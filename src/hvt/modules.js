'use strict';

const db = require('../database');
const plugins = require('../plugins');
const helpers = require('./helpers');

const Modules = module.exports;

// Default modules to seed
const DEFAULT_MODULES = [
	{ name: 'Sales', color: '#10B981', description: 'Sales growth and revenue experiments' },
	{ name: 'Marketing', color: '#6366F1', description: 'Marketing and brand experiments' },
	{ name: 'Product', color: '#F59E0B', description: 'Product development experiments' },
	{ name: 'Engineering', color: '#3B82F6', description: 'Technical and engineering experiments' },
	{ name: 'Operations', color: '#8B5CF6', description: 'Operational efficiency experiments' },
	{ name: 'HR', color: '#EC4899', description: 'Human resources experiments' },
	{ name: 'Customer Success', color: '#14B8A6', description: 'Customer success experiments' },
	{ name: 'Finance', color: '#F97316', description: 'Financial experiments' },
];

/**
 * Create a new HVT module
 */
Modules.create = async function (data) {
	if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
		throw new Error('[[error:invalid-module-name]]');
	}

	// Fire pre-create hook
	const result = await plugins.hooks.fire('filter:hvt.module.create', { data });

	// Create module
	const module = await db.createHVTModule(result.data);

	// Fire post-create hook
	await plugins.hooks.fire('action:hvt.module.created', { module });

	return helpers.sanitizeModule(module);
};

/**
 * Get module by ID
 */
Modules.get = async function (moduleId) {
	if (!moduleId) {
		throw new Error('[[error:invalid-module-id]]');
	}

	const module = await db.getHVTModule(moduleId);

	if (!module) {
		throw new Error('[[error:module-not-found]]');
	}

	return helpers.sanitizeModule(module);
};

/**
 * Get all modules (org-scoped)
 */
Modules.getAll = async function (orgId) {
	const modules = await db.getHVTModulesByOrg(orgId);
	return helpers.sanitizeModules(modules);
};

/**
 * Update module
 */
Modules.update = async function (moduleId, data, uid) {
	if (!moduleId) {
		throw new Error('[[error:invalid-module-id]]');
	}

	// Verify module exists
	const existing = await Modules.get(moduleId);

	// Fire pre-update hook
	const result = await plugins.hooks.fire('filter:hvt.module.update', { 
		moduleId, 
		data,
		existing,
	});

	// Update module
	const updated = await db.updateHVTModule(moduleId, result.data);

	// Fire post-update hook
	await plugins.hooks.fire('action:hvt.module.updated', { 
		module: updated,
		uid,
	});

	return helpers.sanitizeModule(updated);
};

/**
 * Delete module (soft delete)
 */
Modules.delete = async function (moduleId) {
	if (!moduleId) {
		throw new Error('[[error:invalid-module-id]]');
	}

	// Verify module exists
	const existing = await Modules.get(moduleId);

	// Fire pre-delete hook
	await plugins.hooks.fire('filter:hvt.module.delete', { 
		moduleId,
		module: existing,
	});

	// Delete module
	await db.deleteHVTModule(moduleId);

	// Fire post-delete hook
	await plugins.hooks.fire('action:hvt.module.deleted', { 
		moduleId,
		module: existing,
	});
};

/**
 * Check if module exists
 */
Modules.exists = async function (moduleId) {
	if (!moduleId) {
		return false;
	}

	const module = await db.getHVTModule(moduleId);
	return !!module;
};

/**
 * Seed default modules if none exist for an organization
 */
Modules.seedDefaults = async function (orgId, uid) {
	const existing = await db.getHVTModulesByOrg(orgId);
	
	if (existing && existing.length > 0) {
		return existing;
	}

	const seeded = [];
	for (const moduleData of DEFAULT_MODULES) {
		const module = await Modules.create({ ...moduleData, orgId });
		seeded.push(module);
	}

	await plugins.hooks.fire('action:hvt.modules.seeded', { 
		modules: seeded,
		orgId,
		uid,
	});

	return seeded;
};
