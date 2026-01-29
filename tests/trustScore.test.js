/**
 * Trust Score Service Tests
 */

import { calculateTrustScore, getScoringWeights } from '../src/services/trustScore.service.js';

describe('TrustScore Service', () => {
    describe('calculateTrustScore', () => {
        it('returns 0 score with no anchors', () => {
            const result = calculateTrustScore([]);
            expect(result.score).toBe(0);
        });

        it('calculates score with Gmail anchor', () => {
            const anchors = [{
                provider: 'gmail',
                account_created_at: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000) // 3 years ago
            }];

            const result = calculateTrustScore(anchors);
            expect(result.score).toBeGreaterThan(0);
            expect(result.breakdown).toBeDefined();
        });

        it('calculates higher score with multiple anchors', () => {
            const singleAnchor = [{
                provider: 'gmail',
                account_created_at: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000)
            }];

            const multipleAnchors = [
                {
                    provider: 'gmail',
                    account_created_at: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000)
                },
                {
                    provider: 'linkedin',
                    account_created_at: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000),
                    connection_count: 300
                }
            ];

            const singleResult = calculateTrustScore(singleAnchor);
            const multipleResult = calculateTrustScore(multipleAnchors);

            expect(multipleResult.score).toBeGreaterThan(singleResult.score);
        });

        it('respects maximum score of 100', () => {
            const perfectAnchors = [
                {
                    provider: 'gmail',
                    account_created_at: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000),
                    metadata: { email_verified: true }
                },
                {
                    provider: 'linkedin',
                    account_created_at: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000),
                    connection_count: 1000
                }
            ];

            const result = calculateTrustScore(perfectAnchors);
            expect(result.score).toBeLessThanOrEqual(100);
        });
    });

    describe('getScoringWeights', () => {
        it('returns weights that sum to 100', () => {
            const weights = getScoringWeights();
            const total = Object.values(weights).reduce((a, b) => a + b, 0);
            expect(total).toBe(100);
        });
    });
});
