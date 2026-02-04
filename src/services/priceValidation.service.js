/**
 * Price Validation Service
 *
 * Validates listing prices against OCR results and section ceilings.
 */

import db from '../db/index.js';

/**
 * Validate a listing price
 *
 * @param {string} eventId - Event ID
 * @param {string} section - Section name
 * @param {number} askingPriceCents - Asking price in cents
 * @param {string} receiptId - Optional receipt ID for OCR validation
 * @returns {Promise<Object>} Validation result
 */
export async function validateListingPrice(eventId, section, askingPriceCents, receiptId = null) {
    let verifiedFaceValue = null;
    let ceilingPrice = null;
    let verificationMethod = null;
    let ocrResultId = null;

    // Try to get face value from OCR result first
    if (receiptId) {
        const ocrResult = await db.query(
            `SELECT * FROM receipt_ocr_results
             WHERE receipt_id = $1
             ORDER BY confidence_score DESC
             LIMIT 1`,
            [receiptId]
        );

        if (ocrResult.rows.length > 0) {
            const ocr = ocrResult.rows[0];
            if (ocr.face_value_cents && ocr.confidence_score >= 0.7) {
                verifiedFaceValue = ocr.face_value_cents;
                verificationMethod = 'ocr';
                ocrResultId = ocr.id;
            }
        }
    }

    // If no OCR result, try section ceiling
    if (!verifiedFaceValue) {
        const ceiling = await getSectionCeiling(eventId, section);
        if (ceiling) {
            ceilingPrice = ceiling.maxPriceCents;
            verificationMethod = 'section_ceiling';
        }
    }

    // Determine validation result
    const maxAllowedPrice = verifiedFaceValue || ceilingPrice;

    if (!maxAllowedPrice) {
        // No price ceiling found - needs manual review
        return {
            valid: false,
            result: 'manual_review',
            reason: 'No price ceiling found for this section',
            askingPriceCents,
            verifiedFaceValue: null,
            ceilingPrice: null,
            verificationMethod: null,
            ocrResultId: null
        };
    }

    const isValid = askingPriceCents <= maxAllowedPrice;

    return {
        valid: isValid,
        result: isValid ? 'approved' : 'rejected',
        reason: isValid
            ? 'Price is at or below face value'
            : `Price exceeds maximum allowed (${formatCents(maxAllowedPrice)})`,
        askingPriceCents,
        verifiedFaceValue,
        ceilingPrice,
        verificationMethod,
        ocrResultId,
        priceDifference: askingPriceCents - maxAllowedPrice,
        percentageOfFaceValue: Math.round((askingPriceCents / maxAllowedPrice) * 100)
    };
}

/**
 * Get section price ceiling for an event
 *
 * @param {string} eventId - Event ID
 * @param {string} section - Section name
 * @returns {Promise<Object|null>} Price ceiling or null
 */
export async function getSectionCeiling(eventId, section) {
    // First try exact match
    let result = await db.query(
        `SELECT * FROM event_price_ceilings
         WHERE event_id = $1 AND section_pattern ILIKE $2`,
        [eventId, section]
    );

    if (result.rows.length > 0) {
        return formatCeiling(result.rows[0]);
    }

    // Try pattern matching (e.g., "400-Level" matches "400-Level Corners")
    result = await db.query(
        `SELECT * FROM event_price_ceilings
         WHERE event_id = $1 AND $2 ILIKE '%' || section_pattern || '%'
         ORDER BY max_price_cents DESC
         LIMIT 1`,
        [eventId, section]
    );

    if (result.rows.length > 0) {
        return formatCeiling(result.rows[0]);
    }

    // Try reverse pattern matching
    result = await db.query(
        `SELECT * FROM event_price_ceilings
         WHERE event_id = $1 AND section_pattern ILIKE '%' || $2 || '%'
         ORDER BY max_price_cents DESC
         LIMIT 1`,
        [eventId, section]
    );

    if (result.rows.length > 0) {
        return formatCeiling(result.rows[0]);
    }

    return null;
}

/**
 * Get all price ceilings for an event
 *
 * @param {string} eventId - Event ID
 * @returns {Promise<Array>} Price ceilings
 */
export async function getEventPriceCeilings(eventId) {
    const result = await db.query(
        `SELECT * FROM event_price_ceilings
         WHERE event_id = $1
         ORDER BY max_price_cents ASC`,
        [eventId]
    );

    return result.rows.map(formatCeiling);
}

/**
 * Set price ceilings for an event (admin)
 *
 * @param {string} eventId - Event ID
 * @param {string} eventName - Event name
 * @param {Date} eventDate - Event date
 * @param {string} venueName - Venue name
 * @param {Array} ceilings - Array of {sectionPattern, maxPriceCents}
 * @returns {Promise<Array>} Created/updated ceilings
 */
export async function setPriceCeilings(eventId, eventName, eventDate, venueName, ceilings, source = 'manual') {
    const results = [];

    for (const ceiling of ceilings) {
        const result = await db.query(
            `INSERT INTO event_price_ceilings
             (event_id, event_name, event_date, venue_name, section_pattern, max_price_cents, source)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (event_id, section_pattern)
             DO UPDATE SET max_price_cents = $6, updated_at = NOW()
             RETURNING *`,
            [eventId, eventName, eventDate, venueName, ceiling.sectionPattern, ceiling.maxPriceCents, source]
        );
        results.push(formatCeiling(result.rows[0]));
    }

    return results;
}

/**
 * Create a price verification record
 *
 * @param {Object} data - Verification data
 * @returns {Promise<Object>} Created verification
 */
export async function createPriceVerification(data) {
    const result = await db.query(
        `INSERT INTO price_verifications (
            listing_id, receipt_id, ocr_result_id, ceiling_id,
            asking_price_cents, verified_face_value_cents, ceiling_price_cents,
            verification_result, rejection_reason, risk_score, fraud_signals
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
            data.listingId,
            data.receiptId,
            data.ocrResultId,
            data.ceilingId,
            data.askingPriceCents,
            data.verifiedFaceValueCents,
            data.ceilingPriceCents,
            data.verificationResult,
            data.rejectionReason,
            data.riskScore,
            JSON.stringify(data.fraudSignals || [])
        ]
    );

    return result.rows[0];
}

/**
 * Format cents to dollar string
 */
function formatCents(cents) {
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

/**
 * Format ceiling for API response
 */
function formatCeiling(row) {
    if (!row) return null;

    return {
        id: row.id,
        eventId: row.event_id,
        eventName: row.event_name,
        eventDate: row.event_date,
        venueName: row.venue_name,
        sectionPattern: row.section_pattern,
        maxPriceCents: row.max_price_cents,
        currency: row.currency,
        source: row.source,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

export default {
    validateListingPrice,
    getSectionCeiling,
    getEventPriceCeilings,
    setPriceCeilings,
    createPriceVerification
};
