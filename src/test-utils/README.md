# Test Utils

Centralized utilities for testing and migration scripts.

## EnvironmentStarter

A centralized utility for properly initializing the NodeBB environment for migrations, test scripts, and standalone utilities.

### Why?

Directly requiring NodeBB modules causes Winston logging warnings:
```
[winston] Attempt to write logs with no transports, which can increase memory usage
```

This happens because modules are loaded before the environment (config, database, meta) is initialized.

### Quick Start

```javascript
const EnvironmentStarter = require('./src/test-utils/environment-starter');

// Simple approach - automatic setup and teardown
EnvironmentStarter.run(async (env) => {
    const { db, User, meta } = env;

    // Your code here
    const users = await User.getUsers('users:joindate', 0, -1);
    console.log(`Found ${users.length} users`);

}, { name: 'My Script' }).catch(console.error);
```

### Features

- ✅ Proper initialization order (config → database → meta → modules)
- ✅ Prevents Winston logging warnings
- ✅ Automatic cleanup with `shutdown()`
- ✅ Silent mode for automated scripts
- ✅ Load only the modules you need
- ✅ Helper for automatic setup/teardown (`run()`)
- ✅ Safe module requiring after initialization

### Documentation

- [Usage Examples](./USAGE_EXAMPLES.md) - Complete examples and patterns
- [API Reference](#api-reference) - Full API documentation

## API Reference

### `EnvironmentStarter.init(options)`

Initialize the NodeBB environment.

**Parameters:**
- `options.name` (string) - Script name for logging (default: 'NodeBB Script')
- `options.silent` (boolean) - Suppress output (default: false)
- `options.rootDir` (string) - NodeBB root directory (auto-detected)
- `options.loadUser` (boolean) - Load User module (default: true)
- `options.loadMeta` (boolean) - Load meta configs (default: true)
- `options.modules` (Array<string>) - Additional modules to load (default: [])

**Returns:** `Promise<Object>` - Object with initialized modules (db, User, meta, etc.)

**Example:**
```javascript
const env = await EnvironmentStarter.init({
    name: 'My Migration',
    modules: ['posts', 'topics']
});
```

### `EnvironmentStarter.shutdown(options)`

Shutdown the environment and clean up resources.

**Parameters:**
- `options.silent` (boolean) - Suppress output (default: false)

**Returns:** `Promise<void>`

**Example:**
```javascript
await EnvironmentStarter.shutdown();
```

### `EnvironmentStarter.run(fn, options)`

Execute a function with automatic environment setup and teardown.

**Parameters:**
- `fn` (Function) - Async function to execute. Receives `env` as parameter.
- `options` (Object) - Same as `init()` options

**Returns:** `Promise<any>` - Result of the function

**Example:**
```javascript
const result = await EnvironmentStarter.run(async (env) => {
    return await env.db.getObjectField('global', 'someKey');
}, { name: 'Data Fetch' });
```

### `EnvironmentStarter.requireModule(modulePath)`

Safely require a module after environment initialization.

**Parameters:**
- `modulePath` (string) - Module path relative to src/ (e.g., '../reports/helpers')

**Returns:** The required module

**Example:**
```javascript
await EnvironmentStarter.init({ name: 'Test' });
const helpers = EnvironmentStarter.requireModule('../reports/helpers');
```

## Common Use Cases

### 1. Migration Scripts

```javascript
const EnvironmentStarter = require('../src/test-utils/environment-starter');

EnvironmentStarter.run(async (env) => {
    // Migration logic
}, { name: 'Data Migration' });
```

### 2. Test Scripts

```javascript
describe('Tests', function() {
    before(() => EnvironmentStarter.init({ name: 'Test Suite' }));
    after(() => EnvironmentStarter.shutdown());

    it('should work', async function() {
        const { User } = EnvironmentStarter.initializedModules;
        // Test logic
    });
});
```

### 3. Standalone Utilities

```javascript
const EnvironmentStarter = require('./src/test-utils/environment-starter');

async function main() {
    const env = await EnvironmentStarter.init({
        name: 'Cleanup Utility',
        silent: true
    });

    try {
        // Utility logic
    } finally {
        await EnvironmentStarter.shutdown({ silent: true });
    }
}
```

## Migration from Old Approach

### Before (causes Winston warnings)

```javascript
const db = require('../src/database');
const User = require('../src/user');

async function migrate() {
    await db.init();
    // ...
}
```

### After (no warnings)

```javascript
const EnvironmentStarter = require('../src/test-utils/environment-starter');

EnvironmentStarter.run(async (env) => {
    const { db, User } = env;
    // ...
}, { name: 'Migration' });
```

## Troubleshooting

### "Environment must be initialized before requiring modules"

Make sure to call `init()` before using `requireModule()`:

```javascript
await EnvironmentStarter.init({ name: 'Script' });
const helpers = EnvironmentStarter.requireModule('../reports/helpers');
```

### "Environment already initialized"

This is informational - the environment is already ready. The cached modules will be returned.

### Database connection errors

Check your `config.json` file and ensure database credentials are correct.

## Contributing

When creating new test utilities, add them to this directory and document them here.
