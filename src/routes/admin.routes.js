/**
 * Admin & Analytics Routes
 *
 * POST /api/admin/track/scan - Public: Log a QR scan / page view (lightweight)
 * POST /api/admin/track/pageview - Public: Log a page view
 * GET /api/admin/signups - All signups with attribution
 * GET /api/admin/stats - Overview stats
 * GET /api/admin/campaign-performance - Campaign breakdown with conversion rates
 * GET /api/admin/qr-funnel - QR scan-to-signup funnel by source
 * GET /api/admin/leads - Waitlist leads with source data
 * GET /api/admin/export-csv - Download signups as CSV
 * POST /api/admin/query - Run a read-only SQL query (admin only)
 */

import { Router } from 'express';
import db from '../db/index.js';
import crypto from 'crypto';

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';

function checkAdminAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// ============================================
// PUBLIC TRACKING ENDPOINTS (no auth required)
// ============================================

/**
 * POST /api/admin/track/scan
 * Log a QR code scan. Called from frontend on page load when ?source= or ?code= is present.
 * Lightweight, fire-and-forget from the client side.
 */
router.post('/track/scan', async (req, res) => {
    try {
        const { code, source, sessionId, landingPage, referrer } = req.body;

        // At least source or code must be present
        if (!source && !code) {
            return res.status(400).json({ error: 'source or code required' });
        }

        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const sid = sessionId || crypto.randomUUID();

        await db.query(`
            INSERT INTO scan_events (code, source, session_id, ip_address, user_agent, referrer, landing_page)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            code || null,
            source || null,
            sid,
            ipAddress,
            userAgent,
            referrer || null,
            landingPage || '/'
        ]);

        console.log(`[Scan] ${source || code} from ${ipAddress}`);
        res.json({ ok: true, sessionId: sid });
    } catch (err) {
        // Don't fail the user experience over tracking errors
        console.error('[Scan] Track error:', err.message);
        res.json({ ok: true });
    }
});

/**
 * POST /api/admin/track/pageview
 * Log a generic page view with optional UTM params.
 */
router.post('/track/pageview', async (req, res) => {
    try {
        const { sessionId, source, campaign, medium, landingPage, referrer } = req.body;

        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const sid = sessionId || crypto.randomUUID();

        await db.query(`
            INSERT INTO page_views (session_id, source, campaign, medium, landing_page, referrer, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            sid,
            source || null,
            campaign || null,
            medium || null,
            landingPage || '/',
            referrer || null,
            ipAddress,
            userAgent
        ]);

        res.json({ ok: true, sessionId: sid });
    } catch (err) {
        console.error('[Pageview] Track error:', err.message);
        res.json({ ok: true });
    }
});

// ============================================
// ADMIN ENDPOINTS (password required)
// ============================================

/**
 * GET /api/admin/signups
 * All registered users with their attribution data
 */
router.get('/signups', checkAdminAuth, async (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;

        const result = await db.query(`
            SELECT
                u.id,
                u.email,
                u.created_at,
                u.has_beta_access,
                u.invited_by_code,
                ua.source,
                ua.campaign,
                ua.medium,
                ua.landing_page,
                ua.referrer
            FROM users u
            LEFT JOIN user_attribution ua ON u.id = ua.user_id
            ORDER BY u.created_at DESC
            LIMIT $1 OFFSET $2
        `, [parseInt(limit), parseInt(offset)]);

        const countResult = await db.query('SELECT COUNT(*) FROM users');

        res.json({
            total: parseInt(countResult.rows[0].count),
            signups: result.rows
        });
    } catch (err) {
        console.error('[Admin] Signups error:', err);
        res.status(500).json({ error: 'Failed to fetch signups' });
    }
});

/**
 * GET /api/admin/stats
 * Overview dashboard stats
 */
router.get('/stats', checkAdminAuth, async (req, res) => {
    try {
        const [overview, bySource, byVertical, leadsOverview] = await Promise.all([
            db.query(`
                SELECT
                    COUNT(*) as total_signups,
                    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as this_week,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as this_month,
                    COUNT(*) FILTER (WHERE has_beta_access = TRUE) as beta_users
                FROM users
            `),
            db.query(`
                SELECT
                    COALESCE(ua.source, 'direct') as source,
                    COUNT(*) as signups
                FROM users u
                LEFT JOIN user_attribution ua ON u.id = ua.user_id
                GROUP BY ua.source
                ORDER BY signups DESC
            `),
            db.query(`
                SELECT
                    vertical,
                    COUNT(*) as leads
                FROM leads
                GROUP BY vertical
                ORDER BY leads DESC
            `),
            db.query(`
                SELECT
                    COUNT(*) as total_leads,
                    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as this_week
                FROM leads
            `)
        ]);

        res.json({
            overview: overview.rows[0],
            by_source: bySource.rows,
            by_vertical: byVertical.rows,
            leads: leadsOverview.rows[0]
        });
    } catch (err) {
        console.error('[Admin] Stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

/**
 * GET /api/admin/campaign-performance
 * Campaign breakdown with scan counts and conversion rates
 */
router.get('/campaign-performance', checkAdminAuth, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                COALESCE(s.source, ua.source) as source,
                COUNT(DISTINCT s.session_id) as scans,
                COUNT(DISTINCT ua.user_id) as signups,
                COUNT(DISTINCT l.id) as leads,
                ROUND(
                    100.0 * COUNT(DISTINCT ua.user_id) / NULLIF(COUNT(DISTINCT s.session_id), 0),
                    1
                ) as scan_to_signup_pct,
                ROUND(
                    100.0 * COUNT(DISTINCT l.id) / NULLIF(COUNT(DISTINCT s.session_id), 0),
                    1
                ) as scan_to_lead_pct
            FROM scan_events s
            FULL OUTER JOIN user_attribution ua ON ua.source = s.source
            FULL OUTER JOIN leads l ON l.source = COALESCE(s.source, ua.source)
            WHERE COALESCE(s.source, ua.source) IS NOT NULL
            GROUP BY COALESCE(s.source, ua.source)
            ORDER BY scans DESC NULLS LAST
        `);

        res.json({ campaigns: result.rows });
    } catch (err) {
        console.error('[Admin] Campaign performance error:', err);
        res.status(500).json({ error: 'Failed to fetch campaign performance' });
    }
});

/**
 * GET /api/admin/qr-funnel
 * QR-specific funnel: scans -> code redemptions -> signups
 */
router.get('/qr-funnel', checkAdminAuth, async (req, res) => {
    try {
        const [scansBySource, codeStats, recentScans] = await Promise.all([
            db.query(`
                SELECT
                    source,
                    COUNT(*) as total_scans,
                    COUNT(DISTINCT session_id) as unique_sessions,
                    COUNT(DISTINCT ip_address) as unique_ips,
                    MIN(created_at) as first_scan,
                    MAX(created_at) as last_scan
                FROM scan_events
                WHERE source LIKE 'qr-%'
                GROUP BY source
                ORDER BY total_scans DESC
            `),
            db.query(`
                SELECT
                    source,
                    COUNT(*) as total_codes,
                    COUNT(*) FILTER (WHERE is_used = TRUE) as redeemed,
                    COUNT(*) FILTER (WHERE is_used = FALSE) as available,
                    ROUND(100.0 * COUNT(*) FILTER (WHERE is_used = TRUE) / COUNT(*), 1) as redemption_rate
                FROM invite_codes
                WHERE type = 'qr'
                GROUP BY source
                ORDER BY redeemed DESC
            `),
            db.query(`
                SELECT source, ip_address, landing_page, created_at
                FROM scan_events
                WHERE source LIKE 'qr-%'
                ORDER BY created_at DESC
                LIMIT 20
            `)
        ]);

        res.json({
            scans_by_source: scansBySource.rows,
            code_stats: codeStats.rows,
            recent_scans: recentScans.rows
        });
    } catch (err) {
        console.error('[Admin] QR funnel error:', err);
        res.status(500).json({ error: 'Failed to fetch QR funnel' });
    }
});

/**
 * GET /api/admin/leads
 * Waitlist leads with source breakdown
 */
router.get('/leads', checkAdminAuth, async (req, res) => {
    try {
        const { limit = 100, offset = 0, source, vertical } = req.query;

        let query = `
            SELECT id, email, phone, source, vertical, referral_code, ip_address,
                   created_at, email_sent, email_sent_at
            FROM leads
        `;
        const params = [];
        const conditions = [];

        if (source) {
            params.push(source);
            conditions.push(`source = $${params.length}`);
        }
        if (vertical) {
            params.push(vertical);
            conditions.push(`vertical = $${params.length}`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY created_at DESC';
        params.push(parseInt(limit));
        query += ` LIMIT $${params.length}`;
        params.push(parseInt(offset));
        query += ` OFFSET $${params.length}`;

        const result = await db.query(query, params);

        const countResult = await db.query('SELECT COUNT(*) FROM leads');

        res.json({
            total: parseInt(countResult.rows[0].count),
            leads: result.rows
        });
    } catch (err) {
        console.error('[Admin] Leads error:', err);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

/**
 * GET /api/admin/export-csv
 * Export signups + leads as CSV
 */
router.get('/export-csv', checkAdminAuth, async (req, res) => {
    try {
        const { type = 'all' } = req.query;

        let rows = [];
        let headers = [];

        if (type === 'signups' || type === 'all') {
            const signups = await db.query(`
                SELECT
                    u.email,
                    u.created_at,
                    u.has_beta_access,
                    u.invited_by_code,
                    COALESCE(ua.source, 'direct') as source,
                    COALESCE(ua.campaign, 'organic') as campaign,
                    COALESCE(ua.medium, 'web') as medium,
                    COALESCE(ua.landing_page, '/') as landing_page
                FROM users u
                LEFT JOIN user_attribution ua ON u.id = ua.user_id
                ORDER BY u.created_at DESC
            `);

            headers = ['Email', 'Signup Date', 'Beta Access', 'Invite Code', 'Source', 'Campaign', 'Medium', 'Landing Page', 'Type'];
            rows = signups.rows.map(r => [
                r.email,
                new Date(r.created_at).toISOString(),
                r.has_beta_access,
                r.invited_by_code || '',
                r.source,
                r.campaign,
                r.medium,
                r.landing_page,
                'signup'
            ]);
        }

        if (type === 'leads' || type === 'all') {
            const leads = await db.query(`
                SELECT email, phone, source, vertical, referral_code, created_at, email_sent
                FROM leads
                ORDER BY created_at DESC
            `);

            if (type === 'leads') {
                headers = ['Email', 'Phone', 'Source', 'Vertical', 'Referral Code', 'Signup Date', 'Email Sent'];
                rows = leads.rows.map(r => [
                    r.email,
                    r.phone || '',
                    r.source,
                    r.vertical,
                    r.referral_code || '',
                    new Date(r.created_at).toISOString(),
                    r.email_sent
                ]);
            } else {
                // Append leads to signups for 'all' type
                for (const r of leads.rows) {
                    rows.push([
                        r.email,
                        new Date(r.created_at).toISOString(),
                        false,
                        r.referral_code || '',
                        r.source,
                        'organic',
                        'web',
                        `/${r.vertical}`,
                        'lead'
                    ]);
                }
            }
        }

        const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(escapeCsv).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=enpassant-${type}-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    } catch (err) {
        console.error('[Admin] CSV export error:', err);
        res.status(500).json({ error: 'Failed to export CSV' });
    }
});

/**
 * POST /api/admin/query
 * Execute a read-only SQL query against the database.
 * Only SELECT statements allowed.
 */
router.post('/query', checkAdminAuth, async (req, res) => {
    try {
        const { sql } = req.body;

        if (!sql || typeof sql !== 'string') {
            return res.status(400).json({ error: 'SQL query string required' });
        }

        // Only allow SELECT and WITH (CTE) statements
        const trimmed = sql.trim().toUpperCase();
        if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('WITH')) {
            return res.status(403).json({
                error: 'Only SELECT queries are allowed'
            });
        }

        // Block destructive keywords even inside CTEs
        const blocked = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'CREATE', 'GRANT', 'REVOKE'];
        for (const keyword of blocked) {
            // Check for keyword as standalone word (not inside a string literal)
            const regex = new RegExp(`\\b${keyword}\\b`, 'i');
            if (regex.test(sql)) {
                return res.status(403).json({
                    error: `Blocked keyword: ${keyword}. Only read-only queries allowed.`
                });
            }
        }

        const result = await db.query(sql);

        res.json({
            rows: result.rows,
            rowCount: result.rowCount,
            fields: result.fields?.map(f => f.name) || []
        });
    } catch (err) {
        console.error('[Admin] Query error:', err.message);
        res.status(400).json({
            error: 'Query failed',
            message: err.message
        });
    }
});

export default router;
