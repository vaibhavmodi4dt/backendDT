'use strict';

const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');

const db = require('../../database');
const user = require('../../user');
const organizations = require('../../organizations');

module.exports = {
	name: 'Migrate users from user.csv',
	timestamp: Date.UTC(2026, 0, 14),
	method: async function () {
		const { progress } = this;
		const csvPath = path.join(__dirname, '../../../user.csv');

		winston.info('[2026/01/14] Starting user CSV migration');

		try {
			// Read CSV file
			const csvContent = await fs.readFile(csvPath, 'utf-8');
			const lines = csvContent.split('\n').filter(line => line.trim());

			if (lines.length <= 1) {
				winston.info('[2026/01/14] No users to migrate');
				return;
			}

			// Parse header
			const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
			const rows = lines.slice(1);

			progress.total = rows.length;

			// Column indices from CSV
			const colMap = {
				username: header.indexOf('Username'),
				userslug: header.indexOf('Userslug'),
				email: header.indexOf('SU Email'),
				fullname: header.indexOf('Student Unicorn'),
				uid: header.indexOf('UID'),
				orgId: header.indexOf('Organization ID'),
				deptId: header.indexOf('Department ID'),
				roleId: header.indexOf('Role ID'),
				membershipId: header.indexOf('Membership ID'),
				memberType: header.indexOf('Member Type'),
				status: header.indexOf('Status'),
			};

			let successCount = 0;
			let errorCount = 0;

			for (const row of rows) {
				try {
					// Parse CSV row - handle quoted fields
					const fields = parseCSVRow(row);
					
					// Skip if username or email is missing
					const username = fields[colMap.username] && fields[colMap.username].trim();
					const email = fields[colMap.email] && fields[colMap.email].trim();
					
					if (!username || !email) {
						winston.warn(`[2026/01/14] Skipping row - missing username or email`);
						progress.incr(1);
						continue;
					}

					const userData = {
						username,
						userslug: fields[colMap.userslug] && fields[colMap.userslug].trim(),
						email,
						fullname: fields[colMap.fullname] && fields[colMap.fullname].trim(),
					};

					const orgIdStr = fields[colMap.orgId] && fields[colMap.orgId].trim();
					const deptIdStr = fields[colMap.deptId] && fields[colMap.deptId].trim();
					const roleIdStr = fields[colMap.roleId] && fields[colMap.roleId].trim();
					
					const orgId = orgIdStr ? parseInt(orgIdStr, 10) : null;
					const deptId = deptIdStr ? parseInt(deptIdStr, 10) : null;
					const roleId = roleIdStr ? parseInt(roleIdStr, 10) : null;
					const memberType = (fields[colMap.memberType] && fields[colMap.memberType].trim()) || 'member';
					const status = (fields[colMap.status] && fields[colMap.status].trim()) || 'active';

					// Check if user exists by username or email
					let uid = await getUserByUsernameOrEmail(username, email);

					// If user exists, remove them from the organization first (if they're already a member)
					if (uid) {
						winston.info(`[2026/01/14] User ${username} exists (uid: ${uid})`);
						if (orgId) {
							await removeUserFromOrganization(uid, orgId);
						}
					} else {
						// Create new user
						winston.info(`[2026/01/14] Creating new user ${username}`);
						uid = await user.create(userData);
					}

					// Add organization membership if orgId is provided
					if (uid && orgId) {
						await addUserToOrganization(uid, orgId, deptId, roleId, memberType, status);
					}

					successCount++;
				} catch (err) {
					errorCount++;
					winston.error(`[2026/01/14] Error processing row: ${err.message}`);
				}

				progress.incr(1);
			}

			winston.info(`[2026/01/14] Migration complete: ${successCount} successful, ${errorCount} errors`);
		} catch (err) {
			winston.error(`[2026/01/14] Fatal error during migration: ${err.message}`);
			throw err;
		}
	},
};

// Helper function to parse CSV row handling quoted fields
function parseCSVRow(row) {
	const fields = [];
	let currentField = '';
	let insideQuotes = false;

	for (let i = 0; i < row.length; i++) {
		const char = row[i];

		if (char === '"') {
			insideQuotes = !insideQuotes;
		} else if (char === ',' && !insideQuotes) {
			fields.push(currentField);
			currentField = '';
		} else {
			currentField += char;
		}
	}
	fields.push(currentField);

	return fields;
}

// Helper function to get user by username or email
async function getUserByUsernameOrEmail(username, email) {
	try {
		// Try to get uid by username
		const uidByUsername = await db.sortedSetScore('username:uid', username);
		if (uidByUsername) {
			return uidByUsername;
		}

		// Try to get uid by email
		const uidByEmail = await db.sortedSetScore('email:uid', email);
		if (uidByEmail) {
			return uidByEmail;
		}

		return null;
	} catch (err) {
		winston.error(`Error checking user existence: ${err.message}`);
		return null;
	}
}

// Helper function to remove user's memberships from a specific organization
async function removeUserFromOrganization(uid, orgId) {
	try {
		await organizations.membership.leaveByOrgAndUid(orgId, uid);
		winston.info(`[2026/01/14] Removed uid ${uid} from organization ${orgId}`);
	} catch (err) {
		// If user is not a member, that's fine - we'll add them
		if (err.message.includes('not-a-member')) {
			winston.info(`[2026/01/14] User ${uid} is not a member of org ${orgId}, will add`);
		} else {
			winston.error(`Error removing uid ${uid} from org ${orgId}: ${err.message}`);
		}
	}
}

// Helper function to add user to organization with department and role
async function addUserToOrganization(uid, orgId, deptId, roleId, memberType, status) {
	try {
		const membershipData = {
			type: memberType,
		};

		if (deptId) {
			membershipData.departmentId = deptId;
		}

		if (roleId) {
			membershipData.roleId = roleId;
		}

		// Check if organization exists
		const orgExists = await organizations.exists(orgId);
		if (!orgExists) {
			winston.warn(`Organization ${orgId} does not exist, skipping membership`);
			return;
		}

		// Join user to organization
		await organizations.membership.join(orgId, uid, membershipData);
		winston.info(`[2026/01/14] Added uid ${uid} to organization ${orgId}`);
	} catch (err) {
		// Log but don't fail - user was created/updated successfully
		winston.error(`Error adding uid ${uid} to organization ${orgId}: ${err.message}`);
	}
}
