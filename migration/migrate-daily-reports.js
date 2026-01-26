'use strict';

/**
 * NodeBB Daily Reports Migration Script
 * 
 * This script migrates old daily reports from JSON export format to the new MongoDB structure
 * with proper UID remapping and index creation.
 * 
 * Usage:
 *   node migrate-daily-reports.js [options]
 * 
 * Options:
 *   --input <file>       Input JSON file (default: nodebb.daily_activity.json)
 *   --dry-run           Validate and preview changes without writing to database
 *   --batch-size <n>    Process records in batches (default: 100)
 *   --skip-backup       Skip backup creation (not recommended)
 */

const fs = require('fs');
const path = require('path');
const util = require('util');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    input: 'migration/nodebb.daily_activity.json',
    dryRun: args.includes('--dry-run'),
    batchSize: 100,
    skipBackup: args.includes('--skip-backup'),
};

// Parse input file
const inputIndex = args.indexOf('--input');
if (inputIndex >= 0 && args[inputIndex + 1]) {
    options.input = args[inputIndex + 1];
}

// Parse batch size
const batchIndex = args.indexOf('--batch-size');
if (batchIndex >= 0 && args[batchIndex + 1]) {
    options.batchSize = parseInt(args[batchIndex + 1], 10);
}

// NodeBB modules - will be passed from EnvironmentStarter
let db;
let User;
let helpers;
let reportsCollection;

// Migration state
const migrationState = {
    startTime: new Date(),
    totalRecords: 0,
    successfulMigrations: 0,
    failedMigrations: 0,
    errors: [],
    warnings: [],
    uidMapping: new Map(),
    processedKeys: new Set(),
    duplicateKeys: [],
    validationResults: {},
    indexStats: {
        userDailyReportIndexes: 0,
        monthlyDateIndexes: new Set(),
        statusIndexes: 0,
        daysSets: 0,
    },
    detailedMapping: [],
};

/**
 * Main migration function
 * @param {Object} env - Environment object from EnvironmentStarter with { db, User, meta }
 */
async function migrate(env) {
    // Extract modules from environment
    if (env) {
        db = env.db;
        User = env.User;

        // Safely require helper modules after environment is initialized
        const EnvironmentStarter = require('../src/test-utils/environment-starter');
        helpers = EnvironmentStarter.requireModule('../reports/helpers');
        const { collections } = EnvironmentStarter.requireModule('../database/mongo/collections');
        reportsCollection = { collection: collections.REPORTS };
    }
    console.log('='.repeat(80));
    console.log('NodeBB Daily Reports Migration');
    console.log('='.repeat(80));
    console.log(`Mode: ${options.dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE MIGRATION'}`);
    console.log(`Input: ${options.input}`);
    console.log(`Batch Size: ${options.batchSize}`);
    console.log('='.repeat(80));
    console.log('');

    try {
        // Step 1: Load and validate input data
        console.log('📂 Step 1: Loading input data...');
        const oldData = await loadInputData(options.input);
        migrationState.totalRecords = oldData.length;
        console.log(`   ✓ Loaded ${migrationState.totalRecords} records`);
        console.log('');

        // Step 2: Extract UIDs and build mapping
        console.log('🔄 Step 2: Building UID mapping...');
        const uniqueOldUids = extractUniqueUids(oldData);
        console.log(`   ✓ Found ${uniqueOldUids.length} unique UIDs`);

        await buildUidMapping(uniqueOldUids);
        console.log(`   ✓ Mapped ${migrationState.uidMapping.size} UIDs`);
        console.log('');

        // Step 3: Validate mapping
        console.log('✅ Step 3: Validating UID mapping...');
        validateUidMapping(uniqueOldUids);
        console.log(`   ✓ All UIDs mapped successfully`);
        console.log('');

        // Step 4: Validate data
        console.log('🔍 Step 4: Validating input data...');
        const validationReport = validateInputData(oldData);
        migrationState.validationResults = validationReport;

        if (!validationReport.isValid) {
            console.error('   ✗ Validation failed:');
            validationReport.errors.forEach(err => console.error(`     - ${err}`));
            throw new Error('Validation failed - aborting migration');
        }
        console.log(`   ✓ All validations passed`);
        console.log('');

        // Step 5: Create backup (unless dry-run or skip-backup)
        if (!options.dryRun && !options.skipBackup) {
            console.log('💾 Step 5: Creating backup...');
            const backupPath = await createBackup(oldData);
            console.log(`   ✓ Backup created: ${backupPath}`);
            console.log('');
        } else {
            console.log('⏭️  Step 5: Skipping backup (dry-run or --skip-backup)');
            console.log('');
        }

        // Step 6: Transform and migrate data
        console.log('🔄 Step 6: Transforming and migrating data...');
        await transformAndMigrate(oldData);
        console.log(`   ✓ Successfully migrated ${migrationState.successfulMigrations} records`);
        if (migrationState.failedMigrations > 0) {
            console.log(`   ⚠ Failed to migrate ${migrationState.failedMigrations} records`);
        }
        console.log('');

        // Step 7: Verify migration
        if (!options.dryRun) {
            console.log('🔍 Step 7: Verifying migration...');
            await verifyMigration(oldData);
            console.log(`   ✓ Verification complete`);
            console.log('');
        }

        // Step 8: Generate reports
        console.log('📊 Step 8: Generating migration report...');
        const reportPath = await generateMigrationReport();
        console.log(`   ✓ Report saved: ${reportPath}`);
        console.log('');

        // Summary
        console.log('='.repeat(80));
        console.log('Migration Summary');
        console.log('='.repeat(80));
        console.log(`Total Records:        ${migrationState.totalRecords}`);
        console.log(`Successful:           ${migrationState.successfulMigrations}`);
        console.log(`Failed:               ${migrationState.failedMigrations}`);
        console.log(`Unique UIDs:          ${uniqueOldUids.length}`);
        console.log(`User Indexes Created: ${migrationState.indexStats.userDailyReportIndexes}`);
        console.log(`Month Indexes:        ${migrationState.indexStats.monthlyDateIndexes.size}`);
        console.log(`Status Indexes:       ${migrationState.indexStats.statusIndexes}`);
        console.log(`Days Sets Created:    ${migrationState.indexStats.daysSets}`);
        console.log(`Duration:             ${((new Date() - migrationState.startTime) / 1000).toFixed(2)}s`);
        console.log('='.repeat(80));

        if (options.dryRun) {
            console.log('\n⚠️  DRY RUN COMPLETE - No changes were made to the database');
        } else {
            console.log('\n✅ MIGRATION COMPLETE');
        }

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error(error.stack);

        // Save error report
        const errorReportPath = await saveErrorReport(error);
        console.error(`\n📄 Error report saved: ${errorReportPath}`);

        process.exit(1);
    }
}

/**
 * Load input JSON data
 */
async function loadInputData(filePath) {
    const fullPath = path.resolve(filePath);

    if (!fs.existsSync(fullPath)) {
        throw new Error(`Input file not found: ${fullPath}`);
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const data = JSON.parse(content);

    if (!Array.isArray(data)) {
        throw new Error('Input data must be an array of report objects');
    }

    return data;
}

/**
 * Extract unique UIDs from old data
 */
function extractUniqueUids(oldData) {
    const uids = new Set();

    oldData.forEach(record => {
        if (record.uid) {
            uids.add(record.uid);
        }
    });

    return Array.from(uids).sort((a, b) => a - b);
}

/**
 * Build UID mapping from old UIDs to new UIDs
 * In this case, we'll query the database to find users by email
 */
async function buildUidMapping(oldUids) {
    console.log('   → Querying database for user mappings...');

    // Load first few records to get email-to-oldUID mapping
    const inputData = await loadInputData(options.input);
    const emailToOldUid = new Map();

    inputData.forEach(record => {
        if (record.email && record.uid) {
            emailToOldUid.set(record.email.toLowerCase(), record.uid);
        }
    });

    console.log(`   → Found ${emailToOldUid.size} email-to-UID mappings in source data`);

    // For each old UID, find the corresponding user by email
    for (const oldUid of oldUids) {
        // Find email for this UID
        const record = inputData.find(r => r.uid === oldUid);
        if (!record || !record.email) {
            migrationState.warnings.push(`No email found for old UID ${oldUid}`);
            continue;
        }

        // Query database to find user by email
        try {
            const newUid = await User.getUidByEmail(record.email);

            if (!newUid) {
                migrationState.warnings.push(`No user found in database for email: ${record.email} (old UID: ${oldUid})`);
                continue;
            }

            migrationState.uidMapping.set(oldUid, parseInt(newUid, 10));
        } catch (error) {
            migrationState.warnings.push(`Error mapping UID ${oldUid} (${record.email}): ${error.message}`);
        }
    }
}

/**
 * Validate UID mapping
 */
function validateUidMapping(oldUids) {
    const errors = [];

    // Check for orphaned UIDs
    const unmappedUids = oldUids.filter(uid => !migrationState.uidMapping.has(uid));
    if (unmappedUids.length > 0) {
        console.warn(`⚠️  Warning: ${unmappedUids.length} UIDs could not be mapped and will be skipped: ${unmappedUids.join(', ')}`);
        // Return the list of unmapped UIDs so they can be filtered out
        return unmappedUids;
    }

    // Check for duplicate mappings
    const newUids = Array.from(migrationState.uidMapping.values());
    const uniqueNewUids = new Set(newUids);
    if (newUids.length !== uniqueNewUids.size) {
        errors.push('Duplicate new UIDs detected in mapping');
    }

    // Check for null/invalid UIDs
    for (const [oldUid, newUid] of migrationState.uidMapping.entries()) {
        if (!newUid || !Number.isFinite(newUid) || newUid <= 0) {
            errors.push(`Invalid new UID for old UID ${oldUid}: ${newUid}`);
        }
    }

    if (errors.length > 0) {
        throw new Error(`UID mapping validation failed:\n${errors.join('\n')}`);
    }
}

/**
 * Validate input data
 */
function validateInputData(oldData) {
    const errors = [];
    const warnings = [];
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    // Track keys for duplicate detection
    const keySeen = new Map();

    oldData.forEach((record, index) => {
        // Validate required fields
        if (!record.uid) {
            errors.push(`Record ${index}: Missing uid`);
        }
        if (!record.date) {
            errors.push(`Record ${index}: Missing date`);
        }
        if (!record._key) {
            errors.push(`Record ${index}: Missing _key`);
        }

        // Validate date format
        if (record.date && !datePattern.test(record.date)) {
            errors.push(`Record ${index}: Invalid date format: ${record.date}`);
        }

        // Validate date consistency
        if (record._key && record.date) {
            const expectedKey = `report:user:${record.uid}:${record.date}`;
            if (record._key !== expectedKey) {
                errors.push(`Record ${index}: Key mismatch. Expected ${expectedKey}, got ${record._key}`);
            }
        }

        // Check for duplicates
        if (record._key) {
            if (keySeen.has(record._key)) {
                warnings.push(`Duplicate key found: ${record._key} (indexes: ${keySeen.get(record._key)}, ${index})`);
                migrationState.duplicateKeys.push({ key: record._key, indexes: [keySeen.get(record._key), index] });
            } else {
                keySeen.set(record._key, index);
            }
        }

        // Validate UID mapping exists
        if (record.uid && !migrationState.uidMapping.has(record.uid)) {
            warnings.push(`Record ${index}: No UID mapping found for UID ${record.uid}`);
        }
    });

    migrationState.errors.push(...errors);
    migrationState.warnings.push(...warnings);

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        totalRecords: oldData.length,
        duplicates: migrationState.duplicateKeys.length,
    };
}

/**
 * Create backup of input data
 */
async function createBackup(oldData) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, 'migration-backups');
    const backupPath = path.join(backupDir, `daily-reports-backup-${timestamp}.json`);

    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    fs.writeFileSync(backupPath, JSON.stringify(oldData, null, 2), 'utf8');

    return backupPath;
}

/**
 * Transform and migrate data
 */
async function transformAndMigrate(oldData) {
    const batches = [];

    // Split into batches
    for (let i = 0; i < oldData.length; i += options.batchSize) {
        batches.push(oldData.slice(i, i + options.batchSize));
    }

    console.log(`   → Processing ${batches.length} batches...`);

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`   → Batch ${i + 1}/${batches.length} (${batch.length} records)...`);

        await processBatch(batch);

        // Progress indicator
        const progress = ((i + 1) / batches.length * 100).toFixed(1);
        console.log(`   → Progress: ${progress}%`);
    }
}

/**
 * Process a batch of records
 */
async function processBatch(batch) {
    for (const record of batch) {
        try {
            await migrateRecord(record);
            migrationState.successfulMigrations++;
        } catch (error) {
            migrationState.failedMigrations++;
            migrationState.errors.push({
                record: record._key || `uid:${record.uid}:${record.date}`,
                error: error.message,
            });
        }
    }
}

/**
 * Migrate a single record
 */
async function migrateRecord(oldRecord) {
    // Get new UID
    const oldUid = oldRecord.uid;
    const newUid = migrationState.uidMapping.get(oldUid);

    if (!newUid) {
        throw new Error(`No UID mapping found for old UID: ${oldUid}`);
    }

    // Generate new key
    const date = oldRecord.date;
    const newKey = helpers.getDailyReportKey(newUid, date);

    // Check for duplicate
    if (migrationState.processedKeys.has(newKey)) {
        throw new Error(`Duplicate key detected: ${newKey}`);
    }
    migrationState.processedKeys.add(newKey);

    // Transform record
    const newRecord = transformRecord(oldRecord, newUid);

    // Save to database (unless dry-run)
    if (!options.dryRun) {
        await db.setObject(newKey, newRecord, reportsCollection);

        // Create indexes
        await createIndexes(newUid, date, newKey, oldRecord);
    }

    // Update detailed mapping stats
    updateDetailedMapping(oldUid, newUid, date);
}

/**
 * Transform a record from old format to new format
 */
function transformRecord(oldRecord, newUid) {
    // Remove MongoDB-specific fields
    const transformed = { ...oldRecord };
    delete transformed._id;
    delete transformed._key;

    // Update UID
    transformed.uid = newUid;

    // Ensure all required fields are present
    if (!transformed.createdAt) {
        transformed.createdAt = transformed.loginAt || new Date().toISOString();
    }
    if (!transformed.updatedAt) {
        transformed.updatedAt = transformed.createdAt;
    }

    // Preserve all other fields as-is
    return transformed;
}

/**
 * Create indexes for a record
 */
async function createIndexes(uid, date, key, record) {
    const timestamp = new Date(record.createdAt).getTime();

    // User's daily reports index
    await db.sortedSetAdd(`user:${uid}:reports:daily`, timestamp, key);
    migrationState.indexStats.userDailyReportIndexes++;

    // Monthly reports index
    const monthKey = date.substring(0, 7); // YYYY-MM
    await db.sortedSetAdd(`reports:daily:date:${monthKey}`, timestamp, key);
    migrationState.indexStats.monthlyDateIndexes.add(monthKey);

    // Status index (if submitted)
    if (record.evaluated?.submissionStatus === 'submitted') {
        await db.sortedSetAdd('reports:daily:status:submitted', timestamp, key);
        migrationState.indexStats.statusIndexes++;
    }

    // Days set for user
    await db.setAdd(`user:${uid}:reports:daily:days`, date);
    migrationState.indexStats.daysSets++;
}

/**
 * Update detailed mapping statistics
 */
function updateDetailedMapping(oldUid, newUid, date) {
    let mapping = migrationState.detailedMapping.find(m => m.oldUid === oldUid);

    if (!mapping) {
        mapping = {
            oldUid,
            newUid,
            recordCount: 0,
            dates: [],
        };
        migrationState.detailedMapping.push(mapping);
    }

    mapping.recordCount++;
    mapping.dates.push(date);
}

/**
 * Verify migration
 */
async function verifyMigration(oldData) {
    console.log('   → Sampling records for verification...');

    const sampleSize = Math.min(100, oldData.length);
    const sampleIndexes = [];

    // Random sampling
    for (let i = 0; i < sampleSize; i++) {
        const randomIndex = Math.floor(Math.random() * oldData.length);
        sampleIndexes.push(randomIndex);
    }

    let correctCount = 0;
    const sampleErrors = [];

    for (const index of sampleIndexes) {
        const oldRecord = oldData[index];
        const newUid = migrationState.uidMapping.get(oldRecord.uid);

        if (!newUid) continue;

        const newKey = helpers.getDailyReportKey(newUid, oldRecord.date);

        try {
            const dbRecord = await db.getObject(newKey, [], reportsCollection);

            if (!dbRecord) {
                sampleErrors.push(`Record not found in database: ${newKey}`);
                continue;
            }

            // Verify UID was remapped
            if (dbRecord.uid !== newUid) {
                sampleErrors.push(`UID mismatch for ${newKey}: expected ${newUid}, got ${dbRecord.uid}`);
                continue;
            }

            // Verify date preserved
            if (dbRecord.date !== oldRecord.date) {
                sampleErrors.push(`Date mismatch for ${newKey}: expected ${oldRecord.date}, got ${dbRecord.date}`);
                continue;
            }

            correctCount++;
        } catch (error) {
            sampleErrors.push(`Error verifying ${newKey}: ${error.message}`);
        }
    }

    console.log(`   → Verified ${correctCount}/${sampleSize} sampled records`);

    if (sampleErrors.length > 0) {
        console.warn(`   ⚠ Found ${sampleErrors.length} verification errors`);
        migrationState.warnings.push(...sampleErrors);
    }
}

/**
 * Generate migration report
 */
async function generateMigrationReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportDir = path.join(__dirname, 'migration-reports');
    const reportPath = path.join(reportDir, `daily-reports-migration-${timestamp}.json`);

    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }

    // Calculate date ranges for detailed mapping
    migrationState.detailedMapping.forEach(mapping => {
        if (mapping.dates.length > 0) {
            mapping.dates.sort();
            mapping.dateRange = `${mapping.dates[0]} to ${mapping.dates[mapping.dates.length - 1]}`;
            delete mapping.dates; // Remove dates array to keep report size manageable
        }
    });

    const report = {
        executionTime: migrationState.startTime.toISOString(),
        duration: `${((new Date() - migrationState.startTime) / 1000).toFixed(2)}s`,
        mode: options.dryRun ? 'dry-run' : 'live',
        totalRecords: migrationState.totalRecords,
        successfulMigrations: migrationState.successfulMigrations,
        failedMigrations: migrationState.failedMigrations,
        uidMappingStatistics: {
            uniqueOldUids: Array.from(migrationState.uidMapping.keys()).length,
            uniqueNewUids: new Set(migrationState.uidMapping.values()).size,
            mappingComplete: migrationState.uidMapping.size > 0,
        },
        indexCreationStatistics: {
            userDailyReportIndexes: migrationState.indexStats.userDailyReportIndexes,
            monthlyDateIndexes: migrationState.indexStats.monthlyDateIndexes.size,
            monthlyDateIndexesList: Array.from(migrationState.indexStats.monthlyDateIndexes).sort(),
            statusIndexes: migrationState.indexStats.statusIndexes,
            daysSetsCreated: migrationState.indexStats.daysSets,
        },
        validationResults: {
            ...migrationState.validationResults,
            allDatesValid: migrationState.errors.filter(e => e.includes && e.includes('Invalid date')).length === 0,
            noDuplicateKeys: migrationState.duplicateKeys.length === 0,
            allUidsRemapped: migrationState.successfulMigrations === migrationState.totalRecords - migrationState.failedMigrations,
        },
        detailedMapping: migrationState.detailedMapping.sort((a, b) => a.oldUid - b.oldUid),
        errors: migrationState.errors,
        warnings: migrationState.warnings,
        duplicateKeys: migrationState.duplicateKeys,
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

    return reportPath;
}

/**
 * Save error report
 */
async function saveErrorReport(error) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportDir = path.join(__dirname, 'migration-reports');
    const reportPath = path.join(reportDir, `daily-reports-error-${timestamp}.json`);

    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }

    const errorReport = {
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
        state: {
            totalRecords: migrationState.totalRecords,
            successfulMigrations: migrationState.successfulMigrations,
            failedMigrations: migrationState.failedMigrations,
            errors: migrationState.errors,
            warnings: migrationState.warnings,
        },
    };

    fs.writeFileSync(reportPath, JSON.stringify(errorReport, null, 2), 'utf8');

    return reportPath;
}

// Run migration with EnvironmentStarter if called directly
if (require.main === module) {
    console.warn('⚠️  Warning: Running migration directly!');
    console.warn('⚠️  Recommended: use run-daily-reports-migration.js instead');
    console.warn('');

    const EnvironmentStarter = require('../src/test-utils/environment-starter');

    EnvironmentStarter.run(migrate, {
        name: 'Daily Reports Migration',
        loadUser: true,
        loadMeta: true,
    }).then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { migrate };
