# Daily Reports Migration Scripts

This folder contains scripts for migrating daily reports from the old JSON export format to the new MongoDB-based system.

## Scripts

### 1. migrate-daily-reports.js
Main migration script that handles UID remapping, data transformation, and index creation.

**Usage:**
```bash
cd migration
node migrate-daily-reports.js --dry-run
node migrate-daily-reports.js
```

### 2. verify-daily-reports.js
Verification script to check migration integrity.

**Usage:**
```bash
cd migration
node verify-daily-reports.js
node verify-daily-reports.js --full
```

### 3. rollback-daily-reports.js
Rollback script to remove migrated data (use with caution).

**Usage:**
```bash
cd migration
node rollback-daily-reports.js --confirm
```

### 4. rebuild-daily-report-indexes.js
Index rebuild script for fixing corrupted indexes.

**Usage:**
```bash
cd migration
node rebuild-daily-report-indexes.js --dry-run
node rebuild-daily-report-indexes.js --clear
```

## Documentation

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed documentation.

## Quick Start

1. **Prepare input file:** Place `nodebb.daily_activity.json` in the backend root directory

2. **Run dry run:**
   ```bash
   cd migration
   node migrate-daily-reports.js --dry-run
   ```

3. **Review the output** and fix any validation errors

4. **Run live migration:**
   ```bash
   node migrate-daily-reports.js
   ```

5. **Verify migration:**
   ```bash
   node verify-daily-reports.js
   ```

## Output Directories

- `../migration-backups/` - Backup files
- `../migration-reports/` - Migration reports and logs

## Important Notes

- Always run dry run first
- Review validation warnings
- Keep backups
- Test on staging first
- Run during maintenance window
