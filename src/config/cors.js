/**
 * CORS Configuration
 *
 * Shared CORS settings for development and production environments.
 * Used by Express middleware and OAuth handlers.
 */

export const ALLOWED_ORIGINS = [
    // Development
    'http://localhost:5173',      // Frontend dev server
    'http://localhost:3000',      // Backend (for same-origin)

    // Production - TrustBridge domains
    'https://trustbridge.io',
    'https://www.trustbridge.io',
    'https://api.trustbridge.io',
    'https://trustbridge.app',
    'https://www.trustbridge.app',
    'https://api.trustbridge.app',

    // Staging
    'https://staging.trustbridge.io',

    // Production - Vercel deployments
    'https://trustbridge.vercel.app',
    'https://trustbridge-frontend.vercel.app',

    // Production - Railway deployments
    'https://trustbridge-api.up.railway.app',

    // Zillow integration (extension usage)
    'https://www.zillow.com',
    'https://zillow.com',
];

/**
 * Check if an origin is allowed
 * Handles Chrome extensions, development mode, and Zillow subdomains
 */
export function isOriginAllowed(origin, isDevelopment = false) {
    // Allow requests with no origin (Chrome extensions background workers, curl, Postman)
    if (!origin) return true;

    // Allow 'null' origin (iframes, file://, data: URLs, redirects)
    if (origin === 'null') return true;

    // Allow Chrome extensions
    if (origin.startsWith('chrome-extension://')) return true;

    // Allow Zillow subdomains
    if (origin.endsWith('.zillow.com')) return true;

    // Allow explicitly listed origins
    if (ALLOWED_ORIGINS.includes(origin)) return true;

    // In development, allow all origins
    if (isDevelopment) return true;

    return false;
}

/**
 * Full CORS options for Express middleware
 */
export const corsOptions = {
    origin: function (origin, callback) {
        const isDev = process.env.NODE_ENV !== 'production';

        if (isOriginAllowed(origin, isDev)) {
            return callback(null, true);
        }

        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 86400 // 24 hours
};

export default {
    ALLOWED_ORIGINS,
    isOriginAllowed,
    corsOptions
};
