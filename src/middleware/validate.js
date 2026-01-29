/**
 * Request Validation Middleware
 *
 * Simple validation helpers for request body fields.
 */

import { ValidationError } from '../services/auth.service.js';

/**
 * Create a validation middleware for required fields
 *
 * @param {Array<string>} fields - Required field names
 * @returns {Function} Express middleware
 */
export function requireFields(...fields) {
    return (req, res, next) => {
        const missing = fields.filter(field => {
            const value = req.body[field];
            return value === undefined || value === null || value === '';
        });

        if (missing.length > 0) {
            return res.status(400).json({
                error: 'validation',
                message: `Missing required fields: ${missing.join(', ')}`
            });
        }

        next();
    };
}

/**
 * Validate UUID format
 */
export function validateUUID(param = 'id') {
    return (req, res, next) => {
        const uuid = req.params[param];
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(uuid)) {
            return res.status(400).json({
                error: 'validation',
                message: `Invalid UUID format for ${param}`
            });
        }

        next();
    };
}

export default { requireFields, validateUUID };
