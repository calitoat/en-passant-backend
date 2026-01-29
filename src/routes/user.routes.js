/**
 * User Routes
 *
 * GET /api/user/me - Get current user profile
 * GET /api/user/score - Get trust score with breakdown
 */

import { Router } from 'express';
import authService from '../services/auth.service.js';
import identityService from '../services/identity.service.js';
import trustScoreService from '../services/trustScore.service.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/user/me
 * Get current user profile
 */
router.get('/me', async (req, res, next) => {
    try {
        const user = await authService.getUserById(req.user.id);

        if (!user) {
            return res.status(404).json({
                error: 'not_found',
                message: 'User not found'
            });
        }

        res.json({ user });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/user/score
 * Get current trust score with detailed breakdown
 */
router.get('/score', async (req, res, next) => {
    try {
        // Get user's identity anchors
        const anchors = await identityService.getAnchors(req.user.id);

        // Calculate trust score
        const { score, breakdown, eduVerified } = trustScoreService.calculateTrustScore(anchors);

        res.json({
            trust_score: score,
            breakdown,
            edu_verified: eduVerified,
            anchors_connected: anchors.length,
            scoring_weights: trustScoreService.getScoringWeights()
        });
    } catch (err) {
        next(err);
    }
});

export default router;
