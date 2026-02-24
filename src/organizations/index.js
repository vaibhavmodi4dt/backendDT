'use strict';

const Organizations = module.exports;

// Sub-modules
Organizations.data = require('./data');
Organizations.membership = require('./membership');
Organizations.departments = require('./departments');
Organizations.roles = require('./roles');
Organizations.helpers = require('./helpers');

// Direct exports for convenience (Organizations CRUD)
Organizations.create = Organizations.data.create;
Organizations.get = Organizations.data.get;
Organizations.getWithStats = Organizations.data.getWithStats;
Organizations.getMultiple = Organizations.data.getMultiple;
Organizations.list = Organizations.data.list;
Organizations.listActive = Organizations.data.listActive;
Organizations.getBySector = Organizations.data.getBySector;
Organizations.update = Organizations.data.update;
Organizations.delete = Organizations.data.delete;
Organizations.exists = Organizations.data.exists;
Organizations.isActive = Organizations.data.isActive;
Organizations.getStats = Organizations.data.getStats;
Organizations.search = Organizations.data.search;
Organizations.getUserWithFullDetails = Organizations.data.getUserWithFullDetails;

// Membership methods
Organizations.join = Organizations.membership.join;
Organizations.leave = Organizations.membership.leave;
Organizations.leaveByOrgAndUid = Organizations.membership.leaveByOrgAndUid;
Organizations.removeWithDetails = Organizations.membership.removeWithDetails;
Organizations.isMember = Organizations.membership.isMember;
Organizations.isManager = Organizations.membership.isManager;
Organizations.isLeader = Organizations.membership.isLeader;
Organizations.getMembers = Organizations.membership.getMembers;
Organizations.getManagers = Organizations.membership.getManagers;
Organizations.getLeaders = Organizations.membership.getLeaders;
Organizations.getUserOrganizations = Organizations.membership.getUserOrganizations;
Organizations.getUserMembershipInOrganization = Organizations.membership.getUserMembershipInOrganization;
Organizations.searchMembers = Organizations.membership.searchMembers;
Organizations.bulkAddMembers = Organizations.membership.bulkAdd;
Organizations.bulkRemoveMembers = Organizations.membership.bulkRemove;

// Department methods
Organizations.createDepartment = Organizations.departments.create;
Organizations.getDepartment = Organizations.departments.get;
Organizations.getDepartments = Organizations.departments.getMultiple;
Organizations.getDepartmentsByOrganization = Organizations.departments.getByOrganization;
Organizations.getRootDepartments = Organizations.departments.getRootDepartments;
Organizations.getDepartmentChildren = Organizations.departments.getChildren;
Organizations.getDepartmentParent = Organizations.departments.getParent;
Organizations.updateDepartment = Organizations.departments.update;
Organizations.deleteDepartment = Organizations.departments.delete;
Organizations.departmentExists = Organizations.departments.exists;
Organizations.getDepartmentMembers = Organizations.departments.getMembers;
Organizations.getDepartmentManagers = Organizations.departments.getManagers;
Organizations.isDepartmentMember = Organizations.departments.isMember;
Organizations.isDepartmentManager = Organizations.departments.isManager;
Organizations.getDepartmentStats = Organizations.departments.getStats;

// Role methods
Organizations.createRole = Organizations.roles.create;
Organizations.getRole = Organizations.roles.get;
Organizations.getRoles = Organizations.roles.getMultiple;
Organizations.getRolesByOrganization = Organizations.roles.getByOrganization;
Organizations.getRolesByDepartment = Organizations.roles.getByDepartment;
Organizations.updateRole = Organizations.roles.update;
Organizations.deleteRole = Organizations.roles.delete;
Organizations.roleExists = Organizations.roles.exists;
Organizations.getRoleMembers = Organizations.roles.getMembers;
Organizations.assignRoleToMember = Organizations.roles.assignToMember;
Organizations.removeRoleFromMember = Organizations.roles.removeFromMember;