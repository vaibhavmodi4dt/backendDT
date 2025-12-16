'use strict';

const db = require('../database');
const user = require('../user');
const plugins = require('../plugins');
const helpers = require('./helpers');

const Departments = module.exports;

/**
 * Create a new department
 */
Departments.create = async function (orgId, data) {
	// Validate data
	helpers.validateDepartmentData(data);

	// Check if organization exists
	const Organizations = require('./data');
	const orgExists = await Organizations.exists(orgId);
	if (!orgExists) {
		throw new Error('[[error:organization-not-found]]');
	}

	// Check if parent department exists (if specified)
	if (data.parentDepartmentId) {
		const parentExists = await Departments.exists(data.parentDepartmentId);
		if (!parentExists) {
			throw new Error('[[error:parent-department-not-found]]');
		}

		// Get parent to calculate level
		const parent = await Departments.get(data.parentDepartmentId);
		data.level = (parent.level || 0) + 1;
	}

	// Fire pre-create hook
	const result = await plugins.hooks.fire('filter:department.create', {
		orgId,
		data,
	});

	// Create department
	const department = await db.createDepartment(orgId, result.data);

	// Fire post-create hook
	await plugins.hooks.fire('action:department.created', {
		department,
	});

	return department;
};

/**
 * Get department by ID
 */
Departments.get = async function (deptId) {
	if (!deptId) {
		throw new Error('[[error:invalid-department-id]]');
	}

	const department = await db.getDepartment(deptId);

	if (!department) {
		throw new Error('[[error:department-not-found]]');
	}

	return department;
};

/**
 * Get multiple departments by IDs
 */
Departments.getMultiple = async function (deptIds) {
	if (!Array.isArray(deptIds) || !deptIds.length) {
		return [];
	}

	return await db.getDepartments(deptIds);
};

/**
 * Get organization departments with pagination
 */
Departments.getByOrganization = async function (orgId, options) {
	options = options || {};
	const page = options.page || 1;
	const itemsPerPage = options.itemsPerPage || 20;

	// Get pagination data
	const pageData = await helpers.paginate(
		`organization:${orgId}:departments:sorted`,
		page,
		itemsPerPage
	);

	// Get department IDs
	const deptIds = await db.getSortedSetRevRange(
		`organization:${orgId}:departments:sorted`,
		pageData.start,
		pageData.stop
	);

	// Get departments
	const departments = await Departments.getMultiple(deptIds);

	return {
		departments,
		...pageData,
	};
};

/**
 * Get all root level departments (no parent)
 */
Departments.getRootDepartments = async function (orgId, options) {
	const result = await Departments.getByOrganization(orgId, options);

	// Filter only root level departments
	result.departments = result.departments.filter(dept => !dept.parentDepartmentId);

	return result;
};

/**
 * Get child departments
 */
Departments.getChildren = async function (deptId) {
	const childIds = await db.getSetMembers(`department:${deptId}:children`);

	if (!childIds || !childIds.length) {
		return [];
	}

	return await Departments.getMultiple(childIds);
};

/**
 * Get parent department
 */
Departments.getParent = async function (deptId) {
	const department = await Departments.get(deptId);

	if (!department.parentDepartmentId) {
		return null;
	}

	return await Departments.get(department.parentDepartmentId);
};

/**
 * Update department
 */
Departments.update = async function (deptId, data) {
	const exists = await Departments.exists(deptId);
	if (!exists) {
		throw new Error('[[error:department-not-found]]');
	}

	// Validate data
	if (data.name !== undefined) {
		helpers.validateDepartmentData({ name: data.name });
	}

	// Fire pre-update hook
	const result = await plugins.hooks.fire('filter:department.update', {
		deptId,
		data,
	});

	// Update department
	const department = await db.updateDepartment(deptId, result.data);

	// Fire post-update hook
	await plugins.hooks.fire('action:department.updated', {
		department,
	});

	return department;
};

/**
 * Delete department (soft delete)
 */
Departments.delete = async function (deptId) {
	const exists = await Departments.exists(deptId);
	if (!exists) {
		throw new Error('[[error:department-not-found]]');
	}

	// Check if department has children
	const children = await Departments.getChildren(deptId);
	if (children.length > 0) {
		throw new Error('[[error:department-has-children]]');
	}

	// Check if department has members
	const memberCount = await db.getDepartmentMemberCount(deptId);
	if (memberCount > 0) {
		throw new Error('[[error:department-has-members]]');
	}

	// Fire pre-delete hook
	await plugins.hooks.fire('filter:department.delete', { deptId });

	// Delete department
	await db.deleteDepartment(deptId);

	// Fire post-delete hook
	await plugins.hooks.fire('action:department.deleted', { deptId });
};

/**
 * Check if department exists
 */
Departments.exists = async function (deptId) {
	const dept = await db.getDepartment(deptId);
	return !!dept;
};

/**
 * Get department members with pagination
 */
Departments.getMembers = async function (deptId, options) {
	options = options || {};
	const page = options.page || 1;
	const itemsPerPage = options.itemsPerPage || 50;

	// Get pagination data
	const pageData = await helpers.paginate(
		`department:${deptId}:members:sorted`,
		page,
		itemsPerPage
	);

	// Get member UIDs
	const uids = await db.getSortedSetRevRange(
		`department:${deptId}:members:sorted`,
		pageData.start,
		pageData.stop
	);

	// Get user data
	const members = await user.getUsersFields(uids, [
		'uid', 'username', 'userslug', 'picture', 'email',
	]);

	return {
		members,
		...pageData,
	};
};

/**
 * Get department managers
 */
Departments.getManagers = async function (deptId) {
	const managerUids = await db.getSetMembers(`department:${deptId}:managers`);

	if (!managerUids || !managerUids.length) {
		return [];
	}

	return await user.getUsersFields(managerUids, [
		'uid', 'username', 'userslug', 'picture', 'email',
	]);
};

/**
 * Check if user is department member
 */
Departments.isMember = async function (deptId, uid) {
	return await db.isDepartmentMember(deptId, uid);
};

/**
 * Check if user is department manager
 */
Departments.isManager = async function (deptId, uid) {
	return await db.isDepartmentManager(deptId, uid);
};

/**
 * Get department stats
 */
Departments.getStats = async function (deptId) {
	const exists = await Departments.exists(deptId);
	if (!exists) {
		throw new Error('[[error:department-not-found]]');
	}

	const [memberCount, managerCount, childrenCount] = await Promise.all([
		db.getDepartmentMemberCount(deptId),
		db.setCount(`department:${deptId}:managers`),
		db.setCount(`department:${deptId}:children`),
	]);

	return {
		memberCount,
		managerCount,
		childrenCount,
	};
};