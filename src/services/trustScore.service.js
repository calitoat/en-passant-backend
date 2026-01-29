/**
 * Trust Score Calculation Service
 *
 * Simple scoring model for shipping fast:
 * - Base account: 30 points
 * - Gmail connected: +30 points
 * - LinkedIn connected: +40 points
 * - .edu email bonus: +15 points
 * - Max score: 115 points (100 base + 15 edu bonus)
 */

// === SCORING POINTS ===
const POINTS = {
    BASE: 30,        // Having a TrustBridge account
    GMAIL: 30,       // Gmail OAuth connected
    LINKEDIN: 40,    // LinkedIn OAuth connected
    EDU_BONUS: 15    // Educational institution email bonus
};

/**
 * Check if an email is from an educational institution
 * Supports: .edu, .edu.xx (country), .ac.xx (academic country domains)
 *
 * @param {string} email - Email address to check
 * @returns {boolean} True if email is from an educational institution
 */
export function isEducationalEmail(email) {
    if (!email) return false;
    const domain = email.toLowerCase().split('@')[1];
    if (!domain) return false;

    // Match patterns:
    // - .edu (US)
    // - .edu.xx (e.g., .edu.au, .edu.cn)
    // - .ac.xx (e.g., .ac.uk, .ac.jp)
    return /\.(edu|edu\.[a-z]{2}|ac\.[a-z]{2})$/i.test(domain);
}

/**
 * Calculate trust score from identity anchors
 *
 * @param {Array} anchors - Array of identity anchor objects
 * @returns {Object} { score: number, breakdown: Object, eduVerified: boolean }
 */
export function calculateTrustScore(anchors) {
    const breakdown = {
        base: { score: POINTS.BASE, label: 'TrustBridge Account' },
        gmail: { score: 0, label: 'Gmail Connected' },
        linkedin: { score: 0, label: 'LinkedIn Connected' },
        edu_bonus: { score: 0, label: 'Educational Email Verified' }
    };

    let eduVerified = false;

    if (anchors && anchors.length > 0) {
        // Gmail connected?
        const gmail = anchors.find(a => a.provider === 'gmail');
        if (gmail) {
            breakdown.gmail.score = POINTS.GMAIL;

            // Check for .edu email bonus
            if (gmail.is_edu_verified) {
                breakdown.edu_bonus.score = POINTS.EDU_BONUS;
                eduVerified = true;
            }
        }

        // LinkedIn connected?
        const linkedin = anchors.find(a => a.provider === 'linkedin');
        if (linkedin) {
            breakdown.linkedin.score = POINTS.LINKEDIN;
        }
    }

    const score = breakdown.base.score + breakdown.gmail.score + breakdown.linkedin.score + breakdown.edu_bonus.score;

    return { score, breakdown, eduVerified };
}

/**
 * Get the current scoring weights (for transparency)
 */
export function getScoringWeights() {
    return { ...POINTS };
}

export default {
    calculateTrustScore,
    getScoringWeights,
    isEducationalEmail
};
