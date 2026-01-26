# EnvironmentStarter Usage Examples

The `EnvironmentStarter` is a centralized utility for properly initializing the NodeBB environment for migrations, test scripts, and standalone utilities.

## Why Use EnvironmentStarter?

**Problem:** Directly requiring NodeBB modules (like `database`, `user`, `meta`) causes Winston logging warnings because the modules are loaded before the environment is properly initialized.

**Solution:** Use `EnvironmentStarter` to initialize configuration, database, and meta configs BEFORE loading any modules.

## Basic Usage

### Example 1: Simple Migration Script

```javascript
'use strict';

const EnvironmentStarter = require('../src/test-utils/environment-starter');

async function main() {
    try {
        // Initialize environment
        const env = await EnvironmentStarter.init({
            name: 'My Migration Script',
        });

        // Now you can safely use the modules
        const users = await env.User.getUsers('users:joindate', 0, -1);
        console.log(`Found ${users.length} users`);

        // Your migration logic here...

    } finally {
        // Always cleanup
        await EnvironmentStarter.shutdown();
    }
}

if (require.main === module) {
    main().catch(console.error);
}
```

### Example 2: Using the `run()` Helper

The simplest way - automatic setup and teardown:

```javascript
'use strict';

const EnvironmentStarter = require('../src/test-utils/environment-starter');

async function migrate(env) {
    // Environment is already initialized
    const { db, User, meta } = env;

    const users = await User.getUsers('users:joindate', 0, -1);
    console.log(`Found ${users.length} users`);

    // Your migration logic...
}

if (require.main === module) {
    EnvironmentStarter.run(migrate, {
        name: 'User Migration',
    }).catch(console.error);
}
```

### Example 3: Loading Additional Modules

```javascript
'use strict';

const EnvironmentStarter = require('../src/test-utils/environment-starter');

async function main() {
    try {
        const env = await EnvironmentStarter.init({
            name: 'Post Migration Script',
            loadUser: true,
            loadMeta: true,
            modules: ['posts', 'topics', 'categories'],  // Load additional modules
        });

        // Now you have access to all modules
        const { db, User, meta, posts, topics, categories } = env;

        // Use the modules...
        const recentTopics = await topics.getTopicsFromSet('topics:recent', 0, 19);
        console.log(`Found ${recentTopics.length} recent topics`);

    } finally {
        await EnvironmentStarter.shutdown();
    }
}

if (require.main === module) {
    main().catch(console.error);
}
```

### Example 4: Silent Mode (for automated scripts)

```javascript
'use strict';

const EnvironmentStarter = require('../src/test-utils/environment-starter');

async function main() {
    try {
        // Silent mode - no initialization logs
        const env = await EnvironmentStarter.init({
            name: 'Automated Cleanup',
            silent: true,
        });

        // Do your work silently...
        await env.db.deleteObjectField('global', 'temp_data');

    } finally {
        await EnvironmentStarter.shutdown({ silent: true });
    }
}

if (require.main === module) {
    main().catch(console.error);
}
```

### Example 5: Test Script

```javascript
'use strict';

const EnvironmentStarter = require('../src/test-utils/environment-starter');
const assert = require('assert');

describe('User Tests', function () {
    before(async function () {
        // Initialize once before all tests
        await EnvironmentStarter.init({
            name: 'User Test Suite',
        });
    });

    after(async function () {
        // Cleanup after all tests
        await EnvironmentStarter.shutdown();
    });

    it('should create a user', async function () {
        const { User } = EnvironmentStarter.initializedModules;

        const uid = await User.create({
            username: 'testuser',
            email: 'test@example.com',
        });

        assert(uid > 0);
    });
});
```

### Example 6: Safely Requiring Modules After Init

```javascript
'use strict';

const EnvironmentStarter = require('../src/test-utils/environment-starter');

async function main() {
    try {
        // Initialize environment first
        await EnvironmentStarter.init({
            name: 'Report Migration',
        });

        // Now safely require modules that depend on initialized environment
        const helpers = EnvironmentStarter.requireModule('../reports/helpers');
        const utils = EnvironmentStarter.requireModule('../utils');

        // Use the modules
        const reportKey = helpers.getDailyReportKey(123, '2024-01-15');
        console.log('Report Key:', reportKey);

    } finally {
        await EnvironmentStarter.shutdown();
    }
}

if (require.main === module) {
    main().catch(console.error);
}
```

### Example 7: Custom Root Directory

```javascript
'use strict';

const EnvironmentStarter = require('../src/test-utils/environment-starter');
const path = require('path');

async function main() {
    try {
        const env = await EnvironmentStarter.init({
            name: 'Custom Config Migration',
            rootDir: path.join(__dirname, '../../'),  // Specify custom root
        });

        // Your logic...

    } finally {
        await EnvironmentStarter.shutdown();
    }
}

if (require.main === module) {
    main().catch(console.error);
}
```

## Options Reference

### `init(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | `'NodeBB Script'` | Name of the script (for logging) |
| `silent` | boolean | `false` | Suppress console output |
| `rootDir` | string | auto-detected | NodeBB root directory |
| `loadUser` | boolean | `true` | Load User module |
| `loadMeta` | boolean | `true` | Load and initialize meta configs |
| `modules` | Array<string> | `[]` | Additional modules to load |

### `shutdown(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `silent` | boolean | `false` | Suppress console output |

### `run(fn, options)`

Executes function with automatic setup/teardown. Uses same options as `init()`.

## Migration Script Template

Here's a complete template for migration scripts:

```javascript
'use strict';

/**
 * [Script Name] Migration
 *
 * Description: What this migration does
 *
 * Usage:
 *   node my-migration.js [--dry-run] [--option value]
 */

const EnvironmentStarter = require('../src/test-utils/environment-starter');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    dryRun: args.includes('--dry-run'),
};

async function migrate(env) {
    const { db, User, meta } = env;

    console.log('Starting migration...');
    console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log('');

    try {
        // Step 1: Prepare data
        console.log('Step 1: Preparing data...');
        // Your code here

        // Step 2: Transform data
        console.log('Step 2: Transforming data...');
        // Your code here

        // Step 3: Save data
        if (!options.dryRun) {
            console.log('Step 3: Saving data...');
            // Your code here
        }

        console.log('');
        console.log('✅ Migration completed successfully');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error.stack);
        throw error;
    }
}

if (require.main === module) {
    EnvironmentStarter.run(migrate, {
        name: 'My Migration',
    }).then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { migrate };
```

## Best Practices

1. **Always use EnvironmentStarter** for migration and test scripts
2. **Initialize before requiring** any NodeBB modules that depend on config/database
3. **Always cleanup** with `shutdown()` in a `finally` block or use `run()` helper
4. **Use `requireModule()`** for modules that must be loaded after initialization
5. **Test with `--dry-run`** before running live migrations
6. **Log your progress** to help debug issues

## Common Patterns

### Pattern 1: Multiple Scripts Sharing Environment

If you have helper functions in separate files, pass the environment as a parameter:

```javascript
// helpers.js
async function processUsers(env, userIds) {
    const { User, db } = env;
    // Process users...
}

module.exports = { processUsers };

// main.js
const EnvironmentStarter = require('../src/test-utils/environment-starter');
const { processUsers } = require('./helpers');

EnvironmentStarter.run(async (env) => {
    await processUsers(env, [1, 2, 3]);
}, { name: 'User Processing' });
```

### Pattern 2: Batch Processing with Progress

```javascript
async function migrate(env) {
    const { db, User } = env;

    const userIds = await db.getSortedSetRange('users:joindate', 0, -1);
    const batchSize = 100;

    for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);

        // Process batch...

        const progress = ((i + batch.length) / userIds.length * 100).toFixed(1);
        console.log(`Progress: ${progress}%`);
    }
}
```

### Pattern 3: Error Recovery

```javascript
async function migrate(env) {
    const { db } = env;
    const errors = [];

    for (const item of items) {
        try {
            await processItem(env, item);
        } catch (error) {
            errors.push({ item, error: error.message });
            console.error(`Failed to process ${item}:`, error.message);
            // Continue processing other items
        }
    }

    if (errors.length > 0) {
        console.log(`\nCompleted with ${errors.length} errors`);
        // Optionally save error report
    }
}
```
