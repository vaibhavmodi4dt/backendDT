'use strict';

const db = require('../database');
const plugins = require('../plugins');
const helpers = require('./helpers');

const Roles = module.exports;

/**
 * Set HVT role for a user in an organization
 */
Roles.set = async function (uid, orgId, role) {
	if (!uid) {
		throw new Error('[[error:user-id-required]]');
	}

	if (!orgId) {
		throw new Error('[[error:org-id-required]]');
	}

	if (!role || !helpers.ROLE_HIERARCHY[role]) {
		throw new Error('[[error:invalid-hvt-role]]');
	}

	// Fire pre-set hook
	const result = await plugins.hooks.fire('filter:hvt.role.set', {
		uid,
		orgId,
		role,
	});

	// Set role
	await db.setHVTUserRole(result.uid, result.orgId, result.role);

	// Fire post-set hook
	await plugins.hooks.fire('action:hvt.role.set', {
		uid: result.uid,
		orgId: result.orgId,
		role: result.role,
	});

	return { uid: result.uid, orgId: result.orgId, role: result.role };
};

/**
 * Get HVT role for a user in an organization
 */
Roles.get = async function (uid, orgId) {
	if (!uid) {
		throw new Error('[[error:user-id-required]]');
	}

	if (!orgId) {
		throw new Error('[[error:org-id-required]]');
	}

	const role = await db.getHVTUserRole(uid, orgId);
	return role || 'viewer'; // Default to viewer if no role set
};

/**
 * Check if user has minimum required role
 */
Roles.hasMinimumRole = async function (uid, orgId, requiredRole) {
	const userRole = await Roles.get(uid, orgId);
	return helpers.hasMinimumRole(userRole, requiredRole);
};

/**
 * Remove HVT role for a user in an organization
 */
Roles.remove = async function (uid, orgId) {
	if (!uid) {
		throw new Error('[[error:user-id-required]]');
	}

	if (!orgId) {
		throw new Error('[[error:org-id-required]]');
	}

	await db.deleteHVTUserRole(uid, orgId);

	// Fire post-remove hook
	await plugins.hooks.fire('action:hvt.role.removed', { uid, orgId });
};

/**
 * Get all users with HVT roles in an organization
 */
Roles.getByOrg = async function (orgId) {
	if (!orgId) {
		throw new Error('[[error:org-id-required]]');
	}

	const roles = await db.getHVTRolesByOrg(orgId);
	return roles || [];
};
