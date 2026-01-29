/**
 * Express Application Setup
 *
 * Configures Express with middleware, sessions, and routes.
 * Production-ready with security hardening for 100k+ users.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import passport from 'passport';
import routes from './routes/index.js';
import healthRoutes from './routes/health.routes.js';
import errorHandler from './middleware/errorHandler.js';
import config from './config/index.js';
import { ALLOWED_ORIGINS } from './config/cors.js';
import { initializePassport } from './config/passport.js';

const app = express();

// Trust proxy for load balancers (Render, Railway, Heroku, etc.)
if (config.trustProxy !== '0') {
    app.set('trust proxy', config.trustProxy === '1' ? 1 : config.trustProxy);
}

// Security headers (Helmet)
app.use(helmet({
    contentSecurityPolicy: config.isProduction ? undefined : false, // Disable CSP in dev
    crossOriginEmbedderPolicy: false, // Allow embedding for Chrome extensions
}));

// Compression for responses
app.use(compression());

// Rate limiting - protect against DDoS and brute force
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
        error: 'rate_limit_exceeded',
        message: 'Too many requests, please try again later.',
        retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/api/health';
    }
});
app.use(limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 attempts per 15 minutes
    message: {
        error: 'auth_rate_limit_exceeded',
        message: 'Too many authentication attempts, please try again later.'
    }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// CORS configuration - allow credentials for OAuth and Chrome extension
app.use(cors({
    origin: function (origin, callback) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] CORS check - Origin: ${origin || 'null/undefined'}`);

        // Allow requests with no origin (Chrome extensions background workers, curl, Postman)
        if (!origin) {
            console.log(`[${timestamp}] CORS allowed: no origin (background worker/curl/Postman)`);
            return callback(null, true);
        }

        // Allow 'null' origin (iframes, file://, data: URLs, redirects)
        if (origin === 'null') {
            console.log(`[${timestamp}] CORS allowed: null origin (iframe/file/redirect)`);
            return callback(null, true);
        }

        // Allow specific origins - return the actual origin value
        if (ALLOWED_ORIGINS.includes(origin)) {
            console.log(`[${timestamp}] CORS allowed: matched allowed origin list`);
            return callback(null, origin);
        }

        // Allow Zillow subdomains
        if (origin.endsWith('.zillow.com')) {
            console.log(`[${timestamp}] CORS allowed: Zillow subdomain`);
            return callback(null, origin);
        }

        // Allow Chrome extensions
        if (origin.startsWith('chrome-extension://')) {
            console.log(`[${timestamp}] CORS allowed: Chrome extension`);
            return callback(null, origin);
        }

        // In development, allow all origins
        if (config.isDevelopment) {
            console.log(`[${timestamp}] CORS allowed: development mode (all origins)`);
            return callback(null, origin);
        }

        // Reject other origins in production
        console.log(`[${timestamp}] CORS rejected: ${origin}`);
        callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true, // Required for cookies/sessions with OAuth
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Explicit OPTIONS handler for preflight requests
app.options('*', cors());

// Parse JSON bodies
app.use(express.json());

// Session configuration (required for OAuth flow)
app.use(session({
    secret: config.sessionSecret,
    resave: true,  // Force save on every request to ensure OAuth state persists
    saveUninitialized: true,  // Create session even if not modified (needed for OAuth)
    cookie: {
        secure: config.isProduction, // HTTPS only in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'  // 'lax' allows cookies on top-level navigations (OAuth callbacks)
    },
    name: 'trustbridge.sid'  // Custom session ID name
}));

// Debug session middleware
if (config.isDevelopment) {
    app.use((req, res, next) => {
        if (req.path.includes('/auth/')) {
            console.log(`[Session] ${req.method} ${req.path} - Session ID: ${req.sessionID}`);
        }
        next();
    });
}

// Initialize Passport
initializePassport();
app.use(passport.initialize());
app.use(passport.session());

// Request logging in development
if (config.isDevelopment) {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
    });
}

// Health check routes (root level for Railway/load balancers)
app.use('/health', healthRoutes);

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'En Passant API',
        version: '1.0.0',
        description: 'Verify humans. Authorize agents. Block imposters.',
        tagline: 'The move they didn\'t see coming',
        endpoints: {
            health: '/api/health',
            docs: 'See README.md for API documentation'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'not_found',
        message: `Route ${req.method} ${req.path} not found`
    });
});

// Global error handler
app.use(errorHandler);

export default app;
