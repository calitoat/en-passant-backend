/**
 * Invite Code Service
 *
 * Handles beta invite system for En Passant:
 * - QR code scans → instant beta access + 2 invite links
 * - Invite links from friends → instant beta access + 2 invite links
 * - Organic visitors (no code) → waitlist only
 */

import crypto from 'crypto';
import db from '../db/index.js';

/**
 * Generate a random invite code
 * Format: EP-XXXXX-XXXXX (letters and numbers, easy to type)
 *
 * @returns {string} Generated invite code
 */
export function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars (0,O,1,I)
    let code = 'EP-';
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code += '-';
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Validate an invite code without redeeming it
 *
 * @param {string} code - The invite code to validate
 * @returns {Promise<Object>} { valid: boolean, type?: string, source?: string, error?: string }
 */
export async function validateCode(code) {
    if (!code || typeof code !== 'string') {
        return { valid: false, error: 'Invalid code format' };
    }

    const normalizedCode = code.toUpperCase().trim();

    const result = await db.query(
        `SELECT id, code, type, source, is_used, expires_at, created_by_user_id
         FROM invite_codes
         WHERE code = $1`,
        [normalizedCode]
    );

    if (result.rows.length === 0) {
        return { valid: false, error: 'Code not found' };
    }

    const inviteCode = result.rows[0];

    if (inviteCode.is_used) {
        return { valid: false, error: 'Code already used' };
    }

    if (inviteCode.expires_at && new Date(inviteCode.expires_at) < new Date()) {
        return { valid: false, error: 'Code has expired' };
    }

    return {
        valid: true,
        type: inviteCode.type,
        source: inviteCode.source,
        codeId: inviteCode.id
    };
}

/**
 * Redeem an invite code for a user
 * Marks the code as used and grants beta access to the user
 *
 * @param {string} code - The invite code
 * @param {string} userId - The user redeeming the code
 * @returns {Promise<Object>} { success: boolean, error?: string }
 */
export async function redeemCode(code, userId) {
    const validation = await validateCode(code);

    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    const normalizedCode = code.toUpperCase().trim();

    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        // Mark the code as used
        await client.query(
            `UPDATE invite_codes
             SET is_used = TRUE, used_by_user_id = $1, used_at = NOW()
             WHERE code = $2`,
            [userId, normalizedCode]
        );

        // Grant beta access to the user
        await client.query(
            `UPDATE users
             SET has_beta_access = TRUE, invited_by_code = $1, invites_remaining = 2
             WHERE id = $2`,
            [normalizedCode, userId]
        );

        // Create 2 invite codes for the new user
        const inviteCodes = [];
        for (let i = 0; i < 2; i++) {
            const newCode = generateCode();
            await client.query(
                `INSERT INTO invite_codes (code, type, created_by_user_id, source)
                 VALUES ($1, 'user_invite', $2, 'user_generated')`,
                [newCode, userId]
            );
            inviteCodes.push(newCode);
        }

        await client.query('COMMIT');

        return {
            success: true,
            inviteCodes,
            type: validation.type,
            source: validation.source
        };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Invite Service] Redeem error:', err);
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Get a user's invite codes (ones they can share)
 *
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} List of invite codes
 */
export async function getUserInvites(userId) {
    const result = await db.query(
        `SELECT code, type, is_used, created_at, used_at,
                (SELECT email FROM users WHERE id = used_by_user_id) as used_by_email
         FROM invite_codes
         WHERE created_by_user_id = $1
         ORDER BY created_at DESC`,
        [userId]
    );

    return result.rows;
}

/**
 * Check if a user has beta access
 *
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} { hasBetaAccess: boolean, invitesRemaining: number, invitedByCode?: string }
 */
export async function getBetaStatus(userId) {
    const result = await db.query(
        `SELECT has_beta_access, invites_remaining, invited_by_code
         FROM users
         WHERE id = $1`,
        [userId]
    );

    if (result.rows.length === 0) {
        return { hasBetaAccess: false, invitesRemaining: 0 };
    }

    const user = result.rows[0];
    return {
        hasBetaAccess: user.has_beta_access || false,
        invitesRemaining: user.invites_remaining || 0,
        invitedByCode: user.invited_by_code
    };
}

/**
 * Generate QR invite codes (admin function)
 * These are pre-generated codes for guerrilla marketing
 *
 * @param {number} count - Number of codes to generate
 * @param {string} source - Source identifier (e.g., "qr-superbowl-venue")
 * @param {Date} expiresAt - Optional expiration date
 * @returns {Promise<Array>} Generated codes
 */
export async function generateQRCodes(count, source, expiresAt = null) {
    const codes = [];

    for (let i = 0; i < count; i++) {
        const code = generateCode();

        await db.query(
            `INSERT INTO invite_codes (code, type, source, expires_at)
             VALUES ($1, 'qr', $2, $3)`,
            [code, source, expiresAt]
        );

        codes.push(code);
    }

    return codes;
}

/**
 * Get QR code stats (admin function)
 *
 * @param {string} source - Optional source filter
 * @returns {Promise<Object>} Stats object
 */
export async function getQRCodeStats(source = null) {
    let query = `
        SELECT
            source,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE is_used = TRUE) as used,
            COUNT(*) FILTER (WHERE is_used = FALSE) as available
        FROM invite_codes
        WHERE type = 'qr'
    `;

    const params = [];
    if (source) {
        query += ' AND source = $1';
        params.push(source);
    }

    query += ' GROUP BY source ORDER BY source';

    const result = await db.query(query, params);
    return result.rows;
}

/**
 * Grant beta access manually (admin function)
 * Used for special cases like early supporters
 *
 * @param {string} userId - User ID to grant access
 * @param {number} inviteCount - Number of invites to grant (default 2)
 * @returns {Promise<boolean>} Success status
 */
export async function grantBetaAccess(userId, inviteCount = 2) {
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        // Grant beta access
        await client.query(
            `UPDATE users
             SET has_beta_access = TRUE, invites_remaining = $1
             WHERE id = $2`,
            [inviteCount, userId]
        );

        // Create invite codes for the user
        for (let i = 0; i < inviteCount; i++) {
            const code = generateCode();
            await client.query(
                `INSERT INTO invite_codes (code, type, created_by_user_id, source)
                 VALUES ($1, 'user_invite', $2, 'admin_grant')`,
                [code, userId]
            );
        }

        await client.query('COMMIT');
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export default {
    generateCode,
    validateCode,
    redeemCode,
    getUserInvites,
    getBetaStatus,
    generateQRCodes,
    getQRCodeStats,
    grantBetaAccess
};
