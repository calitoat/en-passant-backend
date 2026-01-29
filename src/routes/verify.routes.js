/**
 * Public Verification Routes
 *
 * Provides public endpoints for verifying user identity.
 * These routes are accessible without authentication.
 */

import { Router } from 'express';
import db from '../db/index.js';
import trustScoreService from '../services/trustScore.service.js';

const router = Router();

/**
 * GET /api/verify/:username
 *
 * Public verification page data for a user.
 * Returns EP Score, clearance level, connected anchors, and Rank Guards.
 */
router.get('/:username', async (req, res) => {
    try {
        const { username } = req.params;

        // Find user by username or email (for backwards compatibility)
        const userResult = await db.query(
            `SELECT id, email, username, created_at
             FROM users
             WHERE username = $1 OR email = $1`,
            [username]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                valid: false,
                error: 'User not found'
            });
        }

        const user = userResult.rows[0];

        // Get identity anchors
        const anchorsResult = await db.query(
            `SELECT provider, connected_at, is_edu_verified, last_verified_at
             FROM identity_anchors
             WHERE user_id = $1`,
            [user.id]
        );

        // Calculate trust score
        const { score, clearance } = trustScoreService.calculateTrustScore(anchorsResult.rows);

        // Get active Rank Guards (badges)
        const badgesResult = await db.query(
            `SELECT badge_token, trust_score, vertical, issued_at, expires_at
             FROM auth_badges
             WHERE user_id = $1
               AND revoked_at IS NULL
               AND expires_at > NOW()
             ORDER BY issued_at DESC`,
            [user.id]
        );

        // Format anchors for response
        const anchors = {
            gmail: { verified: false },
            linkedin: { verified: false },
            edu: { verified: false }
        };

        for (const anchor of anchorsResult.rows) {
            if (anchor.provider === 'gmail') {
                anchors.gmail = {
                    verified: true,
                    verified_at: anchor.connected_at
                };
                if (anchor.is_edu_verified) {
                    anchors.edu = {
                        verified: true,
                        verified_at: anchor.last_verified_at || anchor.connected_at
                    };
                }
            } else if (anchor.provider === 'linkedin') {
                anchors.linkedin = {
                    verified: true,
                    verified_at: anchor.connected_at
                };
            }
        }

        // Format rank guards for response
        const rankGuards = badgesResult.rows.map(badge => ({
            type: badge.vertical || 'general',
            status: 'active',
            issued_at: badge.issued_at,
            expires_at: badge.expires_at
        }));

        // Increment view count for verification link if exists
        await db.query(
            `UPDATE verification_links
             SET view_count = view_count + 1
             WHERE user_id = $1 AND is_active = true`,
            [user.id]
        );

        res.json({
            valid: true,
            username: user.username || user.email.split('@')[0],
            verification: {
                ep_score: score,
                clearance: {
                    level: clearance.level,
                    title: clearance.title,
                    color: clearance.color
                },
                anchors,
                rank_guards: rankGuards,
                member_since: user.created_at,
                last_verified: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('[Verify Route] Error:', error);
        res.status(500).json({
            valid: false,
            error: 'Verification lookup failed'
        });
    }
});

export default router;
