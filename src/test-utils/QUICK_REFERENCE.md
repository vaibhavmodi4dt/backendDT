# EnvironmentStarter Quick Reference

## 30-Second Quick Start

```javascript
const Env = require('./src/test-utils/environment-starter');

Env.run(async ({ db, User, meta }) => {
    // Your code here
}, { name: 'My Script' });
```

## Common Commands

| Command | Description |
|---------|-------------|
| `Env.run(fn, opts)` | Run with auto setup/teardown |
| `Env.init(opts)` | Initialize environment |
| `Env.shutdown()` | Clean up resources |
| `Env.requireModule(path)` | Safe require after init |

## Options Cheat Sheet

```javascript
{
    name: 'Script Name',      // For logging (default: 'NodeBB Script')
    silent: false,            // Suppress output (default: false)
    loadUser: true,           // Load User module (default: true)
    loadMeta: true,           // Load meta configs (default: true)
    modules: ['posts'],       // Additional modules (default: [])
    rootDir: '/path/to/root', // Custom root (default: auto-detect)
}
```

## Copy-Paste Templates

### 1. Simplest (Recommended)

```javascript
const Env = require('../src/test-utils/environment-starter');

Env.run(async ({ db, User, meta }) => {
    // Your logic
}, { name: 'My Script' });
```

### 2. Manual Control

```javascript
const Env = require('../src/test-utils/environment-starter');

async function main() {
    try {
        const env = await Env.init({ name: 'My Script' });
        // Use env.db, env.User, env.meta
    } finally {
        await Env.shutdown();
    }
}
main();
```

### 3. With Additional Modules

```javascript
const Env = require('../src/test-utils/environment-starter');

Env.run(async ({ db, User, posts, topics }) => {
    // Your logic
}, {
    name: 'My Script',
    modules: ['posts', 'topics']
});
```

### 4. Silent Mode

```javascript
const Env = require('../src/test-utils/environment-starter');

Env.run(async ({ db }) => {
    // Your logic
}, {
    name: 'Automated Task',
    silent: true
});
```

### 5. Test Suite

```javascript
const Env = require('../src/test-utils/environment-starter');

describe('Tests', function() {
    before(() => Env.init({ name: 'Test Suite' }));
    after(() => Env.shutdown());

    it('should work', async () => {
        const { User } = Env.initializedModules;
        // Test logic
    });
});
```

## Module Loading Reference

| Module | Import As | Common Methods |
|--------|-----------|----------------|
| database | `db` | `getObject()`, `setObject()`, `getSortedSetRange()` |
| user | `User` | `getUsers()`, `getUserData()`, `create()` |
| meta | `meta` | `configs.get()`, `configs.set()` |
| posts | `posts` | `getPosts()`, `create()` |
| topics | `topics` | `getTopics()`, `create()` |
| categories | `categories` | `getAllCategories()` |

## Error Messages & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| Winston logging warnings | Modules loaded before init | Use `Env.init()` first |
| "Environment must be initialized" | Called `requireModule()` too early | Call `init()` before `requireModule()` |
| "Environment already initialized" | Info: using cached modules | No action needed |
| Database connection failed | Bad config.json | Check database credentials |

## Command Line Patterns

### Migration Script

```bash
# Dry run first
node migration/my-script.js --dry-run

# Then live
node migration/my-script.js

# With options
node migration/my-script.js --batch-size 50
```

### Test Script

```bash
# Run tests
npm test

# Run specific test
npm test -- --grep "User"
```

## File Paths Reference

```
Your Script Location          → Import Path
─────────────────────────────────────────────────────────────
migration/my-script.js        → require('../src/test-utils/environment-starter')
src/custom/my-script.js       → require('../test-utils/environment-starter')
test/my-test.js               → require('../src/test-utils/environment-starter')
```

## Common Patterns Cheat Sheet

### Pattern: Batch Processing

```javascript
Env.run(async ({ db }) => {
    const items = await db.getSortedSetRange('set', 0, -1);
    const batchSize = 100;

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        // Process batch
        console.log(`Progress: ${((i + batch.length) / items.length * 100).toFixed(1)}%`);
    }
}, { name: 'Batch Processor' });
```

### Pattern: User Processing

```javascript
Env.run(async ({ User }) => {
    const uids = await User.getUidsFromSet('users:joindate', 0, -1);

    for (const uid of uids) {
        const userData = await User.getUserData(uid);
        // Process user
    }
}, { name: 'User Processor' });
```

### Pattern: Data Migration

```javascript
Env.run(async ({ db }) => {
    const oldKeys = await db.getSortedSetRange('old:set', 0, -1);

    for (const key of oldKeys) {
        const data = await db.getObject(key);
        await db.setObject(`new:${key}`, transform(data));
    }
}, { name: 'Data Migration' });
```

### Pattern: Error Handling

```javascript
Env.run(async ({ db }) => {
    const errors = [];

    for (const item of items) {
        try {
            await process(item);
        } catch (err) {
            errors.push({ item, error: err.message });
        }
    }

    if (errors.length > 0) {
        console.error(`Failed: ${errors.length}`);
        // Save error report
    }
}, { name: 'Processor' });
```

## Migration Checklist

- [ ] Copy template: `cp MIGRATION_SCRIPT_TEMPLATE.js my-script.js`
- [ ] Edit script with your logic
- [ ] Add `--dry-run` support
- [ ] Test with: `node my-script.js --dry-run`
- [ ] Review output
- [ ] Run live: `node my-script.js`
- [ ] Verify results
- [ ] Commit and document

## Best Practices

1. ✅ **Always use EnvironmentStarter** for migrations/tests
2. ✅ **Test with --dry-run first**
3. ✅ **Log progress** for long-running operations
4. ✅ **Handle errors gracefully** with try/catch
5. ✅ **Create backups** before data changes
6. ✅ **Use batch processing** for large datasets
7. ✅ **Clean up resources** with shutdown() or run()
8. ✅ **Document your scripts** with clear comments

## Need More Help?

| Resource | Link |
|----------|------|
| Full Documentation | [README.md](./README.md) |
| Complete Examples | [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md) |
| Architecture Details | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Migration Template | [../migration/MIGRATION_SCRIPT_TEMPLATE.js](../migration/MIGRATION_SCRIPT_TEMPLATE.js) |

## Quick Debugging

```javascript
// Check if initialized
console.log(Env.isInitialized);

// See loaded modules
console.log(Object.keys(Env.initializedModules));

// Access cached modules
const { db } = Env.initializedModules;
```
