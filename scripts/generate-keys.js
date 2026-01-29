/**
 * Generate Ed25519 keypair for Auth-Badge signing
 *
 * Run with: npm run generate-keys
 *
 * This generates a new Ed25519 keypair and outputs them in Base64 format
 * for use in your .env file. Keep the private key secret!
 */

import * as ed from '@noble/ed25519';
import crypto from 'crypto';

// Enable synchronous methods in @noble/ed25519
ed.etc.sha512Sync = (...m) => {
    const hash = crypto.createHash('sha512');
    m.forEach(msg => hash.update(msg));
    return hash.digest();
};

async function generateKeys() {
    // Generate a random 32-byte private key
    const privateKey = ed.utils.randomPrivateKey();

    // Derive the public key from the private key
    const publicKey = await ed.getPublicKeyAsync(privateKey);

    // Convert to Base64 for easy storage in .env
    const privateKeyBase64 = Buffer.from(privateKey).toString('base64');
    const publicKeyBase64 = Buffer.from(publicKey).toString('base64');

    // Generate a key ID (first 8 bytes of public key hash, hex encoded)
    const keyIdHash = crypto.createHash('sha256').update(publicKey).digest();
    const keyId = keyIdHash.subarray(0, 8).toString('hex');

    console.log('\n=== TrustBridge Ed25519 Keypair ===\n');
    console.log('Add these to your .env file:\n');
    console.log(`ED25519_PRIVATE_KEY=${privateKeyBase64}`);
    console.log(`ED25519_PUBLIC_KEY=${publicKeyBase64}`);
    console.log(`\nPublic Key ID: ${keyId}`);
    console.log('\n⚠️  Keep your private key secret! Never commit it to version control.');
    console.log('⚠️  Store a backup in a secure location.\n');
}

generateKeys().catch(console.error);
