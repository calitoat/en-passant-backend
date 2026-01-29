import pg from 'pg';
import config from '../config/index.js';

const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    ssl: config.isProduction ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
});

pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
});

/**
 * Execute a single query
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<pg.QueryResult>}
 */
export async function query(text, params) {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (config.isDevelopment && duration > 100) {
        console.log('Slow query:', { text, duration: `${duration}ms`, rows: result.rowCount });
    }

    return result;
}

/**
 * Get a client for transactions
 * @returns {Promise<pg.PoolClient>}
 */
export async function getClient() {
    return pool.connect();
}

/**
 * Execute multiple queries in a transaction
 * @param {Function} callback - Receives client, should return result
 * @returns {Promise<any>}
 */
export async function transaction(callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Close the pool (for graceful shutdown)
 */
export async function closePool() {
    await pool.end();
}

export default { query, getClient, transaction, closePool };
