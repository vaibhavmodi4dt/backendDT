#!/usr/bin/env node

'use strict';

/**
 * Daily Reports Migration - Rollback Script
 * 
 * This script removes all migrated daily reports and their indexes from the database
 * 
 * Usage:
 *   node rollback-daily-reports.js [options]
 * 
 * Options:
 *   --confirm            Required to execute rollback (safety measure)
 *   --keep-after <date>  Keep reports after this date (YYYY-MM-DD)
 */

const db = require('../src/database');
const { collections } = require('../src/database/mongo/collections');

const reportsCollection = { collection: collections.REPORTS };

// Parse arguments
const args = process.argv.slice(2);
const confirmed = args.includes('--confirm');
const keepAfterIndex = args.indexOf('--keep-after');
const keepAfterDate = keepAfterIndex >= 0 ? args[keepAfterIndex + 1] : null;

async function rollback() {
    console.log('='.repeat(80));
    console.log('Daily Reports Migration - ROLLBACK');
    console.log('='.repeat(80));
    console.log('');

    if (!confirmed) {
        console.error('❌ SAFETY CHECK: You must pass --confirm to execute rollback');
        console.log('');
        console.log('This script will DELETE all migrated daily reports from the database.');
        console.log('');
        console.log('Usage:');
        console.log('  node rollback-daily-reports.js --confirm');
        console.log('');
        console.log('To keep reports after a specific date:');
        console.log('  node rollback-daily-reports.js --confirm --keep-after 2026-01-10');
        console.log('');
        process.exit(1);
    }

    if (keepAfterDate) {
        console.log(`⚠️  Keeping reports after: ${keepAfterDate}`);
        console.log('');
    }

    try {
        console.log('🔍 Step 1: Counting existing reports...');
        
        const query = keepAfterDate 
            ? { _key: /^reports:daily:user:/, date: { $lt: keepAfterDate } }
            : { _key: /^reports:daily:user:/ };
        
        const count = await db.count(reportsCollection, query);
        console.log(`   Found ${count} daily reports to delete`);
        console.log('');

        if (count === 0) {
            console.log('✓ No reports to delete. Exiting.');
            process.exit(0);
        }

        // Confirm deletion
        console.log('⚠️  WARNING: This will permanently delete the reports!');
        console.log('   Press Ctrl+C now to abort...');
        await sleep(5000);
        console.log('');

        console.log('🗑️  Step 2: Deleting reports...');
        const deleteResult = await db.deleteMany(reportsCollection, query);
        console.log(`   Deleted ${deleteResult.deletedCount} reports`);
        console.log('');

        console.log('🗑️  Step 3: Cleaning up indexes...');
        
        // Get all user sorted sets
        const userKeys = await db.keys('user:*:reports:daily');
        console.log(`   Found ${userKeys.length} user report indexes`);
        
        let indexesRemoved = 0;
        for (const key of userKeys) {
            const removed = await db.delete(key);
            if (removed) indexesRemoved++;
        }
        console.log(`   Removed ${indexesRemoved} user indexes`);

        // Get all monthly date indexes
        const dateKeys = await db.keys('reports:daily:date:*');
        console.log(`   Found ${dateKeys.length} monthly indexes`);
        
        indexesRemoved = 0;
        for (const key of dateKeys) {
            const removed = await db.delete(key);
            if (removed) indexesRemoved++;
        }
        console.log(`   Removed ${indexesRemoved} monthly indexes`);

        // Remove status indexes
        const statusKeys = await db.keys('reports:daily:status:*');
        console.log(`   Found ${statusKeys.length} status indexes`);
        
        indexesRemoved = 0;
        for (const key of statusKeys) {
            const removed = await db.delete(key);
            if (removed) indexesRemoved++;
        }
        console.log(`   Removed ${indexesRemoved} status indexes`);

        // Remove days sets
        const daysKeys = await db.keys('user:*:reports:daily:days');
        console.log(`   Found ${daysKeys.length} days sets`);
        
        indexesRemoved = 0;
        for (const key of daysKeys) {
            const removed = await db.delete(key);
            if (removed) indexesRemoved++;
        }
        console.log(`   Removed ${indexesRemoved} days sets`);
        console.log('');

        console.log('='.repeat(80));
        console.log('✅ ROLLBACK COMPLETE');
        console.log('='.repeat(80));
        console.log(`Deleted ${deleteResult.deletedCount} reports and all associated indexes`);
        console.log('');

        process.exit(0);
    } catch (error) {
        console.error('❌ Rollback failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Run rollback
if (require.main === module) {
    rollback().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { rollback };
