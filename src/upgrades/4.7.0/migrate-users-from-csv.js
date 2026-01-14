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
					
					if (!fields[colMap.username] || !fields[colMap.email]) {
						winston.warn(`[2026/01/14] Skipping row - missing username or email`);
						progress.incr(1);
						continue;
					}

					const userData = {
						username: fields[colMap.username].trim(),
						userslug: fields[colMap.userslug] ? fields[colMap.userslug].trim() : undefined,
						email: fields[colMap.email].trim(),
						fullname: fields[colMap.fullname] ? fields[colMap.fullname].trim() : undefined,
					};

					const orgId = fields[colMap.orgId] ? parseInt(fields[colMap.orgId].trim(), 10) : null;
					const deptId = fields[colMap.deptId] ? parseInt(fields[colMap.deptId].trim(), 10) : null;
					const roleId = fields[colMap.roleId] ? parseInt(fields[colMap.roleId].trim(), 10) : null;
					const memberType = fields[colMap.memberType] ? fields[colMap.memberType].trim() : 'member';
					const status = fields[colMap.status] ? fields[colMap.status].trim() : 'active';

					// Check if user exists by username or email
					let uid = await getUserByUsernameOrEmail(userData.username, userData.email);

					// If user exists, remove their existing memberships
					if (uid) {
						winston.info(`[2026/01/14] User ${userData.username} exists (uid: ${uid}), removing old memberships`);
						await removeUserMemberships(uid);
					} else {
						// Create new user
						winston.info(`[2026/01/14] Creating new user ${userData.username}`);
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

// Helper function to remove user's existing memberships
async function removeUserMemberships(uid) {
	try {
		// Get all user's active memberships
		const membershipIds = await db.getSetMembers(`uid:${uid}:memberships:active`);
		
		if (!membershipIds || membershipIds.length === 0) {
			return;
		}

		// Remove each membership
		for (const membershipId of membershipIds) {
			try {
				await organizations.membership.leave(membershipId);
			} catch (err) {
				// If membership doesn't exist or already removed, continue
				winston.warn(`Could not remove membership ${membershipId}: ${err.message}`);
			}
		}
	} catch (err) {
		winston.error(`Error removing memberships for uid ${uid}: ${err.message}`);
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
