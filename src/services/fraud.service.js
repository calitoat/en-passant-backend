/**
 * Fraud Detection Service
 *
 * Analyzes receipts for fraud signals.
 */

import crypto from 'crypto';
import db from '../db/index.js';

/**
 * Analyze a receipt for fraud signals
 *
 * @param {string} receiptId - Receipt upload ID
 * @param {Buffer} imageBuffer - Image buffer
 * @param {Object} metadata - Additional metadata (EXIF, etc.)
 * @returns {Promise<Object>} Fraud analysis result
 */
export async function analyzeReceipt(receiptId, imageBuffer, metadata = {}) {
    const signals = [];
    let riskScore = 0;

    // Check for duplicate receipt (same hash)
    const duplicateCheck = await checkDuplicateReceipt(imageBuffer, receiptId);
    if (duplicateCheck.isDuplicate) {
        signals.push({
            type: 'duplicate_receipt',
            severity: 'high',
            message: 'This receipt has already been uploaded',
            details: {
                originalReceiptId: duplicateCheck.originalId,
                originalUploadDate: duplicateCheck.uploadDate
            }
        });
        riskScore += 0.5;
    }

    // Check image metadata for editing software
    const editingCheck = checkForEditingSoftware(metadata);
    if (editingCheck.detected) {
        signals.push({
            type: 'editing_software_detected',
            severity: 'medium',
            message: 'Image may have been edited',
            details: editingCheck.details
        });
        riskScore += 0.2;
    }

    // Check for screenshot indicators
    const screenshotCheck = checkForScreenshot(metadata);
    if (screenshotCheck.isScreenshot) {
        signals.push({
            type: 'screenshot_detected',
            severity: 'low',
            message: 'Image appears to be a screenshot',
            details: screenshotCheck.details
        });
        riskScore += 0.1;
    }

    // Determine recommendation based on risk score
    let recommendation;
    if (riskScore >= 0.5) {
        recommendation = 'reject';
    } else if (riskScore >= 0.2) {
        recommendation = 'manual_review';
    } else {
        recommendation = 'approve';
    }

    return {
        receiptId,
        riskScore: Math.min(riskScore, 1),
        signals,
        recommendation,
        analyzedAt: new Date().toISOString()
    };
}

/**
 * Check if this receipt has already been uploaded
 *
 * @param {Buffer} imageBuffer - Image buffer
 * @param {string} excludeReceiptId - Exclude this receipt from check
 * @returns {Promise<Object>} Duplicate check result
 */
async function checkDuplicateReceipt(imageBuffer, excludeReceiptId = null) {
    const hash = crypto.createHash('sha256').update(imageBuffer).digest('hex');

    const query = excludeReceiptId
        ? 'SELECT id, created_at FROM receipt_uploads WHERE file_hash = $1 AND id != $2 LIMIT 1'
        : 'SELECT id, created_at FROM receipt_uploads WHERE file_hash = $1 LIMIT 1';

    const params = excludeReceiptId ? [hash, excludeReceiptId] : [hash];
    const result = await db.query(query, params);

    if (result.rows.length > 0) {
        return {
            isDuplicate: true,
            originalId: result.rows[0].id,
            uploadDate: result.rows[0].created_at,
            hash
        };
    }

    return {
        isDuplicate: false,
        hash
    };
}

/**
 * Check for photo editing software in metadata
 *
 * @param {Object} metadata - Image metadata (EXIF)
 * @returns {Object} Detection result
 */
function checkForEditingSoftware(metadata) {
    const editingSoftware = [
        'photoshop',
        'gimp',
        'lightroom',
        'affinity',
        'pixelmator',
        'paint.net',
        'canva'
    ];

    const software = (metadata.software || '').toLowerCase();
    const creator = (metadata.creator || '').toLowerCase();

    for (const editor of editingSoftware) {
        if (software.includes(editor) || creator.includes(editor)) {
            return {
                detected: true,
                details: {
                    software: metadata.software,
                    creator: metadata.creator
                }
            };
        }
    }

    return { detected: false };
}

/**
 * Check if image appears to be a screenshot
 *
 * @param {Object} metadata - Image metadata
 * @returns {Object} Detection result
 */
function checkForScreenshot(metadata) {
    // Common screenshot indicators
    const screenshotIndicators = [
        // iOS screenshots
        metadata.software?.includes('iOS'),
        // Android screenshots
        metadata.software?.includes('Android'),
        // Mac screenshots
        metadata.software?.includes('screencapture'),
        // Windows snipping tool
        metadata.software?.includes('Snipping'),
        // No camera make/model (typical for screenshots)
        !metadata.make && !metadata.model && metadata.software
    ];

    const isScreenshot = screenshotIndicators.some(Boolean);

    return {
        isScreenshot,
        details: isScreenshot ? {
            software: metadata.software,
            reason: 'No camera metadata or screenshot software detected'
        } : null
    };
}

/**
 * Check user's receipt upload history for suspicious patterns
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Pattern analysis
 */
export async function analyzeUserUploadPattern(userId) {
    const signals = [];

    // Check upload frequency
    const recentUploads = await db.query(
        `SELECT COUNT(*) as count FROM receipt_uploads
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
        [userId]
    );

    const uploadCount = parseInt(recentUploads.rows[0].count);
    if (uploadCount > 10) {
        signals.push({
            type: 'high_upload_frequency',
            severity: 'medium',
            message: `User uploaded ${uploadCount} receipts in last 24 hours`
        });
    }

    // Check for multiple events
    const eventCount = await db.query(
        `SELECT COUNT(DISTINCT event_id) as count FROM ticket_listings
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days'`,
        [userId]
    );

    if (parseInt(eventCount.rows[0].count) > 5) {
        signals.push({
            type: 'multiple_events',
            severity: 'low',
            message: 'User listing tickets for many different events'
        });
    }

    return {
        userId,
        signals,
        suspiciousActivity: signals.length > 0
    };
}

/**
 * Report a listing for manual review
 *
 * @param {string} listingId - Listing ID
 * @param {string} reason - Reason for flagging
 * @param {Object} details - Additional details
 * @returns {Promise<void>}
 */
export async function reportForReview(listingId, reason, details = {}) {
    await db.query(
        `UPDATE ticket_listings
         SET verification_status = 'manual_review',
             verification_notes = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify({ reason, details, reportedAt: new Date().toISOString() }), listingId]
    );
}

export default {
    analyzeReceipt,
    analyzeUserUploadPattern,
    reportForReview
};
