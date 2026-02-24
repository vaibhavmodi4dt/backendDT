'use strict';

const router = require('express').Router();
const middleware = require('../../middleware');
const orgMiddleware = require('../../middleware/organizations');
const controllers = require('../../controllers');
const routeHelpers = require('../helpers');

const { setupApiRoute } = routeHelpers;

module.exports = function () {
	const middlewares = [middleware.ensureLoggedIn];

	// ==================== ORGANIZATION CRUD ====================
	// Only admins can create/update/delete organizations

	setupApiRoute(router, 'post', '/', [
		...middlewares,
		middleware.checkRequired.bind(null, ['name']),
		orgMiddleware.isAdmin, // ONLY ADMINS
	], controllers.write.organizations.create);

	setupApiRoute(router, 'get', '/', middlewares, controllers.write.organizations.list);

	setupApiRoute(router, 'get', '/search', middlewares, controllers.write.organizations.search);

	setupApiRoute(router, 'get', '/:orgId', [
		...middlewares,
		orgMiddleware.organizationExists,
		orgMiddleware.isOrganizationMember, // Must be member to view
	], controllers.write.organizations.get);

	setupApiRoute(router, 'put', '/:orgId', [
		...middlewares,
		orgMiddleware.organizationExists,
		orgMiddleware.isAdmin, // ONLY ADMINS
	], controllers.write.organizations.update);

	setupApiRoute(router, 'delete', '/:orgId', [
		...middlewares,
		orgMiddleware.organizationExists,
		orgMiddleware.isAdmin, // ONLY ADMINS
	], controllers.write.organizations.delete);

	setupApiRoute(router, 'get', '/:orgId/stats', [
		...middlewares,
		orgMiddleware.organizationExists,
		orgMiddleware.isOrganizationMember, // Must be member to view stats
	], controllers.write.organizations.getStats);

	// ==================== MEMBERSHIP ====================
	// Organization managers can manage members

	setupApiRoute(router, 'get', '/:orgId/members', [
		...middlewares,
		orgMiddleware.organizationExists,
		orgMiddleware.isOrganizationMember, // Must be member to view members
	], controllers.write.organizations.getMembers);

	setupApiRoute(router, 'post', '/:orgId/members', [
		...middlewares,
		middleware.checkRequired.bind(null, ['uid']),
		orgMiddleware.organizationExists,
		// orgMiddleware.canManageMembers, // MANAGERS ONLY
	], controllers.write.organizations.addMember);

	setupApiRoute(router, 'get', '/:orgId/members/search', [
		...middlewares,
		orgMiddleware.organizationExists,
		// orgMiddleware.isOrganizationMember, // Must be member to search
	], controllers.write.organizations.searchMembers);

	setupApiRoute(router, 'get', '/:orgId/members/:uid', [
		...middlewares,
		orgMiddleware.organizationExists,
		orgMiddleware.isOrganizationMember, // Must be member to view
	], controllers.write.organizations.getMember);

	setupApiRoute(router, 'put', '/:orgId/members/:uid', [
		...middlewares,
		orgMiddleware.organizationExists,
		// orgMiddleware.canManageMembers, // MANAGERS ONLY
	], controllers.write.organizations.updateMember);

	setupApiRoute(router, 'delete', '/:orgId/members/:uid', [
		...middlewares,
		orgMiddleware.organizationExists,
		// orgMiddleware.canManageMembers, // MANAGERS ONLY
	], controllers.write.organizations.removeMember);

	setupApiRoute(router, 'head', '/:orgId/members/:uid', [
		...middlewares,
		orgMiddleware.organizationExists,
	], controllers.write.organizations.checkMember);

	setupApiRoute(router, 'get', '/:orgId/members/:uid/is-manager', [
		...middlewares,
		orgMiddleware.organizationExists,
	], controllers.write.organizations.checkManager);

	setupApiRoute(router, 'get', '/:orgId/managers', [
		...middlewares,
		orgMiddleware.organizationExists,
		orgMiddleware.isOrganizationMember, // Must be member to view
	], controllers.write.organizations.getManagers);

	setupApiRoute(router, 'get', '/:orgId/leaders', [
		...middlewares,
		orgMiddleware.organizationExists,
		orgMiddleware.isOrganizationMember, // Must be member to view
	], controllers.write.organizations.getLeaders);

	// Bulk operations
	setupApiRoute(router, 'post', '/:orgId/members/bulk', [
		...middlewares,
		middleware.checkRequired.bind(null, ['members']),
		orgMiddleware.organizationExists,
		orgMiddleware.canManageMembers, // MANAGERS ONLY
	], controllers.write.organizations.bulkAddMembers);

	setupApiRoute(router, 'delete', '/:orgId/members/bulk', [
		...middlewares,
		middleware.checkRequired.bind(null, ['uids']),
		orgMiddleware.organizationExists,
		orgMiddleware.canManageMembers, // MANAGERS ONLY
	], controllers.write.organizations.bulkRemoveMembers);

	// ==================== DEPARTMENTS ====================
	// Organization managers can manage departments

	setupApiRoute(router, 'post', '/:orgId/departments', [
		...middlewares,
		middleware.checkRequired.bind(null, ['name']),
		orgMiddleware.organizationExists,
		orgMiddleware.canManageDepartments, // ORG MANAGERS ONLY
	], controllers.write.organizations.createDepartment);

	setupApiRoute(router, 'get', '/:orgId/departments', [
		...middlewares,
		orgMiddleware.organizationExists,
		orgMiddleware.isOrganizationMember, // Must be member to view
	], controllers.write.organizations.getDepartments);

	setupApiRoute(router, 'get', '/:orgId/departments/:deptId', [
		...middlewares,
		orgMiddleware.organizationExists,
		orgMiddleware.departmentExists,
		orgMiddleware.isOrganizationMember, // Must be member to view
	], controllers.write.organizations.getDepartment);

	setupApiRoute(router, 'put', '/:orgId/departments/:deptId', [
		...middlewares,
		orgMiddleware.organizationExists,
		orgMiddleware.departmentExists,
		orgMiddleware.canManageDepartments, // ORG MANAGERS ONLY
	], controllers.write.organizations.updateDepartment);

	setupApiRoute(router, 'delete', '/:orgId/departments/:deptId', [
		...middlewares,
		orgMiddleware.organizationExists,
		orgMiddleware.departmentExists,
		orgMiddleware.canManageDepartments, // ORG MANAGERS ONLY
	], controllers.write.organizations.deleteDepartment);

	setupApiRoute(router, 'get', '/:orgId/departments/:deptId/members', [
		...middlewares,
		orgMiddleware.organizationExists,
		orgMiddleware.departmentExists,
		orgMiddleware.isOrganizationMember, // Must be member to view
	], controllers.write.organizations.getDepartmentMembers);

	setupApiRoute(router, 'get', '/:orgId/departments/:deptId/managers', [
		...middlewares,
		orgMiddleware.organizationExists,
		orgMiddleware.departmentExists,
		orgMiddleware.isOrganizationMember, // Must be member to view
	], controllers.write.organizations.getDepartmentManagers);

	setupApiRoute(router, 'get', '/:orgId/departments/:deptId/children', [
		...middlewares,
		orgMiddleware.organizationExists,
		orgMiddleware.departmentExists,
		orgMiddleware.isOrganizationMember, // Must be member to view
	], controllers.write.organizations.getDepartmentChildren);

	setupApiRoute(router, 'get', '/:orgId/departments/:deptId/parent', [
		...middlewares,
		orgMiddleware.organizationExists,
		orgMiddleware.departmentExists,
		orgMiddleware.isOrganizationMember, // Must be member to view
	], controllers.write.organizations.getDepartmentParent);

	// ==================== ROLES ====================
	// Organization managers can manage roles

	setupApiRoute(router, 'post', '/:orgId/roles', [
		...middlewares,
		middleware.checkRequired.bind(null, ['name']),
		orgMiddleware.organizationExists,
		orgMiddleware.canManageRoles, // ORG MANAGERS ONLY
	], controllers.write.organizations.createRole);

	setupApiRoute(router, 'get', '/:orgId/roles', [
		...middlewares,
		orgMiddleware.organizationExists,
		orgMiddleware.isOrganizationMember, // Must be member to view
	], controllers.write.organizations.getRoles);

	setupApiRoute(router, 'get', '/:orgId/roles/:roleId', [
		...middlewares,
		orgMiddleware.organizationExists,
		orgMiddleware.isOrganizationMember, // Must be member to view
	], controllers.write.organizations.getRole);

	setupApiRoute(router, 'put', '/:orgId/roles/:roleId', [
		...middlewares,
		orgMiddleware.organizationExists,
		orgMiddleware.canManageRoles, // ORG MANAGERS ONLY
	], controllers.write.organizations.updateRole);

	setupApiRoute(router, 'delete', '/:orgId/roles/:roleId', [
		...middlewares,
		orgMiddleware.organizationExists,
		orgMiddleware.canManageRoles, // ORG MANAGERS ONLY
	], controllers.write.organizations.deleteRole);

	setupApiRoute(router, 'get', '/:orgId/roles/:roleId/members', [
		...middlewares,
		orgMiddleware.organizationExists,
		orgMiddleware.isOrganizationMember, // Must be member to view
	], controllers.write.organizations.getRoleMembers);

	setupApiRoute(router, 'post', '/:orgId/roles/:roleId/members', [
		...middlewares,
		middleware.checkRequired.bind(null, ['uid']),
		orgMiddleware.organizationExists,
		orgMiddleware.canManageRoles, // ORG MANAGERS ONLY
	], controllers.write.organizations.assignRoleToMember);

	setupApiRoute(router, 'delete', '/:orgId/roles/:roleId/members/:uid', [
		...middlewares,
		orgMiddleware.organizationExists,
		orgMiddleware.canManageRoles, // ORG MANAGERS ONLY
	], controllers.write.organizations.removeRoleFromMember);

	setupApiRoute(router, 'get', '/user/profile', [
		...middlewares,
	], controllers.write.organizations.getMyOrganizations);

	return router;
};