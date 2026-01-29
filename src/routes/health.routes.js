import { Router } from 'express';
import pool from '../db/index.js';

const router = Router();

/**
 * GET /health
 * Basic health check - returns server status
 */
router.get('/', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: Math.floor(process.uptime())
    });
});

/**
 * GET /health/db
 * Database connectivity check
 */
router.get('/db', async (req, res) => {
    try {
        const startTime = Date.now();
        await pool.query('SELECT 1');
        const latency = Date.now() - startTime;

        res.json({
            status: 'healthy',
            database: 'connected',
            latency_ms: latency
        });
    } catch (error) {
        console.error('Database health check failed:', error.message);
        res.status(503).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: error.message
        });
    }
});

/**
 * GET /health/ready
 * Readiness probe - checks if app is ready to serve traffic
 */
router.get('/ready', async (req, res) => {
    try {
        // Check database
        await pool.query('SELECT 1');

        // Check required environment variables
        const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
        const missingVars = requiredEnvVars.filter(v => !process.env[v]);

        if (missingVars.length > 0) {
            return res.status(503).json({
                status: 'not_ready',
                reason: 'missing_env_vars',
                missing: missingVars
            });
        }

        res.json({
            status: 'ready',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'not_ready',
            reason: 'database_unavailable',
            error: error.message
        });
    }
});

export default router;
