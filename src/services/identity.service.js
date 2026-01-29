/**
 * Identity Anchor Service
 *
 * Manages connected identity providers (Gmail, LinkedIn, etc.)
 * Includes real OAuth integration with Gmail API for metadata fetching.
 */

import { google } from 'googleapis';
import db from '../db/index.js';
import { ValidationError } from './auth.service.js';

// Supported identity providers
const SUPPORTED_PROVIDERS = ['gmail', 'linkedin'];

/**
 * Connect an identity anchor to a user account
 *
 * @param {string} userId - User UUID
 * @param {string} provider - Provider name ('gmail' or 'linkedin')
 * @param {Object} data - Identity data from provider
 * @returns {Promise<Object>} Created identity anchor
 */
export async function connectAnchor(userId, provider, data) {
    if (!SUPPORTED_PROVIDERS.includes(provider)) {
        throw new ValidationError(`Unsupported provider: ${provider}. Supported: ${SUPPORTED_PROVIDERS.join(', ')}`);
    }

    // Validate required fields based on provider
    validateProviderData(provider, data);

    try {
        const result = await db.query(
            `INSERT INTO identity_anchors
             (user_id, provider, provider_user_id, account_created_at, email_address, connection_count, profile_url, metadata, is_edu_verified)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (user_id, provider)
             DO UPDATE SET
                provider_user_id = EXCLUDED.provider_user_id,
                account_created_at = EXCLUDED.account_created_at,
                email_address = EXCLUDED.email_address,
                connection_count = EXCLUDED.connection_count,
                profile_url = EXCLUDED.profile_url,
                metadata = EXCLUDED.metadata,
                is_edu_verified = EXCLUDED.is_edu_verified,
                last_verified_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [
                userId,
                provider,
                data.providerId,
                data.accountCreatedAt || null,
                data.email || null,
                data.connectionCount || null,
                data.profileUrl || null,
                JSON.stringify(data.metadata || {}),
                data.isEduVerified || false
            ]
        );

        return result.rows[0];
    } catch (err) {
        if (err.code === '23503') { // Foreign key violation
            throw new ValidationError('User not found');
        }
        throw err;
    }
}

/**
 * Get all identity anchors for a user
 *
 * @param {string} userId - User UUID
 * @returns {Promise<Array>} Array of identity anchors
 */
export async function getAnchors(userId) {
    const result = await db.query(
        `SELECT id, provider, provider_user_id, account_created_at, email_address,
                connection_count, profile_url, metadata, connected_at, last_verified_at, is_edu_verified
         FROM identity_anchors
         WHERE user_id = $1
         ORDER BY connected_at DESC`,
        [userId]
    );
    return result.rows;
}

/**
 * Get a specific identity anchor
 *
 * @param {string} userId - User UUID
 * @param {string} provider - Provider name
 * @returns {Promise<Object|null>} Identity anchor or null
 */
export async function getAnchor(userId, provider) {
    const result = await db.query(
        `SELECT * FROM identity_anchors WHERE user_id = $1 AND provider = $2`,
        [userId, provider]
    );
    return result.rows[0] || null;
}

/**
 * Disconnect an identity anchor
 *
 * @param {string} userId - User UUID
 * @param {string} provider - Provider name
 * @returns {Promise<boolean>} True if anchor was deleted
 */
export async function disconnectAnchor(userId, provider) {
    const result = await db.query(
        'DELETE FROM identity_anchors WHERE user_id = $1 AND provider = $2 RETURNING id',
        [userId, provider]
    );
    return result.rowCount > 0;
}

/**
 * Fetch Gmail metadata using OAuth access token
 *
 * This function fetches email metadata (NOT content) to determine:
 * - Account age (from oldest email date)
 * - Email volume (total count)
 * - Activity patterns
 *
 * PRIVACY: We only access metadata, never email content.
 *
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<Object>} Gmail metadata for trust scoring
 */
export async function fetchGmailMetadata(accessToken) {
    try {
        // Create OAuth2 client with access token
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });

        // Initialize Gmail API
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Get user's email profile
        const profile = await gmail.users.getProfile({ userId: 'me' });
        const totalEmails = parseInt(profile.data.messagesTotal || '0', 10);

        // Find the oldest email to estimate account age
        // We search for the oldest email in the inbox
        let oldestEmailDate = null;
        let accountCreatedAt = null;

        try {
            // Search for oldest emails (limit to 1, sorted by date ascending)
            const oldestMessages = await gmail.users.messages.list({
                userId: 'me',
                maxResults: 1,
                q: 'in:anywhere', // Search all mail
                orderBy: 'internalDate'
            });

            if (oldestMessages.data.messages && oldestMessages.data.messages.length > 0) {
                const oldestMessageId = oldestMessages.data.messages[0].id;

                // Get the message metadata (not content)
                const message = await gmail.users.messages.get({
                    userId: 'me',
                    id: oldestMessageId,
                    format: 'metadata',
                    metadataHeaders: ['Date']
                });

                // Extract internal date (Unix timestamp in milliseconds)
                if (message.data.internalDate) {
                    oldestEmailDate = new Date(parseInt(message.data.internalDate, 10));
                    accountCreatedAt = oldestEmailDate; // Use oldest email as proxy for account creation
                }
            }
        } catch (err) {
            console.warn('Could not fetch oldest email:', err.message);
            // Continue without oldest email date - not critical
        }

        // Get recent activity (emails in last 30 days)
        let recentEmailCount = 0;
        try {
            const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
            const recentMessages = await gmail.users.messages.list({
                userId: 'me',
                maxResults: 100,
                q: `after:${thirtyDaysAgo}`
            });
            recentEmailCount = recentMessages.data.resultSizeEstimate || 0;
        } catch (err) {
            console.warn('Could not fetch recent email count:', err.message);
        }

        return {
            totalEmails,
            oldestEmailDate: oldestEmailDate?.toISOString() || null,
            accountCreatedAt,
            recentEmailCount,
            emailAddress: profile.data.emailAddress,
            historyId: profile.data.historyId
        };
    } catch (err) {
        console.error('Gmail API error:', err.message);

        // Return minimal data if API fails
        // This allows OAuth to complete even if metadata fetch fails
        return {
            totalEmails: 0,
            oldestEmailDate: null,
            accountCreatedAt: null,
            recentEmailCount: 0,
            error: err.message
        };
    }
}

/**
 * Refresh Gmail metadata using stored refresh token
 *
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Updated Gmail metadata
 */
export async function refreshGmailMetadata(userId) {
    const anchor = await getAnchor(userId, 'gmail');

    if (!anchor) {
        throw new ValidationError('Gmail not connected');
    }

    const refreshToken = anchor.metadata?.refresh_token;
    if (!refreshToken) {
        throw new ValidationError('No refresh token available. Please reconnect Gmail.');
    }

    // Create OAuth2 client with refresh token
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    // Get new access token
    const { credentials } = await oauth2Client.refreshAccessToken();

    // Fetch fresh metadata
    const metadata = await fetchGmailMetadata(credentials.access_token);

    // Update anchor with fresh metadata
    await db.query(
        `UPDATE identity_anchors
         SET metadata = metadata || $1::jsonb,
             last_verified_at = CURRENT_TIMESTAMP
         WHERE user_id = $2 AND provider = 'gmail'`,
        [
            JSON.stringify({
                email_count: metadata.totalEmails,
                oldest_email_date: metadata.oldestEmailDate,
                recent_email_count: metadata.recentEmailCount,
                last_refreshed: new Date().toISOString()
            }),
            userId
        ]
    );

    return metadata;
}

/**
 * Validate provider-specific data
 */
function validateProviderData(provider, data) {
    if (!data.providerId) {
        throw new ValidationError('providerId is required');
    }

    switch (provider) {
        case 'gmail':
            if (!data.email) {
                throw new ValidationError('email is required for Gmail provider');
            }
            break;
        case 'linkedin':
            // LinkedIn can work with just providerId
            break;
    }
}

/**
 * Generate mock identity data for testing
 * This simulates what we'd get from OAuth providers
 *
 * @param {string} provider - Provider name
 * @param {Object} options - Optional overrides
 * @returns {Object} Mock identity data
 */
export function generateMockData(provider, options = {}) {
    const now = new Date();

    switch (provider) {
        case 'gmail':
            return {
                providerId: options.providerId || `mock-gmail-${Date.now()}`,
                email: options.email || `testuser${Date.now()}@gmail.com`,
                accountCreatedAt: options.accountCreatedAt || new Date(now - 3 * 365 * 24 * 60 * 60 * 1000), // 3 years ago
                metadata: {
                    email_verified: true,
                    hd: options.domain || null, // Google Workspace domain
                    ...options.metadata
                }
            };

        case 'linkedin':
            return {
                providerId: options.providerId || `mock-linkedin-${Date.now()}`,
                email: options.email,
                accountCreatedAt: options.accountCreatedAt || new Date(now - 5 * 365 * 24 * 60 * 60 * 1000), // 5 years ago
                connectionCount: options.connectionCount || 250,
                profileUrl: options.profileUrl || `https://linkedin.com/in/mock-user-${Date.now()}`,
                metadata: {
                    headline: options.headline || 'Software Engineer',
                    industry: options.industry || 'Technology',
                    ...options.metadata
                }
            };

        default:
            throw new ValidationError(`Cannot generate mock data for provider: ${provider}`);
    }
}

export default {
    connectAnchor,
    getAnchors,
    getAnchor,
    disconnectAnchor,
    fetchGmailMetadata,
    refreshGmailMetadata,
    generateMockData,
    SUPPORTED_PROVIDERS
};
