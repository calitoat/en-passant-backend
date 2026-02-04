/**
 * Invite Routes
 *
 * Beta invite system endpoints:
 * POST /api/invites/validate - Check if an invite code is valid
 * POST /api/invites/redeem - Redeem an invite code (usually done during registration)
 * GET /api/invites/my-codes - Get user's shareable invite codes
 * GET /api/invites/beta-status - Check user's beta access status
 * POST /api/invites/generate-qr - Admin: Generate QR invite codes
 * GET /api/invites/qr-stats - Admin: Get QR code usage stats
 */

import { Router } from 'express';
import inviteService from '../services/invite.service.js';
import { authenticate } from '../middleware/authenticate.js';
import config from '../config/index.js';

const router = Router();

/**
 * POST /api/invites/validate
 * Check if an invite code is valid (without redeeming)
 * Public endpoint - used before registration
 */
router.post('/validate', async (req, res, next) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({
                error: 'missing_code',
                message: 'Invite code is required'
            });
        }

        const result = await inviteService.validateCode(code);

        if (result.valid) {
            res.json({
                valid: true,
                type: result.type,
                message: 'Code is valid! You can use this to join the beta.'
            });
        } else {
            res.status(400).json({
                valid: false,
                error: result.error
            });
        }
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/invites/redeem
 * Redeem an invite code for the authenticated user
 * Used if user registered without a code and wants to add one later
 */
router.post('/redeem', authenticate, async (req, res, next) => {
    try {
        const { code } = req.body;
        const userId = req.user.id;

        if (!code) {
            return res.status(400).json({
                error: 'missing_code',
                message: 'Invite code is required'
            });
        }

        // Check if user already has beta access
        const status = await inviteService.getBetaStatus(userId);
        if (status.hasBetaAccess) {
            return res.status(400).json({
                error: 'already_has_access',
                message: 'You already have beta access'
            });
        }

        const result = await inviteService.redeemCode(code, userId);

        if (result.success) {
            res.json({
                success: true,
                message: 'Welcome to the En Passant beta!',
                inviteCodes: result.inviteCodes,
                inviteType: result.type
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/invites/my-codes
 * Get the authenticated user's shareable invite codes
 */
router.get('/my-codes', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const codes = await inviteService.getUserInvites(userId);

        // Build shareable URLs
        const codesWithUrls = codes.map(code => ({
            ...code,
            shareUrl: `${config.frontendUrl}/join?code=${code.code}`,
            isAvailable: !code.is_used
        }));

        res.json({
            codes: codesWithUrls,
            totalCodes: codes.length,
            availableCodes: codes.filter(c => !c.is_used).length,
            usedCodes: codes.filter(c => c.is_used).length
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/invites/beta-status
 * Check the authenticated user's beta access status
 */
router.get('/beta-status', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const status = await inviteService.getBetaStatus(userId);

        res.json({
            hasBetaAccess: status.hasBetaAccess,
            invitesRemaining: status.invitesRemaining,
            invitedByCode: status.invitedByCode,
            message: status.hasBetaAccess
                ? 'You have full beta access!'
                : 'You are on the waitlist. Enter an invite code to get access.'
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/invites/generate-qr
 * Admin endpoint: Generate QR invite codes for guerrilla marketing
 *
 * Body:
 * - count: number of codes to generate (default 10, max 100)
 * - source: source identifier (e.g., "qr-superbowl-venue")
 * - expiresAt: optional expiration date
 */
router.post('/generate-qr', authenticate, async (req, res, next) => {
    try {
        // TODO: Add proper admin role check
        // For now, restrict to specific admin emails
        const adminEmails = ['ivan@enpassantapi.io', 'admin@enpassantapi.io'];
        if (!adminEmails.includes(req.user.email)) {
            return res.status(403).json({
                error: 'forbidden',
                message: 'Admin access required'
            });
        }

        const { count = 10, source, expiresAt } = req.body;

        if (!source) {
            return res.status(400).json({
                error: 'missing_source',
                message: 'Source identifier is required (e.g., "qr-superbowl-venue")'
            });
        }

        if (count > 100) {
            return res.status(400).json({
                error: 'too_many_codes',
                message: 'Maximum 100 codes per request'
            });
        }

        const codes = await inviteService.generateQRCodes(
            count,
            source,
            expiresAt ? new Date(expiresAt) : null
        );

        // Generate URLs for the codes
        const codesWithUrls = codes.map(code => ({
            code,
            url: `${config.frontendUrl}/join?code=${code}&source=${encodeURIComponent(source)}`
        }));

        res.json({
            success: true,
            count: codes.length,
            source,
            codes: codesWithUrls
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/invites/qr-stats
 * Admin endpoint: Get QR code usage statistics
 */
router.get('/qr-stats', authenticate, async (req, res, next) => {
    try {
        // TODO: Add proper admin role check
        const adminEmails = ['ivan@enpassantapi.io', 'admin@enpassantapi.io'];
        if (!adminEmails.includes(req.user.email)) {
            return res.status(403).json({
                error: 'forbidden',
                message: 'Admin access required'
            });
        }

        const { source } = req.query;
        const stats = await inviteService.getQRCodeStats(source || null);

        // Calculate totals
        const totals = stats.reduce(
            (acc, row) => ({
                total: acc.total + parseInt(row.total),
                used: acc.used + parseInt(row.used),
                available: acc.available + parseInt(row.available)
            }),
            { total: 0, used: 0, available: 0 }
        );

        res.json({
            bySource: stats,
            totals,
            conversionRate: totals.total > 0
                ? ((totals.used / totals.total) * 100).toFixed(1) + '%'
                : '0%'
        });
    } catch (err) {
        next(err);
    }
});

export default router;
