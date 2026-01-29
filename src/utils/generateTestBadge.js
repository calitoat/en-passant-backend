/**
 * Test Badge Generator Utility
 *
 * Generates a valid Ed25519 signed Auth-Badge for testing purposes.
 * Output can be copy-pasted to Chrome localStorage for extension testing.
 *
 * Usage: node src/utils/generateTestBadge.js
 */

import * as ed from '@noble/ed25519';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Enable synchronous SHA-512 for @noble/ed25519
ed.etc.sha512Sync = (...m) => {
    const hash = crypto.createHash('sha512');
    m.forEach(msg => hash.update(msg));
    return hash.digest();
};

/**
 * Serialize object to canonical JSON (deterministic serialization)
 * Keys are sorted alphabetically at all levels
 */
function canonicalJSON(obj) {
    return JSON.stringify(obj, Object.keys(obj).sort());
}

/**
 * Generate a secure random token
 */
function generateBadgeToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
}

async function generateTestBadge() {
    console.log('='.repeat(60));
    console.log('TrustBridge Test Badge Generator');
    console.log('='.repeat(60));
    console.log();

    // Load keys from environment
    const privateKeyBase64 = process.env.ED25519_PRIVATE_KEY;
    const publicKeyBase64 = process.env.ED25519_PUBLIC_KEY;

    if (!privateKeyBase64 || !publicKeyBase64) {
        console.error('ERROR: Missing ED25519 keys in environment.');
        console.error('Make sure .env file contains:');
        console.error('  ED25519_PRIVATE_KEY=<base64>');
        console.error('  ED25519_PUBLIC_KEY=<base64>');
        console.error('\nRun: npm run generate-keys to create new keys');
        process.exit(1);
    }

    const privateKey = Buffer.from(privateKeyBase64, 'base64');
    const publicKey = Buffer.from(publicKeyBase64, 'base64');

    // Generate key ID
    const keyIdHash = crypto.createHash('sha256').update(publicKey).digest();
    const publicKeyId = keyIdHash.subarray(0, 8).toString('hex');

    console.log('Keys loaded successfully');
    console.log(`Public Key ID: ${publicKeyId}`);
    console.log();

    // Generate badge data
    const badgeToken = generateBadgeToken();
    const testUserId = 'test-user-' + crypto.randomBytes(8).toString('hex');
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create badge payload with trust score 30 (base account only)
    // Real users get: base(30) + gmail(30) + linkedin(40) = 100 max
    const badgePayload = {
        sub: testUserId,
        iss: 'trustbridge',
        iat: Math.floor(issuedAt.getTime() / 1000),
        exp: Math.floor(expiresAt.getTime() / 1000),
        trust_score: 30,
        badge_token: badgeToken
    };

    console.log('Badge Payload:');
    console.log(JSON.stringify(badgePayload, null, 2));
    console.log();

    // Sign the payload
    const message = canonicalJSON(badgePayload);
    const messageBytes = new TextEncoder().encode(message);
    const signature = await ed.signAsync(messageBytes, privateKey);
    const signatureBase64 = Buffer.from(signature).toString('base64');

    // Verify the signature (sanity check)
    const isValid = await ed.verifyAsync(signature, messageBytes, publicKey);
    console.log(`Signature verified: ${isValid}`);
    console.log();

    // Create the full badge object for storage
    const fullBadge = {
        badge_token: badgeToken,
        payload: badgePayload,
        signature: signatureBase64,
        public_key_id: publicKeyId,
        issued_at: issuedAt.toISOString(),
        expires_at: expiresAt.toISOString()
    };

    console.log('='.repeat(60));
    console.log('STEP 1: Open Chrome DevTools on any page with the extension');
    console.log('STEP 2: Go to Console tab');
    console.log('STEP 3: Copy and paste this command:');
    console.log('='.repeat(60));
    console.log();
    console.log(`chrome.storage.local.set({ trustbridge_badge: ${JSON.stringify(fullBadge)} });`);
    console.log();
    console.log('='.repeat(60));
    console.log('ALTERNATIVE: Use the extension popup or background page console');
    console.log('='.repeat(60));
    console.log();
    console.log('// To verify it was saved:');
    console.log("chrome.storage.local.get('trustbridge_badge', console.log);");
    console.log();
    console.log('='.repeat(60));
    console.log('RAW BADGE JSON (for manual use):');
    console.log('='.repeat(60));
    console.log();
    console.log(JSON.stringify(fullBadge, null, 2));
    console.log();
    console.log('='.repeat(60));
    console.log('Badge Details:');
    console.log(`  Token:       ${badgeToken.substring(0, 16)}...`);
    console.log(`  User ID:     ${testUserId}`);
    console.log(`  Trust Score: 30 (base account)`);
    console.log(`  Issued:      ${issuedAt.toISOString()}`);
    console.log(`  Expires:     ${expiresAt.toISOString()}`);
    console.log('='.repeat(60));
    console.log();
    console.log('Scoring: Base(30) + Gmail(+30) + LinkedIn(+40) = 100 max');
    console.log('After setting the badge, refresh Zillow to see the verification badge!');
}

generateTestBadge().catch(err => {
    console.error('Failed to generate badge:', err);
    process.exit(1);
});
