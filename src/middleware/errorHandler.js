/**
 * Global Error Handler Middleware
 *
 * Catches all errors and returns consistent JSON responses.
 */

import config from '../config/index.js';

export function errorHandler(err, req, res, next) {
    // Log error in development
    if (config.isDevelopment) {
        console.error('Error:', err);
    }

    // Known error types with statusCode property
    if (err.statusCode) {
        return res.status(err.statusCode).json({
            error: err.name.toLowerCase().replace('error', ''),
            message: err.message
        });
    }

    // Database errors
    if (err.code && err.code.startsWith('23')) {
        return res.status(400).json({
            error: 'database_constraint',
            message: 'Database constraint violation'
        });
    }

    // Default to 500 Internal Server Error
    res.status(500).json({
        error: 'internal_server_error',
        message: config.isProduction ? 'An unexpected error occurred' : err.message
    });
}

export default errorHandler;
