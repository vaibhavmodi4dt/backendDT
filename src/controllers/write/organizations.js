'use strict';

const Organizations = require('../../organizations');
const helpers = require('../helpers');
const user = require('../../user');

const Controllers = module.exports;

// ==================== ORGANIZATION CRUD ====================

Controllers.create = async function (req, res) {
	const data = {
		...req.body,
		createdBy: req.uid,
	};

	const organization = await Organizations.create(data);
	helpers.formatApiResponse(200, res, organization);
};

Controllers.get = async function (req, res) {
	const { orgId } = req.params;
	const includeStats = req.query.includeStats === 'true';

	let organization;
	if (includeStats) {
		organization = await Organizations.getWithStats(orgId);
	} else {
		organization = await Organizations.get(orgId);
	}

	helpers.formatApiResponse(200, res, organization);
};

Controllers.list = async function (req, res) {
	const options = {
		page: parseInt(req.query.page, 10) || 1,
		itemsPerPage: parseInt(req.query.limit, 10) || 20,
	};

	const sector = req.query.sector;
	const state = req.query.state;

	let result;

	if (sector) {
		result = await Organizations.getBySector(sector, options);
	} else if (state === 'active') {
		result = await Organizations.listActive(options);
	} else {
		result = await Organizations.list(options);
	}

	helpers.formatApiResponse(200, res, result);
};

Controllers.update = async function (req, res) {
	const { orgId } = req.params;
	const data = {
		...req.body,
		updatedBy: req.uid,
	};

	const organization = await Organizations.update(orgId, data);
	helpers.formatApiResponse(200, res, organization);
};

Controllers.delete = async function (req, res) {
	const { orgId } = req.params;

	await Organizations.delete(orgId);
	helpers.formatApiResponse(200, res, { success: true });
};

Controllers.getStats = async function (req, res) {
	const { orgId } = req.params;

	const stats = await Organizations.getStats(orgId);
	helpers.formatApiResponse(200, res, stats);
};

Controllers.search = async function (req, res) {
	const query = req.query.q || '';
	const options = {
		page: parseInt(req.query.page, 10) || 1,
		itemsPerPage: parseInt(req.query.limit, 10) || 20,
	};

	const result = await Organizations.search(query, options);
	helpers.formatApiResponse(200, res, result);
};

// ==================== MEMBERSHIP ====================

Controllers.getMembers = async function (req, res) {
	const { orgId } = req.params;
	const options = {
		page: parseInt(req.query.page, 10) || 1,
		itemsPerPage: parseInt(req.query.limit, 10) || 50,
	};

	const result = await Organizations.getMembers(orgId, options);
	helpers.formatApiResponse(200, res, result);
};

Controllers.addMember = async function (req, res) {
	const { orgId } = req.params;
	const { uid, type, departmentId, roleId } = req.body;

	const membership = await Organizations.join(orgId, uid, {
		type,
		departmentId,
		roleId,
	});

	helpers.formatApiResponse(200, res, membership);
};

Controllers.getMember = async function (req, res) {
	const { orgId, uid } = req.params;

	const memberships = await Organizations.getUserMembershipInOrganization(orgId, uid);

	if (!memberships || !memberships.length) {
		return helpers.formatApiResponse(404, res, new Error('[[error:not-a-member]]'));
	}

	// Get user data
	const userData = await user.getUserFields(uid, [
		'uid', 'username', 'userslug', 'picture', 'email',
	]);

	helpers.formatApiResponse(200, res, {
		...userData,
		memberships,
	});
};

Controllers.updateMember = async function (req, res) {
	const { orgId, uid } = req.params;
	const { type, departmentId, roleId, membershipId } = req.body;

	// If membershipId is provided, update that specific membership
	if (membershipId) {
		const updated = await Organizations.membership.update(membershipId, {
			type,
			departmentId,
			roleId,
		});
		return helpers.formatApiResponse(200, res, updated);
	}

	// Otherwise, find the membership and update it
	const memberships = await Organizations.getUserMembershipInOrganization(orgId, uid);

	if (!memberships || !memberships.length) {
		return helpers.formatApiResponse(404, res, new Error('[[error:not-a-member]]'));
	}

	// Update first membership (or you can add logic to update all)
	const updated = await Organizations.membership.update(memberships[0].membershipId, {
		type,
		departmentId,
		roleId,
	});

	helpers.formatApiResponse(200, res, updated);
};

Controllers.removeMember = async function (req, res) {
	const { orgId, uid } = req.params;
	const { reason } = req.body;

	const result = await Organizations.membership.removeWithDetails(orgId, uid, {
		reason,
		removedBy: req.uid,
	});

	helpers.formatApiResponse(200, res, result);
};

Controllers.checkMember = async function (req, res) {
	const { orgId, uid } = req.params;

	const isMember = await Organizations.isMember(orgId, uid);

	if (isMember) {
		helpers.formatApiResponse(200, res, { isMember: true });
	} else {
		helpers.formatApiResponse(404, res, new Error('[[error:not-a-member]]'));
	}
};

Controllers.checkManager = async function (req, res) {
	const { orgId, uid } = req.params;

	const isManager = await Organizations.isManager(orgId, uid);
	helpers.formatApiResponse(200, res, { isManager });
};

Controllers.getManagers = async function (req, res) {
	const { orgId } = req.params;
	const options = {
		page: parseInt(req.query.page, 10) || 1,
		itemsPerPage: parseInt(req.query.limit, 10) || 50,
	};

	const result = await Organizations.getManagers(orgId, options);
	helpers.formatApiResponse(200, res, result);
};

Controllers.getLeaders = async function (req, res) {
	const { orgId } = req.params;
	const options = {
		page: parseInt(req.query.page, 10) || 1,
		itemsPerPage: parseInt(req.query.limit, 10) || 50,
	};

	const result = await Organizations.getLeaders(orgId, options);
	helpers.formatApiResponse(200, res, result);
};

Controllers.searchMembers = async function (req, res) {
	const { orgId } = req.params;
	const query = req.query.q || '';
	const options = {
		page: parseInt(req.query.page, 10) || 1,
		itemsPerPage: parseInt(req.query.limit, 10) || 50,
	};

	const result = await Organizations.searchMembers(orgId, query, options);
	helpers.formatApiResponse(200, res, result);
};

Controllers.bulkAddMembers = async function (req, res) {
	const { orgId } = req.params;
	const { members } = req.body;

	if (!Array.isArray(members)) {
		return helpers.formatApiResponse(400, res, new Error('[[error:invalid-members-data]]'));
	}

	const result = await Organizations.bulkAddMembers(orgId, members);
	helpers.formatApiResponse(200, res, result);
};

Controllers.bulkRemoveMembers = async function (req, res) {
	const { orgId } = req.params;
	const { uids } = req.body;

	if (!Array.isArray(uids)) {
		return helpers.formatApiResponse(400, res, new Error('[[error:invalid-uids]]'));
	}

	const result = await Organizations.bulkRemoveMembers(orgId, uids);
	helpers.formatApiResponse(200, res, result);
};

// ==================== DEPARTMENTS ====================

Controllers.createDepartment = async function (req, res) {
	const { orgId } = req.params;
	const data = {
		...req.body,
		createdBy: req.uid,
	};

	const department = await Organizations.createDepartment(orgId, data);
	helpers.formatApiResponse(200, res, department);
};

Controllers.getDepartments = async function (req, res) {
	const { orgId } = req.params;
	const options = {
		page: parseInt(req.query.page, 10) || 1,
		itemsPerPage: parseInt(req.query.limit, 10) || 20,
	};

	const rootOnly = req.query.rootOnly === 'true';

	let result;
	if (rootOnly) {
		result = await Organizations.getRootDepartments(orgId, options);
	} else {
		result = await Organizations.getDepartmentsByOrganization(orgId, options);
	}

	helpers.formatApiResponse(200, res, result);
};

Controllers.getDepartment = async function (req, res) {
	const { deptId } = req.params;
	const includeStats = req.query.includeStats === 'true';

	const department = await Organizations.getDepartment(deptId);

	if (includeStats) {
		const stats = await Organizations.getDepartmentStats(deptId);
		department.stats = stats;
	}

	helpers.formatApiResponse(200, res, department);
};

Controllers.updateDepartment = async function (req, res) {
	const { deptId } = req.params;
	const data = {
		...req.body,
		updatedBy: req.uid,
	};

	const department = await Organizations.updateDepartment(deptId, data);
	helpers.formatApiResponse(200, res, department);
};

Controllers.deleteDepartment = async function (req, res) {
	const { deptId } = req.params;

	await Organizations.deleteDepartment(deptId);
	helpers.formatApiResponse(200, res, { success: true });
};

Controllers.getDepartmentMembers = async function (req, res) {
	const { deptId } = req.params;
	const options = {
		page: parseInt(req.query.page, 10) || 1,
		itemsPerPage: parseInt(req.query.limit, 10) || 50,
	};

	const result = await Organizations.getDepartmentMembers(deptId, options);
	helpers.formatApiResponse(200, res, result);
};

Controllers.getDepartmentManagers = async function (req, res) {
	const { deptId } = req.params;

	const managers = await Organizations.getDepartmentManagers(deptId);
	helpers.formatApiResponse(200, res, { managers });
};

Controllers.getDepartmentChildren = async function (req, res) {
	const { deptId } = req.params;

	const children = await Organizations.getDepartmentChildren(deptId);
	helpers.formatApiResponse(200, res, { departments: children });
};

Controllers.getDepartmentParent = async function (req, res) {
	const { deptId } = req.params;

	const parent = await Organizations.getDepartmentParent(deptId);
	helpers.formatApiResponse(200, res, parent);
};

// ==================== ROLES ====================

Controllers.createRole = async function (req, res) {
	const { orgId } = req.params;
	const data = {
		...req.body,
		createdBy: req.uid,
	};

	const role = await Organizations.createRole(orgId, data);
	helpers.formatApiResponse(200, res, role);
};

Controllers.getRoles = async function (req, res) {
	const { orgId } = req.params;
	const options = {
		page: parseInt(req.query.page, 10) || 1,
		itemsPerPage: parseInt(req.query.limit, 10) || 50,
		scope: req.query.scope,
		departmentId: req.query.departmentId,
	};

	const result = await Organizations.getRolesByOrganization(orgId, options);
	helpers.formatApiResponse(200, res, result);
};

Controllers.getRole = async function (req, res) {
	const { roleId } = req.params;

	const role = await Organizations.getRole(roleId);
	helpers.formatApiResponse(200, res, role);
};

Controllers.updateRole = async function (req, res) {
	const { roleId } = req.params;
	const data = {
		...req.body,
		updatedBy: req.uid,
	};

	const role = await Organizations.updateRole(roleId, data);
	helpers.formatApiResponse(200, res, role);
};

Controllers.deleteRole = async function (req, res) {
	const { roleId } = req.params;

	await Organizations.deleteRole(roleId);
	helpers.formatApiResponse(200, res, { success: true });
};

Controllers.getRoleMembers = async function (req, res) {
	const { roleId } = req.params;
	const options = {
		page: parseInt(req.query.page, 10),
		itemsPerPage: parseInt(req.query.limit, 10) || 50,
	};

	const result = await Organizations.getRoleMembers(roleId, options);
	helpers.formatApiResponse(200, res, result);
};

Controllers.assignRoleToMember = async function (req, res) {
	const { roleId } = req.params;
	const { uid, membershipId } = req.body;

	const result = await Organizations.assignRoleToMember(roleId, uid, membershipId);
	helpers.formatApiResponse(200, res, result);
};

Controllers.removeRoleFromMember = async function (req, res) {
	const { roleId } = req.params;
	const { uid } = req.body;

	await Organizations.removeRoleFromMember(roleId, uid);
	helpers.formatApiResponse(200, res, { success: true });
};

// ==================== USER-CENTRIC APIS (YOUR KEY QUERY) ====================

Controllers.getUserOrganizations = async function (req, res) {
	const { uid } = req.params;
	const options = {
		status: req.query.status || 'active',
		includeUserData: req.query.includeUserData === 'true',
	};

	const organizations = await Organizations.getUserOrganizations(uid, options);
	helpers.formatApiResponse(200, res, organizations);
};

Controllers.getUserOrganization = async function (req, res) {
	const { uid, orgId } = req.params;

	const memberships = await Organizations.getUserMembershipInOrganization(orgId, uid);

	if (!memberships || !memberships.length) {
		return helpers.formatApiResponse(404, res, new Error('[[error:not-a-member]]'));
	}

	const organization = await Organizations.get(orgId);

	helpers.formatApiResponse(200, res, {
		organization,
		memberships,
	});
};