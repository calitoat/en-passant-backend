/**
 * Events Routes
 *
 * GET /api/events - List events with ticket exchange
 * GET /api/events/search - Search events
 * GET /api/events/:id - Get event with price ceilings
 * POST /api/events/:id/price-ceilings - Set price ceilings (admin)
 */

import { Router } from 'express';
import eventService from '../services/event.service.js';
import priceValidationService from '../services/priceValidation.service.js';
import listingService from '../services/listing.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireFields } from '../middleware/validate.js';

const router = Router();

/**
 * GET /api/events
 * List events with ticket exchange enabled
 */
router.get('/', async (req, res, next) => {
    try {
        const { category, upcoming, limit, offset } = req.query;

        const events = await eventService.getEvents({
            category,
            upcoming: upcoming !== 'false',
            limit: limit ? parseInt(limit) : 50,
            offset: offset ? parseInt(offset) : 0
        });

        res.json({
            count: events.length,
            events
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/events/search
 * Search events by name
 */
router.get('/search', async (req, res, next) => {
    try {
        const { q, limit } = req.query;

        if (!q || q.length < 2) {
            return res.status(400).json({
                error: 'invalid_query',
                message: 'Search query must be at least 2 characters'
            });
        }

        const events = await eventService.searchEvents(q, limit ? parseInt(limit) : 10);

        res.json({
            count: events.length,
            events
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/events/:id
 * Get event with price ceilings
 */
router.get('/:id', async (req, res, next) => {
    try {
        const event = await eventService.getEventWithCeilings(req.params.id);

        if (!event) {
            return res.status(404).json({
                error: 'not_found',
                message: 'Event not found'
            });
        }

        // Get listing stats for the event
        const stats = await listingService.getEventListingStats(req.params.id);

        res.json({
            ...event,
            listingStats: {
                totalListings: parseInt(stats.total_listings) || 0,
                verifiedListings: parseInt(stats.verified_listings) || 0,
                minPrice: stats.min_price ? parseInt(stats.min_price) : null,
                maxPrice: stats.max_price ? parseInt(stats.max_price) : null,
                avgPrice: stats.avg_price ? parseInt(stats.avg_price) : null,
                totalTickets: parseInt(stats.total_tickets) || 0
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/events
 * Create/update an event (admin only for now, could add auth later)
 */
router.post('/', authenticate, requireFields('id', 'name', 'date'), async (req, res, next) => {
    try {
        const event = await eventService.upsertEvent(req.body);

        res.status(201).json({
            message: 'Event created/updated successfully',
            event
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/events/:id/price-ceilings
 * Set price ceilings for an event (admin)
 */
router.post('/:id/price-ceilings', authenticate, requireFields('ceilings'), async (req, res, next) => {
    try {
        const { eventName, eventDate, venueName, ceilings, source } = req.body;

        if (!Array.isArray(ceilings) || ceilings.length === 0) {
            return res.status(400).json({
                error: 'invalid_ceilings',
                message: 'Ceilings must be a non-empty array'
            });
        }

        // Validate ceiling format
        for (const ceiling of ceilings) {
            if (!ceiling.sectionPattern || !ceiling.maxPriceCents) {
                return res.status(400).json({
                    error: 'invalid_ceiling_format',
                    message: 'Each ceiling must have sectionPattern and maxPriceCents'
                });
            }
        }

        const result = await priceValidationService.setPriceCeilings(
            req.params.id,
            eventName,
            eventDate,
            venueName,
            ceilings,
            source || 'manual'
        );

        res.status(201).json({
            message: 'Price ceilings set successfully',
            count: result.length,
            ceilings: result
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/events/:id/ceilings
 * Get price ceilings for an event
 */
router.get('/:id/ceilings', async (req, res, next) => {
    try {
        const ceilings = await priceValidationService.getEventPriceCeilings(req.params.id);

        res.json({
            eventId: req.params.id,
            count: ceilings.length,
            ceilings
        });
    } catch (err) {
        next(err);
    }
});

export default router;
