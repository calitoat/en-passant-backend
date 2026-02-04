/**
 * Event Service
 *
 * Manages events for ticket exchange.
 */

import db from '../db/index.js';

/**
 * Create or update an event
 *
 * @param {Object} data - Event data
 * @returns {Promise<Object>} Created/updated event
 */
export async function upsertEvent(data) {
    const {
        id,
        name,
        date,
        venueName,
        venueCity,
        venueState,
        category,
        subcategory,
        imageUrl,
        ticketExchangeEnabled = true
    } = data;

    const result = await db.query(
        `INSERT INTO events (
            id, name, date, venue_name, venue_city, venue_state,
            category, subcategory, image_url, ticket_exchange_enabled
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
            name = $2, date = $3, venue_name = $4, venue_city = $5, venue_state = $6,
            category = $7, subcategory = $8, image_url = $9, ticket_exchange_enabled = $10,
            updated_at = NOW()
        RETURNING *`,
        [id, name, date, venueName, venueCity, venueState, category, subcategory, imageUrl, ticketExchangeEnabled]
    );

    return formatEvent(result.rows[0]);
}

/**
 * Get event by ID
 *
 * @param {string} id - Event ID
 * @returns {Promise<Object|null>} Event or null
 */
export async function getEvent(id) {
    const result = await db.query(
        'SELECT * FROM events WHERE id = $1',
        [id]
    );

    return result.rows.length > 0 ? formatEvent(result.rows[0]) : null;
}

/**
 * Get event with price ceilings
 *
 * @param {string} id - Event ID
 * @returns {Promise<Object|null>} Event with ceilings or null
 */
export async function getEventWithCeilings(id) {
    const event = await getEvent(id);
    if (!event) return null;

    const ceilings = await db.query(
        `SELECT * FROM event_price_ceilings
         WHERE event_id = $1
         ORDER BY max_price_cents ASC`,
        [id]
    );

    return {
        ...event,
        priceCeilings: ceilings.rows.map(row => ({
            id: row.id,
            sectionPattern: row.section_pattern,
            maxPriceCents: row.max_price_cents,
            currency: row.currency,
            source: row.source
        }))
    };
}

/**
 * List events with ticket exchange
 *
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Events
 */
export async function getEvents(filters = {}) {
    const {
        category,
        upcoming = true,
        limit = 50,
        offset = 0
    } = filters;

    const conditions = ['ticket_exchange_enabled = TRUE'];
    const params = [];
    let paramIndex = 1;

    if (category) {
        conditions.push(`category = $${paramIndex++}`);
        params.push(category);
    }

    if (upcoming) {
        conditions.push(`date >= NOW()`);
    }

    params.push(limit, offset);

    const result = await db.query(
        `SELECT e.*,
                (SELECT COUNT(*) FROM ticket_listings l
                 WHERE l.event_id = e.id AND l.is_active = TRUE AND l.is_sold = FALSE) as listing_count,
                (SELECT MIN(asking_price_cents) FROM ticket_listings l
                 WHERE l.event_id = e.id AND l.is_active = TRUE AND l.is_sold = FALSE AND l.verification_status = 'verified') as min_price
         FROM events e
         WHERE ${conditions.join(' AND ')}
         ORDER BY date ASC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        params
    );

    return result.rows.map(formatEvent);
}

/**
 * Search events by name
 *
 * @param {string} query - Search query
 * @param {number} limit - Max results
 * @returns {Promise<Array>} Matching events
 */
export async function searchEvents(query, limit = 10) {
    const result = await db.query(
        `SELECT * FROM events
         WHERE ticket_exchange_enabled = TRUE
           AND date >= NOW()
           AND (name ILIKE $1 OR venue_name ILIKE $1)
         ORDER BY date ASC
         LIMIT $2`,
        [`%${query}%`, limit]
    );

    return result.rows.map(formatEvent);
}

/**
 * Format event for API response
 */
function formatEvent(row) {
    if (!row) return null;

    return {
        id: row.id,
        name: row.name,
        date: row.date,
        venueName: row.venue_name,
        venueCity: row.venue_city,
        venueState: row.venue_state,
        category: row.category,
        subcategory: row.subcategory,
        imageUrl: row.image_url,
        ticketExchangeEnabled: row.ticket_exchange_enabled,
        listingCount: row.listing_count ? parseInt(row.listing_count) : undefined,
        minPrice: row.min_price ? parseInt(row.min_price) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

export default {
    upsertEvent,
    getEvent,
    getEventWithCeilings,
    getEvents,
    searchEvents
};
