import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

function optionalEnv(name, defaultValue) {
    return process.env[name] || defaultValue;
}

const config = {
    // Server
    port: parseInt(optionalEnv('PORT', '3000'), 10),
    nodeEnv: optionalEnv('NODE_ENV', 'development'),

    // Environment checks
    get isProduction() {
        return this.nodeEnv === 'production';
    },
    get isDevelopment() {
        return this.nodeEnv === 'development';
    },

    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(optionalEnv('RATE_LIMIT_WINDOW_MS', '900000'), 10), // 15 minutes
        maxRequests: parseInt(optionalEnv('RATE_LIMIT_MAX_REQUESTS', '100'), 10)
    },

    // Trust Proxy (for load balancers)
    trustProxy: optionalEnv('TRUST_PROXY', '0'),

    // Database
    databaseUrl: requireEnv('DATABASE_URL'),

    // JWT
    jwtSecret: requireEnv('JWT_SECRET'),
    jwtExpiresIn: optionalEnv('JWT_EXPIRES_IN', '24h'),

    // Ed25519 keys (Base64 encoded)
    ed25519PrivateKey: requireEnv('ED25519_PRIVATE_KEY'),
    ed25519PublicKey: requireEnv('ED25519_PUBLIC_KEY'),

    // Badge settings
    badgeExpiryDays: parseInt(optionalEnv('BADGE_EXPIRY_DAYS', '7'), 10),

    // Google OAuth & Cloud
    google: {
        clientId: optionalEnv('GOOGLE_CLIENT_ID', ''),
        clientSecret: optionalEnv('GOOGLE_CLIENT_SECRET', ''),
        callbackUrl: optionalEnv('GOOGLE_CALLBACK_URL', 'http://localhost:3000/api/auth/google/callback'),
        credentialsPath: optionalEnv('GOOGLE_CLOUD_CREDENTIALS', ''),
        credentialsJson: optionalEnv('GOOGLE_CLOUD_CREDENTIALS_JSON', '')
    },

    // LinkedIn OAuth
    linkedin: {
        clientId: optionalEnv('LINKEDIN_CLIENT_ID', ''),
        clientSecret: optionalEnv('LINKEDIN_CLIENT_SECRET', ''),
        callbackUrl: optionalEnv('LINKEDIN_CALLBACK_URL', 'http://localhost:3000/api/auth/linkedin/callback')
    },

    // Session
    sessionSecret: optionalEnv('SESSION_SECRET', 'dev-session-secret-change-in-production'),

    // Frontend URL (for OAuth redirects)
    frontendUrl: optionalEnv('FRONTEND_URL', 'http://localhost:5173'),

    // AWS S3 Configuration
    aws: {
        accessKeyId: optionalEnv('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: optionalEnv('AWS_SECRET_ACCESS_KEY', ''),
        region: optionalEnv('AWS_REGION', 'us-east-1'),
        s3Bucket: optionalEnv('AWS_S3_BUCKET', 'enpassant-receipts')
    }
};

export default config;
