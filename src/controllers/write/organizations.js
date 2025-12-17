'use strict';

const api = require('../../api');
const helpers = require('../helpers');

const Controllers = module.exports;

// ==================== ORGANIZATION CRUD ====================

Controllers.create = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.create(req, req.body));
};

Controllers.get = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.get(req, {
		orgId: req.params.orgId,
		includeStats: req.query.includeStats === 'true',
	}));
};

Controllers.list = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.list(req, {
		page: parseInt(req.query.page, 10),
		limit: parseInt(req.query.limit, 10),
		sector: req.query.sector,
		state: req.query.state,
	}));
};

Controllers.update = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.update(req, {
		...req.body,
		orgId: req.params.orgId,
	}));
};

Controllers.delete = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.delete(req, {
		orgId: req.params.orgId,
	}));
};

Controllers.getStats = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.getStats(req, {
		orgId: req.params.orgId,
	}));
};

Controllers.search = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.search(req, {
		query: req.query.q,
		page: parseInt(req.query.page, 10),
		limit: parseInt(req.query.limit, 10),
	}));
};

// ==================== MEMBERSHIP ====================

Controllers.getMembers = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.getMembers(req, {
		orgId: req.params.orgId,
		page: parseInt(req.query.page, 10),
		limit: parseInt(req.query.limit, 10),
	}));
};

Controllers.addMember = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.join(req, {
		orgId: req.params.orgId,
		...req.body,
	}));
};

Controllers.getMember = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.getMember(req, {
		orgId: req.params.orgId,
		uid: req.params.uid,
	}));
};

Controllers.updateMember = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.updateMember(req, {
		orgId: req.params.orgId,
		uid: req.params.uid,
		...req.body,
	}));
};

Controllers.removeMember = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.leave(req, {
		orgId: req.params.orgId,
		uid: req.params.uid,
		reason: req.body.reason,
	}));
};

Controllers.checkMember = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.checkMember(req, {
		orgId: req.params.orgId,
		uid: req.params.uid,
	}));
};

Controllers.checkManager = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.checkManager(req, {
		orgId: req.params.orgId,
		uid: req.params.uid,
	}));
};

Controllers.getManagers = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.getManagers(req, {
		orgId: req.params.orgId,
		page: parseInt(req.query.page, 10),
		limit: parseInt(req.query.limit, 10),
	}));
};

Controllers.getLeaders = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.getLeaders(req, {
		orgId: req.params.orgId,
		page: parseInt(req.query.page, 10),
		limit: parseInt(req.query.limit, 10),
	}));
};

Controllers.searchMembers = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.searchMembers(req, {
		orgId: req.params.orgId,
		query: req.query.q,
		page: parseInt(req.query.page, 10),
		limit: parseInt(req.query.limit, 10),
	}));
};

Controllers.bulkAddMembers = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.bulkAddMembers(req, {
		orgId: req.params.orgId,
		members: req.body.members,
	}));
};

Controllers.bulkRemoveMembers = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.bulkRemoveMembers(req, {
		orgId: req.params.orgId,
		uids: req.body.uids,
	}));
};

// ==================== DEPARTMENTS ====================

Controllers.createDepartment = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.createDepartment(req, {
		...req.body,
		orgId: req.params.orgId,
	}));
};

Controllers.getDepartments = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.getDepartments(req, {
		orgId: req.params.orgId,
		page: parseInt(req.query.page, 10),
		limit: parseInt(req.query.limit, 10),
		rootOnly: req.query.rootOnly === 'true',
	}));
};

Controllers.getDepartment = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.getDepartment(req, {
		deptId: req.params.deptId,
		includeStats: req.query.includeStats === 'true',
	}));
};

Controllers.updateDepartment = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.updateDepartment(req, {
		...req.body,
		deptId: req.params.deptId,
	}));
};

Controllers.deleteDepartment = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.deleteDepartment(req, {
		deptId: req.params.deptId,
	}));
};

Controllers.getDepartmentMembers = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.getDepartmentMembers(req, {
		deptId: req.params.deptId,
		page: parseInt(req.query.page, 10),
		limit: parseInt(req.query.limit, 10),
	}));
};

Controllers.getDepartmentManagers = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.getDepartmentManagers(req, {
		deptId: req.params.deptId,
	}));
};

Controllers.getDepartmentChildren = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.getDepartmentChildren(req, {
		deptId: req.params.deptId,
	}));
};

Controllers.getDepartmentParent = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.getDepartmentParent(req, {
		deptId: req.params.deptId,
	}));
};

// ==================== ROLES ====================

Controllers.createRole = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.createRole(req, {
		...req.body,
		orgId: req.params.orgId,
	}));
};

Controllers.getRoles = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.getRoles(req, {
		orgId: req.params.orgId,
		page: parseInt(req.query.page, 10),
		limit: parseInt(req.query.limit, 10),
		scope: req.query.scope,
		departmentId: req.query.departmentId,
	}));
};

Controllers.getRole = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.getRole(req, {
		roleId: req.params.roleId,
	}));
};

Controllers.updateRole = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.updateRole(req, {
		...req.body,
		roleId: req.params.roleId,
	}));
};

Controllers.deleteRole = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.deleteRole(req, {
		roleId: req.params.roleId,
	}));
};

Controllers.getRoleMembers = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.getRoleMembers(req, {
		roleId: req.params.roleId,
		page: parseInt(req.query.page, 10),
		limit: parseInt(req.query.limit, 10),
	}));
};

Controllers.assignRoleToMember = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.assignRole(req, {
		roleId: req.params.roleId,
		...req.body,
	}));
};

Controllers.removeRoleFromMember = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.removeRole(req, {
		roleId: req.params.roleId,
		uid: req.body.uid,
	}));
};

// ==================== USER-CENTRIC APIS ====================

Controllers.getUserOrganizations = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.getUserOrganizations(req, {
		uid: req.params.uid,
		status: req.query.status,
		includeUserData: req.query.includeUserData === 'true',
	}));
};

Controllers.getUserOrganization = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.getUserOrganization(req, {
		uid: req.params.uid,
		orgId: req.params.orgId,
	}));
};

Controllers.getMyOrganizations = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.organizations.getMyOrganizations(req));
};