/**
 * Cryptographic operations for Auth-Badge signing and verification
 *
 * Uses Ed25519 (via @noble/ed25519) for digital signatures.
 * Ed25519 provides:
 * - 128-bit security level
 * - Fast signing and verification
 * - Small signatures (64 bytes)
 * - Deterministic signatures (same input always produces same signature)
 */

import * as ed from '@noble/ed25519';
import crypto from 'crypto';
import config from '../config/index.js';

// Enable synchronous SHA-512 for @noble/ed25519
ed.etc.sha512Sync = (...m) => {
    const hash = crypto.createHash('sha512');
    m.forEach(msg => hash.update(msg));
    return hash.digest();
};

// Load keys from config (Base64 encoded)
let privateKey = null;
let publicKey = null;
let publicKeyId = null;

/**
 * Initialize cryptographic keys from environment
 * Called once at startup
 */
export function initializeKeys() {
    try {
        privateKey = Buffer.from(config.ed25519PrivateKey, 'base64');
        publicKey = Buffer.from(config.ed25519PublicKey, 'base64');

        // Generate key ID: first 8 bytes of SHA-256(publicKey), hex encoded
        const keyIdHash = crypto.createHash('sha256').update(publicKey).digest();
        publicKeyId = keyIdHash.subarray(0, 8).toString('hex');

        console.log(`Crypto service initialized. Public Key ID: ${publicKeyId}`);
    } catch (err) {
        throw new Error(`Failed to initialize crypto keys: ${err.message}`);
    }
}

/**
 * Get the public key ID (for badge verification lookups)
 */
export function getPublicKeyId() {
    if (!publicKeyId) {
        throw new Error('Crypto service not initialized');
    }
    return publicKeyId;
}

/**
 * Get the public key in Base64 format (for sharing with verifiers)
 */
export function getPublicKeyBase64() {
    if (!publicKey) {
        throw new Error('Crypto service not initialized');
    }
    return Buffer.from(publicKey).toString('base64');
}

/**
 * Sign a badge payload
 *
 * @param {Object} payload - The badge data to sign
 * @returns {Promise<string>} Base64-encoded signature
 *
 * The payload is serialized to canonical JSON before signing to ensure
 * deterministic signatures regardless of object property order.
 */
export async function signBadge(payload) {
    if (!privateKey) {
        throw new Error('Crypto service not initialized');
    }

    // Canonical JSON: sorted keys, no whitespace
    const message = canonicalJSON(payload);
    const messageBytes = new TextEncoder().encode(message);

    // Sign with Ed25519
    const signature = await ed.signAsync(messageBytes, privateKey);

    return Buffer.from(signature).toString('base64');
}

/**
 * Verify a badge signature
 *
 * @param {Object} payload - The badge data that was signed
 * @param {string} signatureBase64 - Base64-encoded signature
 * @param {string} [publicKeyBase64] - Optional: use specific public key (for external verification)
 * @returns {Promise<boolean>} True if signature is valid
 */
export async function verifySignature(payload, signatureBase64, publicKeyBase64 = null) {
    const pubKey = publicKeyBase64
        ? Buffer.from(publicKeyBase64, 'base64')
        : publicKey;

    if (!pubKey) {
        throw new Error('No public key available for verification');
    }

    try {
        const message = canonicalJSON(payload);
        const messageBytes = new TextEncoder().encode(message);
        const signature = Buffer.from(signatureBase64, 'base64');

        return await ed.verifyAsync(signature, messageBytes, pubKey);
    } catch (err) {
        // Invalid signature format or verification failure
        console.error('Signature verification error:', err.message);
        return false;
    }
}

/**
 * Generate a secure random token for badge identification
 * @param {number} bytes - Number of random bytes (default 32 = 64 hex chars)
 * @returns {string} Hex-encoded random token
 */
export function generateBadgeToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Serialize object to canonical JSON (deterministic serialization)
 * Keys are sorted alphabetically at all levels
 */
function canonicalJSON(obj) {
    return JSON.stringify(obj, Object.keys(obj).sort());
}

export default {
    initializeKeys,
    getPublicKeyId,
    getPublicKeyBase64,
    signBadge,
    verifySignature,
    generateBadgeToken
};
