/**
 * QR Code Batch Generator for En Passant Guerrilla Campaign
 *
 * Generates QR invite codes in the database, creates PNG images,
 * and outputs a CSV manifest for poster printing.
 *
 * Usage: node scripts/generate-qr-codes.js
 */

import dotenv from 'dotenv';
import pg from 'pg';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'https://enpassantapi.io';
const OUTPUT_DIR = path.join(__dirname, '..', 'qr-codes');

// ── Batch Definitions ──────────────────────────────────────────
const BATCHES = [
    { count: 100, source: 'qr-superbowl-entrance', vertical: 'tickets' },
    { count: 100, source: 'qr-superbowl-parking',  vertical: 'tickets' },
    { count: 50,  source: 'qr-soma-laundromat',     vertical: 'apartments' },
    { count: 50,  source: 'qr-marina-coffee',        vertical: 'dating' },
    { count: 50,  source: 'qr-stanford-campus',      vertical: 'jobs' },
    { count: 50,  source: 'qr-wework-sf',            vertical: 'freelance' },
];

// Expiry: 30 days from now
const EXPIRES_AT = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

// ── Code Generation ────────────────────────────────────────────
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode() {
    let code = 'EP-';
    for (let i = 0; i < 5; i++) {
        code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }
    code += '-';
    for (let i = 0; i < 5; i++) {
        code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }
    return code;
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('ERROR: DATABASE_URL not set. Check your .env file.');
        process.exit(1);
    }

    const pool = new pg.Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
    });

    console.log('Connected to database.');
    console.log(`Output directory: ${OUTPUT_DIR}\n`);

    // Create output directories
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const manifest = [];
    let totalGenerated = 0;

    for (const batch of BATCHES) {
        const batchDir = path.join(OUTPUT_DIR, batch.source);
        if (!fs.existsSync(batchDir)) {
            fs.mkdirSync(batchDir, { recursive: true });
        }

        console.log(`\n── ${batch.source} (${batch.count} codes, /${batch.vertical}) ──`);

        for (let i = 0; i < batch.count; i++) {
            const code = generateCode();

            // Insert into database
            await pool.query(
                `INSERT INTO invite_codes (code, type, source, expires_at)
                 VALUES ($1, 'qr', $2, $3)
                 ON CONFLICT (code) DO NOTHING`,
                [code, batch.source, EXPIRES_AT]
            );

            // Build the landing URL
            const url = `${BASE_URL}/${batch.vertical}?code=${code}&source=${encodeURIComponent(batch.source)}`;

            // Generate QR image
            const filename = `${code}.png`;
            const filepath = path.join(batchDir, filename);

            await QRCode.toFile(filepath, url, {
                width: 400,
                margin: 2,
                color: { dark: '#000000', light: '#FFFFFF' },
                errorCorrectionLevel: 'H',
            });

            manifest.push({
                code,
                source: batch.source,
                vertical: batch.vertical,
                url,
                file: path.relative(OUTPUT_DIR, filepath),
            });

            totalGenerated++;

            // Progress indicator every 25 codes
            if ((i + 1) % 25 === 0) {
                console.log(`  ${i + 1}/${batch.count} generated`);
            }
        }

        console.log(`  Done: ${batch.count} codes`);
    }

    // ── Write CSV manifest ─────────────────────────────────────
    const csvHeader = 'code,source,vertical,url,file';
    const csvRows = manifest.map(
        m => `${m.code},${m.source},${m.vertical},${m.url},${m.file}`
    );
    const csv = [csvHeader, ...csvRows].join('\n');
    const csvPath = path.join(OUTPUT_DIR, 'manifest.csv');
    fs.writeFileSync(csvPath, csv);

    // ── Summary ────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════');
    console.log('  QR Code Generation Complete');
    console.log('══════════════════════════════════════════');
    console.log(`  Total codes generated: ${totalGenerated}`);
    console.log(`  Manifest: ${csvPath}`);
    console.log(`  Expiry: ${EXPIRES_AT.toISOString()}`);
    console.log('');
    console.log('  Batches:');
    for (const batch of BATCHES) {
        console.log(`    ${batch.source.padEnd(28)} ${batch.count} codes → /${batch.vertical}`);
    }
    console.log('══════════════════════════════════════════\n');

    await pool.end();
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
