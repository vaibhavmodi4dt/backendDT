'use strict';

const Organizations = require('../organizations');

const api = module.exports;

/**
 * API helper methods for organizations
 * These provide a thin convenience layer over the main Organizations module
 */

// Organizations
api.organizations = {};

api.organizations.create = async function (caller, data) {
	data.createdBy = caller.uid;
	return await Organizations.create(data);
};

api.organizations.get = async function (caller, data) {
	return await Organizations.get(data.orgId);
};

api.organizations.list = async function (caller, data) {
	return await Organizations.list(data);
};

api.organizations.update = async function (caller, data) {
	data.updatedBy = caller.uid;
	return await Organizations.update(data.orgId, data);
};

api.organizations.delete = async function (caller, data) {
	return await Organizations.delete(data.orgId);
};

api.organizations.getStats = async function (caller, data) {
	return await Organizations.getStats(data.orgId);
};

// Membership
api.organizations.join = async function (caller, data) {
	return await Organizations.join(data.orgId, data.uid, {
		type: data.type,
		departmentId: data.departmentId,
		roleId: data.roleId,
	});
};

api.organizations.leave = async function (caller, data) {
	return await Organizations.leaveByOrgAndUid(data.orgId, data.uid);
};

api.organizations.getMembers = async function (caller, data) {
	return await Organizations.getMembers(data.orgId, {
		page: data.page,
		itemsPerPage: data.limit,
	});
};

api.organizations.getUserOrganizations = async function (caller, data) {
	return await Organizations.getUserOrganizations(data.uid, {
		status: data.status,
		includeUserData: data.includeUserData,
	});
};

// Departments
api.organizations.createDepartment = async function (caller, data) {
	data.createdBy = caller.uid;
	return await Organizations.createDepartment(data.orgId, data);
};

api.organizations.getDepartments = async function (caller, data) {
	return await Organizations.getDepartmentsByOrganization(data.orgId, {
		page: data.page,
		itemsPerPage: data.limit,
	});
};

api.organizations.updateDepartment = async function (caller, data) {
	data.updatedBy = caller.uid;
	return await Organizations.updateDepartment(data.deptId, data);
};

api.organizations.deleteDepartment = async function (caller, data) {
	return await Organizations.deleteDepartment(data.deptId);
};

// Roles
api.organizations.createRole = async function (caller, data) {
	data.createdBy = caller.uid;
	return await Organizations.createRole(data.orgId, data);
};

api.organizations.getRoles = async function (caller, data) {
	return await Organizations.getRolesByOrganization(data.orgId, {
		page: data.page,
		itemsPerPage: data.limit,
		scope: data.scope,
		departmentId: data.departmentId,
	});
};

api.organizations.updateRole = async function (caller, data) {
	data.updatedBy = caller.uid;
	return await Organizations.updateRole(data.roleId, data);
};

api.organizations.deleteRole = async function (caller, data) {
	return await Organizations.deleteRole(data.roleId);
};

api.organizations.assignRole = async function (caller, data) {
	return await Organizations.assignRoleToMember(data.roleId, data.uid, data.membershipId);
};

api.organizations.removeRole = async function (caller, data) {
	return await Organizations.removeRoleFromMember(data.roleId, data.uid);
};