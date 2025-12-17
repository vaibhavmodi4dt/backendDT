'use strict';

const Organizations = require('../organizations');

const organizationsApi = module.exports;

/**
 * API helper methods for organizations
 * These provide a thin convenience layer over the main Organizations module
 * Following NodeBB's pattern: api methods receive (caller, data)
 */

// ==================== ORGANIZATIONS ====================

organizationsApi.create = async function (caller, data) {
	return await Organizations.create({
		...data,
		createdBy: caller.uid,
	});
};

organizationsApi.get = async function (caller, data) {
	if (data.includeStats) {
		return await Organizations.getWithStats(data.orgId);
	}
	return await Organizations.get(data.orgId);
};

organizationsApi.list = async function (caller, data) {
	const options = {
		page: data.page || 1,
		itemsPerPage: data.limit || 20,
	};

	if (data.sector) {
		return await Organizations.getBySector(data.sector, options);
	}
	if (data.state === 'active') {
		return await Organizations.listActive(options);
	}
	return await Organizations.list(options);
};

organizationsApi.update = async function (caller, data) {
	return await Organizations.update(data.orgId, {
		...data,
		updatedBy: caller.uid,
	});
};

organizationsApi.delete = async function (caller, data) {
	await Organizations.delete(data.orgId);
	return { success: true };
};

organizationsApi.getStats = async function (caller, data) {
	return await Organizations.getStats(data.orgId);
};

organizationsApi.search = async function (caller, data) {
	return await Organizations.search(data.query || '', {
		page: data.page || 1,
		itemsPerPage: data.limit || 20,
	});
};

// ==================== MEMBERSHIP ====================

organizationsApi.join = async function (caller, data) {
	return await Organizations.join(data.orgId, data.uid, {
		type: data.type,
		departmentId: data.departmentId,
		roleId: data.roleId,
	});
};

organizationsApi.leave = async function (caller, data) {
	return await Organizations.membership.removeWithDetails(data.orgId, data.uid, {
		reason: data.reason,
		removedBy: caller.uid,
	});
};

organizationsApi.getMembers = async function (caller, data) {
	return await Organizations.getMembers(data.orgId, {
		page: data.page || 1,
		itemsPerPage: data.limit || 50,
	});
};

organizationsApi.getMember = async function (caller, data) {
	const memberships = await Organizations.getUserMembershipInOrganization(data.orgId, data.uid);
	
	if (!memberships || !memberships.length) {
		throw new Error('[[error:not-a-member]]');
	}

	const user = require('../user');
	const userData = await user.getUserFields(data.uid, [
		'uid', 'username', 'userslug', 'picture', 'email',
	]);

	return {
		...userData,
		memberships,
	};
};

organizationsApi.updateMember = async function (caller, data) {
	if (data.membershipId) {
		return await Organizations.membership.update(data.membershipId, {
			type: data.type,
			departmentId: data.departmentId,
			roleId: data.roleId,
		});
	}

	const memberships = await Organizations.getUserMembershipInOrganization(data.orgId, data.uid);
	if (!memberships || !memberships.length) {
		throw new Error('[[error:not-a-member]]');
	}

	return await Organizations.membership.update(memberships[0].membershipId, {
		type: data.type,
		departmentId: data.departmentId,
		roleId: data.roleId,
	});
};

organizationsApi.checkMember = async function (caller, data) {
	const isMember = await Organizations.isMember(data.orgId, data.uid);
	if (!isMember) {
		throw new Error('[[error:not-a-member]]');
	}
	return { isMember: true };
};

organizationsApi.checkManager = async function (caller, data) {
	return {
		isManager: await Organizations.isManager(data.orgId, data.uid),
	};
};

organizationsApi.getManagers = async function (caller, data) {
	return await Organizations.getManagers(data.orgId, {
		page: data.page || 1,
		itemsPerPage: data.limit || 50,
	});
};

organizationsApi.getLeaders = async function (caller, data) {
	return await Organizations.getLeaders(data.orgId, {
		page: data.page || 1,
		itemsPerPage: data.limit || 50,
	});
};

organizationsApi.searchMembers = async function (caller, data) {
	return await Organizations.searchMembers(data.orgId, data.query || '', {
		page: data.page || 1,
		itemsPerPage: data.limit || 50,
	});
};

organizationsApi.bulkAddMembers = async function (caller, data) {
	if (!Array.isArray(data.members)) {
		throw new Error('[[error:invalid-members-data]]');
	}
	return await Organizations.bulkAddMembers(data.orgId, data.members);
};

organizationsApi.bulkRemoveMembers = async function (caller, data) {
	if (!Array.isArray(data.uids)) {
		throw new Error('[[error:invalid-uids]]');
	}
	return await Organizations.bulkRemoveMembers(data.orgId, data.uids);
};

// ==================== DEPARTMENTS ====================

organizationsApi.createDepartment = async function (caller, data) {
	return await Organizations.createDepartment(data.orgId, {
		...data,
		createdBy: caller.uid,
	});
};

organizationsApi.getDepartments = async function (caller, data) {
	const options = {
		page: data.page || 1,
		itemsPerPage: data.limit || 20,
	};

	if (data.rootOnly) {
		return await Organizations.getRootDepartments(data.orgId, options);
	}
	return await Organizations.getDepartmentsByOrganization(data.orgId, options);
};

organizationsApi.getDepartment = async function (caller, data) {
	const department = await Organizations.getDepartment(data.deptId);
	
	if (data.includeStats) {
		const stats = await Organizations.getDepartmentStats(data.deptId);
		department.stats = stats;
	}
	
	return department;
};

organizationsApi.updateDepartment = async function (caller, data) {
	return await Organizations.updateDepartment(data.deptId, {
		...data,
		updatedBy: caller.uid,
	});
};

organizationsApi.deleteDepartment = async function (caller, data) {
	await Organizations.deleteDepartment(data.deptId);
	return { success: true };
};

organizationsApi.getDepartmentMembers = async function (caller, data) {
	return await Organizations.getDepartmentMembers(data.deptId, {
		page: data.page || 1,
		itemsPerPage: data.limit || 50,
	});
};

organizationsApi.getDepartmentManagers = async function (caller, data) {
	const managers = await Organizations.getDepartmentManagers(data.deptId);
	return { managers };
};

organizationsApi.getDepartmentChildren = async function (caller, data) {
	const children = await Organizations.getDepartmentChildren(data.deptId);
	return { departments: children };
};

organizationsApi.getDepartmentParent = async function (caller, data) {
	return await Organizations.getDepartmentParent(data.deptId);
};

// ==================== ROLES ====================

organizationsApi.createRole = async function (caller, data) {
	return await Organizations.createRole(data.orgId, {
		...data,
		createdBy: caller.uid,
	});
};

organizationsApi.getRoles = async function (caller, data) {
	return await Organizations.getRolesByOrganization(data.orgId, {
		page: data.page || 1,
		itemsPerPage: data.limit || 50,
		scope: data.scope,
		departmentId: data.departmentId,
	});
};

organizationsApi.getRole = async function (caller, data) {
	return await Organizations.getRole(data.roleId);
};

organizationsApi.updateRole = async function (caller, data) {
	return await Organizations.updateRole(data.roleId, {
		...data,
		updatedBy: caller.uid,
	});
};

organizationsApi.deleteRole = async function (caller, data) {
	await Organizations.deleteRole(data.roleId);
	return { success: true };
};

organizationsApi.getRoleMembers = async function (caller, data) {
	return await Organizations.getRoleMembers(data.roleId, {
		page: data.page,
		itemsPerPage: data.limit || 50,
	});
};

organizationsApi.assignRole = async function (caller, data) {
	return await Organizations.assignRoleToMember(data.roleId, data.uid, data.membershipId);
};

organizationsApi.removeRole = async function (caller, data) {
	await Organizations.removeRoleFromMember(data.roleId, data.uid);
	return { success: true };
};

// ==================== USER-CENTRIC ====================

organizationsApi.getUserOrganizations = async function (caller, data) {
	return await Organizations.getUserOrganizations(data.uid, {
		status: data.status || 'active',
		includeUserData: data.includeUserData,
	});
};

organizationsApi.getUserOrganization = async function (caller, data) {
	const memberships = await Organizations.getUserMembershipInOrganization(data.orgId, data.uid);

	if (!memberships || !memberships.length) {
		throw new Error('[[error:not-a-member]]');
	}

	const organization = await Organizations.get(data.orgId);

	return {
		organization,
		memberships,
	};
};

organizationsApi.getMyOrganizations = async function (caller) {
	const uid = caller.uid;
	
	if (!uid) {
		throw new Error('[[error:not-logged-in]]');
	}
	
	const user = require('../user');
	
	// Get user data
	const userData = await user.getUserFields(uid, [
		'uid', 'username', 'userslug', 'email', 'picture', 
		'joindate', 'lastonline', 'status', 'fullname',
		'gdpr_consent', 'userType',
	]);
	
	// Get user's organizations with all details
	const organizations = await Organizations.getUserWithFullDetails(uid);
	
	// Build response
	return {
		email: userData.email,
		gdpr_consent: userData.gdpr_consent || 0,
		joindate: userData.joindate,
		lastonline: userData.lastonline,
		status: userData.status || 'offline',
		uid: parseInt(uid, 10),
		username: userData.username,
		userslug: userData.userslug,
		userType: userData.userType || '',
		picture: userData.picture || '',
		organizations: organizations,
	};
};