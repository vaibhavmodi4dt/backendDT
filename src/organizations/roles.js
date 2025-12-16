'use strict';

const db = require('../database');
const user = require('../user');
const plugins = require('../plugins');
const helpers = require('./helpers');

const Roles = module.exports;

/**
 * Create a new role
 */
Roles.create = async function (orgId, data) {
	// Validate data
	helpers.validateRoleData(data);

	// Check if organization exists
	const Organizations = require('./data');
	const orgExists = await Organizations.exists(orgId);
	if (!orgExists) {
		throw new Error('[[error:organization-not-found]]');
	}

	// Check if department exists (if scope is department)
	if (data.scope === 'department' && data.departmentId) {
		const Departments = require('./departments');
		const deptExists = await Departments.exists(data.departmentId);
		if (!deptExists) {
			throw new Error('[[error:department-not-found]]');
		}
	}

	// Fire pre-create hook
	const result = await plugins.hooks.fire('filter:role.create', {
		orgId,
		data,
	});

	// Create role
	const role = await db.createRole(orgId, result.data);

	// Fire post-create hook
	await plugins.hooks.fire('action:role.created', {
		role,
	});

	return role;
};

/**
 * Get role by ID
 */
Roles.get = async function (roleId) {
	if (!roleId) {
		throw new Error('[[error:invalid-role-id]]');
	}

	const role = await db.getRole(roleId);

	if (!role) {
		throw new Error('[[error:role-not-found]]');
	}

	return role;
};

/**
 * Get multiple roles by IDs
 */
Roles.getMultiple = async function (roleIds) {
	if (!Array.isArray(roleIds) || !roleIds.length) {
		return [];
	}

	return await db.getRoles(roleIds);
};

/**
 * Get organization roles with pagination
 */
Roles.getByOrganization = async function (orgId, options) {
	options = options || {};
	const page = options.page || 1;
	const itemsPerPage = options.itemsPerPage || 50;

	// Get pagination data
	const pageData = await helpers.paginate(
		`organization:${orgId}:roles:sorted`,
		page,
		itemsPerPage
	);

	// Get role IDs
	const roleIds = await db.getSortedSetRevRange(
		`organization:${orgId}:roles:sorted`,
		pageData.start,
		pageData.stop
	);

	// Get roles
	let roles = await Roles.getMultiple(roleIds);

	// Filter by scope if specified
	if (options.scope) {
		roles = roles.filter(role => role.scope === options.scope);
	}

	// Filter by department if specified
	if (options.departmentId) {
		roles = roles.filter(role => role.departmentId === options.departmentId);
	}

	return {
		roles,
		...pageData,
	};
};

/**
 * Get department roles
 */
Roles.getByDepartment = async function (deptId) {
	const roleIds = await db.getSetMembers(`department:${deptId}:roles`);

	if (!roleIds || !roleIds.length) {
		return [];
	}

	return await Roles.getMultiple(roleIds);
};

/**
 * Update role
 */
Roles.update = async function (roleId, data) {
	const exists = await Roles.exists(roleId);
	if (!exists) {
		throw new Error('[[error:role-not-found]]');
	}

	// Validate data
	if (data.name !== undefined) {
		helpers.validateRoleData({ name: data.name });
	}

	// Fire pre-update hook
	const result = await plugins.hooks.fire('filter:role.update', {
		roleId,
		data,
	});

	// Update role
	const role = await db.updateRole(roleId, result.data);

	// Fire post-update hook
	await plugins.hooks.fire('action:role.updated', {
		role,
	});

	return role;
};

/**
 * Delete role (soft delete)
 */
Roles.delete = async function (roleId) {
	const exists = await Roles.exists(roleId);
	if (!exists) {
		throw new Error('[[error:role-not-found]]');
	}

	// TODO: Check if role is assigned to any members
	// For now, we'll allow deletion

	// Fire pre-delete hook
	await plugins.hooks.fire('filter:role.delete', { roleId });

	// Delete role
	await db.deleteRole(roleId);

	// Fire post-delete hook
	await plugins.hooks.fire('action:role.deleted', { roleId });
};

/**
 * Check if role exists
 */
Roles.exists = async function (roleId) {
	const role = await db.getRole(roleId);
	return !!role;
};

/**
 * Get members with this role
 */
Roles.getMembers = async function (roleId, options) {
	options = options || {};

	const role = await Roles.get(roleId);

	// Get all memberships in the organization
	const orgId = role.organizationId;
	const memberUids = await db.getSetMembers(`organization:${orgId}:members:active`);

	// Get memberships for each user
	const membersWithRole = [];

	for (const uid of memberUids) {
		const memberships = await db.getUserMembershipInOrganization(orgId, uid);

		// Check if any membership has this role
		const hasRole = memberships.some(m => m.roleId === roleId);

		if (hasRole) {
			const userData = await user.getUserFields(uid, [
				'uid', 'username', 'userslug', 'picture', 'email',
			]);
			membersWithRole.push(userData);
		}
	}

	// Paginate if requested
	if (options.page) {
		const page = parseInt(options.page, 10) || 1;
		const itemsPerPage = options.itemsPerPage || 50;

		const start = Math.max(0, (page - 1) * itemsPerPage);
		const stop = start + itemsPerPage;
		const paginated = membersWithRole.slice(start, stop);

		const pageCount = Math.max(1, Math.ceil(membersWithRole.length / itemsPerPage));

		return {
			members: paginated,
			page,
			pageCount,
			totalItems: membersWithRole.length,
			pagination: require('../pagination').create(page, pageCount),
		};
	}

	return {
		members: membersWithRole,
		totalItems: membersWithRole.length,
	};
};

/**
 * Assign role to member
 */
Roles.assignToMember = async function (roleId, uid, membershipId) {
	const role = await Roles.get(roleId);

	// If membershipId is provided, update that specific membership
	if (membershipId) {
		const Membership = require('./membership');
		return await Membership.update(membershipId, { roleId });
	}

	// Otherwise, find the membership and update it
	const memberships = await db.getUserMembershipInOrganization(role.organizationId, uid);

	if (!memberships || !memberships.length) {
		throw new Error('[[error:user-not-member]]');
	}

	// If role is department-scoped, assign to matching department membership
	if (role.scope === 'department' && role.departmentId) {
		const deptMembership = memberships.find(m => m.departmentId === role.departmentId);
		if (!deptMembership) {
			throw new Error('[[error:user-not-in-department]]');
		}

		const Membership = require('./membership');
		return await Membership.update(deptMembership.membershipId, { roleId });
	}

	// For organization-scoped roles, assign to first membership
	const Membership = require('./membership');
	return await Membership.update(memberships[0].membershipId, { roleId });
};

/**
 * Remove role from member
 */
Roles.removeFromMember = async function (roleId, uid) {
	const role = await Roles.get(roleId);

	const memberships = await db.getUserMembershipInOrganization(role.organizationId, uid);

	if (!memberships || !memberships.length) {
		throw new Error('[[error:user-not-member]]');
	}

	// Find memberships with this role
	const membershipsWithRole = memberships.filter(m => m.roleId === roleId);

	if (!membershipsWithRole.length) {
		throw new Error('[[error:user-does-not-have-role]]');
	}

	// Remove role from all matching memberships
	const Membership = require('./membership');
	await Promise.all(
		membershipsWithRole.map(m => Membership.update(m.membershipId, { roleId: null }))
	);
};