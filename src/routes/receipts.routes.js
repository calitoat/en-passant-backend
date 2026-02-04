/**
 * Receipts Routes
 *
 * POST /api/receipts/upload - Upload receipt (auth required)
 * GET /api/receipts/:id - Get receipt details
 * POST /api/receipts/:id/verify - Trigger OCR processing
 */

import { Router } from 'express';
import multer from 'multer';
import db from '../db/index.js';
import storageService from '../services/storage.service.js';
import ocrService from '../services/ocr.service.js';
import fraudService from '../services/fraud.service.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Allowed: JPEG, PNG, WebP, PDF'));
        }
    }
});

/**
 * POST /api/receipts/upload
 * Upload a receipt image
 */
router.post('/upload', authenticate, upload.single('receipt'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'no_file',
                message: 'No receipt file provided'
            });
        }

        const { buffer, originalname, mimetype, size } = req.file;

        // Upload to S3
        const uploadResult = await storageService.uploadReceipt(
            buffer,
            originalname,
            mimetype,
            req.user.id
        );

        // Create receipt record
        const result = await db.query(
            `INSERT INTO receipt_uploads (
                user_id, s3_key, original_filename, mime_type, file_size_bytes, file_hash, upload_status
            ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
            RETURNING *`,
            [
                req.user.id,
                uploadResult.key,
                originalname,
                mimetype,
                size,
                uploadResult.fileHash
            ]
        );

        const receipt = result.rows[0];

        // Optionally auto-process if requested
        if (req.body.autoProcess === 'true') {
            // Process in background (don't await)
            processReceiptAsync(receipt.id, buffer, mimetype).catch(err => {
                console.error('[Receipts] Auto-process error:', err.message);
            });
        }

        res.status(201).json({
            message: 'Receipt uploaded successfully',
            receipt: {
                id: receipt.id,
                filename: receipt.original_filename,
                status: receipt.upload_status,
                createdAt: receipt.created_at
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/receipts/:id
 * Get receipt details and signed URL
 */
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT r.*, o.vendor, o.event_name, o.section, o.row_name, o.seat_numbers,
                    o.face_value_cents, o.fees_cents, o.total_cents, o.quantity,
                    o.confidence_score, o.extraction_method
             FROM receipt_uploads r
             LEFT JOIN receipt_ocr_results o ON r.id = o.receipt_id
             WHERE r.id = $1 AND r.user_id = $2`,
            [req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'not_found',
                message: 'Receipt not found'
            });
        }

        const receipt = result.rows[0];

        // Get signed URL for viewing
        let imageUrl = null;
        try {
            imageUrl = await storageService.getReceiptUrl(receipt.s3_key);
        } catch (err) {
            console.log('[Receipts] Could not get signed URL:', err.message);
        }

        res.json({
            id: receipt.id,
            filename: receipt.original_filename,
            mimeType: receipt.mime_type,
            status: receipt.upload_status,
            imageUrl,
            createdAt: receipt.created_at,
            processedAt: receipt.processed_at,
            ocrResult: receipt.vendor ? {
                vendor: receipt.vendor,
                eventName: receipt.event_name,
                section: receipt.section,
                row: receipt.row_name,
                seats: receipt.seat_numbers,
                faceValueCents: receipt.face_value_cents,
                feesCents: receipt.fees_cents,
                totalCents: receipt.total_cents,
                quantity: receipt.quantity,
                confidence: receipt.confidence_score,
                method: receipt.extraction_method
            } : null
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/receipts/:id/verify
 * Trigger OCR processing on a receipt
 */
router.post('/:id/verify', authenticate, async (req, res, next) => {
    try {
        // Get receipt
        const receiptResult = await db.query(
            'SELECT * FROM receipt_uploads WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );

        if (receiptResult.rows.length === 0) {
            return res.status(404).json({
                error: 'not_found',
                message: 'Receipt not found'
            });
        }

        const receipt = receiptResult.rows[0];

        // Check if already processed
        if (receipt.upload_status === 'completed') {
            const existingOcr = await db.query(
                'SELECT * FROM receipt_ocr_results WHERE receipt_id = $1 ORDER BY created_at DESC LIMIT 1',
                [receipt.id]
            );

            if (existingOcr.rows.length > 0) {
                const ocr = existingOcr.rows[0];
                return res.json({
                    message: 'Receipt already processed',
                    status: 'completed',
                    ocrResult: {
                        vendor: ocr.vendor,
                        eventName: ocr.event_name,
                        section: ocr.section,
                        row: ocr.row_name,
                        seats: ocr.seat_numbers,
                        faceValueCents: ocr.face_value_cents,
                        feesCents: ocr.fees_cents,
                        totalCents: ocr.total_cents,
                        quantity: ocr.quantity,
                        confidence: parseFloat(ocr.confidence_score),
                        method: ocr.extraction_method
                    }
                });
            }
        }

        // Update status to processing
        await db.query(
            "UPDATE receipt_uploads SET upload_status = 'processing' WHERE id = $1",
            [receipt.id]
        );

        // Get image buffer
        let imageBuffer;
        try {
            imageBuffer = await storageService.getReceiptBuffer(receipt.s3_key);
        } catch (err) {
            // If we can't get the buffer, we need to use the original upload
            // This would require storing the buffer temporarily or re-uploading
            return res.status(400).json({
                error: 'processing_error',
                message: 'Could not retrieve receipt image for processing'
            });
        }

        // Process with OCR
        const ocrResult = await ocrService.processReceipt(imageBuffer, receipt.mime_type);

        if (!ocrResult.success) {
            await db.query(
                "UPDATE receipt_uploads SET upload_status = 'failed', processed_at = NOW() WHERE id = $1",
                [receipt.id]
            );

            return res.status(400).json({
                error: 'ocr_failed',
                message: ocrResult.error || 'OCR processing failed'
            });
        }

        // Run fraud detection
        const fraudResult = await fraudService.analyzeReceipt(receipt.id, imageBuffer, {});

        // Store OCR result
        const ocrData = ocrService.formatForDatabase(ocrResult.data, ocrResult.rawText);

        await db.query(
            `INSERT INTO receipt_ocr_results (
                receipt_id, vendor, event_name, event_date, venue_name,
                section, row_name, seat_numbers, face_value_cents, fees_cents,
                total_cents, quantity, raw_text, confidence_score, extraction_method
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
            [
                receipt.id,
                ocrData.vendor,
                ocrData.eventName,
                ocrData.eventDate,
                ocrData.venueName,
                ocrData.section,
                ocrData.rowName,
                ocrData.seatNumbers,
                ocrData.faceValueCents,
                ocrData.feesCents,
                ocrData.totalCents,
                ocrData.quantity,
                ocrData.rawText,
                ocrData.confidenceScore,
                ocrData.extractionMethod
            ]
        );

        // Update receipt status
        await db.query(
            "UPDATE receipt_uploads SET upload_status = 'completed', processed_at = NOW() WHERE id = $1",
            [receipt.id]
        );

        res.json({
            message: 'Receipt processed successfully',
            status: 'completed',
            ocrResult: {
                vendor: ocrData.vendor,
                eventName: ocrData.eventName,
                section: ocrData.section,
                row: ocrData.rowName,
                seats: ocrData.seatNumbers,
                faceValueCents: ocrData.faceValueCents,
                feesCents: ocrData.feesCents,
                totalCents: ocrData.totalCents,
                quantity: ocrData.quantity,
                confidence: ocrData.confidenceScore,
                method: ocrData.extractionMethod
            },
            fraudAnalysis: {
                riskScore: fraudResult.riskScore,
                recommendation: fraudResult.recommendation,
                signals: fraudResult.signals.length
            }
        });
    } catch (err) {
        // Update status to failed
        await db.query(
            "UPDATE receipt_uploads SET upload_status = 'failed', processed_at = NOW() WHERE id = $1",
            [req.params.id]
        ).catch(() => {});

        next(err);
    }
});

/**
 * GET /api/receipts
 * List user's receipts
 */
router.get('/', authenticate, async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT r.id, r.original_filename, r.upload_status, r.created_at, r.processed_at,
                    o.face_value_cents, o.section, o.vendor, o.confidence_score
             FROM receipt_uploads r
             LEFT JOIN receipt_ocr_results o ON r.id = o.receipt_id
             WHERE r.user_id = $1
             ORDER BY r.created_at DESC
             LIMIT 50`,
            [req.user.id]
        );

        res.json({
            count: result.rows.length,
            receipts: result.rows.map(r => ({
                id: r.id,
                filename: r.original_filename,
                status: r.upload_status,
                createdAt: r.created_at,
                processedAt: r.processed_at,
                faceValueCents: r.face_value_cents,
                section: r.section,
                vendor: r.vendor,
                confidence: r.confidence_score ? parseFloat(r.confidence_score) : null
            }))
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Process receipt async (for background processing)
 */
async function processReceiptAsync(receiptId, buffer, mimeType) {
    try {
        await db.query(
            "UPDATE receipt_uploads SET upload_status = 'processing' WHERE id = $1",
            [receiptId]
        );

        const ocrResult = await ocrService.processReceipt(buffer, mimeType);

        if (ocrResult.success) {
            const ocrData = ocrService.formatForDatabase(ocrResult.data, ocrResult.rawText);

            await db.query(
                `INSERT INTO receipt_ocr_results (
                    receipt_id, vendor, event_name, section, row_name, seat_numbers,
                    face_value_cents, fees_cents, total_cents, quantity,
                    raw_text, confidence_score, extraction_method
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [
                    receiptId,
                    ocrData.vendor,
                    ocrData.eventName,
                    ocrData.section,
                    ocrData.rowName,
                    ocrData.seatNumbers,
                    ocrData.faceValueCents,
                    ocrData.feesCents,
                    ocrData.totalCents,
                    ocrData.quantity,
                    ocrData.rawText,
                    ocrData.confidenceScore,
                    ocrData.extractionMethod
                ]
            );

            await db.query(
                "UPDATE receipt_uploads SET upload_status = 'completed', processed_at = NOW() WHERE id = $1",
                [receiptId]
            );
        } else {
            await db.query(
                "UPDATE receipt_uploads SET upload_status = 'failed', processed_at = NOW() WHERE id = $1",
                [receiptId]
            );
        }
    } catch (err) {
        console.error('[Receipts] Async processing error:', err);
        await db.query(
            "UPDATE receipt_uploads SET upload_status = 'failed', processed_at = NOW() WHERE id = $1",
            [receiptId]
        );
    }
}

export default router;
