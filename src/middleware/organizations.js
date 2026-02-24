'use strict';

const user = require('../user');
const Organizations = require('../organizations');

const Middleware = module.exports;

/**
 * Middleware: Only NodeBB admins can perform organization CRUD operations
 * Use this for: Create, Update, Delete organizations
 */
Middleware.isAdmin = async function (req, res, next) {
	const isAdmin = await user.isAdministrator(req.uid);
	
	if (!isAdmin) {
		return res.status(403).json({
			status: {
				code: 403,
				message: 'Forbidden',
			},
			response: {
				error: '[[error:no-privileges]]',
				message: 'Only administrators can perform this action',
			},
		});
	}
	
	next();
};

/**
 * Middleware: Check if user is admin OR global moderator
 * More permissive than isAdmin
 */
Middleware.isAdminOrGlobalMod = async function (req, res, next) {
	const [isAdmin, isGlobalMod] = await Promise.all([
		user.isAdministrator(req.uid),
		user.isGlobalModerator(req.uid),
	]);
	
	if (!isAdmin && !isGlobalMod) {
		return res.status(403).json({
			status: {
				code: 403,
				message: 'Forbidden',
			},
			response: {
				error: '[[error:no-privileges]]',
				message: 'Only administrators or moderators can perform this action',
			},
		});
	}
	
	next();
};

/**
 * Middleware: Check if user is an organization manager
 * Use this for: Managing departments, roles, members within an organization
 */
Middleware.isOrganizationManager = async function (req, res, next) {
	const { orgId } = req.params;
	const { uid } = req;
	
	// Admins can do anything
	const isAdmin = await user.isAdministrator(uid);
	if (isAdmin) {
		return next();
	}
	
	// Check if user is a manager of this organization
	const isManager = await Organizations.isManager(orgId, uid);
	
	if (!isManager) {
		return res.status(403).json({
			status: {
				code: 403,
				message: 'Forbidden',
			},
			response: {
				error: '[[error:no-privileges]]',
				message: 'Only organization managers can perform this action',
			},
		});
	}
	
	// Store in request for later use
	req.isOrgManager = true;
	next();
};

/**
 * Middleware: Check if user is a department manager
 * Use this for: Managing department-specific operations
 */
Middleware.isDepartmentManager = async function (req, res, next) {
	const { orgId, deptId } = req.params;
	const { uid } = req;
	
	// Admins can do anything
	const isAdmin = await user.isAdministrator(uid);
	if (isAdmin) {
		req.isAdmin = true;
		return next();
	}
	
	// Check if user is an organization manager (can manage all departments)
	const isOrgManager = await Organizations.isManager(orgId, uid);
	if (isOrgManager) {
		req.isOrgManager = true;
		return next();
	}
	
	// Check if user is a manager of this specific department
	const isDeptManager = await Organizations.isDepartmentManager(deptId, uid);
	
	if (!isDeptManager) {
		return res.status(403).json({
			status: {
				code: 403,
				message: 'Forbidden',
			},
			response: {
				error: '[[error:no-privileges]]',
				message: 'Only department managers can perform this action',
			},
		});
	}
	
	req.isDeptManager = true;
	next();
};

/**
 * Middleware: Check if user is a member of the organization
 * Use this for: Viewing organization details, member lists, etc.
 */
Middleware.isOrganizationMember = async function (req, res, next) {
	const { orgId } = req.params;
	const { uid } = req;
	
	// Admins can view anything
	const isAdmin = await user.isAdministrator(uid);
	if (isAdmin) {
		req.isAdmin = true;
		return next();
	}
	
	// Check if user is a member of this organization
	const isMember = await Organizations.isMember(orgId, uid);
	
	if (!isMember) {
		return res.status(403).json({
			status: {
				code: 403,
				message: 'Forbidden',
			},
			response: {
				error: '[[error:not-authorized]]',
				message: 'You must be a member of this organization to view this content',
			},
		});
	}
	
	req.isOrgMember = true;
	next();
};

/**
 * Middleware: Check if user can manage members
 * Admins and organization managers can add/remove members
 */
Middleware.canManageMembers = async function (req, res, next) {
	const { orgId } = req.params;
	const { uid } = req;
	
	// Admins can do anything
	const isAdmin = await user.isAdministrator(uid);
	if (isAdmin) {
		req.isAdmin = true;
		return next();
	}
	
	// Organization managers can manage members
	const isManager = await Organizations.isManager(orgId, uid);
	if (isManager) {
		req.isOrgManager = true;
		return next();
	}
	
	return res.status(403).json({
		status: {
			code: 403,
			message: 'Forbidden',
		},
		response: {
			error: '[[error:no-privileges]]',
			message: 'Only administrators or organization managers can manage members',
		},
	});
};

/**
 * Middleware: Check if user can manage departments
 * Admins and organization managers can create/edit/delete departments
 */
Middleware.canManageDepartments = async function (req, res, next) {
	const { orgId } = req.params;
	const { uid } = req;
	
	// Admins can do anything
	const isAdmin = await user.isAdministrator(uid);
	if (isAdmin) {
		req.isAdmin = true;
		return next();
	}
	
	// Organization managers can manage departments
	const isManager = await Organizations.isManager(orgId, uid);
	if (isManager) {
		req.isOrgManager = true;
		return next();
	}
	
	return res.status(403).json({
		status: {
			code: 403,
			message: 'Forbidden',
		},
		response: {
			error: '[[error:no-privileges]]',
			message: 'Only organization managers can manage departments',
		},
	});
};

/**
 * Middleware: Check if user can manage roles
 * Admins and organization managers can create/edit/delete roles
 */
Middleware.canManageRoles = async function (req, res, next) {
	const { orgId } = req.params;
	const { uid } = req;
	
	// Admins can do anything
	const isAdmin = await user.isAdministrator(uid);
	if (isAdmin) {
		req.isAdmin = true;
		return next();
	}
	
	// Organization managers can manage roles
	const isManager = await Organizations.isManager(orgId, uid);
	if (isManager) {
		req.isOrgManager = true;
		return next();
	}
	
	return res.status(403).json({
		status: {
			code: 403,
			message: 'Forbidden',
		},
		response: {
			error: '[[error:no-privileges]]',
			message: 'Only organization managers can manage roles',
		},
	});
};

/**
 * Middleware: Check if organization exists
 * Returns 404 if organization doesn't exist
 */
Middleware.organizationExists = async function (req, res, next) {
	const { orgId } = req.params;
	
	const exists = await Organizations.exists(orgId);
	
	if (!exists) {
		return res.status(404).json({
			status: {
				code: 404,
				message: 'Not Found',
			},
			response: {
				error: '[[error:organization-not-found]]',
				message: 'Organization not found',
			},
		});
	}
	
	next();
};

/**
 * Middleware: Check if department exists
 * Returns 404 if department doesn't exist
 */
Middleware.departmentExists = async function (req, res, next) {
	const { deptId } = req.params;
	
	const exists = await Organizations.departmentExists(deptId);
	
	if (!exists) {
		return res.status(404).json({
			status: {
				code: 404,
				message: 'Not Found',
			},
			response: {
				error: '[[error:department-not-found]]',
				message: 'Department not found',
			},
		});
	}
	
	next();
};

/**
 * Middleware: Validate organization data
 * Use this for create/update operations
 */
Middleware.validateOrganizationData = function (req, res, next) {
	const { name } = req.body;
	
	if (!name || typeof name !== 'string') {
		return res.status(400).json({
			status: {
				code: 400,
				message: 'Bad Request',
			},
			response: {
				error: '[[error:invalid-data]]',
				message: 'Organization name is required',
			},
		});
	}
	
	if (name.length < 3) {
		return res.status(400).json({
			status: {
				code: 400,
				message: 'Bad Request',
			},
			response: {
				error: '[[error:invalid-data]]',
				message: 'Organization name must be at least 3 characters',
			},
		});
	}
	
	if (name.length > 255) {
		return res.status(400).json({
			status: {
				code: 400,
				message: 'Bad Request',
			},
			response: {
				error: '[[error:invalid-data]]',
				message: 'Organization name must be less than 255 characters',
			},
		});
	}
	
	next();
};

/**
 * Combined middleware helper
 * Use this to chain multiple checks
 */
Middleware.compose = function (...middlewares) {
	return async function (req, res, next) {
		let index = 0;
		
		const runNext = async () => {
			if (index >= middlewares.length) {
				return next();
			}
			
			const middleware = middlewares[index++];
			await middleware(req, res, runNext);
		};
		
		await runNext();
	};
};