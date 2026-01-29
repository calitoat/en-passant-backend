/**
 * JWT Authentication Middleware
 *
 * Verifies JWT tokens and attaches user info to request.
 */

import authService from '../services/auth.service.js';

/**
 * Require authentication for route
 * Extracts JWT from Authorization header and verifies it
 */
export function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'unauthorized',
            message: 'Missing or invalid Authorization header'
        });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
        const decoded = authService.verifyToken(token);
        req.user = {
            id: decoded.userId,
            email: decoded.email
        };
        next();
    } catch (err) {
        return res.status(401).json({
            error: 'unauthorized',
            message: 'Invalid or expired token'
        });
    }
}

/**
 * Optional authentication
 * If token is present, verify and attach user. If not, continue without user.
 */
export function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }

    const token = authHeader.substring(7);

    try {
        const decoded = authService.verifyToken(token);
        req.user = {
            id: decoded.userId,
            email: decoded.email
        };
    } catch (err) {
        // Token invalid, but that's okay for optional auth
    }

    next();
}

export default { authenticate, optionalAuth };
