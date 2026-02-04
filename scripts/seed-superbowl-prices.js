#!/usr/bin/env node

/**
 * Seed Script: Super Bowl LX Price Ceilings
 *
 * Populates the event_price_ceilings table with official face values
 * for Super Bowl LX at Allegiant Stadium.
 *
 * Usage: node scripts/seed-superbowl-prices.js
 */

import db from '../src/db/index.js';
import eventService from '../src/services/event.service.js';
import priceValidationService from '../src/services/priceValidation.service.js';

const SUPERBOWL_EVENT = {
    id: 'superbowl-lx-2026',
    name: 'Super Bowl LX',
    date: new Date('2026-02-08T18:30:00-08:00'), // 6:30 PM PST
    venueName: 'Allegiant Stadium',
    venueCity: 'Las Vegas',
    venueState: 'NV',
    category: 'sports',
    subcategory: 'nfl',
    imageUrl: 'https://images.unsplash.com/photo-1504016798967-59a258e9386d?w=800',
    ticketExchangeEnabled: true
};

const PRICE_CEILINGS = [
    // Upper Level (400s)
    { sectionPattern: '400-Level Corners', maxPriceCents: 100000 },      // $1,000
    { sectionPattern: '400-Level Sideline', maxPriceCents: 120000 },     // $1,200
    { sectionPattern: '400-Level End Zone', maxPriceCents: 100000 },     // $1,000

    // Middle Level (300s)
    { sectionPattern: '300-Level Corners', maxPriceCents: 150000 },      // $1,500
    { sectionPattern: '300-Level Sideline', maxPriceCents: 180000 },     // $1,800
    { sectionPattern: '300-Level End Zone', maxPriceCents: 150000 },     // $1,500

    // Lower Level (200s)
    { sectionPattern: '200-Level Corners', maxPriceCents: 220000 },      // $2,200
    { sectionPattern: '200-Level Sideline', maxPriceCents: 280000 },     // $2,800
    { sectionPattern: '200-Level End Zone', maxPriceCents: 220000 },     // $2,200

    // Lower Level (100s)
    { sectionPattern: '100-Level Corners', maxPriceCents: 320000 },      // $3,200
    { sectionPattern: '100-Level Sideline', maxPriceCents: 400000 },     // $4,000
    { sectionPattern: '100-Level End Zone', maxPriceCents: 320000 },     // $3,200

    // Premium
    { sectionPattern: 'Club Level', maxPriceCents: 500000 },             // $5,000
    { sectionPattern: 'Floor/Field', maxPriceCents: 600000 },            // $6,000

    // Named sections (for more specific matching)
    { sectionPattern: 'Section 401', maxPriceCents: 100000 },
    { sectionPattern: 'Section 402', maxPriceCents: 100000 },
    { sectionPattern: 'Section 403', maxPriceCents: 100000 },
    { sectionPattern: 'Section 404', maxPriceCents: 120000 },
    { sectionPattern: 'Section 405', maxPriceCents: 120000 },
    { sectionPattern: 'Section 406', maxPriceCents: 120000 },
    { sectionPattern: 'Section 407', maxPriceCents: 100000 },
    { sectionPattern: 'Section 408', maxPriceCents: 100000 },
];

async function seed() {
    console.log('Starting Super Bowl LX seed...\n');

    try {
        // Create/update the event
        console.log('Creating event:', SUPERBOWL_EVENT.name);
        const event = await eventService.upsertEvent(SUPERBOWL_EVENT);
        console.log('Event created:', event.id);

        // Set price ceilings
        console.log('\nSetting price ceilings...');
        const ceilings = await priceValidationService.setPriceCeilings(
            SUPERBOWL_EVENT.id,
            SUPERBOWL_EVENT.name,
            SUPERBOWL_EVENT.date,
            SUPERBOWL_EVENT.venueName,
            PRICE_CEILINGS,
            'official'
        );

        console.log(`Created ${ceilings.length} price ceilings:\n`);

        // Display ceilings
        for (const ceiling of ceilings) {
            const price = (ceiling.maxPriceCents / 100).toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD'
            });
            console.log(`  ${ceiling.sectionPattern}: ${price}`);
        }

        console.log('\nSeed completed successfully!');
        console.log(`\nEvent ID: ${SUPERBOWL_EVENT.id}`);
        console.log(`Event Date: ${SUPERBOWL_EVENT.date.toLocaleString()}`);
        console.log(`Venue: ${SUPERBOWL_EVENT.venueName}, ${SUPERBOWL_EVENT.venueCity}, ${SUPERBOWL_EVENT.venueState}`);

    } catch (err) {
        console.error('Seed failed:', err.message);
        process.exit(1);
    } finally {
        await db.closePool();
    }
}

seed();
