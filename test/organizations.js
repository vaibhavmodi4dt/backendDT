'use strict';

const assert = require('assert');

const db = require('./mocks/databasemock');
const Organizations = require('../src/organizations');
const User = require('../src/user');
const groups = require('../src/groups');

describe('Organizations', () => {
	let testUid;
	let adminUid;
	let testOrgId;
	let testDeptId;
	let testRoleId;

	before(async () => {
		// Create test users
		testUid = await User.create({ 
			username: 'orgTestUser', 
			email: 'orgtest@example.com', 
			password: '123456' 
		});
		
		adminUid = await User.create({ 
			username: 'orgAdmin', 
			email: 'orgadmin@example.com', 
			password: '123456' 
		});
		
		// Confirm emails
		await User.setUserField(testUid, 'email', 'orgtest@example.com');
		await User.email.confirmByUid(testUid);
		await User.setUserField(adminUid, 'email', 'orgadmin@example.com');
		await User.email.confirmByUid(adminUid);
		
		// Make admin
		await groups.join('administrators', adminUid);
	});

	describe('Organization CRUD', () => {
		it('should create an organization', async () => {
			const orgData = {
				name: 'Test Organization',
				sector: 'Technology',
				website: 'https://test.org',
				about: 'A test organization',
				createdBy: adminUid,
			};
			
			const organization = await Organizations.create(orgData);
			
			assert(organization);
			assert.strictEqual(organization.name, 'Test Organization');
			assert.strictEqual(organization.sector, 'Technology');
			assert(organization.orgId);
			
			testOrgId = organization.orgId;
		});

		it('should get organization by id', async () => {
			const organization = await Organizations.get(testOrgId);
			
			assert(organization);
			assert.strictEqual(organization.orgId, testOrgId);
			assert.strictEqual(organization.name, 'Test Organization');
		});

		it('should update organization', async () => {
			const organization = await Organizations.update(testOrgId, {
				name: 'Updated Organization',
				about: 'Updated description',
				updatedBy: adminUid,
			});
			
			assert.strictEqual(organization.name, 'Updated Organization');
			assert.strictEqual(organization.about, 'Updated description');
		});

		it('should list all organizations', async () => {
			const result = await Organizations.list({ page: 1, itemsPerPage: 20 });
			
			assert(result);
			assert(Array.isArray(result.organizations));
			assert(result.organizations.length > 0);
			assert(result.pagination);
		});

		it('should list active organizations', async () => {
			const result = await Organizations.listActive({ page: 1, itemsPerPage: 20 });
			
			assert(result);
			assert(Array.isArray(result.organizations));
		});

		it('should search organizations', async () => {
			const result = await Organizations.search('Updated', { page: 1, itemsPerPage: 20 });
			
			assert(result);
			assert(Array.isArray(result.organizations));
		});

		it('should get organization stats', async () => {
			const stats = await Organizations.getStats(testOrgId);
			
			assert(stats);
			assert.strictEqual(typeof stats.memberCount, 'number');
			assert.strictEqual(typeof stats.departmentCount, 'number');
			assert.strictEqual(typeof stats.roleCount, 'number');
		});

		it('should check if organization exists', async () => {
			const exists = await Organizations.exists(testOrgId);
			assert.strictEqual(exists, true);
			
			const notExists = await Organizations.exists('nonexistent');
			assert.strictEqual(notExists, false);
		});
	});

	describe('Departments', () => {
		it('should create a department', async () => {
			const deptData = {
				name: 'Engineering',
				description: 'Engineering department',
				createdBy: adminUid,
			};
			
			const department = await Organizations.createDepartment(testOrgId, deptData);
			
			assert(department);
			assert.strictEqual(department.name, 'Engineering');
			assert.strictEqual(department.organizationId, testOrgId);
			assert(department.deptId);
			
			testDeptId = department.deptId;
		});

		it('should get department by id', async () => {
			const department = await Organizations.getDepartment(testDeptId);
			
			assert(department);
			assert.strictEqual(department.deptId, testDeptId);
			assert.strictEqual(department.name, 'Engineering');
		});

		it('should get all departments in organization', async () => {
			const result = await Organizations.getDepartmentsByOrganization(testOrgId, {
				page: 1,
				itemsPerPage: 20,
			});
			
			assert(result);
			assert(Array.isArray(result.departments));
			assert(result.departments.length > 0);
		});

		it('should update department', async () => {
			const department = await Organizations.updateDepartment(testDeptId, {
				name: 'Software Engineering',
				description: 'Updated description',
				updatedBy: adminUid,
			});
			
			assert.strictEqual(department.name, 'Software Engineering');
			assert.strictEqual(department.description, 'Updated description');
		});

		it('should check if department exists', async () => {
			const exists = await Organizations.departmentExists(testDeptId);
			assert.strictEqual(exists, true);
		});

		it('should get department stats', async () => {
			const stats = await Organizations.getDepartmentStats(testDeptId);
			
			assert(stats);
			assert.strictEqual(typeof stats.memberCount, 'number');
		});
	});

	describe('Roles', () => {
		it('should create a role', async () => {
			const roleData = {
				name: 'Software Developer',
				description: 'Develops software',
				createdBy: adminUid,
			};
			
			const role = await Organizations.createRole(testOrgId, roleData);
			
			assert(role);
			assert.strictEqual(role.name, 'Software Developer');
			assert.strictEqual(role.organizationId, testOrgId);
			assert(role.roleId);
			
			testRoleId = role.roleId;
		});

		it('should get role by id', async () => {
			const role = await Organizations.getRole(testRoleId);
			
			assert(role);
			assert.strictEqual(role.roleId, testRoleId);
			assert.strictEqual(role.name, 'Software Developer');
		});

		it('should get all roles in organization', async () => {
			const result = await Organizations.getRolesByOrganization(testOrgId, {
				page: 1,
				itemsPerPage: 20,
			});
			
			assert(result);
			assert(Array.isArray(result.roles));
			assert(result.roles.length > 0);
		});

		it('should update role', async () => {
			const role = await Organizations.updateRole(testRoleId, {
				name: 'Senior Software Developer',
				description: 'Senior developer role',
				updatedBy: adminUid,
			});
			
			assert.strictEqual(role.name, 'Senior Software Developer');
		});

		it('should check if role exists', async () => {
			const exists = await Organizations.roleExists(testRoleId);
			assert.strictEqual(exists, true);
		});
	});

	describe('Membership', () => {
		it('should add member to organization', async () => {
			const membership = await Organizations.join(testOrgId, testUid, {
				type: 'member',
				departmentId: testDeptId,
				roleId: testRoleId,
			});
			
			assert(membership);
			assert.strictEqual(parseInt(membership.uid, 10), parseInt(testUid, 10));
			assert.strictEqual(membership.organizationId, testOrgId);
			assert.strictEqual(membership.type, 'member');
			assert(membership.membershipId);
		});

		it('should check if user is member', async () => {
			const isMember = await Organizations.isMember(testOrgId, testUid);
			assert.strictEqual(isMember, true);
		});

		it('should get all members', async () => {
			const result = await Organizations.getMembers(testOrgId, {
				page: 1,
				itemsPerPage: 50,
			});
			
			assert(result);
			assert(Array.isArray(result.members));
			assert(result.members.length > 0);
		});

		it('should get user memberships in organization', async () => {
			const memberships = await Organizations.getUserMembershipInOrganization(testOrgId, testUid);
			
			assert(Array.isArray(memberships));
			assert(memberships.length > 0);
			assert.strictEqual(parseInt(memberships[0].uid, 10), parseInt(testUid, 10));
		});

		it('should get user organizations', async () => {
			const organizations = await Organizations.getUserOrganizations(testUid, {
				status: 'active',
			});
			
			assert(Array.isArray(organizations));
			assert(organizations.length > 0);
		});

		it('should add manager to organization', async () => {
			const managerUid = await User.create({ 
				username: 'orgManager', 
				email: 'manager@example.com', 
				password: '123456' 
			});
			
			await Organizations.join(testOrgId, managerUid, {
				type: 'manager',
				departmentId: testDeptId,
			});
			
			const isManager = await Organizations.isManager(testOrgId, managerUid);
			assert.strictEqual(isManager, true);
		});

		it('should get managers', async () => {
			const result = await Organizations.getManagers(testOrgId, {
				page: 1,
				itemsPerPage: 50,
			});
			
			assert(result);
			assert(Array.isArray(result.managers));
		});

		it('should check if user is department member', async () => {
			const isMember = await Organizations.isDepartmentMember(testDeptId, testUid);
			assert.strictEqual(isMember, true);
		});

		it('should get department members', async () => {
			const result = await Organizations.getDepartmentMembers(testDeptId, {
				page: 1,
				itemsPerPage: 50,
			});
			
			assert(result);
			assert(Array.isArray(result.members));
		});
	});

	describe('Bulk Operations', () => {
		let bulkUserUids;

		before(async () => {
			bulkUserUids = await Promise.all([
				User.create({ username: 'bulkUser1', password: '123456' }),
				User.create({ username: 'bulkUser2', password: '123456' }),
				User.create({ username: 'bulkUser3', password: '123456' }),
			]);
		});

		it('should bulk add members', async () => {
			const members = bulkUserUids.map(uid => ({
				uid: uid,
				type: 'member',
				departmentId: testDeptId,
				roleId: testRoleId,
			}));
			
			const result = await Organizations.bulkAddMembers(testOrgId, members);
			
			assert(result);
			assert(result.added);
		});

		it('should verify bulk members were added', async () => {
			for (const uid of bulkUserUids) {
				const isMember = await Organizations.isMember(testOrgId, uid);
				assert.strictEqual(isMember, true);
			}
		});

		it('should bulk remove members', async () => {
			const result = await Organizations.bulkRemoveMembers(testOrgId, bulkUserUids);
			
			assert(result);
			assert(result.removed);
		});

		it('should verify bulk members were removed', async () => {
			for (const uid of bulkUserUids) {
				const isMember = await Organizations.isMember(testOrgId, uid);
				assert.strictEqual(isMember, false);
			}
		});
	});

	describe('Error Handling', () => {
		it('should error with invalid organization id', async () => {
			try {
				await Organizations.get('nonexistent');
				assert(false);
			} catch (err) {
				assert(err);
			}
		});

		it('should error with invalid department id', async () => {
			try {
				await Organizations.getDepartment('nonexistent');
				assert(false);
			} catch (err) {
				assert(err);
			}
		});

		it('should error with invalid role id', async () => {
			try {
				await Organizations.getRole('nonexistent');
				assert(false);
			} catch (err) {
				assert(err);
			}
		});

		it('should error when adding duplicate member', async () => {
			try {
				await Organizations.join(testOrgId, testUid, {
					type: 'member',
				});
				assert(false);
			} catch (err) {
				assert.strictEqual(err.message, '[[error:already-member]]');
			}
		});
	});

	describe('Cleanup', () => {
		it('should delete role', async () => {
			await Organizations.deleteRole(testRoleId);
			const exists = await Organizations.roleExists(testRoleId);
			assert.strictEqual(exists, false);
		});

		it('should delete department', async () => {
			await Organizations.deleteDepartment(testDeptId);
			const exists = await Organizations.departmentExists(testDeptId);
			assert.strictEqual(exists, false);
		});

		it('should delete organization', async () => {
			await Organizations.delete(testOrgId);
			const exists = await Organizations.exists(testOrgId);
			assert.strictEqual(exists, false);
		});
	});
});