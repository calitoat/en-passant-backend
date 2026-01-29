/**
 * LinkedIn OpenID Connect Strategy
 *
 * LinkedIn deprecated the old /v2/me endpoint and r_liteprofile scope.
 * New apps must use OpenID Connect with the /v2/userinfo endpoint.
 *
 * This custom strategy implements the correct OAuth2 + OIDC flow.
 */

import { Strategy as OAuth2Strategy } from 'passport-oauth2';

class LinkedInOIDCStrategy extends OAuth2Strategy {
    constructor(options, verify) {
        options = options || {};
        options.authorizationURL = options.authorizationURL || 'https://www.linkedin.com/oauth/v2/authorization';
        options.tokenURL = options.tokenURL || 'https://www.linkedin.com/oauth/v2/accessToken';
        options.scope = options.scope || ['openid', 'profile', 'email'];
        // Disable passport's built-in state verification - we handle state ourselves for token passing
        options.state = false;

        super(options, verify);

        this.name = 'linkedin';
        this._userProfileURL = 'https://api.linkedin.com/v2/userinfo';
    }

    /**
     * Override authenticate to pass through state without validation
     * This allows us to encode our JWT token in the state parameter
     */
    authenticate(req, options) {
        // If state is provided in options, use it (our custom token-encoded state)
        if (options && options.state) {
            this._stateStore = {
                store: (req, cb) => cb(null, options.state),
                verify: (req, state, cb) => cb(null, true, state) // Always pass verification
            };
        }
        return super.authenticate(req, options);
    }

    /**
     * Fetch user profile from LinkedIn's OpenID Connect userinfo endpoint
     */
    userProfile(accessToken, done) {
        this._oauth2.useAuthorizationHeaderforGET(true);

        this._oauth2.get(this._userProfileURL, accessToken, (err, body, res) => {
            if (err) {
                console.error('[LinkedIn OIDC] Error fetching userinfo:', err);
                return done(new Error('Failed to fetch user profile from LinkedIn'));
            }

            try {
                const json = JSON.parse(body);
                console.log('[LinkedIn OIDC] Userinfo response:', JSON.stringify(json, null, 2));

                // LinkedIn OIDC userinfo returns:
                // - sub: unique user ID
                // - name: full name
                // - given_name: first name
                // - family_name: last name
                // - picture: profile photo URL
                // - email: email address
                // - email_verified: boolean
                // - locale: user's locale

                const profile = {
                    provider: 'linkedin',
                    id: json.sub,
                    sub: json.sub,
                    displayName: json.name || `${json.given_name || ''} ${json.family_name || ''}`.trim(),
                    name: {
                        givenName: json.given_name,
                        familyName: json.family_name
                    },
                    given_name: json.given_name,
                    family_name: json.family_name,
                    email: json.email,
                    email_verified: json.email_verified,
                    picture: json.picture,
                    locale: json.locale,
                    _raw: body,
                    _json: json
                };

                // Add emails array for compatibility
                if (json.email) {
                    profile.emails = [{ value: json.email, verified: json.email_verified }];
                }

                // Add photos array for compatibility
                if (json.picture) {
                    profile.photos = [{ value: json.picture }];
                }

                return done(null, profile);
            } catch (e) {
                console.error('[LinkedIn OIDC] Error parsing userinfo:', e);
                return done(new Error('Failed to parse LinkedIn profile response'));
            }
        });
    }
}

export default LinkedInOIDCStrategy;
