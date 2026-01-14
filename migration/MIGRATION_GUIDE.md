# Daily Reports Migration Guide

## Overview

This guide explains how to migrate daily reports from the old JSON export format to the new MongoDB-based storage system with proper UID remapping and index creation.

## Migration Script

**File:** `migrate-daily-reports.js`

The migration script performs the following operations:
1. Loads old report data from JSON export
2. Maps old UIDs to new UIDs using email addresses
3. Validates all data before migration
4. Creates backups of original data
5. Transforms records to new format with remapped UIDs
6. Creates proper database indexes
7. Verifies migration integrity
8. Generates comprehensive reports

## Prerequisites

1. **Database Connection**: Ensure NodeBB database is accessible
2. **User Data**: All users from old system must exist in new system with same email addresses
3. **Input File**: JSON export file (default: `nodebb.daily_activity.json`)
4. **Disk Space**: Sufficient space for backups and reports

## Usage

### Basic Usage (Dry Run)

Always start with a dry run to validate data without making changes:

```bash
cd migration
node migrate-daily-reports.js --dry-run
```

### Live Migration

Once dry run succeeds, perform live migration:

```bash
cd migration
node migrate-daily-reports.js
```

### Advanced Options

```bash
# Specify custom input file
node migrate-daily-reports.js --input ../custom-export.json

# Custom batch size (default: 100)
node migrate-daily-reports.js --batch-size 50

# Skip backup creation (not recommended)
node migrate-daily-reports.js --skip-backup

# Combined options
node migrate-daily-reports.js --input ../data.json --batch-size 200 --dry-run
```

## Migration Process

### Phase 1: Data Loading
- Reads JSON file
- Validates file format
- Counts total records

### Phase 2: UID Mapping
- Extracts all unique UIDs from old data
- Queries database for users by email
- Creates old UID → new UID mapping table
- Validates mapping completeness

### Phase 3: Data Validation
- Validates date formats (YYYY-MM-DD)
- Checks key consistency
- Detects duplicate records
- Verifies all UIDs can be mapped
- Reports validation errors and warnings

### Phase 4: Backup Creation
- Creates timestamped backup in `migration-backups/`
- Skipped in dry-run mode
- Can be disabled with `--skip-backup` (not recommended)

### Phase 5: Data Transformation
- Processes records in batches
- Updates UID fields with new UIDs
- Preserves all other data fields
- Generates new database keys

### Phase 6: Index Creation
For each migrated report, creates:
- `user:{uid}:reports:daily` - User's reports sorted by timestamp
- `reports:daily:date:{YYYY-MM}` - Monthly reports index
- `reports:daily:status:submitted` - Submitted reports index (if applicable)
- `user:{uid}:reports:daily:days` - Set of dates with reports

### Phase 7: Verification
- Samples 100 random records
- Verifies records exist in database
- Checks UID remapping correctness
- Validates data integrity

### Phase 8: Report Generation
Generates comprehensive migration report with:
- Execution statistics
- UID mapping details
- Index creation counts
- Validation results
- Errors and warnings
- Detailed per-user breakdown

## Output Files

### Migration Reports

**Location:** `migration-reports/` (created in parent directory)

**Filename:** `daily-reports-migration-{timestamp}.json`

**Contents:**
```json
{
  "executionTime": "2026-01-14T12:00:00.000Z",
  "duration": "45.23s",
  "mode": "live",
  "totalRecords": 222,
  "successfulMigrations": 222,
  "failedMigrations": 0,
  "uidMappingStatistics": {
    "uniqueOldUids": 49,
    "uniqueNewUids": 49,
    "mappingComplete": true
  },
  "indexCreationStatistics": {
    "userDailyReportIndexes": 222,
    "monthlyDateIndexes": 4,
    "monthlyDateIndexesList": ["2026-01", "2026-02", "2026-03", "2026-04"],
    "statusIndexes": 200,
    "daysSetsCreated": 222
  },
  "validationResults": {
    "isValid": true,
    "errors": [],
    "warnings": [],
    "totalRecords": 222,
    "duplicates": 0,
    "allDatesValid": true,
    "noDuplicateKeys": true,
    "allUidsRemapped": true
  },
  "detailedMapping": [
    {
      "oldUid": 5180,
      "newUid": 10001,
      "recordCount": 5,
      "dateRange": "2026-01-01 to 2026-01-05"
    }
  ],
  "errors": [],
  "warnings": [],
  "duplicateKeys": []
}
```

### Backup Files

**Location:** `migration-backups/` (created in parent directory)

**Filename:** `daily-reports-backup-{timestamp}.json`

**Contents:** Complete copy of input JSON data

### Error Reports

**Location:** `migration-reports/` (created in parent directory)

**Filename:** `daily-reports-error-{timestamp}.json`

**Generated only on fatal errors**

## Data Format

### Old Format (Input)

```json
{
  "_id": { "$oid": "695b37a67ad96480172bacb6" },
  "_key": "report:user:6655:2026-01-05",
  "uid": 6655,
  "date": "2026-01-05",
  "email": "user@example.com",
  "plan": [...],
  "report": "...",
  "frameworks": [...],
  "evaluated": {...},
  "createdAt": "2026-01-05T04:01:42.545Z",
  "updatedAt": "2026-01-05T13:31:13.134Z",
  "loginAt": "2026-01-05T04:01:42.579Z",
  "logoutAt": "2026-01-05T13:31:22.017Z",
  "updatedCount": 1,
  "modifiedAt": "2026-01-05T13:29:09.951Z",
  "conversationId": "..."
}
```

### New Format (Output)

**Key Pattern:** `reports:daily:user:{NEW_UID}:{date}`

**Document:**
```javascript
{
  uid: 10001,                              // REMAPPED from 6655
  date: "2026-01-05",                      // PRESERVED
  email: "user@example.com",               // PRESERVED
  plan: [...],                             // PRESERVED
  report: "...",                           // PRESERVED
  frameworks: [...],                       // PRESERVED
  evaluated: {...},                        // PRESERVED
  createdAt: "2026-01-05T04:01:42.545Z",   // PRESERVED
  updatedAt: "2026-01-05T13:31:13.134Z",   // PRESERVED
  loginAt: "2026-01-05T04:01:42.579Z",     // PRESERVED
  logoutAt: "2026-01-05T13:31:22.017Z",    // PRESERVED
  updatedCount: 1,                         // PRESERVED
  modifiedAt: "2026-01-05T13:29:09.951Z",  // PRESERVED
  conversationId: "..."                    // PRESERVED
}
```

## Troubleshooting

### Common Issues

#### 1. UID Mapping Failures

**Symptom:** Warning messages about unmapped UIDs

**Cause:** User doesn't exist in new system or email mismatch

**Solution:**
- Ensure all users from old system exist in new system
- Verify email addresses match exactly
- Check for typos in email addresses
- Review warnings in migration report

#### 2. Duplicate Keys

**Symptom:** Validation error about duplicate keys

**Cause:** Multiple reports for same user on same date

**Solution:**
- Review duplicate records manually
- Decide merge strategy (keep latest, keep most complete, etc.)
- Manually deduplicate before migration

#### 3. Invalid Date Formats

**Symptom:** Validation error about date format

**Cause:** Date not in YYYY-MM-DD format

**Solution:**
- Fix dates in source data
- Ensure all dates match pattern `^\d{4}-\d{2}-\d{2}$`

#### 4. Memory Issues

**Symptom:** Out of memory errors with large datasets

**Solution:**
- Reduce batch size: `--batch-size 50`
- Process data in chunks
- Increase Node.js memory: `node --max-old-space-size=4096 migrate-daily-reports.js`

### Validation Failures

If dry run shows validation errors:

1. Review validation report in console output
2. Fix errors in source data
3. Re-run dry run
4. Only proceed to live migration after clean dry run

### Migration Failures

If live migration fails:

1. Check error report in `migration-reports/`
2. Review failed records and error messages
3. Restore from backup if needed
4. Fix issues and re-run

## Rollback Procedure

If migration needs to be reversed:

### 1. Stop All Services
```bash
./nodebb stop
```

### 2. Clear Migrated Data

**MongoDB:**
```javascript
// Connect to MongoDB
db.objects.deleteMany({ _key: /^reports:daily:user:/ });
```

**Redis Keys:**
```bash
# Remove sorted sets
redis-cli --scan --pattern "user:*:reports:daily" | xargs redis-cli del
redis-cli --scan --pattern "reports:daily:date:*" | xargs redis-cli del
redis-cli --scan --pattern "reports:daily:status:*" | xargs redis-cli del
redis-cli --scan --pattern "user:*:reports:daily:days" | xargs redis-cli del
```

### 3. Verify Cleanup
```bash
# Check no daily reports remain
redis-cli --scan --pattern "*:reports:daily*"
```

### 4. Re-run Migration
Fix issues and re-run migration script

## Performance Considerations

### Batch Size
- **Default:** 100 records per batch
- **Large datasets (>10,000):** Use 50-100
- **Small datasets (<1,000):** Can use 200-500
- **Memory constrained:** Use 25-50

### Execution Time
- **~1-2 seconds per 100 records**
- **222 records ≈ 5-10 seconds**
- **10,000 records ≈ 3-5 minutes**

### Database Load
- Migration uses batch operations
- Indexes created per-record (cannot be batched)
- Monitor database performance during migration
- Consider running during low-traffic periods

## Best Practices

1. **Always run dry run first**
2. **Review validation warnings carefully**
3. **Keep backups**
4. **Test on staging environment first**
5. **Run during maintenance window**
6. **Monitor database performance**
7. **Verify migration report**
8. **Spot-check random records manually**

## Verification

After migration, verify:

### 1. Record Count
```javascript
// Check total reports migrated
db.objects.count({ _key: /^reports:daily:user:/ })
```

### 2. Sample Records
```javascript
// Check a few records manually
db.objects.findOne({ _key: 'reports:daily:user:10001:2026-01-05' })
```

### 3. Indexes
```bash
# Check index keys exist
redis-cli keys "user:*:reports:daily" | head -10
redis-cli keys "reports:daily:date:*"
```

### 4. Application Testing
- Login as various users
- View daily reports
- Submit new reports
- Verify old reports display correctly

## Helper Scripts

### Verification Script

**File:** `verify-daily-reports.js`

Verifies the integrity of migrated reports:

```bash
cd migration

# Basic verification (samples 50 records)
node verify-daily-reports.js

# Custom sample size
node verify-daily-reports.js --sample-size 100

# Full verification (checks all records)
node verify-daily-reports.js --full

# Verify specific user
node verify-daily-reports.js --uid 10001

# Verify specific date
node verify-daily-reports.js --date 2026-01-05
```

### Rollback Script

**File:** `rollback-daily-reports.js`

Removes all migrated reports and indexes:

```bash
cd migration

# Full rollback (requires confirmation)
node rollback-daily-reports.js --confirm

# Keep reports after specific date
node rollback-daily-reports.js --confirm --keep-after 2026-01-10
```

⚠️  **WARNING:** Rollback is destructive and cannot be undone!

### Index Rebuild Script

**File:** `rebuild-daily-report-indexes.js`

Rebuilds indexes from existing report data:

```bash
cd migration

# Preview what would be rebuilt
node rebuild-daily-report-indexes.js --dry-run

# Rebuild all indexes
node rebuild-daily-report-indexes.js

# Clear and rebuild all indexes
node rebuild-daily-report-indexes.js --clear

# Rebuild indexes for specific user
node rebuild-daily-report-indexes.js --uid 10001
```

Use this if indexes get corrupted or out of sync.

## Support

For issues or questions:
1. Review migration report for detailed error messages
2. Check validation warnings
3. Verify prerequisites are met
4. Review troubleshooting section
5. Use helper scripts for verification and debugging
6. Contact development team with error report

## Migration Checklist

- [ ] Backup current database
- [ ] Verify all users exist in new system
- [ ] Prepare input JSON file (place in backend root directory)
- [ ] Change to migration directory: `cd migration`
- [ ] Run dry run: `node migrate-daily-reports.js --dry-run`
- [ ] Review dry run report
- [ ] Fix any validation errors
- [ ] Run dry run again until clean
- [ ] Schedule maintenance window
- [ ] Stop application services (optional but recommended)
- [ ] Run live migration: `node migrate-daily-reports.js`
- [ ] Review migration report
- [ ] Verify sample records: `node verify-daily-reports.js`
- [ ] Test application functionality
- [ ] Monitor for issues
- [ ] Keep backups for rollback if needed
- [ ] Document migration results

## Technical Details

### Key Generation
```javascript
helpers.getDailyReportKey(uid, date)
// Returns: "reports:daily:user:{uid}:{date}"
```

### Index Keys
- User reports: `user:{uid}:reports:daily` (sorted set by timestamp)
- Monthly index: `reports:daily:date:{YYYY-MM}` (sorted set by timestamp)
- Status index: `reports:daily:status:submitted` (sorted set by timestamp)
- Days set: `user:{uid}:reports:daily:days` (set of date strings)

### Timestamp Handling
- Uses original `createdAt` for sorted set scores
- Preserves all original timestamps
- Ensures chronological ordering

### Email Matching
- Case-insensitive email comparison
- Queries database via `User.getUidByEmail(email)`
- Falls back to warnings if email not found
