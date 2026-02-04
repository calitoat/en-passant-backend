/**
 * Listings Routes
 *
 * POST /api/listings - Create listing (auth required)
 * GET /api/listings - Browse listings (public)
 * GET /api/listings/:id - Get single listing
 * PUT /api/listings/:id - Update listing (auth required)
 * POST /api/listings/:id/flag - Flag listing (auth required)
 * POST /api/listings/:id/sold - Mark as sold (auth required)
 */

import { Router } from 'express';
import listingService from '../services/listing.service.js';
import priceValidationService from '../services/priceValidation.service.js';
import { authenticate, optionalAuth } from '../middleware/authenticate.js';
import { requireFields } from '../middleware/validate.js';

const router = Router();

/**
 * POST /api/listings
 * Create a new ticket listing
 */
router.post('/', authenticate, requireFields('eventId', 'eventName', 'eventDate', 'section', 'askingPriceCents'), async (req, res, next) => {
    try {
        const {
            eventId,
            eventName,
            eventDate,
            venueName,
            section,
            rowName,
            seatNumbers,
            quantity,
            askingPriceCents,
            receiptId
        } = req.body;

        // Validate price against ceiling/receipt
        const validation = await priceValidationService.validateListingPrice(
            eventId,
            section,
            askingPriceCents,
            receiptId
        );

        // Determine verification status based on validation result
        let verificationStatus;
        let verificationMethod = validation.verificationMethod;
        let faceValueCents = validation.verifiedFaceValue || validation.ceilingPrice;

        if (validation.result === 'approved') {
            verificationStatus = 'verified';
        } else if (validation.result === 'manual_review') {
            verificationStatus = 'manual_review';
        } else {
            verificationStatus = 'rejected';
        }

        // If rejected, don't create the listing
        if (verificationStatus === 'rejected') {
            return res.status(400).json({
                error: 'price_exceeds_maximum',
                message: validation.reason,
                maxAllowedPrice: faceValueCents,
                askingPrice: askingPriceCents,
                percentageOverFaceValue: validation.percentageOfFaceValue - 100
            });
        }

        // Create the listing
        const listing = await listingService.createListing(req.user.id, {
            eventId,
            eventName,
            eventDate,
            venueName,
            section,
            rowName,
            seatNumbers,
            quantity,
            askingPriceCents,
            faceValueCents,
            receiptId,
            verificationStatus,
            verificationMethod
        });

        // Create verification record
        if (validation.verificationMethod) {
            await priceValidationService.createPriceVerification({
                listingId: listing.id,
                receiptId,
                ocrResultId: validation.ocrResultId,
                ceilingId: null, // Could look this up if needed
                askingPriceCents,
                verifiedFaceValueCents: validation.verifiedFaceValue,
                ceilingPriceCents: validation.ceilingPrice,
                verificationResult: validation.result,
                rejectionReason: validation.result === 'rejected' ? validation.reason : null,
                riskScore: 0,
                fraudSignals: []
            });
        }

        res.status(201).json({
            message: 'Listing created successfully',
            listing,
            verification: {
                status: verificationStatus,
                method: verificationMethod,
                faceValue: faceValueCents,
                message: validation.reason
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/listings
 * Browse listings (public)
 */
router.get('/', async (req, res, next) => {
    try {
        const {
            eventId,
            section,
            minPrice,
            maxPrice,
            verifiedOnly,
            limit,
            offset,
            sortBy,
            sortOrder
        } = req.query;

        const listings = await listingService.getListings({
            eventId,
            section,
            minPrice: minPrice ? parseInt(minPrice) : undefined,
            maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
            verifiedOnly: verifiedOnly !== 'false',
            limit: limit ? parseInt(limit) : 50,
            offset: offset ? parseInt(offset) : 0,
            sortBy,
            sortOrder
        });

        res.json({
            count: listings.length,
            listings
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/listings/my
 * Get current user's listings
 */
router.get('/my', authenticate, async (req, res, next) => {
    try {
        const listings = await listingService.getUserListings(req.user.id);

        res.json({
            count: listings.length,
            listings
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/listings/:id
 * Get a single listing
 */
router.get('/:id', async (req, res, next) => {
    try {
        const listing = await listingService.getListing(req.params.id);

        if (!listing) {
            return res.status(404).json({
                error: 'not_found',
                message: 'Listing not found'
            });
        }

        res.json(listing);
    } catch (err) {
        next(err);
    }
});

/**
 * PUT /api/listings/:id
 * Update a listing (owner only)
 */
router.put('/:id', authenticate, async (req, res, next) => {
    try {
        const { section, rowName, seatNumbers, askingPriceCents, isActive } = req.body;

        // If price is being updated, validate it
        if (askingPriceCents !== undefined) {
            const listing = await listingService.getListing(req.params.id);
            if (!listing) {
                return res.status(404).json({
                    error: 'not_found',
                    message: 'Listing not found'
                });
            }

            const validation = await priceValidationService.validateListingPrice(
                listing.eventId,
                section || listing.section,
                askingPriceCents,
                listing.receiptId
            );

            if (validation.result === 'rejected') {
                return res.status(400).json({
                    error: 'price_exceeds_maximum',
                    message: validation.reason,
                    maxAllowedPrice: validation.verifiedFaceValue || validation.ceilingPrice
                });
            }
        }

        const updated = await listingService.updateListing(
            req.params.id,
            req.user.id,
            { section, rowName, seatNumbers, askingPriceCents, isActive }
        );

        res.json({
            message: 'Listing updated successfully',
            listing: updated
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/listings/:id/flag
 * Flag a listing (auth required)
 */
router.post('/:id/flag', authenticate, requireFields('reason'), async (req, res, next) => {
    try {
        const { reason, description } = req.body;

        const flag = await listingService.flagListing(
            req.params.id,
            req.user.id,
            reason,
            description
        );

        res.status(201).json({
            message: 'Listing flagged successfully',
            flag
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/listings/:id/sold
 * Mark listing as sold (owner only)
 */
router.post('/:id/sold', authenticate, async (req, res, next) => {
    try {
        const listing = await listingService.markAsSold(req.params.id, req.user.id);

        res.json({
            message: 'Listing marked as sold',
            listing
        });
    } catch (err) {
        next(err);
    }
});

export default router;
