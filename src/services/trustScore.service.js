/**
 * Trust Score Calculation Service (EP Score)
 *
 * Scoring model:
 * - Base account: 20 points
 * - Gmail connected: +25 points
 * - LinkedIn connected: +30 points
 * - .edu email bonus: +25 points
 * - Max score: 100 points
 */

// === SCORING POINTS ===
const POINTS = {
    BASE: 20,        // Having an En Passant account
    GMAIL: 25,       // Gmail OAuth connected
    LINKEDIN: 30,    // LinkedIn OAuth connected
    EDU_BONUS: 25    // Educational institution email bonus
};

const MAX_SCORE = 100;

// === CLEARANCE LEVELS ===
const CLEARANCE_LEVELS = {
    GRANDMASTER: { level: 4, title: 'Grandmaster', color: 'gold', minScore: 100 },
    MASTER: { level: 3, title: 'Master', color: 'emerald', minScore: 75 },
    PLAYER: { level: 2, title: 'Player', color: 'blue', minScore: 50 },
    SPECTATOR: { level: 1, title: 'Spectator', color: 'gray', minScore: 0 }
};

/**
 * Get clearance level based on EP Score
 *
 * @param {number} score - EP Score (0-100)
 * @returns {Object} { level, title, color }
 */
export function getClearanceLevel(score) {
    if (score >= 100) return CLEARANCE_LEVELS.GRANDMASTER;
    if (score >= 75) return CLEARANCE_LEVELS.MASTER;
    if (score >= 50) return CLEARANCE_LEVELS.PLAYER;
    return CLEARANCE_LEVELS.SPECTATOR;
}

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
        base: { score: POINTS.BASE, label: 'En Passant Account' },
        gmail: { score: 0, label: 'Gmail Connected' },
        linkedin: { score: 0, label: 'LinkedIn Connected' },
        edu_bonus: { score: 0, label: '.edu Email Verified' }
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

    const score = Math.min(
        breakdown.base.score + breakdown.gmail.score + breakdown.linkedin.score + breakdown.edu_bonus.score,
        MAX_SCORE
    );

    const clearance = getClearanceLevel(score);

    return { score, breakdown, eduVerified, clearance };
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
    getClearanceLevel,
    isEducationalEmail
};
