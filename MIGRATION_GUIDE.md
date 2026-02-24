# Migration & Test Script Guide

## Problem

When running migration scripts that directly require NodeBB modules, you get Winston logging warnings:

```
[winston] Attempt to write logs with no transports, which can increase memory usage: {"level":"error"}
```

This happens because the modules are loaded before the NodeBB environment (configuration, database, meta) is properly initialized.

## Solution

Use the centralized **EnvironmentStarter** utility located in [src/test-utils/environment-starter.js](./src/test-utils/environment-starter.js).

## Quick Fix for Your Current Issue

Instead of running:
```bash
node migration/migrate-daily-reports.js
```

Run:
```bash
node migration/run-daily-reports-migration.js
```

This wrapper script uses `EnvironmentStarter` to properly initialize the environment before running the migration.

## For Future Scripts

### Option 1: Use the Simple Helper (Recommended)

```javascript
const EnvironmentStarter = require('./src/test-utils/environment-starter');

EnvironmentStarter.run(async (env) => {
    const { db, User, meta } = env;

    // Your migration/test logic here
    const users = await User.getUsers('users:joindate', 0, -1);
    console.log(`Found ${users.length} users`);

}, { name: 'My Script' }).catch(console.error);
```

### Option 2: Manual Setup/Teardown

```javascript
const EnvironmentStarter = require('./src/test-utils/environment-starter');

async function main() {
    try {
        const env = await EnvironmentStarter.init({
            name: 'My Migration',
        });

        // Your logic here
        const { db, User, meta } = env;

    } finally {
        await EnvironmentStarter.shutdown();
    }
}

main().catch(console.error);
```

## Creating New Migration Scripts

1. **Copy the template:**
   ```bash
   cp migration/MIGRATION_SCRIPT_TEMPLATE.js migration/your-script.js
   ```

2. **Edit the template** to implement your logic

3. **Run with dry-run first:**
   ```bash
   node migration/your-script.js --dry-run
   ```

## Resources

| Resource | Description |
|----------|-------------|
| [src/test-utils/README.md](./src/test-utils/README.md) | Main documentation for EnvironmentStarter |
| [src/test-utils/USAGE_EXAMPLES.md](./src/test-utils/USAGE_EXAMPLES.md) | Complete examples and patterns |
| [migration/MIGRATION_SCRIPT_TEMPLATE.js](./migration/MIGRATION_SCRIPT_TEMPLATE.js) | Template for new migration scripts |
| [migration/README.md](./migration/README.md) | Migration-specific documentation |

## Key Features

✅ **Proper initialization order** - Config → Database → Meta → Modules
✅ **Prevents Winston warnings** - Environment ready before modules load
✅ **Automatic cleanup** - `shutdown()` or use `run()` helper
✅ **Silent mode** - For automated scripts
✅ **Flexible module loading** - Load only what you need
✅ **Reusable** - One utility for all scripts

## Migration Script Checklist

- [ ] Use `EnvironmentStarter` for initialization
- [ ] Test with `--dry-run` flag first
- [ ] Create backups before modifying data
- [ ] Log progress clearly
- [ ] Handle errors gracefully
- [ ] Save error reports
- [ ] Clean up with `shutdown()`

## Common Patterns

### Pattern 1: Simple Data Migration

```javascript
const EnvironmentStarter = require('../src/test-utils/environment-starter');

EnvironmentStarter.run(async (env) => {
    const { db } = env;

    console.log('Migrating data...');
    const keys = await db.getSortedSetRange('old:data', 0, -1);

    for (const key of keys) {
        const data = await db.getObject(key);
        await db.setObject(`new:${key}`, transformData(data));
    }

    console.log('✅ Migration complete');
}, { name: 'Data Migration' });
```

### Pattern 2: User Processing

```javascript
const EnvironmentStarter = require('../src/test-utils/environment-starter');

EnvironmentStarter.run(async (env) => {
    const { User } = env;

    const uids = await User.getUidsFromSet('users:joindate', 0, -1);

    for (const uid of uids) {
        const userData = await User.getUserData(uid);
        // Process user...
    }
}, { name: 'User Processing' });
```

### Pattern 3: Batch Processing with Progress

```javascript
const EnvironmentStarter = require('../src/test-utils/environment-starter');

EnvironmentStarter.run(async (env) => {
    const { db } = env;

    const items = await db.getSortedSetRange('items', 0, -1);
    const batchSize = 100;

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);

        // Process batch...

        const progress = ((i + batch.length) / items.length * 100).toFixed(1);
        console.log(`Progress: ${progress}%`);
    }
}, { name: 'Batch Processing' });
```

## Troubleshooting

### Issue: Winston logging warnings

**Cause:** Modules loaded before environment initialized
**Solution:** Use `EnvironmentStarter.init()` before requiring any NodeBB modules

### Issue: Database connection errors

**Cause:** Missing or incorrect `config.json`
**Solution:** Verify database credentials in `config.json`

### Issue: Module not found errors

**Cause:** Wrong path or module doesn't exist
**Solution:** Check module paths are relative to `src/` directory

## Need Help?

- Check [Usage Examples](./src/test-utils/USAGE_EXAMPLES.md) for common patterns
- See [Template](./migration/MIGRATION_SCRIPT_TEMPLATE.js) for a complete example
- Review existing migration scripts in [migration/](./migration/) directory
