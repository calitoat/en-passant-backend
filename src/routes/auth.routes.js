/**
 * Authentication Routes
 *
 * POST /api/auth/register - Register new user
 * POST /api/auth/login - Login and get JWT token
 * GET /api/auth/google - Initiate Google OAuth
 * GET /api/auth/google/callback - Google OAuth callback
 */

import { Router } from 'express';
import passport from 'passport';
import authService from '../services/auth.service.js';
import identityService from '../services/identity.service.js';
import inviteService from '../services/invite.service.js';
import { isEducationalEmail } from '../services/trustScore.service.js';
import { requireFields } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import config from '../config/index.js';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user account
 *
 * Body:
 * - email: required
 * - password: required
 * - inviteCode: optional - if valid, grants immediate beta access + 2 invite codes
 */
router.post('/register', requireFields('email', 'password'), async (req, res, next) => {
    try {
        const { email, password, inviteCode, attribution } = req.body;

        // If invite code provided, validate it first (before creating user)
        let inviteValidation = null;
        if (inviteCode) {
            inviteValidation = await inviteService.validateCode(inviteCode);
            if (!inviteValidation.valid) {
                return res.status(400).json({
                    error: 'invalid_invite_code',
                    message: inviteValidation.error
                });
            }
        }

        // Register the user
        const user = await authService.register(email, password);

        // Generate token for immediate use
        const token = authService.generateToken(user);

        // Store attribution data if provided
        if (attribution && user.id) {
            try {
                const db = (await import('../db/index.js')).default;
                await db.query(`
                    INSERT INTO user_attribution
                    (user_id, source, campaign, medium, content, landing_page, referrer)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (user_id) DO NOTHING
                `, [
                    user.id,
                    attribution.source || 'direct',
                    attribution.campaign || 'organic',
                    attribution.medium || 'web',
                    attribution.content || null,
                    attribution.landing_page || null,
                    attribution.referrer || null
                ]);
                console.log(`[SIGNUP] Email: ${email}, Source: ${attribution.source || 'direct'}, Campaign: ${attribution.campaign || 'organic'}`);
            } catch (attrErr) {
                // Don't fail registration over attribution tracking
                console.error('[SIGNUP] Attribution save failed:', attrErr.message);
            }
        }

        // If valid invite code was provided, redeem it
        let betaAccess = null;
        if (inviteCode && inviteValidation?.valid) {
            const redeemResult = await inviteService.redeemCode(inviteCode, user.id);
            if (redeemResult.success) {
                betaAccess = {
                    granted: true,
                    inviteCodes: redeemResult.inviteCodes,
                    inviteType: redeemResult.type,
                    source: redeemResult.source
                };
            }
        }

        res.status(201).json({
            message: betaAccess
                ? 'Welcome to the En Passant beta!'
                : 'User registered successfully. You are on the waitlist.',
            user,
            token,
            betaAccess
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', requireFields('email', 'password'), async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const { user, token } = await authService.login(email, password);

        res.json({
            message: 'Login successful',
            user,
            token
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 *
 * Query params:
 * - token: JWT token of logged-in user (to link Gmail to existing account)
 *
 * The token is stored in session so we can associate the Gmail
 * account with the correct user after OAuth completes.
 */
router.get('/google', (req, res, next) => {
    const { token } = req.query;

    console.log('[Google OAuth] Starting OAuth flow');
    console.log('[Google OAuth] Token from query:', token ? 'present' : 'missing');

    // Store JWT in session for use after OAuth callback
    if (token) {
        req.session.userToken = token;
        console.log('[Google OAuth] Stored token in session');
    }

    // CRITICAL: Save session BEFORE redirecting to OAuth provider
    req.session.save((err) => {
        if (err) {
            console.error('[Google OAuth] Session save error:', err);
            return res.redirect(`${config.frontendUrl}/dashboard?error=session_error`);
        }

        console.log('[Google OAuth] Session saved, redirecting to Google...');
        console.log('[Google OAuth] Session ID:', req.sessionID);

        // Pass token in state parameter so it survives session regeneration
        const state = token ? Buffer.from(JSON.stringify({ token })).toString('base64') : undefined;

        passport.authenticate('google', {
            scope: [
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/gmail.metadata'
            ],
            accessType: 'offline',
            prompt: 'consent',
            state: state
        })(req, res, next);
    });
});

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback
 *
 * After successful OAuth:
 * 1. If user has JWT token in session, link Gmail to their account
 * 2. Fetch Gmail metadata for trust scoring
 * 3. Redirect to frontend with success/error status
 */
router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: `${config.frontendUrl}/dashboard?error=connection_failed&provider=google`,
        session: true
    }),
    async (req, res) => {
        console.log('[Google OAuth] === CALLBACK ROUTE HIT ===');
        console.log('[Google OAuth] Session ID:', req.sessionID);
        console.log('[Google OAuth] Session contents:', JSON.stringify(req.session, null, 2));
        console.log('[Google OAuth] req.user exists?', !!req.user);

        try {
            const oauthData = req.user;

            // Try to get token from session first, then from state parameter
            let userToken = req.session.userToken;

            // If not in session, try to extract from state parameter (survives session regeneration)
            if (!userToken && req.query.state) {
                try {
                    const stateData = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
                    userToken = stateData.token;
                    console.log('[Google OAuth] Recovered token from state parameter');
                } catch (e) {
                    console.log('[Google OAuth] Could not parse state parameter');
                }
            }

            console.log('[Google OAuth] OAuth data:', {
                googleId: oauthData?.googleId,
                email: oauthData?.email,
                displayName: oauthData?.displayName
            });
            console.log('[Google OAuth] User token:', userToken ? 'present' : 'MISSING');

            // Clear the token from session
            delete req.session.userToken;

            if (!userToken) {
                console.log('[Google OAuth] No user token - redirecting to login');
                req.session.pendingOAuth = oauthData;
                return res.redirect(`${config.frontendUrl}/login?oauth=pending`);
            }

            // Verify the JWT and get user ID
            let userId;
            try {
                const decoded = authService.verifyToken(userToken);
                userId = decoded.userId;
                console.log('[Google OAuth] Verified user ID:', userId);
            } catch (err) {
                console.error('[Google OAuth] Token verification failed:', err.message);
                return res.redirect(`${config.frontendUrl}/auth/error?message=invalid_token`);
            }

            // Fetch Gmail metadata using the access token
            console.log('[Google OAuth] Fetching Gmail metadata...');
            const gmailMetadata = await identityService.fetchGmailMetadata(oauthData.accessToken);
            console.log('[Google OAuth] Gmail metadata:', gmailMetadata);

            // Check if email is from an educational institution
            const isEduEmail = isEducationalEmail(oauthData.email);
            console.log('[Google OAuth] Email:', oauthData.email, '| Is .edu:', isEduEmail);

            // Connect Gmail as identity anchor
            const anchorData = {
                providerId: oauthData.googleId,
                email: oauthData.email,
                accountCreatedAt: gmailMetadata.accountCreatedAt,
                isEduVerified: isEduEmail,
                metadata: {
                    email_verified: oauthData.emailVerified,
                    display_name: oauthData.displayName,
                    profile_photo: oauthData.profilePhoto,
                    email_count: gmailMetadata.totalEmails,
                    oldest_email_date: gmailMetadata.oldestEmailDate,
                    refresh_token: oauthData.refreshToken,
                    is_edu_email: isEduEmail
                }
            };

            console.log('[Google OAuth] Saving identity anchor...');
            const savedAnchor = await identityService.connectAnchor(userId, 'gmail', anchorData);
            console.log('[Google OAuth] Identity anchor saved:', savedAnchor?.id);

            // Redirect to dashboard with success
            console.log('[Google OAuth] SUCCESS - redirecting to dashboard');
            const redirectUrl = isEduEmail
                ? `${config.frontendUrl}/dashboard?connected=gmail&edu_bonus=true`
                : `${config.frontendUrl}/dashboard?connected=gmail`;
            res.redirect(redirectUrl);
        } catch (err) {
            console.error('[Google OAuth] Callback error:', err);
            console.error('[Google OAuth] Error stack:', err.stack);
            res.redirect(`${config.frontendUrl}/dashboard?error=connection_failed&provider=google`);
        }
    }
);

/**
 * POST /api/auth/google/link
 * Link pending OAuth to user account (alternative flow)
 *
 * Used when user started OAuth before logging in.
 */
router.post('/google/link', authenticate, async (req, res, next) => {
    try {
        const oauthData = req.session.pendingOAuth;

        if (!oauthData) {
            return res.status(400).json({
                error: 'no_pending_oauth',
                message: 'No pending OAuth data found. Please start the OAuth flow again.'
            });
        }

        // Clear pending OAuth
        delete req.session.pendingOAuth;

        // Fetch Gmail metadata
        const gmailMetadata = await identityService.fetchGmailMetadata(oauthData.accessToken);

        // Check if email is from an educational institution
        const isEduEmail = isEducationalEmail(oauthData.email);

        // Connect Gmail as identity anchor
        const anchorData = {
            providerId: oauthData.googleId,
            email: oauthData.email,
            accountCreatedAt: gmailMetadata.accountCreatedAt,
            isEduVerified: isEduEmail,
            metadata: {
                email_verified: oauthData.emailVerified,
                display_name: oauthData.displayName,
                profile_photo: oauthData.profilePhoto,
                email_count: gmailMetadata.totalEmails,
                oldest_email_date: gmailMetadata.oldestEmailDate,
                refresh_token: oauthData.refreshToken,
                is_edu_email: isEduEmail
            }
        };

        const anchor = await identityService.connectAnchor(req.user.id, 'gmail', anchorData);

        res.json({
            message: 'Gmail connected successfully',
            anchor
        });
    } catch (err) {
        next(err);
    }
});

// ============================================
// LinkedIn OAuth Routes
// ============================================

/**
 * GET /api/auth/linkedin
 * Initiate LinkedIn OAuth flow
 *
 * Query params:
 * - token: JWT token of logged-in user (to link LinkedIn to existing account)
 */
router.get('/linkedin', (req, res, next) => {
    const { token } = req.query;

    console.log('[LinkedIn OAuth] Starting OAuth flow');
    console.log('[LinkedIn OAuth] Token from query:', token ? 'present' : 'missing');

    // Store JWT in session for use after OAuth callback
    if (token) {
        req.session.userToken = token;
        console.log('[LinkedIn OAuth] Stored token in session');
    }

    // CRITICAL: Save session BEFORE redirecting to OAuth provider
    req.session.save((err) => {
        if (err) {
            console.error('[LinkedIn OAuth] Session save error:', err);
            return res.redirect(`${config.frontendUrl}/dashboard?error=session_error`);
        }

        console.log('[LinkedIn OAuth] Session saved, redirecting to LinkedIn...');
        console.log('[LinkedIn OAuth] Session ID:', req.sessionID);

        // Pass token in state parameter so it survives session regeneration
        // LinkedIn requires state, so we encode our token in it
        const state = token ? Buffer.from(JSON.stringify({ token })).toString('base64') : 'no_token';

        passport.authenticate('linkedin', { state: state })(req, res, next);
    });
});

/**
 * GET /api/auth/linkedin/callback
 * Handle LinkedIn OAuth callback
 */
router.get('/linkedin/callback',
    passport.authenticate('linkedin', {
        failureRedirect: `${config.frontendUrl}/dashboard?error=connection_failed&provider=linkedin`,
        session: true
    }),
    async (req, res) => {
        console.log('[LinkedIn OAuth] === CALLBACK ROUTE HIT ===');
        console.log('[LinkedIn OAuth] Session ID:', req.sessionID);
        console.log('[LinkedIn OAuth] Session contents:', JSON.stringify(req.session, null, 2));
        console.log('[LinkedIn OAuth] req.user exists?', !!req.user);

        try {
            const oauthData = req.user;

            // Try to get token from session first, then from state parameter
            let userToken = req.session.userToken;

            // If not in session, try to extract from state parameter (survives session regeneration)
            if (!userToken && req.query.state && req.query.state !== 'no_token') {
                try {
                    const stateData = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
                    userToken = stateData.token;
                    console.log('[LinkedIn OAuth] Recovered token from state parameter');
                } catch (e) {
                    console.log('[LinkedIn OAuth] Could not parse state parameter:', e.message);
                }
            }

            console.log('[LinkedIn OAuth] OAuth data:', {
                linkedinId: oauthData?.linkedinId,
                email: oauthData?.email,
                displayName: oauthData?.displayName
            });
            console.log('[LinkedIn OAuth] User token:', userToken ? 'present' : 'MISSING');

            // Clear the token from session
            delete req.session.userToken;

            if (!userToken) {
                console.log('[LinkedIn OAuth] No user token - redirecting to login');
                req.session.pendingLinkedInOAuth = oauthData;
                return res.redirect(`${config.frontendUrl}/login?oauth=pending-linkedin`);
            }

            // Verify the JWT and get user ID
            let userId;
            try {
                const decoded = authService.verifyToken(userToken);
                userId = decoded.userId;
                console.log('[LinkedIn OAuth] Verified user ID:', userId);
            } catch (err) {
                console.error('[LinkedIn OAuth] Token verification failed:', err.message);
                return res.redirect(`${config.frontendUrl}/auth/error?message=invalid_token`);
            }

            // Connect LinkedIn as identity anchor
            const anchorData = {
                providerId: oauthData.linkedinId,
                email: oauthData.email,
                metadata: {
                    display_name: oauthData.displayName,
                    profile_photo: oauthData.profilePhoto,
                    refresh_token: oauthData.refreshToken
                }
            };

            console.log('[LinkedIn OAuth] Saving identity anchor...');
            const savedAnchor = await identityService.connectAnchor(userId, 'linkedin', anchorData);
            console.log('[LinkedIn OAuth] Identity anchor saved:', savedAnchor?.id);

            // Redirect to dashboard with success
            console.log('[LinkedIn OAuth] SUCCESS - redirecting to dashboard');
            res.redirect(`${config.frontendUrl}/dashboard?connected=linkedin`);
        } catch (err) {
            console.error('[LinkedIn OAuth] Error in callback:', err);
            console.error('[LinkedIn OAuth] Error stack:', err.stack);
            res.redirect(`${config.frontendUrl}/dashboard?error=connection_failed&provider=linkedin`);
        }
    }
);

/**
 * POST /api/auth/linkedin/link
 * Link pending LinkedIn OAuth to user account (alternative flow)
 *
 * Used when user started OAuth before logging in.
 */
router.post('/linkedin/link', authenticate, async (req, res, next) => {
    try {
        const oauthData = req.session.pendingLinkedInOAuth;

        if (!oauthData) {
            return res.status(400).json({
                error: 'no_pending_oauth',
                message: 'No pending LinkedIn OAuth data found. Please start the OAuth flow again.'
            });
        }

        // Clear pending OAuth
        delete req.session.pendingLinkedInOAuth;

        // Connect LinkedIn as identity anchor
        const anchorData = {
            providerId: oauthData.linkedinId,
            email: oauthData.email,
            metadata: {
                display_name: oauthData.displayName,
                profile_photo: oauthData.profilePhoto,
                refresh_token: oauthData.refreshToken
            }
        };

        const anchor = await identityService.connectAnchor(req.user.id, 'linkedin', anchorData);

        res.json({
            message: 'LinkedIn connected successfully',
            anchor
        });
    } catch (err) {
        next(err);
    }
});

export default router;
