/**
 * Identity Routes
 *
 * POST /api/identity/connect - Connect identity anchor
 * GET /api/identity/anchors - List connected anchors
 * DELETE /api/identity/:provider - Disconnect anchor
 * POST /api/identity/mock/:provider - Generate mock data (dev only)
 */

import { Router } from 'express';
import identityService from '../services/identity.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireFields } from '../middleware/validate.js';
import config from '../config/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/identity/connect
 * Connect an identity anchor (Gmail, LinkedIn)
 */
router.post('/connect', requireFields('provider', 'data'), async (req, res, next) => {
    try {
        const { provider, data } = req.body;
        const anchor = await identityService.connectAnchor(req.user.id, provider, data);

        res.status(201).json({
            message: `${provider} connected successfully`,
            anchor
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/identity/anchors
 * List all connected identity anchors
 */
router.get('/anchors', async (req, res, next) => {
    try {
        const anchors = await identityService.getAnchors(req.user.id);

        res.json({
            count: anchors.length,
            anchors
        });
    } catch (err) {
        next(err);
    }
});

/**
 * DELETE /api/identity/:provider
 * Disconnect an identity anchor
 */
router.delete('/:provider', async (req, res, next) => {
    try {
        const { provider } = req.params;
        const deleted = await identityService.disconnectAnchor(req.user.id, provider);

        if (!deleted) {
            return res.status(404).json({
                error: 'not_found',
                message: `No ${provider} anchor found`
            });
        }

        res.json({
            message: `${provider} disconnected successfully`
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/identity/mock/:provider
 * Generate and connect mock identity data (development only)
 */
router.post('/mock/:provider', async (req, res, next) => {
    if (config.isProduction) {
        return res.status(403).json({
            error: 'forbidden',
            message: 'Mock data not available in production'
        });
    }

    try {
        const { provider } = req.params;
        const options = req.body || {};

        // Generate mock data
        const mockData = identityService.generateMockData(provider, options);

        // Connect it
        const anchor = await identityService.connectAnchor(req.user.id, provider, mockData);

        res.status(201).json({
            message: `Mock ${provider} data connected`,
            mock_data: mockData,
            anchor
        });
    } catch (err) {
        next(err);
    }
});

export default router;
