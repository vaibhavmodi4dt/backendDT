'use strict';

const meta = require('../meta');
const pagination = require('../pagination');
const db = require('../database');

const helpers = module.exports;

/**
 * Paginate a sorted set using NodeBB's pagination
 * @param {string} sortedSetKey - The sorted set key
 * @param {number} page - Current page number
 * @param {number} itemsPerPage - Items per page (optional, uses config)
 * @returns {Object} Pagination data with start, stop, and pagination object
 */
helpers.paginate = async function (sortedSetKey, page, itemsPerPage) {
	page = parseInt(page, 10) || 1;
	itemsPerPage = itemsPerPage || meta.config.organizationsPerPage || 20;

	const count = await db.sortedSetCard(sortedSetKey);
	const pageCount = Math.max(1, Math.ceil(count / itemsPerPage));

	const start = Math.max(0, (page - 1) * itemsPerPage);
	const stop = start + itemsPerPage - 1;

	return {
		start,
		stop,
		page,
		pageCount,
		itemsPerPage,
		totalItems: count,
		pagination: pagination.create(page, pageCount),
	};
};

/**
 * Validate organization data
 */
helpers.validateOrganizationData = function (data) {
	if (!data.name || typeof data.name !== 'string') {
		throw new Error('[[error:invalid-organization-name]]');
	}

	if (data.name.length < 3) {
		throw new Error('[[error:organization-name-too-short]]');
	}

	if (data.name.length > 255) {
		throw new Error('[[error:organization-name-too-long]]');
	}

	if (data.website && !helpers.isValidUrl(data.website)) {
		throw new Error('[[error:invalid-website-url]]');
	}

	if (data.emails && !Array.isArray(data.emails)) {
		throw new Error('[[error:invalid-emails-format]]');
	}

	if (data.phoneNumbers && !Array.isArray(data.phoneNumbers)) {
		throw new Error('[[error:invalid-phone-numbers-format]]');
	}
};

/**
 * Validate department data
 */
helpers.validateDepartmentData = function (data) {
	if (!data.name || typeof data.name !== 'string') {
		throw new Error('[[error:invalid-department-name]]');
	}

	if (data.name.length < 2) {
		throw new Error('[[error:department-name-too-short]]');
	}

	if (data.name.length > 255) {
		throw new Error('[[error:department-name-too-long]]');
	}
};

/**
 * Validate role data
 */
helpers.validateRoleData = function (data) {
	if (!data.name || typeof data.name !== 'string') {
		throw new Error('[[error:invalid-role-name]]');
	}

	if (data.name.length < 2) {
		throw new Error('[[error:role-name-too-short]]');
	}

	if (data.name.length > 255) {
		throw new Error('[[error:role-name-too-long]]');
	}

	if (data.scope && !['organization', 'department'].includes(data.scope)) {
		throw new Error('[[error:invalid-role-scope]]');
	}
};

/**
 * Validate membership data
 */
helpers.validateMembershipData = function (data) {
	if (!data.uid) {
		throw new Error('[[error:invalid-uid]]');
	}

	if (data.type && !['member', 'manager', 'leader'].includes(data.type)) {
		throw new Error('[[error:invalid-membership-type]]');
	}
};

/**
 * Check if URL is valid
 */
helpers.isValidUrl = function (url) {
	try {
		const urlObj = new URL(url);
		return ['http:', 'https:'].includes(urlObj.protocol);
	} catch (e) {
		return false;
	}
};

/**
 * Sanitize organization data for output
 */
helpers.sanitizeOrganization = function (org) {
	if (!org) {
		return null;
	}

	// Remove internal fields if needed
	const sanitized = { ...org };
	delete sanitized._key;

	return sanitized;
};

/**
 * Sanitize multiple organizations
 */
helpers.sanitizeOrganizations = function (orgs) {
	return orgs.map(helpers.sanitizeOrganization).filter(Boolean);
};

/**
 * Format organization response with stats
 */
helpers.formatOrganizationWithStats = async function (org) {
	if (!org) {
		return null;
	}

	const [memberCount, managerCount, departmentCount, roleCount] = await Promise.all([
		db.getOrganizationMemberCount(org.orgId),
		db.getOrganizationManagerCount(org.orgId),
		db.getOrganizationDepartmentCount(org.orgId),
		db.getOrganizationRoleCount(org.orgId),
	]);

	return {
		...org,
		stats: {
			memberCount,
			managerCount,
			departmentCount,
			roleCount,
		},
	};
};

/**
 * Check if user exists (using NodeBB's user module)
 */
helpers.userExists = async function (uid) {
	const user = require('../user');
	return await user.exists(uid);
};

/**
 * Check if user is admin or global moderator (using NodeBB's user module)
 */
helpers.isAdminOrGlobalMod = async function (uid) {
	const user = require('../user');
	const [isAdmin, isGlobalMod] = await Promise.all([
		user.isAdministrator(uid),
		user.isGlobalModerator(uid),
	]);
	return isAdmin || isGlobalMod;
};

/**
 * Build filter query for organizations
 */
helpers.buildOrganizationFilter = function (filters) {
	const filter = {};

	if (filters.sector) {
		filter.sector = filters.sector;
	}

	if (filters.state) {
		filter.state = filters.state;
	}

	return filter;
};

/**
 * Build filter query for memberships
 */
helpers.buildMembershipFilter = function (filters) {
	const filter = {};

	if (filters.type) {
		filter.type = filters.type;
	}

	if (filters.status) {
		filter.status = filters.status;
	}

	if (filters.departmentId) {
		filter.departmentId = filters.departmentId;
	}

	return filter;
};