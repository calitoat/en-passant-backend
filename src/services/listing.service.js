/**
 * Listing Service
 *
 * Manages ticket listings CRUD operations.
 */

import db from '../db/index.js';
import { ValidationError } from './auth.service.js';

/**
 * Create a new ticket listing
 *
 * @param {string} userId - User UUID
 * @param {Object} data - Listing data
 * @returns {Promise<Object>} Created listing
 */
export async function createListing(userId, data) {
    const {
        eventId,
        eventName,
        eventDate,
        venueName,
        section,
        rowName,
        seatNumbers,
        quantity,
        askingPriceCents,
        faceValueCents,
        receiptId,
        verificationStatus = 'pending',
        verificationMethod,
        expiresAt
    } = data;

    // Validate required fields
    if (!eventId || !eventName || !eventDate || !section || !askingPriceCents) {
        throw new ValidationError('Missing required listing fields');
    }

    // Check user's active listing count for this event (2 ticket limit)
    const existingResult = await db.query(
        `SELECT COALESCE(SUM(quantity), 0) as total_quantity
         FROM ticket_listings
         WHERE user_id = $1 AND event_id = $2 AND is_active = TRUE AND is_sold = FALSE`,
        [userId, eventId]
    );

    const existingQuantity = parseInt(existingResult.rows[0]?.total_quantity || 0);
    if (existingQuantity + (quantity || 1) > 2) {
        throw new ValidationError(`Cannot list more than 2 tickets per event. You already have ${existingQuantity} listed.`);
    }

    const result = await db.query(
        `INSERT INTO ticket_listings (
            user_id, event_id, event_name, event_date, venue_name,
            section, row_name, seat_numbers, quantity, asking_price_cents,
            face_value_cents, receipt_id, verification_status, verification_method, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
            userId, eventId, eventName, eventDate, venueName,
            section, rowName, seatNumbers, quantity || 1, askingPriceCents,
            faceValueCents, receiptId, verificationStatus, verificationMethod, expiresAt
        ]
    );

    return formatListing(result.rows[0]);
}

/**
 * Get listings with filters
 *
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Listings
 */
export async function getListings(filters = {}) {
    const {
        eventId,
        section,
        minPrice,
        maxPrice,
        verifiedOnly = true,
        userId,
        limit = 50,
        offset = 0,
        sortBy = 'asking_price_cents',
        sortOrder = 'ASC'
    } = filters;

    const conditions = ['is_active = TRUE', 'is_sold = FALSE'];
    const params = [];
    let paramIndex = 1;

    if (eventId) {
        conditions.push(`event_id = $${paramIndex++}`);
        params.push(eventId);
    }

    if (section) {
        conditions.push(`section ILIKE $${paramIndex++}`);
        params.push(`%${section}%`);
    }

    if (minPrice) {
        conditions.push(`asking_price_cents >= $${paramIndex++}`);
        params.push(minPrice);
    }

    if (maxPrice) {
        conditions.push(`asking_price_cents <= $${paramIndex++}`);
        params.push(maxPrice);
    }

    if (verifiedOnly) {
        conditions.push(`verification_status = 'verified'`);
    }

    if (userId) {
        conditions.push(`user_id = $${paramIndex++}`);
        params.push(userId);
    }

    // Validate sort column
    const validSortColumns = ['asking_price_cents', 'created_at', 'event_date', 'section'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'asking_price_cents';
    const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const query = `
        SELECT l.*, u.username as seller_username,
               (SELECT trust_score FROM auth_badges WHERE user_id = l.user_id AND revoked_at IS NULL ORDER BY issued_at DESC LIMIT 1) as seller_trust_score
        FROM ticket_listings l
        LEFT JOIN users u ON l.user_id = u.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY ${sortColumn} ${order}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows.map(formatListing);
}

/**
 * Get a single listing by ID
 *
 * @param {string} id - Listing UUID
 * @returns {Promise<Object|null>} Listing or null
 */
export async function getListing(id) {
    const result = await db.query(
        `SELECT l.*, u.username as seller_username,
                (SELECT trust_score FROM auth_badges WHERE user_id = l.user_id AND revoked_at IS NULL ORDER BY issued_at DESC LIMIT 1) as seller_trust_score
         FROM ticket_listings l
         LEFT JOIN users u ON l.user_id = u.id
         WHERE l.id = $1`,
        [id]
    );

    if (result.rows.length === 0) {
        return null;
    }

    // Increment view count
    await db.query(
        'UPDATE ticket_listings SET view_count = view_count + 1 WHERE id = $1',
        [id]
    );

    return formatListing(result.rows[0]);
}

/**
 * Get user's listings
 *
 * @param {string} userId - User UUID
 * @returns {Promise<Array>} User's listings
 */
export async function getUserListings(userId) {
    const result = await db.query(
        `SELECT * FROM ticket_listings
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
    );

    return result.rows.map(formatListing);
}

/**
 * Update a listing
 *
 * @param {string} id - Listing UUID
 * @param {string} userId - User UUID (for authorization)
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated listing
 */
export async function updateListing(id, userId, data) {
    // First check ownership
    const existing = await db.query(
        'SELECT * FROM ticket_listings WHERE id = $1',
        [id]
    );

    if (existing.rows.length === 0) {
        throw new ValidationError('Listing not found');
    }

    if (existing.rows[0].user_id !== userId) {
        throw new ValidationError('Not authorized to update this listing');
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    const allowedFields = ['section', 'row_name', 'seat_numbers', 'asking_price_cents', 'is_active'];

    for (const field of allowedFields) {
        const camelField = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        if (data[camelField] !== undefined) {
            updates.push(`${field} = $${paramIndex++}`);
            params.push(data[camelField]);
        }
    }

    if (updates.length === 0) {
        throw new ValidationError('No valid fields to update');
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await db.query(
        `UPDATE ticket_listings SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        params
    );

    return formatListing(result.rows[0]);
}

/**
 * Update listing verification status
 *
 * @param {string} id - Listing UUID
 * @param {string} status - New verification status
 * @param {string} method - Verification method
 * @param {string} notes - Optional notes
 * @returns {Promise<Object>} Updated listing
 */
export async function updateVerificationStatus(id, status, method, notes = null) {
    const result = await db.query(
        `UPDATE ticket_listings
         SET verification_status = $1, verification_method = $2, verification_notes = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [status, method, notes, id]
    );

    if (result.rows.length === 0) {
        throw new ValidationError('Listing not found');
    }

    return formatListing(result.rows[0]);
}

/**
 * Flag a listing
 *
 * @param {string} listingId - Listing UUID
 * @param {string} reporterId - Reporter user UUID
 * @param {string} reason - Flag reason
 * @param {string} description - Optional description
 * @returns {Promise<Object>} Created flag
 */
export async function flagListing(listingId, reporterId, reason, description = null) {
    const validReasons = ['price_too_high', 'fake_receipt', 'wrong_section', 'duplicate', 'other'];
    if (!validReasons.includes(reason)) {
        throw new ValidationError(`Invalid flag reason. Must be one of: ${validReasons.join(', ')}`);
    }

    // Check listing exists
    const listing = await db.query('SELECT id FROM ticket_listings WHERE id = $1', [listingId]);
    if (listing.rows.length === 0) {
        throw new ValidationError('Listing not found');
    }

    try {
        const result = await db.query(
            `INSERT INTO listing_flags (listing_id, reporter_id, reason, description)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [listingId, reporterId, reason, description]
        );

        return result.rows[0];
    } catch (err) {
        if (err.code === '23505') { // Unique violation
            throw new ValidationError('You have already flagged this listing');
        }
        throw err;
    }
}

/**
 * Mark listing as sold
 *
 * @param {string} id - Listing UUID
 * @param {string} userId - User UUID (for authorization)
 * @returns {Promise<Object>} Updated listing
 */
export async function markAsSold(id, userId) {
    const result = await db.query(
        `UPDATE ticket_listings
         SET is_sold = TRUE, sold_at = NOW(), is_active = FALSE, updated_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [id, userId]
    );

    if (result.rows.length === 0) {
        throw new ValidationError('Listing not found or not authorized');
    }

    return formatListing(result.rows[0]);
}

/**
 * Get listing statistics for an event
 *
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Statistics
 */
export async function getEventListingStats(eventId) {
    const result = await db.query(
        `SELECT
            COUNT(*) as total_listings,
            COUNT(*) FILTER (WHERE verification_status = 'verified') as verified_listings,
            MIN(asking_price_cents) as min_price,
            MAX(asking_price_cents) as max_price,
            AVG(asking_price_cents)::INTEGER as avg_price,
            SUM(quantity) as total_tickets
         FROM ticket_listings
         WHERE event_id = $1 AND is_active = TRUE AND is_sold = FALSE`,
        [eventId]
    );

    return result.rows[0];
}

/**
 * Format listing for API response
 */
function formatListing(row) {
    if (!row) return null;

    return {
        id: row.id,
        userId: row.user_id,
        eventId: row.event_id,
        eventName: row.event_name,
        eventDate: row.event_date,
        venueName: row.venue_name,
        section: row.section,
        rowName: row.row_name,
        seatNumbers: row.seat_numbers,
        quantity: row.quantity,
        askingPriceCents: row.asking_price_cents,
        faceValueCents: row.face_value_cents,
        receiptId: row.receipt_id,
        verificationStatus: row.verification_status,
        verificationMethod: row.verification_method,
        verificationNotes: row.verification_notes,
        isActive: row.is_active,
        isSold: row.is_sold,
        viewCount: row.view_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        soldAt: row.sold_at,
        expiresAt: row.expires_at,
        sellerUsername: row.seller_username,
        sellerTrustScore: row.seller_trust_score
    };
}

export default {
    createListing,
    getListings,
    getListing,
    getUserListings,
    updateListing,
    updateVerificationStatus,
    flagListing,
    markAsSold,
    getEventListingStats
};
