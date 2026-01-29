/**
 * TrustBridge API Server
 *
 * Entry point for the application.
 */

import app from './src/app.js';
import config from './src/config/index.js';
import cryptoService from './src/services/crypto.service.js';
import db from './src/db/index.js';

async function start() {
    try {
        // Initialize cryptographic keys
        cryptoService.initializeKeys();

        // Test database connection
        await db.query('SELECT 1');
        console.log('Database connected');

        // Start server
        app.listen(config.port, () => {
            console.log(`\nTrustBridge API running on http://localhost:${config.port}`);
            console.log(`Environment: ${config.nodeEnv}`);
            console.log('\nEndpoints:');
            console.log(`  Health:     GET  http://localhost:${config.port}/api/health`);
            console.log(`  Register:   POST http://localhost:${config.port}/api/auth/register`);
            console.log(`  Login:      POST http://localhost:${config.port}/api/auth/login`);
            console.log(`  Score:      GET  http://localhost:${config.port}/api/user/score`);
            console.log(`  Badge:      POST http://localhost:${config.port}/api/badges/generate`);
            console.log(`  Verify:     POST http://localhost:${config.port}/api/badges/verify`);
        });
    } catch (err) {
        console.error('Failed to start server:', err.message);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await db.closePool();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nShutting down...');
    await db.closePool();
    process.exit(0);
});

start();
