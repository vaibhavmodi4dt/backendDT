'use strict';

/**
 * Environment Starter Utility
 *
 * Centralized utility for properly initializing the NodeBB environment
 * for migrations, test scripts, and standalone utilities.
 *
 * This ensures proper initialization order:
 * 1. Configuration loading (nconf)
 * 2. Database connection
 * 3. Meta configs initialization
 * 4. Module loading
 *
 * Usage:
 *   const EnvironmentStarter = require('../src/test-utils/environment-starter');
 *
 *   async function main() {
 *     const env = await EnvironmentStarter.init({
 *       name: 'My Migration Script',
 *       silent: false
 *     });
 *
 *     // Use env.db, env.User, etc.
 *
 *     await EnvironmentStarter.shutdown();
 *   }
 */

const nconf = require('nconf');
const path = require('path');

class EnvironmentStarter {
    static isInitialized = false;
    static initializedModules = {};

    /**
     * Initialize the NodeBB environment
     * @param {Object} options - Initialization options
     * @param {string} options.name - Name of the script/process for logging
     * @param {boolean} options.silent - Suppress console output (default: false)
     * @param {string} options.rootDir - Root directory (auto-detected if not provided)
     * @param {boolean} options.loadUser - Load User module (default: true)
     * @param {boolean} options.loadMeta - Load and initialize meta configs (default: true)
     * @param {Array<string>} options.modules - Additional modules to load (e.g., ['posts', 'topics'])
     * @returns {Promise<Object>} Object containing initialized modules
     */
    static async init(options = {}) {
        const {
            name = 'NodeBB Script',
            silent = false,
            rootDir = null,
            loadUser = true,
            loadMeta = true,
            modules = [],
        } = options;

        if (this.isInitialized) {
            if (!silent) {
                console.log('  ℹ️  Environment already initialized, returning cached modules');
            }
            return this.initializedModules;
        }

        const log = (emoji, message) => {
            if (!silent) {
                console.log(`  ${emoji} ${message}`);
            }
        };

        try {
            if (!silent) {
                console.log('');
                console.log('═'.repeat(80));
                console.log(`  Initializing NodeBB Environment: ${name}`);
                console.log('═'.repeat(80));
            }

            // Step 1: Load configuration
            log('🔧', 'Loading configuration...');
            const root = rootDir || this.detectRootDir();
            this.configureNconf(root);

            // Step 2: Connect to database
            log('🔌', 'Connecting to database...');
            const db = require('../database');
            await db.init();
            this.initializedModules.db = db;

            // Step 3: Load meta (if requested)
            if (loadMeta) {
                log('📦', 'Loading meta configs...');
                const meta = require('../meta');
                await meta.configs.init();
                this.initializedModules.meta = meta;
            }

            // Step 4: Load User module (if requested)
            if (loadUser) {
                log('👤', 'Loading User module...');
                const User = require('../user');
                this.initializedModules.User = User;
            }

            // Step 5: Load additional modules
            if (modules.length > 0) {
                log('📚', `Loading additional modules: ${modules.join(', ')}...`);
                for (const moduleName of modules) {
                    try {
                        this.initializedModules[moduleName] = require(`../${moduleName}`);
                    } catch (err) {
                        console.error(`  ⚠️  Failed to load module '${moduleName}':`, err.message);
                    }
                }
            }

            this.isInitialized = true;

            if (!silent) {
                console.log('  ✅ Environment initialized successfully');
                console.log('═'.repeat(80));
                console.log('');
            }

            return this.initializedModules;
        } catch (error) {
            console.error('');
            console.error('❌ Environment initialization failed:', error.message);
            console.error(error.stack);
            throw error;
        }
    }

    /**
     * Detect the NodeBB root directory
     * @returns {string} Root directory path
     */
    static detectRootDir() {
        // Try to find package.json going up the directory tree
        let currentDir = __dirname;
        let maxDepth = 5;

        while (maxDepth > 0) {
            const packagePath = path.join(currentDir, 'package.json');
            try {
                require(packagePath);
                return currentDir;
            } catch (err) {
                currentDir = path.join(currentDir, '..');
                maxDepth--;
            }
        }

        // Fallback: assume we're in src/test-utils and go up two levels
        return path.join(__dirname, '../..');
    }

    /**
     * Configure nconf with standard NodeBB settings
     * @param {string} rootDir - Root directory path
     */
    static configureNconf(rootDir) {
        nconf.argv().env({
            separator: '__',
            parseValues: true,
        });

        const configFile = path.join(rootDir, 'config.json');
        nconf.file({ file: configFile });

        nconf.defaults({
            base_dir: rootDir,
            themes_path: path.join(rootDir, 'node_modules'),
            upload_path: path.join(rootDir, 'public/uploads'),
            views_dir: path.join(rootDir, 'build/public/templates'),
        });
    }

    /**
     * Shutdown the environment and clean up resources
     * @param {Object} options - Shutdown options
     * @param {boolean} options.silent - Suppress console output (default: false)
     */
    static async shutdown(options = {}) {
        const { silent = false } = options;

        if (!this.isInitialized) {
            return;
        }

        try {
            if (!silent) {
                console.log('');
                console.log('  🔌 Shutting down environment...');
            }

            if (this.initializedModules.db) {
                await this.initializedModules.db.close();
            }

            this.isInitialized = false;
            this.initializedModules = {};

            if (!silent) {
                console.log('  ✅ Shutdown complete');
            }
        } catch (error) {
            console.error('  ⚠️  Error during shutdown:', error.message);
        }
    }

    /**
     * Execute a function with automatic environment setup and teardown
     * @param {Function} fn - Async function to execute
     * @param {Object} options - Initialization options (same as init())
     * @returns {Promise<any>} Result of the function
     */
    static async run(fn, options = {}) {
        try {
            const env = await this.init(options);
            const result = await fn(env);
            return result;
        } finally {
            await this.shutdown({ silent: options.silent });
        }
    }

    /**
     * Require a module only after environment is initialized
     * This prevents Winston and other logging errors
     * @param {string} modulePath - Path to the module (e.g., '../reports/helpers')
     * @returns {any} The required module
     */
    static requireModule(modulePath) {
        if (!this.isInitialized) {
            throw new Error('Environment must be initialized before requiring modules. Call EnvironmentStarter.init() first.');
        }
        return require(modulePath);
    }
}

module.exports = EnvironmentStarter;
