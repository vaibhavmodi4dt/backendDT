#!/usr/bin/env node

'use strict';

/**
 * Daily Reports Migration - Verification Script
 * 
 * This script verifies the integrity of migrated daily reports
 * 
 * Usage:
 *   node verify-daily-reports.js [options]
 * 
 * Options:
 *   --sample-size <n>    Number of records to sample (default: 50)
 *   --uid <uid>          Verify specific user's reports
 *   --date <date>        Verify specific date (YYYY-MM-DD)
 *   --full               Full verification (slow for large datasets)
 */

const db = require('../src/database');
const User = require('../src/user');
const helpers = require('../src/reports/helpers');
const { collections } = require('../src/database/mongo/collections');

const reportsCollection = { collection: collections.REPORTS };

// Parse arguments
const args = process.argv.slice(2);
const sampleSizeIndex = args.indexOf('--sample-size');
const sampleSize = sampleSizeIndex >= 0 ? parseInt(args[sampleSizeIndex + 1], 10) : 50;
const uidIndex = args.indexOf('--uid');
const targetUid = uidIndex >= 0 ? parseInt(args[uidIndex + 1], 10) : null;
const dateIndex = args.indexOf('--date');
const targetDate = dateIndex >= 0 ? args[dateIndex + 1] : null;
const fullVerification = args.includes('--full');

const verificationResults = {
    totalChecked: 0,
    passed: 0,
    failed: 0,
    warnings: [],
    errors: [],
    stats: {
        totalReports: 0,
        uniqueUsers: 0,
        dateRange: { min: null, max: null },
        submittedReports: 0,
        reportsWithPlans: 0,
        reportsWithFrameworks: 0,
        reportsWithEvaluations: 0,
    },
};

async function verify() {
    console.log('='.repeat(80));
    console.log('Daily Reports Migration - VERIFICATION');
    console.log('='.repeat(80));
    console.log('');

    try {
        // Step 1: Count reports
        console.log('📊 Step 1: Gathering statistics...');
        await gatherStatistics();
        console.log(`   Total reports: ${verificationResults.stats.totalReports}`);
        console.log(`   Unique users: ${verificationResults.stats.uniqueUsers}`);
        console.log(`   Date range: ${verificationResults.stats.dateRange.min} to ${verificationResults.stats.dateRange.max}`);
        console.log(`   Submitted reports: ${verificationResults.stats.submittedReports}`);
        console.log('');

        // Step 2: Verify indexes
        console.log('🔍 Step 2: Verifying indexes...');
        await verifyIndexes();
        console.log('   ✓ Index verification complete');
        console.log('');

        // Step 3: Verify data integrity
        console.log('🔍 Step 3: Verifying data integrity...');
        await verifyDataIntegrity();
        console.log('   ✓ Data integrity checks complete');
        console.log('');

        // Step 4: Sample verification
        if (!targetUid && !targetDate) {
            console.log(`🔍 Step 4: Sampling ${fullVerification ? 'all' : sampleSize} records...`);
            await sampleVerification();
            console.log(`   ✓ Sampled ${verificationResults.totalChecked} records`);
            console.log('');
        }

        // Summary
        console.log('='.repeat(80));
        console.log('Verification Summary');
        console.log('='.repeat(80));
        console.log(`Total Checked:     ${verificationResults.totalChecked}`);
        console.log(`Passed:            ${verificationResults.passed}`);
        console.log(`Failed:            ${verificationResults.failed}`);
        console.log(`Warnings:          ${verificationResults.warnings.length}`);
        console.log(`Errors:            ${verificationResults.errors.length}`);
        console.log('='.repeat(80));

        if (verificationResults.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            verificationResults.warnings.slice(0, 10).forEach(w => console.log(`  - ${w}`));
            if (verificationResults.warnings.length > 10) {
                console.log(`  ... and ${verificationResults.warnings.length - 10} more`);
            }
        }

        if (verificationResults.errors.length > 0) {
            console.log('\n❌ Errors:');
            verificationResults.errors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
            if (verificationResults.errors.length > 10) {
                console.log(`  ... and ${verificationResults.errors.length - 10} more`);
            }
        }

        if (verificationResults.failed === 0 && verificationResults.errors.length === 0) {
            console.log('\n✅ VERIFICATION PASSED');
        } else {
            console.log('\n⚠️  VERIFICATION COMPLETED WITH ISSUES');
        }

        process.exit(verificationResults.failed > 0 || verificationResults.errors.length > 0 ? 1 : 0);
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

async function gatherStatistics() {
    // Get all reports
    const query = targetUid 
        ? { _key: new RegExp(`^reports:daily:user:${targetUid}:`), uid: targetUid }
        : { _key: /^reports:daily:user:/ };

    if (targetDate) {
        query.date = targetDate;
    }

    const reports = await db.findFields(reportsCollection, query, ['uid', 'date', 'evaluated', 'plan', 'frameworks']);
    
    verificationResults.stats.totalReports = reports.length;

    if (reports.length === 0) {
        return;
    }

    // Unique users
    const uids = new Set(reports.map(r => r.uid));
    verificationResults.stats.uniqueUsers = uids.size;

    // Date range
    const dates = reports.map(r => r.date).sort();
    verificationResults.stats.dateRange.min = dates[0];
    verificationResults.stats.dateRange.max = dates[dates.length - 1];

    // Count by type
    verificationResults.stats.submittedReports = reports.filter(
        r => r.evaluated?.submissionStatus === 'submitted'
    ).length;
    verificationResults.stats.reportsWithPlans = reports.filter(r => r.plan && r.plan.length > 0).length;
    verificationResults.stats.reportsWithFrameworks = reports.filter(r => r.frameworks && r.frameworks.length > 0).length;
    verificationResults.stats.reportsWithEvaluations = reports.filter(r => r.evaluated).length;
}

async function verifyIndexes() {
    const query = targetUid 
        ? { _key: new RegExp(`^reports:daily:user:${targetUid}:`), uid: targetUid }
        : { _key: /^reports:daily:user:/ };

    if (targetDate) {
        query.date = targetDate;
    }

    const reports = await db.findFields(reportsCollection, query, ['uid', 'date', '_key', 'evaluated', 'createdAt']);

    for (const report of reports) {
        const key = report._key;
        const uid = report.uid;
        const date = report.date;

        // Verify user index
        const userIndexKey = `user:${uid}:reports:daily`;
        const inUserIndex = await db.isSortedSetMember(userIndexKey, key);
        if (!inUserIndex) {
            verificationResults.errors.push(`Missing user index: ${userIndexKey} -> ${key}`);
        }

        // Verify monthly index
        const monthKey = date.substring(0, 7);
        const monthIndexKey = `reports:daily:date:${monthKey}`;
        const inMonthIndex = await db.isSortedSetMember(monthIndexKey, key);
        if (!inMonthIndex) {
            verificationResults.errors.push(`Missing month index: ${monthIndexKey} -> ${key}`);
        }

        // Verify status index if submitted
        if (report.evaluated?.submissionStatus === 'submitted') {
            const inStatusIndex = await db.isSortedSetMember('reports:daily:status:submitted', key);
            if (!inStatusIndex) {
                verificationResults.errors.push(`Missing status index for submitted report: ${key}`);
            }
        }

        // Verify days set
        const daysSetKey = `user:${uid}:reports:daily:days`;
        const inDaysSet = await db.isSetMember(daysSetKey, date);
        if (!inDaysSet) {
            verificationResults.errors.push(`Missing days set entry: ${daysSetKey} -> ${date}`);
        }
    }
}

async function verifyDataIntegrity() {
    const query = targetUid 
        ? { _key: new RegExp(`^reports:daily:user:${targetUid}:`), uid: targetUid }
        : { _key: /^reports:daily:user:/ };

    if (targetDate) {
        query.date = targetDate;
    }

    const reports = await db.findFields(reportsCollection, query);

    for (const report of reports) {
        verificationResults.totalChecked++;

        let passed = true;

        // Check required fields
        if (!report.uid) {
            verificationResults.errors.push(`${report._key}: Missing uid`);
            passed = false;
        }
        if (!report.date) {
            verificationResults.errors.push(`${report._key}: Missing date`);
            passed = false;
        }
        if (!report.createdAt) {
            verificationResults.errors.push(`${report._key}: Missing createdAt`);
            passed = false;
        }

        // Verify key format
        const expectedKey = helpers.getDailyReportKey(report.uid, report.date);
        if (report._key !== expectedKey) {
            verificationResults.errors.push(`${report._key}: Key mismatch, expected ${expectedKey}`);
            passed = false;
        }

        // Verify date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(report.date)) {
            verificationResults.errors.push(`${report._key}: Invalid date format: ${report.date}`);
            passed = false;
        }

        // Verify UID is valid
        if (!Number.isFinite(report.uid) || report.uid <= 0) {
            verificationResults.errors.push(`${report._key}: Invalid UID: ${report.uid}`);
            passed = false;
        }

        // Check for old UID patterns (should all be remapped)
        if (report.uid >= 5000 && report.uid < 10000) {
            verificationResults.warnings.push(`${report._key}: UID ${report.uid} looks like old UID (not remapped?)`);
        }

        if (passed) {
            verificationResults.passed++;
        } else {
            verificationResults.failed++;
        }
    }
}

async function sampleVerification() {
    const query = { _key: /^reports:daily:user:/ };
    const allReports = await db.findFields(reportsCollection, query, ['_key', 'uid', 'date', 'email']);

    if (allReports.length === 0) {
        return;
    }

    const toCheck = fullVerification ? allReports : sampleRecords(allReports, sampleSize);

    for (const report of toCheck) {
        const key = report._key;
        
        // Verify record exists and is accessible
        const fullReport = await db.getObject(key, [], reportsCollection);
        
        if (!fullReport) {
            verificationResults.errors.push(`Record not found: ${key}`);
            verificationResults.failed++;
            continue;
        }

        // Verify user exists
        if (report.email) {
            try {
                const userExists = await User.getUidByEmail(report.email);
                if (!userExists) {
                    verificationResults.warnings.push(`User not found for email: ${report.email} (${key})`);
                }
            } catch (error) {
                verificationResults.warnings.push(`Error verifying user for ${key}: ${error.message}`);
            }
        }

        verificationResults.passed++;
    }

    verificationResults.totalChecked += toCheck.length;
}

function sampleRecords(records, count) {
    if (records.length <= count) {
        return records;
    }

    const sampled = [];
    const step = Math.floor(records.length / count);

    for (let i = 0; i < count; i++) {
        const index = i * step;
        sampled.push(records[index]);
    }

    return sampled;
}

// Run verification
if (require.main === module) {
    verify().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { verify };
