/**
 * Badge Routes
 *
 * POST /api/badges/generate - Generate new Auth-Badge
 * POST /api/badges/verify - Verify badge (public endpoint)
 * POST /api/badges/revoke - Revoke a badge
 * GET /api/badges - List user's active badges
 * GET /api/badges/public-key - Get public key for verification
 */

import { Router } from 'express';
import badgeService from '../services/badge.service.js';
import { authenticate, optionalAuth } from '../middleware/authenticate.js';
import { requireFields } from '../middleware/validate.js';

const router = Router();

/**
 * POST /api/badges/generate
 * Generate a new Auth-Badge for the authenticated user
 */
router.post('/generate', authenticate, async (req, res, next) => {
    try {
        const badge = await badgeService.generateBadge(req.user.id);

        res.status(201).json({
            message: 'Auth-Badge generated successfully',
            badge
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/badges/verify
 * Verify an Auth-Badge (public endpoint - no auth required)
 *
 * This is the endpoint that platforms call to verify badges.
 */
router.post('/verify', requireFields('badge_token', 'payload', 'signature'), async (req, res, next) => {
    const timestamp = new Date().toISOString();
    const origin = req.get('origin') || req.get('referer') || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    console.log(`\n[${timestamp}] ===== BADGE VERIFICATION REQUEST =====`);
    console.log(`[${timestamp}] Origin: ${origin}`);
    console.log(`[${timestamp}] User-Agent: ${userAgent}`);
    console.log(`[${timestamp}] IP: ${req.ip || req.connection?.remoteAddress}`);

    try {
        const { badge_token, payload, signature } = req.body;

        console.log(`[${timestamp}] Badge Token: ${badge_token?.substring(0, 16)}...`);
        console.log(`[${timestamp}] Payload: ${JSON.stringify(payload)}`);
        console.log(`[${timestamp}] Signature: ${signature?.substring(0, 32)}...`);

        const result = await badgeService.verifyBadge(badge_token, payload, signature);

        console.log(`[${timestamp}] Verification Result: ${JSON.stringify(result)}`);
        console.log(`[${timestamp}] ===== END VERIFICATION =====\n`);

        res.json(result);
    } catch (err) {
        console.error(`[${timestamp}] Verification Error: ${err.message}`);
        console.error(`[${timestamp}] Stack: ${err.stack}`);
        console.log(`[${timestamp}] ===== END VERIFICATION (ERROR) =====\n`);
        next(err);
    }
});

/**
 * POST /api/badges/revoke
 * Revoke a badge (requires authentication)
 */
router.post('/revoke', authenticate, requireFields('badge_token'), async (req, res, next) => {
    try {
        const { badge_token, reason } = req.body;
        const revoked = await badgeService.revokeBadge(badge_token, reason);

        if (!revoked) {
            return res.status(404).json({
                error: 'not_found',
                message: 'Badge not found or already revoked'
            });
        }

        res.json({
            message: 'Badge revoked successfully'
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/badges
 * List user's active (non-expired, non-revoked) badges
 */
router.get('/', authenticate, async (req, res, next) => {
    try {
        const badges = await badgeService.getUserBadges(req.user.id);

        res.json({
            count: badges.length,
            badges
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/badges/public-key
 * Get the public key for external verification (public endpoint)
 *
 * External verifiers can use this to verify badge signatures offline.
 */
router.get('/public-key', (req, res) => {
    const keyInfo = badgeService.getPublicKey();

    res.json({
        message: 'Use this public key to verify Auth-Badge signatures',
        ...keyInfo
    });
});

export default router;
