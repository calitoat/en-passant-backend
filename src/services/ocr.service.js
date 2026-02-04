/**
 * OCR Service
 *
 * Extracts data from receipt images using Google Cloud Vision.
 */

import vision from '@google-cloud/vision';
import config from '../config/index.js';

// Initialize Vision client
let visionClient = null;

function getVisionClient() {
    if (visionClient) return visionClient;

    try {
        // Try to initialize with credentials
        if (config.google?.credentialsJson) {
            const credentials = JSON.parse(
                Buffer.from(config.google.credentialsJson, 'base64').toString()
            );
            visionClient = new vision.ImageAnnotatorClient({ credentials });
        } else if (config.google?.credentialsPath) {
            visionClient = new vision.ImageAnnotatorClient({
                keyFilename: config.google.credentialsPath
            });
        } else {
            // Default credentials (from environment)
            visionClient = new vision.ImageAnnotatorClient();
        }
    } catch (err) {
        console.log('[OCR] Vision client initialization failed:', err.message);
        visionClient = null;
    }

    return visionClient;
}

/**
 * Process a receipt image and extract ticket information
 *
 * @param {Buffer} imageBuffer - Image buffer
 * @param {string} mimeType - MIME type of the image
 * @returns {Promise<Object>} Extracted receipt data
 */
export async function processReceipt(imageBuffer, mimeType) {
    // Try OCR
    const rawText = await extractTextFromImage(imageBuffer);

    if (!rawText) {
        return {
            success: false,
            error: 'No text could be extracted from the image',
            rawText: null,
            data: null,
            confidence: 0
        };
    }

    // Parse the text based on vendor
    const vendor = detectVendor(rawText);
    const parsedData = parseReceiptText(rawText, vendor);

    return {
        success: true,
        rawText,
        vendor,
        data: parsedData,
        confidence: parsedData.confidence,
        extractionMethod: 'google_vision'
    };
}

/**
 * Extract raw text from an image using Google Cloud Vision
 *
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<string|null>} Extracted text or null
 */
export async function extractTextFromImage(buffer) {
    const client = getVisionClient();

    // If no Vision client, use mock OCR for development
    if (!client) {
        if (config.isDevelopment) {
            console.log('[OCR] Vision not configured, using mock extraction');
            return generateMockOcrText();
        }
        throw new Error('Google Cloud Vision is not configured');
    }

    try {
        const [result] = await client.textDetection({
            image: { content: buffer.toString('base64') }
        });

        const detections = result.textAnnotations;

        if (!detections || detections.length === 0) {
            return null;
        }

        // First annotation contains all text
        return detections[0].description;
    } catch (err) {
        console.error('[OCR] Vision API error:', err.message);

        if (config.isDevelopment) {
            console.log('[OCR] Falling back to mock extraction');
            return generateMockOcrText();
        }

        throw err;
    }
}

/**
 * Detect the ticket vendor from OCR text
 *
 * @param {string} text - OCR text
 * @returns {string} Vendor name
 */
function detectVendor(text) {
    const textLower = text.toLowerCase();

    if (textLower.includes('ticketmaster') || textLower.includes('livenation')) {
        return 'ticketmaster';
    }
    if (textLower.includes('axs')) {
        return 'axs';
    }
    if (textLower.includes('seatgeek')) {
        return 'seatgeek';
    }
    if (textLower.includes('stubhub')) {
        return 'stubhub';
    }
    if (textLower.includes('vividseats') || textLower.includes('vivid seats')) {
        return 'vividseats';
    }
    if (textLower.includes('gametime')) {
        return 'gametime';
    }

    return 'unknown';
}

/**
 * Parse receipt text to extract structured data
 *
 * @param {string} text - OCR text
 * @param {string} vendor - Detected vendor
 * @returns {Object} Parsed data
 */
function parseReceiptText(text, vendor) {
    // Use vendor-specific parser if available
    switch (vendor) {
        case 'ticketmaster':
            return parseTicketmaster(text);
        case 'axs':
            return parseAxs(text);
        case 'seatgeek':
            return parseSeatGeek(text);
        default:
            return parseGeneric(text);
    }
}

/**
 * Parse Ticketmaster receipt
 */
function parseTicketmaster(text) {
    const result = {
        eventName: null,
        eventDate: null,
        venueName: null,
        section: null,
        row: null,
        seats: null,
        faceValue: null,
        fees: null,
        total: null,
        quantity: 1,
        confidence: 0.5
    };

    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineLower = line.toLowerCase();

        // Section pattern: "Section 123" or "SEC 123"
        const sectionMatch = line.match(/(?:section|sec)\s*:?\s*(\w+)/i);
        if (sectionMatch) {
            result.section = sectionMatch[1];
            result.confidence += 0.1;
        }

        // Row pattern
        const rowMatch = line.match(/(?:row)\s*:?\s*(\w+)/i);
        if (rowMatch) {
            result.row = rowMatch[1];
            result.confidence += 0.1;
        }

        // Seat pattern
        const seatMatch = line.match(/(?:seat|seats)\s*:?\s*([\d,\s-]+)/i);
        if (seatMatch) {
            result.seats = seatMatch[1].trim();
            result.confidence += 0.1;
        }

        // Price patterns
        const priceMatch = line.match(/\$\s*([\d,]+\.?\d*)/);
        if (priceMatch) {
            const amount = parseFloat(priceMatch[1].replace(',', '')) * 100;

            if (lineLower.includes('face value') || lineLower.includes('ticket price')) {
                result.faceValue = Math.round(amount);
                result.confidence += 0.15;
            } else if (lineLower.includes('fee') || lineLower.includes('service')) {
                result.fees = Math.round(amount);
            } else if (lineLower.includes('total') || lineLower.includes('order total')) {
                result.total = Math.round(amount);
            }
        }

        // Quantity
        const qtyMatch = line.match(/(?:qty|quantity)\s*:?\s*(\d+)/i);
        if (qtyMatch) {
            result.quantity = parseInt(qtyMatch[1]);
        }
    }

    // If no face value found but we have total and fees, calculate it
    if (!result.faceValue && result.total && result.fees) {
        result.faceValue = result.total - result.fees;
    }

    // If no face value but we have total, use it as estimate
    if (!result.faceValue && result.total) {
        result.faceValue = Math.round(result.total * 0.75); // Estimate face value as 75% of total
        result.confidence -= 0.1;
    }

    result.confidence = Math.min(Math.max(result.confidence, 0), 1);

    return result;
}

/**
 * Parse AXS receipt
 */
function parseAxs(text) {
    // Similar to Ticketmaster with AXS-specific patterns
    return parseTicketmaster(text); // Use same parser for now
}

/**
 * Parse SeatGeek receipt
 */
function parseSeatGeek(text) {
    return parseTicketmaster(text); // Use same parser for now
}

/**
 * Parse generic receipt (unknown vendor)
 */
function parseGeneric(text) {
    const result = parseTicketmaster(text);
    result.confidence *= 0.8; // Lower confidence for unknown vendor
    return result;
}

/**
 * Generate mock OCR text for development/testing
 */
function generateMockOcrText() {
    return `
TICKETMASTER
Order Confirmation

Super Bowl LX
Sunday, February 8, 2026
Allegiant Stadium, Las Vegas, NV

Section: 400-Level Corners
Row: 12
Seats: 5, 6

Ticket Price (Face Value): $1,000.00
Service Fee: $150.00
Order Processing Fee: $10.00
---------------------------------
Total: $2,320.00
Quantity: 2

Order #: TM-12345678
Purchase Date: Jan 15, 2026

Thank you for your purchase!
    `.trim();
}

/**
 * Convert parsed cents to OCR result format for database
 */
export function formatForDatabase(parsed, rawText) {
    return {
        vendor: parsed.vendor || 'unknown',
        eventName: parsed.eventName,
        eventDate: parsed.eventDate,
        venueName: parsed.venueName,
        section: parsed.section,
        rowName: parsed.row,
        seatNumbers: parsed.seats,
        faceValueCents: parsed.faceValue,
        feesCents: parsed.fees,
        totalCents: parsed.total,
        quantity: parsed.quantity || 1,
        rawText,
        confidenceScore: parsed.confidence,
        extractionMethod: 'google_vision'
    };
}

export default {
    processReceipt,
    extractTextFromImage,
    formatForDatabase
};
