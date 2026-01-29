/**
 * Passport.js Configuration
 *
 * Configures Google OAuth 2.0 strategy for identity verification.
 * This is used to connect Gmail accounts as identity anchors.
 */

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import LinkedInOIDCStrategy from './linkedin-oidc-strategy.js';
import config from './index.js';
import db from '../db/index.js';
import authService from '../services/auth.service.js';

/**
 * Google OAuth 2.0 Strategy
 *
 * Scopes requested:
 * - userinfo.email: Get user's email address
 * - userinfo.profile: Get user's basic profile info
 * - gmail.metadata: Access email metadata (dates, counts) - NO content access
 */
const googleStrategy = new GoogleStrategy(
    {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
        scope: [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/gmail.metadata'
        ],
        accessType: 'offline', // Get refresh token for ongoing access
        prompt: 'consent'      // Always show consent to get refresh token
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Extract profile information
            const googleId = profile.id;
            const email = profile.emails?.[0]?.value;
            const emailVerified = profile.emails?.[0]?.verified || false;
            const displayName = profile.displayName;
            const profilePhoto = profile.photos?.[0]?.value;

            // Store tokens and profile for later use
            const oauthData = {
                googleId,
                email,
                emailVerified,
                displayName,
                profilePhoto,
                accessToken,
                refreshToken
            };

            return done(null, oauthData);
        } catch (err) {
            return done(err, null);
        }
    }
);

/**
 * LinkedIn OAuth 2.0 Strategy (OpenID Connect)
 *
 * Uses custom OIDC strategy because LinkedIn deprecated the old /v2/me endpoint.
 * New apps must use OpenID Connect with /v2/userinfo endpoint.
 *
 * Profile fields from LinkedIn OIDC:
 * - sub: unique user ID
 * - name: full display name
 * - given_name, family_name: first and last name
 * - email: email address
 * - picture: profile photo URL
 */
const linkedInStrategy = new LinkedInOIDCStrategy(
    {
        clientID: config.linkedin.clientId,
        clientSecret: config.linkedin.clientSecret,
        callbackURL: config.linkedin.callbackUrl,
        scope: ['openid', 'profile', 'email'],
        state: true
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            console.log('[LinkedIn OAuth] Profile from OIDC strategy:', {
                sub: profile.sub,
                email: profile.email,
                displayName: profile.displayName,
                picture: profile.picture
            });

            // Extract profile information from OIDC response
            const linkedinId = profile.sub || profile.id;
            const email = profile.email || profile.emails?.[0]?.value;
            const displayName = profile.displayName || profile.name || 'LinkedIn User';
            const profilePhoto = profile.picture || profile.photos?.[0]?.value;

            console.log('[LinkedIn OAuth] Extracted data:', {
                linkedinId,
                email,
                displayName,
                hasProfilePhoto: !!profilePhoto
            });

            // Store tokens and profile for later use
            const oauthData = {
                linkedinId,
                email,
                displayName,
                profilePhoto,
                accessToken,
                refreshToken
            };

            return done(null, oauthData);
        } catch (err) {
            console.error('[LinkedIn OAuth] Error extracting profile:', err);
            return done(err, null);
        }
    }
);

/**
 * Serialize user to session
 * We store minimal data - just enough to identify the OAuth session
 */
passport.serializeUser((oauthData, done) => {
    done(null, oauthData);
});

/**
 * Deserialize user from session
 */
passport.deserializeUser((oauthData, done) => {
    done(null, oauthData);
});

/**
 * Initialize Passport with Google and LinkedIn strategies
 */
export function initializePassport() {
    if (config.google.clientId && config.google.clientSecret) {
        passport.use(googleStrategy);
        console.log('Passport Google OAuth initialized');
    } else {
        console.warn('Google OAuth credentials not configured - Google OAuth disabled');
    }

    if (config.linkedin.clientId && config.linkedin.clientSecret) {
        passport.use(linkedInStrategy);
        console.log('Passport LinkedIn OAuth initialized');
    } else {
        console.warn('LinkedIn OAuth credentials not configured - LinkedIn OAuth disabled');
    }
}

export default passport;
