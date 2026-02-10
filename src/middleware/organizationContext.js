'use strict';

const winston = require('winston');
const cacheCreate = require('../cache/lru');
const Organizations = require('../organizations');
const helpers = require('./helpers');
const db = require("../database")

/**
 * Cache for organization context to avoid repeated database lookups
 * TTL: 5 minutes, Max: 1000 entries
 */
const contextCache = cacheCreate({
	name: 'organization-context',
	ttl: 1000 * 60 * 5,
	max: 1000,
});

/**
 * Middleware to extract organization context from headers
 * Adds to request:
 * - req.organisation: Organization data and user permissions
 * - req.department: Department data (if department ID provided)
 * - req.user: User ID from header
 *
 * Headers expected:
 * - X-Organization-Id: Organization ID
 * - X-Department-Id: Department ID (optional)
 * - X-User-Id: User ID
 */
const Middleware = module.exports;

Middleware.organizationContext = helpers.try(async (req, res, next) => {
	// Extract headers (case-insensitive)
	const orgId = req.headers['x-organization-id'] || req.headers['X-Organization-Id'];
	const deptId = req.headers['x-department-id'] || req.headers['X-Department-Id'];
	const userId = req.headers['x-user-id'] || req.headers['X-User-Id'];

	// If no organization header, skip this middleware
	if (!orgId) {
		return next();
	}

	try {
		// Create cache key
		const cacheKey = `org:${orgId}:dept:${deptId || 'none'}:user:${userId || req.uid || 'none'}`;

		// Try to get from cache first
		let context = contextCache.get(cacheKey);

		if (!context) {
			// Fetch fresh data
			context = {};

			const uid = userId || req.uid;

			// Get organization data and permissions
			if (orgId) {
				context.organisation = await db.getOrganization(orgId);

				if (context.organisation) {
					// Get user permissions in this organization
					context.organisation.permissions = {
						isMember: await Organizations.isMember(orgId, uid),
						isManager: await Organizations.isManager(orgId, uid),
						isLeader: await Organizations.isLeader(orgId, uid),
					};

					// Get user membership in this organization
					const memberships = await Organizations.getUserMembershipInOrganization(orgId, uid);
					if (memberships && memberships.length > 0) {
						context.organisation.membership = memberships[0];
					}
				}
			}

			// Get department data and permissions
			if (deptId) {
				context.department = await Organizations.getDepartment(deptId);

				if (context.department) {
					// Get user permissions in this department
					context.department.permissions = {
						isMember: await Organizations.isDepartmentMember(deptId, uid),
						isManager: await Organizations.isDepartmentManager(deptId, uid),
					};
				}
			}

			// Set user ID
			if (userId) {
				context.user = {
					id: userId,
				};
			}

			// Cache the context
			contextCache.set(cacheKey, context);
		}

		// Attach to request object
		req.organisation = context.organisation;
		req.department = context.department;
		req.user = context.user;

		next();
	} catch (err) {
		// Log error but don't fail the request
		winston.error(`Error in organizationContext middleware: ${err.message}`);
		next();
	}
});

/**
 * Middleware to verify organization context is present
 * Use this on routes that require organization context
 */
Middleware.requireOrganizationContext = (req, res, next) => {
	if (!req.organisation) {
		return res.status(400).json({
			status: {
				code: 400,
				message: 'Bad Request',
			},
			response: {
				error: '[[error:missing-organization-context]]',
				message: 'X-Organization-Id header is required',
			},
		});
	}

	next();
};

/**
 * Middleware to verify organization membership
 * Use this on routes where user must be a member of the organization
 */
Middleware.requireOrganizationMembership = (req, res, next) => {
	if (!req.organisation) {
		return res.status(400).json({
			status: {
				code: 400,
				message: 'Bad Request',
			},
			response: {
				error: '[[error:missing-organization-context]]',
				message: 'X-Organization-Id header is required',
			},
		});
	}

	if (!req.organisation.permissions.isMember) {
		return res.status(403).json({
			status: {
				code: 403,
				message: 'Forbidden',
			},
			response: {
				error: '[[error:no-privileges]]',
				message: 'You are not a member of this organization',
			},
		});
	}

	next();
};

/**
 * Middleware to verify organization manager status
 * Use this on routes where user must be a manager of the organization
 */
Middleware.requireOrganizationManager = (req, res, next) => {
	if (!req.organisation) {
		return res.status(400).json({
			status: {
				code: 400,
				message: 'Bad Request',
			},
			response: {
				error: '[[error:missing-organization-context]]',
				message: 'X-Organization-Id header is required',
			},
		});
	}

	if (!req.organisation.permissions.isManager) {
		return res.status(403).json({
			status: {
				code: 403,
				message: 'Forbidden',
			},
			response: {
				error: '[[error:no-privileges]]',
				message: 'You must be an organization manager to perform this action',
			},
		});
	}

	next();
};

/**
 * Middleware to verify department membership
 * Use this on routes where user must be a member of the department
 */
Middleware.requireDepartmentMembership = (req, res, next) => {
	if (!req.department) {
		return res.status(400).json({
			status: {
				code: 400,
				message: 'Bad Request',
			},
			response: {
				error: '[[error:missing-department-context]]',
				message: 'X-Department-Id header is required',
			},
		});
	}

	if (!req.department.permissions.isMember) {
		return res.status(403).json({
			status: {
				code: 403,
				message: 'Forbidden',
			},
			response: {
				error: '[[error:no-privileges]]',
				message: 'You are not a member of this department',
			},
		});
	}

	next();
};

/**
 * Middleware to verify department manager status
 * Use this on routes where user must be a manager of the department
 */
Middleware.requireDepartmentManager = (req, res, next) => {
	if (!req.department) {
		return res.status(400).json({
			status: {
				code: 400,
				message: 'Bad Request',
			},
			response: {
				error: '[[error:missing-department-context]]',
				message: 'X-Department-Id header is required',
			},
		});
	}

	if (!req.department.permissions.isManager) {
		return res.status(403).json({
			status: {
				code: 403,
				message: 'Forbidden',
			},
			response: {
				error: '[[error:no-privileges]]',
				message: 'You must be a department manager to perform this action',
			},
		});
	}

	next();
};

/**
 * Clear cache function for cache invalidation
 * Call this when organization or department data changes
 */
Middleware.clearContextCache = (orgId, deptId) => {
	// Clear all entries for this organization
	const keys = contextCache.keys();
	keys.forEach((key) => {
		if (key.includes(`org:${orgId}`)) {
			contextCache.del(key);
		}
	});

	// If department ID provided, also clear that specific entry
	if (deptId) {
		const deptKey = `org:${orgId}:dept:${deptId}`;
		const keysToDelete = keys.filter(key => key.includes(deptKey));
		keysToDelete.forEach(key => contextCache.del(key));
	}
};

/**
 * Get cache statistics (for monitoring/debugging)
 */
Middleware.getCacheStats = () => {
	return {
		size: contextCache.size,
		keys: contextCache.keys(),
	};
};
