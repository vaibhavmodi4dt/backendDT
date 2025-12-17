'use strict';

const db = require('../database');
const user = require('../user');
const plugins = require('../plugins');
const helpers = require('./helpers');
const { collections } = require('../database/mongo/collections');

const Membership = module.exports;

/**
 * Add member to organization
 */
Membership.join = async function (orgId, uid, data) {
	data = data || {};

	// Validate
	helpers.validateMembershipData({ uid, ...data });

	// Check if user exists
	const userExists = await helpers.userExists(uid);
	if (!userExists) {
		throw new Error('[[error:user-not-found]]');
	}

	// Check if organization exists
	const Organizations = require('./data');
	const orgExists = await Organizations.exists(orgId);
	if (!orgExists) {
		throw new Error('[[error:organization-not-found]]');
	}

	// Check if already a member
	const isMember = await Membership.isMember(orgId, uid);
	if (isMember) {
		throw new Error('[[error:already-member]]');
	}

	// Check if department exists (if specified)
	if (data.departmentId) {
		const Departments = require('./departments');
		const deptExists = await Departments.exists(data.departmentId);
		if (!deptExists) {
			throw new Error('[[error:department-not-found]]');
		}
	}

	// Check if role exists (if specified)
	if (data.roleId) {
		const Roles = require('./roles');
		const roleExists = await Roles.exists(data.roleId);
		if (!roleExists) {
			throw new Error('[[error:role-not-found]]');
		}
	}

	// Fire pre-join hook
	const result = await plugins.hooks.fire('filter:organization.join', {
		orgId,
		uid,
		data,
	});

	// Create membership
	const membership = await db.createMembership(orgId, uid, result.data);

	// Fire post-join hook
	await plugins.hooks.fire('action:organization.joined', {
		orgId,
		uid,
		membership,
	});

	return membership;
};

/**
 * Remove member from organization
 */
Membership.leave = async function (membershipId) {
	if (!membershipId) {
		throw new Error('[[error:invalid-membership-id]]');
	}

	const membership = await db.getMembership(membershipId);
	if (!membership) {
		throw new Error('[[error:membership-not-found]]');
	}

	// Fire pre-leave hook
	await plugins.hooks.fire('filter:organization.leave', {
		membership,
	});

	// Remove membership
	await db.removeMembership(membershipId);

	// Fire post-leave hook
	await plugins.hooks.fire('action:organization.left', {
		orgId: membership.organizationId,
		uid: membership.uid,
		membership,
	});
};

/**
 * Remove member from organization by orgId and uid
 */
Membership.leaveByOrgAndUid = async function (orgId, uid) {
	const memberships = await db.getUserMembershipInOrganization(orgId, uid);

	if (!memberships || !memberships.length) {
		throw new Error('[[error:not-a-member]]');
	}

	// Remove all memberships for this user in this org
	await Promise.all(memberships.map(m => Membership.leave(m.membershipId)));
};

/**
 * Remove member with reason and return complete data for frontend
 */
Membership.removeWithDetails = async function (orgId, uid, data) {
	data = data || {};
	const { reason, removedBy } = data;

	// Get memberships before removal (to return full data)
	const memberships = await db.getUserMembershipInOrganization(orgId, uid);

	if (!memberships || !memberships.length) {
		throw new Error('[[error:not-a-member]]');
	}

	// Get full membership details including department and role info
	const membershipDetails = await Promise.all(
		memberships.map(async (m) => {
			const [dept, role] = await Promise.all([
				m.departmentId ? require('./departments').get(m.departmentId) : null,
				m.roleId ? require('./roles').get(m.roleId) : null,
			]);
			return {
				...m,
				department: dept,
				role,
			};
		})
	);

	// Remove member (this updates status to 'removed' and sets removedAt)
	await Membership.leaveByOrgAndUid(orgId, uid);

	// If reason provided, store it in membership records
	if (reason && memberships.length > 0) {
		await Promise.all(
			memberships.map(m =>
				db.setObjectField(
					`membership:${m.membershipId}`,
					'removalReason',
					reason,
					{ collection: collections.ORGANIZATIONS }
				)
			)
		);
	}

	// Return complete data
	return {
		success: true,
		message: 'Member removed successfully',
		removedMemberships: membershipDetails,
		reason: reason || null,
		removedAt: Date.now(),
		removedBy: removedBy || null,
	};
};

/**
 * Update membership
 */
Membership.update = async function (membershipId, data) {
	if (!membershipId) {
		throw new Error('[[error:invalid-membership-id]]');
	}

	const membership = await db.getMembership(membershipId);
	if (!membership) {
		throw new Error('[[error:membership-not-found]]');
	}

	// Validate
	if (data.type) {
		helpers.validateMembershipData({ uid: membership.uid, type: data.type });
	}

	// Fire pre-update hook
	const result = await plugins.hooks.fire('filter:membership.update', {
		membershipId,
		data,
	});

	// Update membership
	const updated = await db.updateMembership(membershipId, result.data);

	// Fire post-update hook
	await plugins.hooks.fire('action:membership.updated', {
		membership: updated,
	});

	return updated;
};

/**
 * Check if user is member of organization
 */
Membership.isMember = async function (orgId, uid) {
	return await db.isMember(orgId, uid);
};

/**
 * Check if user is manager of organization
 */
Membership.isManager = async function (orgId, uid) {
	return await db.isManager(orgId, uid);
};

/**
 * Check if user is leader of organization
 */
Membership.isLeader = async function (orgId, uid) {
	return await db.isLeader(orgId, uid);
};

/**
 * Get organization members with pagination
 */
Membership.getMembers = async function (orgId, options) {
	options = options || {};
	const page = options.page || 1;
	const itemsPerPage = options.itemsPerPage || 50;

	// Get pagination data
	const pageData = await helpers.paginate(
		`organization:${orgId}:members:sorted`,
		page,
		itemsPerPage
	);

	// Get member UIDs
	const uids = await db.getSortedSetRevRange(
		`organization:${orgId}:members:sorted`,
		pageData.start,
		pageData.stop
	);

	// Get user data
	const userData = await user.getUsersFields(uids, [
		'uid', 'username', 'userslug', 'picture', 'email',
	]);

	// Get membership details for each user
	const membersWithDetails = await Promise.all(
		userData.map(async (userData) => {
			const memberships = await db.getUserMembershipInOrganization(orgId, userData.uid);
			return {
				...userData,
				memberships,
			};
		})
	);

	return {
		members: membersWithDetails,
		...pageData,
	};
};

/**
 * Get organization managers
 */
Membership.getManagers = async function (orgId, options) {
	options = options || {};
	const page = options.page || 1;
	const itemsPerPage = options.itemsPerPage || 50;

	// Get manager UIDs
	const managerUids = await db.getSetMembers(`organization:${orgId}:managers`);

	// Paginate
	const start = Math.max(0, (page - 1) * itemsPerPage);
	const stop = start + itemsPerPage;
	const paginatedUids = managerUids.slice(start, stop);

	// Get user data
	const managers = await user.getUsersFields(paginatedUids, [
		'uid', 'username', 'userslug', 'picture', 'email',
	]);

	const pageCount = Math.max(1, Math.ceil(managerUids.length / itemsPerPage));

	return {
		managers,
		page,
		pageCount,
		totalItems: managerUids.length,
		pagination: require('../pagination').create(page, pageCount),
	};
};

/**
 * Get organization leaders
 */
Membership.getLeaders = async function (orgId, options) {
	options = options || {};
	const page = options.page || 1;
	const itemsPerPage = options.itemsPerPage || 50;

	// Get leader UIDs
	const leaderUids = await db.getSetMembers(`organization:${orgId}:leaders`);

	// Paginate
	const start = Math.max(0, (page - 1) * itemsPerPage);
	const stop = start + itemsPerPage;
	const paginatedUids = leaderUids.slice(start, stop);

	// Get user data
	const leaders = await user.getUsersFields(paginatedUids, [
		'uid', 'username', 'userslug', 'picture', 'email',
	]);

	const pageCount = Math.max(1, Math.ceil(leaderUids.length / itemsPerPage));

	return {
		leaders,
		page,
		pageCount,
		totalItems: leaderUids.length,
		pagination: require('../pagination').create(page, pageCount),
	};
};

/**
 * Get user's organizations with full details (YOUR KEY QUERY)
 */
Membership.getUserOrganizations = async function (uid, options) {
	options = options || {};

	// Use database method for efficient query
	let organizations = await db.getUserOrganizationsWithDetails(uid);

	// Filter by status if specified
	if (options.status) {
		organizations = organizations.map((org) => {
			const filteredMemberships = org.memberships.filter(
				m => m.status === options.status
			);
			return filteredMemberships.length > 0 ? { ...org, memberships: filteredMemberships } : null;
		}).filter(Boolean);
	}

	// Add user data if includeUserData option is true
	if (options.includeUserData) {
		const userData = await user.getUserFields(uid, [
			'uid', 'username', 'userslug', 'picture', 'email',
		]);
		return {
			user: userData,
			organizations,
		};
	}

	return organizations;
};

/**
 * Get user's membership in specific organization
 */
Membership.getUserMembershipInOrganization = async function (orgId, uid) {
	return await db.getUserMembershipInOrganization(orgId, uid);
};

/**
 * Search members in organization
 */
Membership.searchMembers = async function (orgId, query, options) {
	options = options || {};
	const page = options.page || 1;
	const itemsPerPage = options.itemsPerPage || 50;

	// Get all members
	const uids = await db.getSortedSetRevRange(
		`organization:${orgId}:members:sorted`,
		0,
		-1
	);

	// Get user data
	const users = await user.getUsersFields(uids, [
		'uid', 'username', 'userslug', 'picture', 'email',
	]);

	// Filter by query
	const filtered = users.filter((user) => {
		if (!user) return false;
		const searchStr = `${user.username} ${user.email}`.toLowerCase();
		return searchStr.includes(query.toLowerCase());
	});

	// Paginate
	const start = Math.max(0, (page - 1) * itemsPerPage);
	const stop = start + itemsPerPage;
	const paginated = filtered.slice(start, stop);

	const pageCount = Math.max(1, Math.ceil(filtered.length / itemsPerPage));

	return {
		members: paginated,
		page,
		pageCount,
		totalItems: filtered.length,
		pagination: require('../pagination').create(page, pageCount),
	};
};

/**
 * Bulk add members
 */
Membership.bulkAdd = async function (orgId, members) {
	if (!Array.isArray(members) || !members.length) {
		throw new Error('[[error:invalid-members-data]]');
	}

	const results = {
		added: [],
		failed: [],
	};

	for (const memberData of members) {
		try {
			const membership = await Membership.join(orgId, memberData.uid, memberData);
			results.added.push(membership);
		} catch (err) {
			results.failed.push({
				uid: memberData.uid,
				error: err.message,
			});
		}
	}

	return results;
};

/**
 * Bulk remove members
 */
Membership.bulkRemove = async function (orgId, uids) {
	if (!Array.isArray(uids) || !uids.length) {
		throw new Error('[[error:invalid-uids]]');
	}

	const results = {
		removed: [],
		failed: [],
	};

	for (const uid of uids) {
		try {
			await Membership.leaveByOrgAndUid(orgId, uid);
			results.removed.push(uid);
		} catch (err) {
			results.failed.push({
				uid,
				error: err.message,
			});
		}
	}

	return results;
};