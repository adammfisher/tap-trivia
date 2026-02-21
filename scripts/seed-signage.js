#!/usr/bin/env node
/**
 * Seed signage data for a bar in DynamoDB.
 * Usage: node scripts/seed-signage.js
 */
'use strict';

const path = require('path');
const { TABLE, docClient, UpdateCommand } = require(
  path.resolve(__dirname, '../backend/shared/dynamo')
);

const BAR_CODE = '9CK6T';

const signage = {
  enabled: true,
  rotationSpeed: 15,
  slides: [
    {
      id: 'seed-specials-001',
      template: 'specials',
      enabled: true,
      schedule: { days: [] },
      data: {
        emoji: '🍺',
        label: "Tonight's Specials",
        headline: 'Thirsty Thursday',
        subheadline: 'All Day Deals',
        featuredName: 'Margarita Pitcher',
        featuredDesc: 'House lime, Cointreau, fresh squeeze',
        featuredPrice: '$18',
        menuItems: [
          { icon: '🍺', name: 'Draft Beers', desc: 'All domestics', price: '$3' },
          { icon: '🍸', name: 'Well Drinks', desc: 'Vodka, rum, whiskey', price: '$4' },
          { icon: '🍗', name: 'Wings Basket', desc: '12 ct. buffalo or BBQ', price: '$8' },
          { icon: '🌮', name: 'Loaded Nachos', desc: 'Beef, cheese, jalapeños', price: '$10' },
        ],
      },
    },
    {
      id: 'seed-happyhour-002',
      template: 'happyhour',
      enabled: true,
      schedule: { days: [] },
      data: {
        emoji: '🍹',
        timeRange: '4 PM – 7 PM',
        frequency: 'Every Weekday',
        deals: [
          { deal: '50% OFF', item: 'All Draft Beers', color: '#f59e0b' },
          { deal: '$5', item: 'House Wine & Sangria', color: '#e879f9' },
          { deal: '$6', item: 'Any Appetizer', color: '#00d4aa' },
        ],
      },
    },
    {
      id: 'seed-event-003',
      template: 'event',
      enabled: true,
      schedule: { days: [] },
      data: {
        emoji: '🧠',
        eventName: 'TapTrivia Night',
        when: 'Every Thursday · 8 PM',
        details: 'Free to play · Win prizes · Teams welcome',
        prizes: [
          { place: '1st Place', prize: '$50 Bar Tab', emoji: '🥇' },
          { place: '2nd Place', prize: '$25 Bar Tab', emoji: '🥈' },
          { place: '3rd Place', prize: 'Free Appetizer', emoji: '🥉' },
        ],
      },
    },
    {
      id: 'seed-brand-004',
      template: 'brand',
      enabled: true,
      schedule: { days: [] },
      data: {
        tagline: 'Cold Drinks · Good Times · Live Trivia',
        hours: [
          { label: 'Mon – Thu', hours: '4 PM – 12 AM' },
          { label: 'Fri – Sat', hours: '4 PM – 2 AM' },
          { label: 'Sunday', hours: '12 PM – 10 PM' },
        ],
      },
    },
    {
      id: 'seed-announcement-005',
      template: 'announcement',
      enabled: true,
      schedule: { days: [] },
      data: {
        emoji: '🎉',
        headline: 'Patio Season Is Here!',
        message: 'We just expanded our outdoor seating — 20 new spots with string lights, fire pits, and full bar service. Come check it out this weekend!',
        subtext: 'Grand opening Saturday at noon · Live music all day',
      },
    },
    {
      id: 'seed-sports-006',
      template: 'sports',
      enabled: true,
      schedule: { days: [] },
      data: {
        emoji: '🏈',
        headline: 'Game Day Sunday',
        matchup: 'Panthers vs Falcons',
        when: 'This Sunday · 1:00 PM Kickoff',
        promo: '$3 Bud Light · $5 Wings · $8 Pitchers',
        tagline: 'Every screen. Every game. Best seat in Brevard.',
      },
    },
    {
      id: 'seed-custom-007',
      template: 'custom',
      enabled: true,
      schedule: { days: [] },
      data: {
        emoji: '🎶',
        headline: 'Live Music Friday',
        body: "Local favorite Jake Morrison is back with acoustic covers and originals. Grab a drink, grab a seat — it's going to be a good one.",
        items: [
          { emoji: '🎸', text: 'Starts at 9 PM' },
          { emoji: '🍻', text: '$4 craft pints all night' },
          { emoji: '🎟️', text: 'No cover charge' },
        ],
      },
    },
  ],
};

async function seed() {
  await docClient.send(new UpdateCommand({
    TableName: TABLE.BARS,
    Key: { PK: `BAR#${BAR_CODE}` },
    UpdateExpression: 'SET signage = :s, signageUpdatedAt = :ts',
    ExpressionAttributeValues: {
      ':s': signage,
      ':ts': new Date().toISOString(),
    },
    ReturnValues: 'NONE',
  }));

  console.log(`Signage seeded for bar ${BAR_CODE} — ${signage.slides.length} slides`);
}

seed().catch(err => {
  console.error('Failed to seed signage:', err);
  process.exit(1);
});
