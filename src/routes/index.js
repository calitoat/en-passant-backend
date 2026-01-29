/**
 * Route Aggregator
 *
 * Combines all route modules and mounts them at their respective paths.
 */

import { Router } from 'express';
import authRoutes from './auth.routes.js';
import identityRoutes from './identity.routes.js';
import userRoutes from './user.routes.js';
import badgeRoutes from './badge.routes.js';
import waitlistRoutes from './waitlist.routes.js';
import verifyRoutes from './verify.routes.js';
import db from '../db/index.js';
import config from '../config/index.js';
import { ALLOWED_ORIGINS } from '../config/cors.js';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/identity', identityRoutes);
router.use('/user', userRoutes);
router.use('/badges', badgeRoutes);
router.use('/waitlist', waitlistRoutes);
router.use('/verify', verifyRoutes);

// Enhanced health check endpoint
router.get('/health', async (req, res) => {
    const timestamp = new Date().toISOString();
    const requestOrigin = req.get('origin') || 'none';

    // Check database connectivity
    let dbStatus = 'unknown';
    let dbLatency = null;
    try {
        const dbStart = Date.now();
        await db.query('SELECT 1');
        dbLatency = Date.now() - dbStart;
        dbStatus = 'connected';
    } catch (err) {
        dbStatus = `error: ${err.message}`;
    }

    res.json({
        status: 'healthy',
        timestamp,
        environment: config.nodeEnv,
        version: '1.0.0',
        request: {
            origin: requestOrigin,
            ip: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('user-agent')
        },
        cors: {
            allowedOrigins: ALLOWED_ORIGINS,
            chromeExtensions: 'chrome-extension://* (all)',
            zillowSubdomains: '*.zillow.com',
            nullOrigin: 'allowed (iframes, file://, redirects)',
            developmentMode: config.isDevelopment ? 'all origins allowed' : 'restricted'
        },
        database: {
            status: dbStatus,
            latencyMs: dbLatency
        },
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                googleOAuth: 'GET /api/auth/google'
            },
            badges: {
                generate: 'POST /api/badges/generate (auth required)',
                verify: 'POST /api/badges/verify (public)',
                list: 'GET /api/badges (auth required)',
                publicKey: 'GET /api/badges/public-key (public)'
            },
            user: {
                score: 'GET /api/user/score (auth required)',
                profile: 'GET /api/user/profile (auth required)'
            },
            verify: {
                publicProfile: 'GET /api/verify/:username (public)'
            }
        }
    });
});

export default router;
