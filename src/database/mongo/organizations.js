'use strict';

const {collections} = require('./collections');

module.exports = function (module) {
	const helpers = require('./helpers');

	// Collection option for organizations
	const collectionOptions = { collection: collections.ORGANIZATIONS };

	// ==================== ORGANIZATIONS ====================

	module.createOrganization = async function (data) {
		const orgId = await module.incrObjectField('global', 'nextOrgId');
		const timestamp = Date.now();

		const orgData = {
			_key: `organization:${orgId}`,
			orgId: String(orgId),
			name: data.name,
			sector: data.sector || '',
			website: data.website || '',
			about: data.about || '',
			employeeRange: data.employeeRange || '',
			emails: data.emails || [],
			phoneNumbers: data.phoneNumbers || [],
			locations: data.locations || [],
			socialLinks: data.socialLinks || [],
			leaders: data.leaders || [],
			images: data.images || {},
			state: 'active',
			timestamp: timestamp,
			lastmodified: timestamp,
			lastmodifiedBy: data.createdBy || '',
		};

		// Store in 'organizations' collection
		await module.setObject(`organization:${orgId}`, orgData, collectionOptions);

		// Store relationships in 'indexes' collection
		await module.sortedSetAdd('organizations:sorted', timestamp, orgId);
		await module.setAdd('organizations:active', orgId);

		if (data.sector) {
			await module.setAdd(`organizations:sector:${data.sector}`, orgId);
		}

		return orgData;
	};

	module.getOrganization = async function (orgId) {
		return await module.getObject(`organization:${orgId}`, [], collectionOptions);
	};

	module.getOrganizations = async function (orgIds) {
		if (!Array.isArray(orgIds) || !orgIds.length) {
			return [];
		}
		return await module.getObjects(
			orgIds.map(id => `organization:${id}`),
			[],
			collectionOptions
		);
	};

	module.getOrganizationsFields = async function (orgIds, fields) {
		if (!Array.isArray(orgIds) || !orgIds.length) {
			return [];
		}
		return await module.getObjectsFields(
			orgIds.map(id => `organization:${id}`),
			fields,
			collectionOptions
		);
	};

	module.updateOrganization = async function (orgId, data) {
		const updateData = {
			...data,
			lastmodified: Date.now(),
		};

		if (data.updatedBy) {
			updateData.lastmodifiedBy = data.updatedBy;
		}

		await module.setObject(`organization:${orgId}`, updateData, collectionOptions);
		return await module.getOrganization(orgId);
	};

	module.deleteOrganization = async function (orgId) {
		await module.setObjectField(`organization:${orgId}`, 'state', 'deleted', collectionOptions);
		await module.setRemove('organizations:active', orgId);
	};

	module.getOrganizationField = async function (orgId, field) {
		return await module.getObjectField(`organization:${orgId}`, field, collectionOptions);
	};

	module.setOrganizationField = async function (orgId, field, value) {
		return await module.setObjectField(`organization:${orgId}`, field, value, collectionOptions);
	};

	module.isOrganizationActive = async function (orgId) {
		return await module.isSetMember('organizations:active', orgId);
	};

	// ==================== DEPARTMENTS ====================

	module.createDepartment = async function (orgId, data) {
		const deptId = await module.incrObjectField('global', 'nextDeptId');
		const timestamp = Date.now();

		const deptData = {
			_key: `department:${deptId}`,
			deptId: String(deptId),
			organizationId: String(orgId),
			name: data.name,
			description: data.description || '',
			parentDepartmentId: data.parentDepartmentId || null,
			level: data.level || 0,
			state: 'active',
			timestamp: timestamp,
			lastmodified: timestamp,
			lastmodifiedBy: data.createdBy || '',
		};

		// Store in 'organizations' collection
		await module.setObject(`department:${deptId}`, deptData, collectionOptions);

		// Store relationships in 'indexes' collection
		await module.sortedSetAdd(`organization:${orgId}:departments:sorted`, timestamp, deptId);
		await module.setAdd(`organization:${orgId}:departments`, deptId);

		if (data.parentDepartmentId) {
			await module.setAdd(`department:${data.parentDepartmentId}:children`, deptId);
		}

		return deptData;
	};

	module.getDepartment = async function (deptId) {
		return await module.getObject(`department:${deptId}`, [], collectionOptions);
	};

	module.getDepartments = async function (deptIds) {
		if (!Array.isArray(deptIds) || !deptIds.length) {
			return [];
		}
		return await module.getObjects(
			deptIds.map(id => `department:${id}`),
			[],
			collectionOptions
		);
	};

	module.getDepartmentsFields = async function (deptIds, fields) {
		if (!Array.isArray(deptIds) || !deptIds.length) {
			return [];
		}
		return await module.getObjectsFields(
			deptIds.map(id => `department:${id}`),
			fields,
			collectionOptions
		);
	};

	module.getOrganizationDepartments = async function (orgId, start, stop) {
		const deptIds = await module.getSortedSetRevRange(
			`organization:${orgId}:departments:sorted`,
			start,
			stop
		);
		return await module.getDepartments(deptIds);
	};

	module.updateDepartment = async function (deptId, data) {
		const updateData = {
			...data,
			lastmodified: Date.now(),
		};

		if (data.updatedBy) {
			updateData.lastmodifiedBy = data.updatedBy;
		}

		await module.setObject(`department:${deptId}`, updateData, collectionOptions);
		return await module.getDepartment(deptId);
	};

	module.deleteDepartment = async function (deptId) {
		const dept = await module.getDepartment(deptId);
		if (!dept) {
			return;
		}

		await module.setObjectField(`department:${deptId}`, 'state', 'deleted', collectionOptions);
		await module.setRemove(`organization:${dept.organizationId}:departments`, deptId);
		await module.sortedSetRemove(`organization:${dept.organizationId}:departments:sorted`, deptId);

		if (dept.parentDepartmentId) {
			await module.setRemove(`department:${dept.parentDepartmentId}:children`, deptId);
		}
	};

	module.getDepartmentField = async function (deptId, field) {
		return await module.getObjectField(`department:${deptId}`, field, collectionOptions);
	};

	module.setDepartmentField = async function (deptId, field, value) {
		return await module.setObjectField(`department:${deptId}`, field, value, collectionOptions);
	};

	// ==================== ROLES ====================

	module.createRole = async function (orgId, data) {
		const roleId = await module.incrObjectField('global', 'nextRoleId');
		const timestamp = Date.now();

		const roleData = {
			_key: `role:${roleId}`,
			roleId: String(roleId),
			organizationId: String(orgId),
			name: data.name,
			description: data.description || '',
			scope: data.scope || 'organization',
			departmentId: data.departmentId || null,
			state: 'active',
			timestamp: timestamp,
			lastmodified: timestamp,
			lastmodifiedBy: data.createdBy || '',
		};

		// Store in 'organizations' collection
		await module.setObject(`role:${roleId}`, roleData, collectionOptions);

		// Store relationships in 'indexes' collection
		await module.sortedSetAdd(`organization:${orgId}:roles:sorted`, timestamp, roleId);
		await module.setAdd(`organization:${orgId}:roles`, roleId);

		if (data.departmentId) {
			await module.setAdd(`department:${data.departmentId}:roles`, roleId);
		}

		return roleData;
	};

	module.getRole = async function (roleId) {
		return await module.getObject(`role:${roleId}`, [], collectionOptions);
	};

	module.getRoles = async function (roleIds) {
		if (!Array.isArray(roleIds) || !roleIds.length) {
			return [];
		}
		return await module.getObjects(
			roleIds.map(id => `role:${id}`),
			[],
			collectionOptions
		);
	};

	module.getRolesFields = async function (roleIds, fields) {
		if (!Array.isArray(roleIds) || !roleIds.length) {
			return [];
		}
		return await module.getObjectsFields(
			roleIds.map(id => `role:${id}`),
			fields,
			collectionOptions
		);
	};

	module.getOrganizationRoles = async function (orgId, start, stop) {
		const roleIds = await module.getSortedSetRevRange(
			`organization:${orgId}:roles:sorted`,
			start,
			stop
		);
		return await module.getRoles(roleIds);
	};

	module.updateRole = async function (roleId, data) {
		const updateData = {
			...data,
			lastmodified: Date.now(),
		};

		if (data.updatedBy) {
			updateData.lastmodifiedBy = data.updatedBy;
		}

		await module.setObject(`role:${roleId}`, updateData, collectionOptions);
		return await module.getRole(roleId);
	};

	module.deleteRole = async function (roleId) {
		const role = await module.getRole(roleId);
		if (!role) {
			return;
		}

		await module.setObjectField(`role:${roleId}`, 'state', 'deleted', collectionOptions);
		await module.setRemove(`organization:${role.organizationId}:roles`, roleId);
		await module.sortedSetRemove(`organization:${role.organizationId}:roles:sorted`, roleId);

		if (role.departmentId) {
			await module.setRemove(`department:${role.departmentId}:roles`, roleId);
		}
	};

	module.getRoleField = async function (roleId, field) {
		return await module.getObjectField(`role:${roleId}`, field, collectionOptions);
	};

	module.setRoleField = async function (roleId, field, value) {
		return await module.setObjectField(`role:${roleId}`, field, value, collectionOptions);
	};

	// ==================== MEMBERSHIPS ====================

	module.createMembership = async function (orgId, uid, data) {
		const membershipId = await module.incrObjectField('global', 'nextMembershipId');
		const timestamp = Date.now();

		const membershipData = {
			_key: `membership:${membershipId}`,
			membershipId: String(membershipId),
			uid: String(uid),
			organizationId: String(orgId),
			departmentId: data.departmentId || null,
			type: data.type || 'member',
			roleId: data.roleId || null,
			status: 'active',
			joinedAt: timestamp,
			removedAt: null,
			timestamp: timestamp,
			lastmodified: timestamp,
		};

		// Store in 'organizations' collection
		await module.setObject(`membership:${membershipId}`, membershipData, collectionOptions);

		// Update all relationship indexes
		await module.setAdd(`uid:${uid}:memberships:active`, membershipId);
		await module.setAdd(`uid:${uid}:organizations`, orgId);
		await module.setAdd(`organization:${orgId}:members:active`, uid);
		await module.sortedSetAdd(`organization:${orgId}:members:sorted`, timestamp, uid);

		if (data.type === 'manager') {
			await module.setAdd(`organization:${orgId}:managers`, uid);
		}

		if (data.type === 'leader') {
			await module.setAdd(`organization:${orgId}:leaders`, uid);
		}

		if (data.departmentId) {
			await module.setAdd(`department:${data.departmentId}:members:active`, uid);
			await module.sortedSetAdd(`department:${data.departmentId}:members:sorted`, timestamp, uid);

			if (data.type === 'manager') {
				await module.setAdd(`department:${data.departmentId}:managers`, uid);
			}
		}

		return membershipData;
	};

	module.getMembership = async function (membershipId) {
		return await module.getObject(`membership:${membershipId}`, [], collectionOptions);
	};

	module.getMemberships = async function (membershipIds) {
		if (!Array.isArray(membershipIds) || !membershipIds.length) {
			return [];
		}
		return await module.getObjects(
			membershipIds.map(id => `membership:${id}`),
			[],
			collectionOptions
		);
	};

	module.getMembershipsFields = async function (membershipIds, fields) {
		if (!Array.isArray(membershipIds) || !membershipIds.length) {
			return [];
		}
		return await module.getObjectsFields(
			membershipIds.map(id => `membership:${id}`),
			fields,
			collectionOptions
		);
	};

	module.updateMembership = async function (membershipId, data) {
		const membership = await module.getMembership(membershipId);
		if (!membership) {
			throw new Error('[[error:membership-not-found]]');
		}

		const updateData = {
			...data,
			lastmodified: Date.now(),
		};

		// Handle type changes (manager/member/leader)
		if (data.type && data.type !== membership.type) {
			// Remove old type
			if (membership.type === 'manager') {
				await module.setRemove(`organization:${membership.organizationId}:managers`, membership.uid);
				if (membership.departmentId) {
					await module.setRemove(`department:${membership.departmentId}:managers`, membership.uid);
				}
			} else if (membership.type === 'leader') {
				await module.setRemove(`organization:${membership.organizationId}:leaders`, membership.uid);
			}

			// Add new type
			if (data.type === 'manager') {
				await module.setAdd(`organization:${membership.organizationId}:managers`, membership.uid);
				if (membership.departmentId) {
					await module.setAdd(`department:${membership.departmentId}:managers`, membership.uid);
				}
			} else if (data.type === 'leader') {
				await module.setAdd(`organization:${membership.organizationId}:leaders`, membership.uid);
			}
		}

		// Handle department changes
		if (data.departmentId !== undefined && data.departmentId !== membership.departmentId) {
			// Remove from old department
			if (membership.departmentId) {
				await module.setRemove(`department:${membership.departmentId}:members:active`, membership.uid);
				await module.sortedSetRemove(`department:${membership.departmentId}:members:sorted`, membership.uid);
				if (membership.type === 'manager') {
					await module.setRemove(`department:${membership.departmentId}:managers`, membership.uid);
				}
			}

			// Add to new department
			if (data.departmentId) {
				await module.setAdd(`department:${data.departmentId}:members:active`, membership.uid);
				await module.sortedSetAdd(`department:${data.departmentId}:members:sorted`, Date.now(), membership.uid);
				if (membership.type === 'manager' || data.type === 'manager') {
					await module.setAdd(`department:${data.departmentId}:managers`, membership.uid);
				}
			}
		}

		await module.setObject(`membership:${membershipId}`, updateData, collectionOptions);
		return await module.getMembership(membershipId);
	};

	module.removeMembership = async function (membershipId) {
		const membership = await module.getMembership(membershipId);

		if (!membership) {
			throw new Error('[[error:membership-not-found]]');
		}

		const timestamp = Date.now();

		// Update status in 'organizations' collection
		await module.setObjectFields(`membership:${membershipId}`, {
			status: 'removed',
			removedAt: timestamp,
			lastmodified: timestamp,
		}, collectionOptions);

		// Remove from all relationship indexes
		await module.setRemove(`uid:${membership.uid}:memberships:active`, membershipId);
		await module.setRemove(`organization:${membership.organizationId}:members:active`, membership.uid);
		await module.sortedSetRemove(`organization:${membership.organizationId}:members:sorted`, membership.uid);

		if (membership.type === 'manager') {
			await module.setRemove(`organization:${membership.organizationId}:managers`, membership.uid);
		}

		if (membership.type === 'leader') {
			await module.setRemove(`organization:${membership.organizationId}:leaders`, membership.uid);
		}

		if (membership.departmentId) {
			await module.setRemove(`department:${membership.departmentId}:members:active`, membership.uid);
			await module.sortedSetRemove(`department:${membership.departmentId}:members:sorted`, membership.uid);

			if (membership.type === 'manager') {
				await module.setRemove(`department:${membership.departmentId}:managers`, membership.uid);
			}
		}

		// Check if user has any other active memberships in this org
		const userMemberships = await module.getSetMembers(`uid:${membership.uid}:memberships:active`);
		const activeMemberships = await module.getMembershipsFields(userMemberships, ['organizationId', 'status']);
		const hasOtherOrgMemberships = activeMemberships.some(
			m => m.organizationId === membership.organizationId && m.status === 'active'
		);

		if (!hasOtherOrgMemberships) {
			await module.setRemove(`uid:${membership.uid}:organizations`, membership.organizationId);
		}

		return membership;
	};

	module.isMember = async function (orgId, uid) {
		return await module.isSetMember(`organization:${orgId}:members:active`, uid);
	};

	module.isManager = async function (orgId, uid) {
		return await module.isSetMember(`organization:${orgId}:managers`, uid);
	};

	module.isLeader = async function (orgId, uid) {
		return await module.isSetMember(`organization:${orgId}:leaders`, uid);
	};

	module.isDepartmentMember = async function (deptId, uid) {
		return await module.isSetMember(`department:${deptId}:members:active`, uid);
	};

	module.isDepartmentManager = async function (deptId, uid) {
		return await module.isSetMember(`department:${deptId}:managers`, uid);
	};

	module.getUserMembershipInOrganization = async function (orgId, uid) {
		const membershipIds = await module.getSetMembers(`uid:${uid}:memberships:active`);
		if (!membershipIds || !membershipIds.length) {
			return [];
		}

		const memberships = await module.getMemberships(membershipIds);
		return memberships.filter(m => m && m.organizationId === String(orgId) && m.status === 'active');
	};

	// ==================== YOUR KEY QUERY ====================

	module.getUserOrganizationsWithDetails = async function (uid) {
		// Step 1: Get user's active membership IDs
		const membershipIds = await module.getSetMembers(`uid:${uid}:memberships:active`);

		if (!membershipIds || !membershipIds.length) {
			return [];
		}

		// Step 2: Get all membership objects from 'organizations' collection
		const memberships = await module.getMemberships(membershipIds);

		// Step 3: Extract unique IDs
		const orgIds = [...new Set(memberships.map(m => m.organizationId))];
		const deptIds = [...new Set(memberships.map(m => m.departmentId).filter(Boolean))];
		const roleIds = [...new Set(memberships.map(m => m.roleId).filter(Boolean))];

		// Step 4: Batch fetch all related data from 'organizations' collection
		const [organizations, departments, roles] = await Promise.all([
			module.getOrganizations(orgIds),
			module.getDepartments(deptIds),
			module.getRoles(roleIds),
		]);

		// Step 5: Create lookup maps
		const deptMap = new Map(departments.map(d => [d.deptId, d]));
		const roleMap = new Map(roles.map(r => [r.roleId, r]));

		// Step 6: Assemble response
		const result = organizations.map((org) => {
			if (!org) return null;

			const orgMemberships = memberships
				.filter(m => m.organizationId === org.orgId)
				.map(m => ({
					membershipId: m.membershipId,
					type: m.type,
					status: m.status,
					joinedAt: m.joinedAt,
					department: deptMap.get(m.departmentId) || null,
					role: roleMap.get(m.roleId) || null,
				}));

			return {
				...org,
				memberships: orgMemberships,
			};
		}).filter(Boolean);

		return result;
	};

	// ==================== STATS & COUNTS ====================

	module.getOrganizationMemberCount = async function (orgId) {
		return await module.setCount(`organization:${orgId}:members:active`);
	};

	module.getOrganizationManagerCount = async function (orgId) {
		return await module.setCount(`organization:${orgId}:managers`);
	};

	module.getOrganizationDepartmentCount = async function (orgId) {
		return await module.setCount(`organization:${orgId}:departments`);
	};

	module.getOrganizationRoleCount = async function (orgId) {
		return await module.setCount(`organization:${orgId}:roles`);
	};

	module.getDepartmentMemberCount = async function (deptId) {
		return await module.setCount(`department:${deptId}:members:active`);
	};
};