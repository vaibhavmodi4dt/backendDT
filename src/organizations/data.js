'use strict';

const db = require('../database');
const user = require('../user');
const plugins = require('../plugins');
const helpers = require('./helpers');
const membership = require('./membership');
const departments = require('./departments');
const utils = require('../utils');
const Organizations = module.exports;

/**
 * Create a new organization
 */
Organizations.create = async function (data) {
	// Validate data
	helpers.validateOrganizationData(data);

	// Fire pre-create hook
	const result = await plugins.hooks.fire('filter:organization.create', { data });

	// Create organization
	const organization = await db.createOrganization(result.data);

	// Fire post-create hook
	await plugins.hooks.fire('action:organization.created', { organization });

	return organization;
};

/**
 * Get organization by ID
 */
Organizations.get = async function (orgId) {
	if (!orgId) {
		throw new Error('[[error:invalid-organization-id]]');
	}

	const organization = await db.getOrganization(orgId);

	if (!organization) {
		throw new Error('[[error:organization-not-found]]');
	}

	return organization;
};

/**
 * Get organization with stats
 */
Organizations.getWithStats = async function (orgId) {
	const organization = await Organizations.get(orgId);
	return await helpers.formatOrganizationWithStats(organization);
};

/**
 * Get multiple organizations by IDs
 */
Organizations.getMultiple = async function (orgIds) {
	if (!Array.isArray(orgIds) || !orgIds.length) {
		return [];
	}

	return await db.getOrganizations(orgIds);
};

/**
 * Get all organizations with pagination
 */
Organizations.list = async function (options) {
	options = options || {};
	const page = options.page || 1;
	const itemsPerPage = options.itemsPerPage || 20;

	// Get pagination data
	const pageData = await helpers.paginate('organizations:sorted', page, itemsPerPage);

	// Get organization IDs for this page
	const orgIds = await db.getSortedSetRevRange('organizations:sorted', pageData.start, pageData.stop);

	// Get organizations
	const organizations = await Organizations.getMultiple(orgIds);

	return {
		organizations: helpers.sanitizeOrganizations(organizations),
		...pageData,
	};
};

/**
 * Get active organizations with pagination
 */
Organizations.listActive = async function (options) {
	options = options || {};
	const page = options.page || 1;
	const itemsPerPage = options.itemsPerPage || 20;

	// Get active org IDs
	const activeOrgIds = await db.getSetMembers('organizations:active');

	// Get timestamps for sorting
	const scores = await db.sortedSetScores('organizations:sorted', activeOrgIds);

	// Sort by timestamp (newest first)
	const sorted = activeOrgIds
		.map((orgId, index) => ({ orgId, score: scores[index] }))
		.sort((a, b) => b.score - a.score);

	// Paginate
	const start = Math.max(0, (page - 1) * itemsPerPage);
	const stop = start + itemsPerPage;
	const paginatedOrgIds = sorted.slice(start, stop).map(item => item.orgId);

	// Get organizations
	const organizations = await Organizations.getMultiple(paginatedOrgIds);

	const pageCount = Math.max(1, Math.ceil(sorted.length / itemsPerPage));

	return {
		organizations: helpers.sanitizeOrganizations(organizations),
		page,
		pageCount,
		totalItems: sorted.length,
		pagination: require('../pagination').create(page, pageCount),
	};
};

/**
 * Get organizations by sector
 */
Organizations.getBySector = async function (sector, options) {
	options = options || {};
	const page = options.page || 1;
	const itemsPerPage = options.itemsPerPage || 20;

	// Get org IDs in this sector
	const orgIds = await db.getSetMembers(`organizations:sector:${sector}`);

	// Get timestamps for sorting
	const scores = await db.sortedSetScores('organizations:sorted', orgIds);

	// Sort by timestamp (newest first)
	const sorted = orgIds
		.map((orgId, index) => ({ orgId, score: scores[index] }))
		.sort((a, b) => b.score - a.score);

	// Paginate
	const start = Math.max(0, (page - 1) * itemsPerPage);
	const stop = start + itemsPerPage;
	const paginatedOrgIds = sorted.slice(start, stop).map(item => item.orgId);

	// Get organizations
	const organizations = await Organizations.getMultiple(paginatedOrgIds);

	const pageCount = Math.max(1, Math.ceil(sorted.length / itemsPerPage));

	return {
		organizations: helpers.sanitizeOrganizations(organizations),
		page,
		pageCount,
		totalItems: sorted.length,
		pagination: require('../pagination').create(page, pageCount),
	};
};

/**
 * Update organization
 */
Organizations.update = async function (orgId, data) {
	const exists = await Organizations.exists(orgId);
	if (!exists) {
		throw new Error('[[error:organization-not-found]]');
	}

	// Validate data
	if (data.name !== undefined) {
		helpers.validateOrganizationData({ name: data.name });
	}

	// Fire pre-update hook
	const result = await plugins.hooks.fire('filter:organization.update', { orgId, data });

	// Update organization
	const organization = await db.updateOrganization(orgId, result.data);

	// Fire post-update hook
	await plugins.hooks.fire('action:organization.updated', { organization });

	return organization;
};

/**
 * Delete organization (soft delete)
 */
Organizations.delete = async function (orgId) {
	const exists = await Organizations.exists(orgId);
	if (!exists) {
		throw new Error('[[error:organization-not-found]]');
	}

	// Fire pre-delete hook
	await plugins.hooks.fire('filter:organization.delete', { orgId });

	// Delete organization
	await db.deleteOrganization(orgId);

	// Fire post-delete hook
	await plugins.hooks.fire('action:organization.deleted', { orgId });
};

/**
 * Check if organization exists
 */
Organizations.exists = async function (orgId) {
	const org = await db.getOrganization(orgId);
	return !!org;
};

/**
 * Check if organization is active
 */
Organizations.isActive = async function (orgId) {
	return await db.isOrganizationActive(orgId);
};

/**
 * Get organization stats
 */
Organizations.getStats = async function (orgId) {
	const exists = await Organizations.exists(orgId);
	if (!exists) {
		throw new Error('[[error:organization-not-found]]');
	}

	const [memberCount, managerCount, leaderCount, departmentCount, roleCount] = await Promise.all([
		db.getOrganizationMemberCount(orgId),
		db.getOrganizationManagerCount(orgId),
		db.setCount(`organization:${orgId}:leaders`),
		db.getOrganizationDepartmentCount(orgId),
		db.getOrganizationRoleCount(orgId),
	]);

	return {
		memberCount,
		managerCount,
		leaderCount,
		departmentCount,
		roleCount,
	};
};

/**
 * Search organizations by name
 */
Organizations.search = async function (query, options) {
	options = options || {};
	const page = options.page || 1;
	const itemsPerPage = options.itemsPerPage || 20;

	// Get all active organizations
	const orgIds = await db.getSortedSetRevRange('organizations:sorted', 0, -1);
	const organizations = await Organizations.getMultiple(orgIds);

	// Filter by query
	const filtered = organizations.filter((org) => {
		if (!org) return false;
		const searchStr = `${org.name} ${org.sector} ${org.about}`.toLowerCase();
		return searchStr.includes(query.toLowerCase());
	});

	// Paginate results
	const start = Math.max(0, (page - 1) * itemsPerPage);
	const stop = start + itemsPerPage;
	const paginated = filtered.slice(start, stop);

	const pageCount = Math.max(1, Math.ceil(filtered.length / itemsPerPage));

	return {
		organizations: helpers.sanitizeOrganizations(paginated),
		page,
		pageCount,
		totalItems: filtered.length,
		pagination: require('../pagination').create(page, pageCount),
	};
};


Organizations.getUserWithFullDetails = async function (uid) {
	// Get user's memberships
	const userOrgs = await membership.getUserOrganizations(uid, { status: 'active' });

	if (!userOrgs || userOrgs.length === 0) {
		return [];
	}

	// For each organization, get full details
	const fullDetails = await Promise.all(userOrgs.map(async (orgData) => {
		const org = orgData.organization || orgData;
		const orgId = org.orgId;

		// Get all departments in this organization
		const allDepartments = await departments.getByOrganization(orgId, {
			page: 1,
			itemsPerPage: 100
		});

		// Get user's memberships in this org
		const userMemberships = await membership.getUserMembershipInOrganization(orgId, uid);

		// Build departments array with user's role in each
		const userDepartments = await Promise.all(allDepartments.departments.map(async (dept) => {
			// Find if user has membership in this department
			const userDeptMembership = userMemberships.find(m =>
				m.departmentId === dept.deptId
			);

			let role = null;
			if (userDeptMembership && userDeptMembership.roleId) {
				role = await Organizations.getRole(userDeptMembership.roleId);
			}

			return {
				_id: dept._id || dept.deptId,
				_key: `organization:${orgId}:departments`,
				uid: dept.uid || dept.createdBy,
				organizationId: orgId,
				name: dept.name,
				description: dept.description || '',
				createdBy: dept.createdBy ? `user:${dept.createdBy}` : null,
				createdAt: dept.timestamp ? utils.date.toISO(dept.timestamp) : null,
				updatedAt: dept.lastmodified ? utils.date.toISO(dept.lastmodified) : null,
				updatedBy: dept.lastmodifiedBy ? `user:${dept.lastmodifiedBy}` : null,
				role: role ? {
					_id: role._id || role.roleId,
					_key: `organization:${orgId}:roles`,
					name: role.name,
					description: role.description || '',
					createdBy: role.createdBy ? `user:${role.createdBy}` : null,
					createdAt: role.timestamp ? utils.date.toISO(role.timestamp) : null,
					updatedAt: role.lastmodified ? utils.date.toISO(role.lastmodified) : null,
					updatedBy: role.lastmodifiedBy ? `user:${role.lastmodifiedBy}` : null,
				} : null
			};
		}));

		// Check user privileges
		const isAdmin = await user.isAdminOrGlobalMod(uid);
		const isMember = await membership.isMember(orgId, uid);
		const isManager = await membership.isManager(orgId, uid);

		// Build full organization object
		return {
			_id: org._id || org.orgId,
			uid: org.uid || org.createdBy,
			name: org.name,
			sector: org.sector || '',
			website: org.website || '',
			about: org.about || '',
			employeeRange: org.employeeRange || '',
			leaders: org.leaders || [],
			locations: org.locations || [],
			socialLinks: org.socialLinks || [],
			images: org.images || {},
			emails: org.emails || [],
			phoneNumbers: org.phoneNumbers || [],
			createdBy: org.createdBy ? `user:${org.createdBy}` : null,
			createdAt: org.timestamp ? utils.date.toISO(org.timestamp) : null,
			updatedAt: org.lastmodified ? utils.date.toISO(org.lastmodified) : null,
			updatedBy: org.lastmodifiedBy ? `user:${org.lastmodifiedBy}` : null,
			type: 'organization',
			state: org.state || 'active',
			departments: userDepartments,
			privileges: {
				isAdmin: isAdmin,
				isMember: isMember,
				isManager: isManager
			}
		};
	}));

	return fullDetails;
};
