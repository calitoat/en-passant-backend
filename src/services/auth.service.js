/**
 * Authentication Service
 *
 * Handles user registration, login, and JWT token management.
 * Uses Argon2 for password hashing (memory-hard, resistant to GPU attacks).
 */

import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import config from '../config/index.js';

/**
 * Register a new user
 *
 * @param {string} email - User email
 * @param {string} password - Plain text password (will be hashed)
 * @returns {Promise<Object>} Created user (without password hash)
 */
export async function register(email, password) {
    // Validate email format
    if (!isValidEmail(email)) {
        throw new ValidationError('Invalid email format');
    }

    // Validate password strength
    if (password.length < 8) {
        throw new ValidationError('Password must be at least 8 characters');
    }

    // Hash password with Argon2id (recommended variant)
    const passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,  // 64 MB
        timeCost: 3,        // 3 iterations
        parallelism: 4      // 4 parallel threads
    });

    try {
        const result = await db.query(
            `INSERT INTO users (email, password_hash)
             VALUES ($1, $2)
             RETURNING id, email, created_at, email_verified`,
            [email.toLowerCase(), passwordHash]
        );

        return result.rows[0];
    } catch (err) {
        if (err.code === '23505') { // Unique violation
            throw new ValidationError('Email already registered');
        }
        throw err;
    }
}

/**
 * Authenticate user and return JWT token
 *
 * @param {string} email - User email
 * @param {string} password - Plain text password
 * @returns {Promise<Object>} { user, token }
 */
export async function login(email, password) {
    const result = await db.query(
        'SELECT id, email, password_hash, email_verified, is_active FROM users WHERE email = $1',
        [email.toLowerCase()]
    );

    const user = result.rows[0];

    if (!user) {
        throw new AuthenticationError('Invalid email or password');
    }

    if (!user.is_active) {
        throw new AuthenticationError('Account is deactivated');
    }

    // Verify password
    const validPassword = await argon2.verify(user.password_hash, password);
    if (!validPassword) {
        throw new AuthenticationError('Invalid email or password');
    }

    // Generate JWT
    const token = generateToken(user);

    // Return user without password hash
    const { password_hash, ...safeUser } = user;
    return { user: safeUser, token };
}

/**
 * Get user by ID
 *
 * @param {string} userId - User UUID
 * @returns {Promise<Object|null>} User object or null
 */
export async function getUserById(userId) {
    const result = await db.query(
        'SELECT id, email, created_at, email_verified, is_active FROM users WHERE id = $1',
        [userId]
    );
    return result.rows[0] || null;
}

/**
 * Generate JWT token for user
 *
 * @param {Object} user - User object with id and email
 * @returns {string} JWT token
 */
export function generateToken(user) {
    return jwt.sign(
        { userId: user.id, email: user.email },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );
}

/**
 * Verify JWT token
 *
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
export function verifyToken(token) {
    try {
        return jwt.verify(token, config.jwtSecret);
    } catch (err) {
        throw new AuthenticationError('Invalid or expired token');
    }
}

// Simple email validation
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Custom error classes
export class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = 400;
    }
}

export class AuthenticationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AuthenticationError';
        this.statusCode = 401;
    }
}

export default {
    register,
    login,
    getUserById,
    generateToken,
    verifyToken,
    ValidationError,
    AuthenticationError
};
