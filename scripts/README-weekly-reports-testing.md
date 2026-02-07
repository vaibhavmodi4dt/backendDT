# Weekly Reports Testing Guide

This guide explains how to test weekly report generation for specific dates without modifying production code.

## Quick Start

### Test Current Week (All Users)
```bash
node scripts/test-weekly-reports.js
```

### Test Specific Week (All Users)
```bash
node scripts/test-weekly-reports.js --week 2026-01-05
```

### Test Specific User (Current Week)
```bash
node scripts/test-weekly-reports.js --user 112
```

### Test Specific User and Week
```bash
node scripts/test-weekly-reports.js --week 2026-01-05 --user 112
```

## Command Line Options

| Option | Description | Example |
|--------|-------------|---------|
| `--week <date>` | Specify week start date (Monday, YYYY-MM-DD format) | `--week 2026-01-05` |
| `--user <uid>` | Test for a specific user ID | `--user 112` |
| `--help` or `-h` | Show help message | `--help` |

## How It Works

1. **Week Calculation**: If you provide `--week 2026-01-05`, the script automatically calculates the week end date (Sunday)
2. **Active Users**: The script finds all users who submitted daily reports during the specified week
3. **Report Generation**: Calls the AI service to evaluate daily reports and generate weekly summaries
4. **Database**: Saves the generated reports to the `reports` collection

## Testing Scenarios

### Scenario 1: Test a Past Week
```bash
# Generate reports for the week of Jan 5-11, 2026
node scripts/test-weekly-reports.js --week 2026-01-05
```

**Expected Output:**
- Lists number of active users found
- Shows batch processing progress
- Reports success/skip/failure counts

### Scenario 2: Debug a Specific User
```bash
# Check why user 112's report might have failed
node scripts/test-weekly-reports.js --week 2026-01-05 --user 112
```

**Expected Output:**
- Shows if user has daily reports for that week
- Shows AI evaluation result
- Reports skip reason if applicable

### Scenario 3: Current Week Production Simulation
```bash
# Simulate what the Sunday cron job would do
node scripts/test-weekly-reports.js
```

**Expected Output:**
- Uses current week dates
- Processes all active users
- Same behavior as production cron job

## Using Node.js REPL for Interactive Testing

You can also test using the Node.js REPL for more control:

```bash
# Start Node.js REPL with your app
node
```

```javascript
// Initialize database
const db = require('./src/database');
await db.init();

// Load weekly reports
const WeeklyReports = require('./src/reports/weekly');

// Test: Get active users for a specific week
const activeUsers = await WeeklyReports.getActiveUsers('2026-01-05', '2026-01-11');
console.log('Active users:', activeUsers);

// Test: Generate for a specific user and week
const result = await WeeklyReports.generateForUser(112, '2026-01-05');
console.log('Result:', result);

// Test: Generate for all users (specific week)
const results = await WeeklyReports.generateAllWeeklyReports({
    weekStartStr: '2026-01-05',
    weekEndStr: '2026-01-11'
});
console.log('Results:', results);

// Test: Manual trigger with options
const results2 = await WeeklyReports.manualTrigger({
    weekStartStr: '2026-01-05',
    weekEndStr: '2026-01-11'
});

// Clean up
await db.close();
```

## Troubleshooting

### No Active Users Found
**Problem:** `No active users found. Nothing to generate.`

**Solution:**
1. Verify users have daily reports for that week
2. Check the date format (must be YYYY-MM-DD)
3. Verify the date is a Monday (week start)

```bash
# Check what's in the database for a specific date
node -e "
const db = require('./src/database');
await db.init();
const keys = await db.scan({ match: 'reports:daily:user:*:2026-01-05' }, { collection: 'reports' });
console.log('Found keys:', keys);
await db.close();
"
```

### All Reports Skipped
**Problem:** `Results: 0 successful, 44 skipped, 0 failed`

**Common reasons:**
- `no_daily_reports`: User has no daily reports for that week
- `already_submitted`: Report already generated and submitted
- `cached`: AI service failed but cached report exists

**Debug:**
```bash
# Check a specific user
node scripts/test-weekly-reports.js --week 2026-01-05 --user 112
```

### AI Service Errors
**Problem:** `AI service failed: ...`

**Solution:**
1. Check AI service is running
2. Verify API endpoint configuration
3. Check network connectivity

## Production vs Testing

### Production (Automatic Cron Job)
- Runs every Sunday at 11:00 PM (configured in `WeeklyReports.startScheduler`)
- Automatically uses current week dates
- Processes all active users
- No manual intervention needed

### Testing (Manual Script)
- Run anytime with any date
- Test specific users or weeks
- Safe to run multiple times
- Useful for debugging and development

## Code Changes Summary

The following functions now support optional date parameters for testing:

1. **`WeeklyReports.generateAllWeeklyReports(options)`**
   - `options.weekStartStr`: Override week start (YYYY-MM-DD)
   - `options.weekEndStr`: Override week end (YYYY-MM-DD)
   - If not provided, uses current week (production mode)

2. **`WeeklyReports.generateForUser(uid, weekStartStr)`**
   - `weekStartStr`: Optional week start date
   - If not provided, uses current week

3. **`WeeklyReports.getActiveUsers(startDate, endDate)`**
   - Required parameters for date range
   - Returns array of user IDs who were active in that period

4. **`WeeklyReports.manualTrigger(options)`**
   - Supports all the options above
   - Convenient wrapper for manual testing

## Best Practices

1. **Always test with past weeks** to avoid affecting current production data
2. **Use `--user` flag** when debugging specific user issues
3. **Check database first** to verify data exists before running reports
4. **Monitor AI service** usage when testing with many users
5. **Document test results** for future reference

## Examples

### Example 1: Weekly Testing Routine
```bash
# Every Monday, test the previous week
node scripts/test-weekly-reports.js --week 2026-01-05

# Verify a few specific users
node scripts/test-weekly-reports.js --week 2026-01-05 --user 112
node scripts/test-weekly-reports.js --week 2026-01-05 --user 116
```

### Example 2: Debugging Failed Reports
```bash
# Step 1: Check if user has daily reports
node -e "
const db = require('./src/database');
await db.init();
const pattern = 'reports:daily:user:112:*';
const keys = await db.scan({ match: pattern }, { collection: 'reports' });
console.log('Daily reports for user 112:', keys);
await db.close();
"

# Step 2: Try generating the report
node scripts/test-weekly-reports.js --week 2026-01-05 --user 112
```

### Example 3: Batch Testing Multiple Weeks
```bash
#!/bin/bash
# Test all weeks in January 2026

for week in 2026-01-05 2026-01-12 2026-01-19 2026-01-26; do
    echo "Testing week: $week"
    node scripts/test-weekly-reports.js --week $week
    echo "---"
done
```

## Support

For issues or questions:
1. Check this guide first
2. Review the logs for error messages
3. Test with a single user to isolate the problem
4. Check database connection and AI service status
