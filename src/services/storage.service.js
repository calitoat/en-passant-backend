/**
 * Storage Service
 *
 * Handles file uploads to AWS S3.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import config from '../config/index.js';

// Initialize S3 client
const s3Client = new S3Client({
    region: config.aws?.region || 'us-east-1',
    credentials: config.aws?.accessKeyId ? {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey
    } : undefined
});

const BUCKET_NAME = config.aws?.s3Bucket || 'enpassant-receipts';

/**
 * Upload a receipt file to S3
 *
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Original filename
 * @param {string} mimeType - MIME type
 * @param {string} userId - User ID for organization
 * @returns {Promise<Object>} Upload result with key and hash
 */
export async function uploadReceipt(buffer, filename, mimeType, userId) {
    // Generate SHA256 hash for duplicate detection
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Generate unique S3 key
    const timestamp = Date.now();
    const ext = filename.split('.').pop() || 'jpg';
    const key = `receipts/${userId}/${timestamp}-${fileHash.substring(0, 8)}.${ext}`;

    // Upload to S3
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        Metadata: {
            userId,
            originalFilename: filename,
            uploadedAt: new Date().toISOString()
        }
    });

    try {
        await s3Client.send(command);

        return {
            key,
            fileHash,
            bucket: BUCKET_NAME,
            size: buffer.length,
            mimeType
        };
    } catch (err) {
        // If S3 is not configured, use mock storage for development
        if (config.isDevelopment && (err.name === 'CredentialsProviderError' || err.message?.includes('credentials'))) {
            console.log('[Storage] S3 not configured, using mock storage');
            return {
                key: `mock/${key}`,
                fileHash,
                bucket: 'mock',
                size: buffer.length,
                mimeType,
                mock: true
            };
        }
        throw err;
    }
}

/**
 * Get a signed URL for accessing a receipt
 *
 * @param {string} key - S3 object key
 * @param {number} expiresIn - URL expiration in seconds (default: 1 hour)
 * @returns {Promise<string>} Signed URL
 */
export async function getReceiptUrl(key, expiresIn = 3600) {
    // Handle mock storage
    if (key.startsWith('mock/')) {
        return `https://mock-storage.local/${key}`;
    }

    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
    });

    try {
        const url = await getSignedUrl(s3Client, command, { expiresIn });
        return url;
    } catch (err) {
        if (config.isDevelopment) {
            console.log('[Storage] Could not generate signed URL, using placeholder');
            return `https://placeholder.local/${key}`;
        }
        throw err;
    }
}

/**
 * Delete a receipt from S3
 *
 * @param {string} key - S3 object key
 * @returns {Promise<boolean>} Success status
 */
export async function deleteReceipt(key) {
    // Handle mock storage
    if (key.startsWith('mock/')) {
        return true;
    }

    const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
    });

    try {
        await s3Client.send(command);
        return true;
    } catch (err) {
        console.error('[Storage] Delete error:', err.message);
        return false;
    }
}

/**
 * Get receipt file as buffer (for OCR processing)
 *
 * @param {string} key - S3 object key
 * @returns {Promise<Buffer>} File buffer
 */
export async function getReceiptBuffer(key) {
    // Handle mock storage
    if (key.startsWith('mock/')) {
        throw new Error('Cannot retrieve mock storage files');
    }

    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
    });

    const response = await s3Client.send(command);
    const chunks = [];

    for await (const chunk of response.Body) {
        chunks.push(chunk);
    }

    return Buffer.concat(chunks);
}

export default {
    uploadReceipt,
    getReceiptUrl,
    deleteReceipt,
    getReceiptBuffer
};
