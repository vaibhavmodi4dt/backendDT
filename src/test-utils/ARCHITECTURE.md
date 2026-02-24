# EnvironmentStarter Architecture

## Overview

The EnvironmentStarter provides a centralized, reusable way to initialize the NodeBB environment for migration scripts, test utilities, and standalone tools.

## Problem Statement

### Before EnvironmentStarter

```
┌─────────────────────────────────────────────────────────────┐
│ Migration Script (migrate-data.js)                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  const db = require('../src/database');        ← PROBLEM    │
│  const User = require('../src/user');          ← Winston    │
│  const meta = require('../src/meta');          ← warnings   │
│                                                              │
│  async function migrate() {                                 │
│    await db.init();  ← Config not loaded yet!               │
│    // migration logic...                                    │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

**Issues:**
- ❌ Modules loaded before config initialization
- ❌ Winston logger has no transports configured
- ❌ Database connection fails (no config)
- ❌ Repeated initialization code in every script
- ❌ No standardized cleanup

### After EnvironmentStarter

```
┌─────────────────────────────────────────────────────────────┐
│ Migration Script (migrate-data.js)                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  const Env = require('../src/test-utils/environment-starter');│
│                                                              │
│  Env.run(async (env) => {                                   │
│    const { db, User, meta } = env;  ← Ready to use!        │
│    // migration logic...                                    │
│  }, { name: 'My Migration' });                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Proper initialization order
- ✅ No Winston warnings
- ✅ Config loaded before modules
- ✅ Centralized, reusable code
- ✅ Automatic cleanup

## Initialization Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    EnvironmentStarter.init()                      │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
    ┌────────────────────────┐
    │  1. Load Configuration │
    │     (nconf)            │
    │  - Parse argv/env      │
    │  - Load config.json    │
    │  - Set defaults        │
    └────────┬───────────────┘
             │
             ▼
    ┌────────────────────────┐
    │  2. Connect Database   │
    │     (db.init())        │
    │  - MongoDB/Redis/etc   │
    │  - Use config values   │
    └────────┬───────────────┘
             │
             ▼
    ┌────────────────────────┐
    │  3. Load Meta Configs  │
    │     (meta.configs.init)│
    │  - Runtime settings    │
    │  - Logger setup        │← Winston now has transports!
    └────────┬───────────────┘
             │
             ▼
    ┌────────────────────────┐
    │  4. Load User Module   │
    │     (if requested)     │
    └────────┬───────────────┘
             │
             ▼
    ┌────────────────────────┐
    │  5. Load Additional    │
    │     Modules            │
    │  - posts, topics, etc  │
    └────────┬───────────────┘
             │
             ▼
    ┌────────────────────────┐
    │  Return initialized    │
    │  modules: { db, User,  │
    │  meta, ... }           │
    └────────────────────────┘
```

## Component Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                        Application Layer                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│  │  Migration  │  │  Test Script │  │  Standalone Utility  │    │
│  │  Scripts    │  │              │  │                      │    │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬───────────┘    │
│         │                │                      │                 │
│         └────────────────┴──────────────────────┘                 │
│                          │                                        │
└──────────────────────────┼────────────────────────────────────────┘
                           │
                           │ require()
                           ▼
┌───────────────────────────────────────────────────────────────────┐
│                    EnvironmentStarter                             │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                   Public API                               │  │
│  │  • init(options)          - Initialize environment         │  │
│  │  • shutdown(options)      - Clean up resources            │  │
│  │  • run(fn, options)       - Auto setup/teardown           │  │
│  │  • requireModule(path)    - Safe module loading           │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                   Internal State                           │  │
│  │  • isInitialized          - Initialization flag            │  │
│  │  • initializedModules     - Cached module references       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                 Helper Methods                             │  │
│  │  • detectRootDir()        - Find NodeBB root              │  │
│  │  • configureNconf()       - Set up configuration          │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬───────────────────────────────────────┘
                            │
                            │ loads
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│                     NodeBB Core Modules                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ database │  │   user   │  │   meta   │  │  Additional      │ │
│  │          │  │          │  │          │  │  (posts, topics) │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

## Usage Patterns

### Pattern 1: Simple Run Helper

```javascript
┌─────────────────────────────────────────────┐
│           User Script                       │
└─────────────────┬───────────────────────────┘
                  │
                  │ EnvironmentStarter.run(fn, opts)
                  ▼
┌─────────────────────────────────────────────┐
│      EnvironmentStarter                     │
│                                             │
│  1. init(opts)                              │
│     ↓                                       │
│  2. fn(env)  ← User's function executes    │
│     ↓                                       │
│  3. shutdown()                              │
│                                             │
└─────────────────────────────────────────────┘
```

### Pattern 2: Manual Setup/Teardown

```javascript
┌─────────────────────────────────────────────┐
│           User Script                       │
│                                             │
│  try {                                      │
│    env = await init(opts)                   │
│    // use env.db, env.User, etc            │
│  } finally {                                │
│    await shutdown()                         │
│  }                                          │
└─────────────────────────────────────────────┘
```

### Pattern 3: Test Suite

```javascript
┌─────────────────────────────────────────────┐
│           Test Suite                        │
│                                             │
│  before(() => init(opts))                   │
│                                             │
│  it('test 1', () => {                       │
│    use initializedModules                   │
│  })                                         │
│                                             │
│  it('test 2', () => {                       │
│    use initializedModules                   │
│  })                                         │
│                                             │
│  after(() => shutdown())                    │
└─────────────────────────────────────────────┘
```

## File Structure

```
pdgms-backend/
│
├── src/
│   └── test-utils/
│       ├── environment-starter.js       ← Main utility
│       ├── README.md                    ← Documentation
│       ├── USAGE_EXAMPLES.md            ← Examples
│       └── ARCHITECTURE.md              ← This file
│
├── migration/
│   ├── start.js                         ← Backward compat wrapper
│   ├── run-daily-reports-migration.js   ← Uses EnvironmentStarter
│   ├── migrate-daily-reports.js         ← Updated to work with starter
│   ├── MIGRATION_SCRIPT_TEMPLATE.js     ← Template for new scripts
│   └── README.md                        ← Migration docs
│
└── MIGRATION_GUIDE.md                   ← Quick start guide
```

## State Management

### Singleton Pattern

EnvironmentStarter uses a singleton pattern to ensure the environment is initialized only once:

```javascript
class EnvironmentStarter {
    static isInitialized = false;
    static initializedModules = {};

    static async init(options) {
        if (this.isInitialized) {
            return this.initializedModules;  // Return cached
        }

        // Initialize...
        this.isInitialized = true;
        return this.initializedModules;
    }
}
```

### Benefits:
- ✅ Avoid duplicate initialization
- ✅ Share modules across multiple calls
- ✅ Efficient for test suites
- ✅ Prevents configuration conflicts

## Error Handling

```
┌─────────────────────────────────────────────┐
│        EnvironmentStarter.init()            │
└────────────┬────────────────────────────────┘
             │
             │ try {
             ▼
    ┌────────────────────┐
    │  Load config       │
    └────────┬───────────┘
             │ ✓
             ▼
    ┌────────────────────┐
    │  Connect DB        │─────✗──→ Log error & throw
    └────────┬───────────┘
             │ ✓
             ▼
    ┌────────────────────┐
    │  Load meta         │─────✗──→ Log error & throw
    └────────┬───────────┘
             │ ✓
             ▼
    ┌────────────────────┐
    │  Load modules      │─────✗──→ Log warning & continue
    └────────┬───────────┘
             │ ✓
             ▼
    Return initialized modules

    } catch (error) {
        Log full error with stack trace
        throw error to caller
    }
```

## Design Principles

1. **Single Responsibility**: Only handles environment initialization
2. **DRY (Don't Repeat Yourself)**: One place for initialization logic
3. **Fail Fast**: Errors during init prevent script execution
4. **Flexible**: Options allow customization per use case
5. **Safe**: Automatic cleanup prevents resource leaks
6. **Cached**: Singleton pattern for efficiency
7. **Documented**: Extensive examples and docs

## Performance Considerations

### Initialization Cost

```
┌──────────────────────────┬──────────┬──────────────┐
│ Operation                │ Time     │ Notes        │
├──────────────────────────┼──────────┼──────────────┤
│ Load config (nconf)      │ ~10ms    │ File I/O     │
│ Connect MongoDB          │ ~100ms   │ Network      │
│ Load meta configs        │ ~50ms    │ DB queries   │
│ Load User module         │ ~20ms    │ Module load  │
│ Load additional modules  │ ~10ms ea │ Per module   │
├──────────────────────────┼──────────┼──────────────┤
│ Total (typical)          │ ~180ms   │ One-time     │
└──────────────────────────┴──────────┴──────────────┘
```

### Optimization Tips

1. **Use caching**: Environment initialized once and reused
2. **Load selectively**: Only load modules you need
3. **Silent mode**: Disable logging for faster execution
4. **Shared environment**: Reuse for multiple operations

## Future Enhancements

Potential improvements for future versions:

- [ ] Support for parallel module loading
- [ ] Health checks before returning environment
- [ ] Metrics/telemetry for initialization
- [ ] Plugin system for custom initialization steps
- [ ] Environment presets (test, migration, production)
- [ ] Graceful degradation for missing modules
- [ ] Transaction support for atomic operations
- [ ] Rollback capability for failed migrations
