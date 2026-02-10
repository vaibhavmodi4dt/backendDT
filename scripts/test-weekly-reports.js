#!/usr/bin/env node

/**
 * Weekly Reports Testing Script
 *
 * This script allows you to test weekly report generation for specific dates
 * without modifying the production code.
 *
 * Usage:
 *   node scripts/test-weekly-reports.js
 *   node scripts/test-weekly-reports.js --week 2026-01-05
 *   node scripts/test-weekly-reports.js --user 112
 *   node scripts/test-weekly-reports.js --week 2026-01-05 --user 112
 */

'use strict';

// Parse command line arguments first (before nconf)
const args = process.argv.slice(2);
const options = {};

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--week' && args[i + 1]) {
        options.weekStartStr = args[i + 1];
        i++;
    } else if (args[i] === '--user' && args[i + 1]) {
        options.uid = parseInt(args[i + 1], 10);
        i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
        console.log(`
Weekly Reports Testing Script

Usage:
  node scripts/test-weekly-reports.js [options]

Options:
  --week <date>    Test with specific week start date (YYYY-MM-DD)
                   Example: --week 2026-01-05

  --user <uid>     Test for a specific user ID
                   Example: --user 112

  --help, -h       Show this help message

Examples:
  # Generate reports for current week, all users
  node scripts/test-weekly-reports.js

  # Generate reports for week of Jan 5, 2026, all users
  node scripts/test-weekly-reports.js --week 2026-01-05

  # Generate report for user 112, current week
  node scripts/test-weekly-reports.js --user 112

  # Generate report for user 112, week of Jan 5, 2026
  node scripts/test-weekly-reports.js --week 2026-01-05 --user 112
        `);
        process.exit(0);
    }
}

// Initialize the application
async function init() {
    const nconf = require('nconf');
    const path = require('path');

    // Load configuration
    nconf.argv().env();
    nconf.file({ file: path.join(__dirname, '../config.json') });

    // Calculate week end date if week start is provided
    if (options.weekStartStr) {
        const helpers = require('../src/reports/helpers');
        const weekDates = helpers.getWeekDates(options.weekStartStr);
        options.weekEndStr = weekDates[weekDates.length - 1];
        console.log(`📅 Testing with week: ${options.weekStartStr} to ${options.weekEndStr}`);
    }
    const winston = require('winston');
    winston.configure({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(info => `${info.timestamp} - ${info.level}: ${info.message}`)
        ),
        transports: [
            new winston.transports.Console()
        ]
    });

    try {
        console.log('🚀 Initializing database...');
        const db = require('../src/database');
        await db.init();

        console.log('📊 Loading weekly reports module...');
        const WeeklyReports = require('../src/reports/weekly');

        console.log('▶️  Starting test...\n');

        let result;
        if (options.uid) {
            console.log(`👤 Generating weekly report for user ${options.uid}...`);
            result = await WeeklyReports.generateForUser(options.uid, options.weekStartStr);
        } else {
            console.log('👥 Generating weekly reports for all active users...');
            result = await WeeklyReports.generateAllWeeklyReports({
                weekStartStr: options.weekStartStr,
                weekEndStr: options.weekEndStr
            });
        }

        console.log('\n✅ Test completed!');
        console.log('📋 Result:', JSON.stringify(result, null, 2));

        await db.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run the script
init();
