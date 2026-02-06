#!/usr/bin/env node

'use strict';

/**
 * Daily Reports - Index Rebuild Script
 * 
 * This script rebuilds all indexes for daily reports from existing data
 * Useful if indexes get corrupted or out of sync
 * 
 * Usage:
 *   node rebuild-daily-report-indexes.js [options]
 * 
 * Options:
 *   --dry-run           Preview changes without modifying database
 *   --uid <uid>         Rebuild indexes for specific user only
 *   --clear             Clear existing indexes before rebuilding
 */

const db = require('../src/database');
const helpers = require('../src/reports/helpers');
const { collections } = require('../src/database/mongo/collections');

const reportsCollection = { collection: collections.REPORTS };

// Parse arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const clearIndexes = args.includes('--clear');
const uidIndex = args.indexOf('--uid');
const targetUid = uidIndex >= 0 ? parseInt(args[uidIndex + 1], 10) : null;

const rebuildStats = {
    reportsProcessed: 0,
    userIndexes: 0,
    monthIndexes: new Set(),
    statusIndexes: 0,
    daysSets: 0,
    errors: [],
};

async function rebuild() {
    console.log('='.repeat(80));
    console.log('Daily Reports - INDEX REBUILD');
    console.log('='.repeat(80));
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
    if (targetUid) {
        console.log(`Target: User ${targetUid} only`);
    }
    if (clearIndexes && !dryRun) {
        console.log('⚠️  Will clear existing indexes first');
    }
    console.log('='.repeat(80));
    console.log('');

    try {
        // Step 1: Clear existing indexes if requested
        if (clearIndexes && !dryRun) {
            console.log('🗑️  Step 1: Clearing existing indexes...');
            await clearExistingIndexes();
            console.log('   ✓ Indexes cleared');
            console.log('');
        } else if (clearIndexes && dryRun) {
            console.log('⏭️  Step 1: Would clear indexes (skipped in dry-run)');
            console.log('');
        } else {
            console.log('⏭️  Step 1: Keeping existing indexes (--clear not specified)');
            console.log('');
        }

        // Step 2: Get all reports
        console.log('📂 Step 2: Loading reports...');
        const query = targetUid 
            ? { _key: new RegExp(`^reports:daily:user:${targetUid}:`), uid: targetUid }
            : { _key: /^reports:daily:user:/ };
        
        const reports = await db.findFields(reportsCollection, query);
        console.log(`   Found ${reports.length} reports`);
        console.log('');

        if (reports.length === 0) {
            console.log('✓ No reports to process');
            process.exit(0);
        }

        // Step 3: Rebuild indexes
        console.log('🔨 Step 3: Rebuilding indexes...');
        await rebuildIndexes(reports);
        console.log(`   ✓ Processed ${rebuildStats.reportsProcessed} reports`);
        console.log('');

        // Summary
        console.log('='.repeat(80));
        console.log('Rebuild Summary');
        console.log('='.repeat(80));
        console.log(`Reports Processed:        ${rebuildStats.reportsProcessed}`);
        console.log(`User Indexes Created:     ${rebuildStats.userIndexes}`);
        console.log(`Monthly Indexes Created:  ${rebuildStats.monthIndexes.size}`);
        console.log(`Status Indexes Created:   ${rebuildStats.statusIndexes}`);
        console.log(`Days Sets Updated:        ${rebuildStats.daysSets}`);
        console.log(`Errors:                   ${rebuildStats.errors.length}`);
        console.log('='.repeat(80));

        if (rebuildStats.errors.length > 0) {
            console.log('\n❌ Errors encountered:');
            rebuildStats.errors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
            if (rebuildStats.errors.length > 10) {
                console.log(`  ... and ${rebuildStats.errors.length - 10} more`);
            }
        }

        if (dryRun) {
            console.log('\n⚠️  DRY RUN - No changes were made');
        } else {
            console.log('\n✅ INDEX REBUILD COMPLETE');
        }

        process.exit(rebuildStats.errors.length > 0 ? 1 : 0);
    } catch (error) {
        console.error('❌ Rebuild failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

async function clearExistingIndexes() {
    const keysToDelete = [];

    // User indexes
    const userKeys = await db.keys('user:*:reports:daily');
    keysToDelete.push(...userKeys);

    // Monthly indexes
    const monthKeys = await db.keys('reports:daily:date:*');
    keysToDelete.push(...monthKeys);

    // Status indexes
    const statusKeys = await db.keys('reports:daily:status:*');
    keysToDelete.push(...statusKeys);

    // Days sets
    const daysKeys = await db.keys('user:*:reports:daily:days');
    keysToDelete.push(...daysKeys);

    console.log(`   Found ${keysToDelete.length} index keys to clear`);

    for (const key of keysToDelete) {
        await db.delete(key);
    }
}

async function rebuildIndexes(reports) {
    const batchSize = 100;
    const batches = [];

    // Split into batches
    for (let i = 0; i < reports.length; i += batchSize) {
        batches.push(reports.slice(i, i + batchSize));
    }

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        for (const report of batch) {
            try {
                await rebuildReportIndexes(report);
                rebuildStats.reportsProcessed++;
            } catch (error) {
                rebuildStats.errors.push(`${report._key}: ${error.message}`);
            }
        }

        // Progress
        const progress = ((i + 1) / batches.length * 100).toFixed(1);
        console.log(`   → Progress: ${progress}%`);
    }
}

async function rebuildReportIndexes(report) {
    const uid = report.uid;
    const date = report.date;
    const key = report._key;
    const timestamp = new Date(report.createdAt).getTime();

    if (!uid || !date || !key) {
        throw new Error('Missing required fields (uid, date, or _key)');
    }

    if (dryRun) {
        // Just count what would be done
        rebuildStats.userIndexes++;
        rebuildStats.monthIndexes.add(date.substring(0, 7));
        if (report.evaluated?.submissionStatus === 'submitted') {
            rebuildStats.statusIndexes++;
        }
        rebuildStats.daysSets++;
        return;
    }

    // User's daily reports index
    await db.sortedSetAdd(`user:${uid}:reports:daily`, timestamp, key);
    rebuildStats.userIndexes++;

    // Monthly reports index
    const monthKey = date.substring(0, 7);
    await db.sortedSetAdd(`reports:daily:date:${monthKey}`, timestamp, key);
    rebuildStats.monthIndexes.add(monthKey);

    // Status index (if submitted)
    if (report.evaluated?.submissionStatus === 'submitted') {
        await db.sortedSetAdd('reports:daily:status:submitted', timestamp, key);
        rebuildStats.statusIndexes++;
    }

    // Days set for user
    await db.setAdd(`user:${uid}:reports:daily:days`, date);
    rebuildStats.daysSets++;
}

// Run rebuild
if (require.main === module) {
    rebuild().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { rebuild };
