'use strict';

const { Command } = require('commander');

module.exports = () => {
	const migrateCmd = new Command('migrate')
		.description('Import/migrate data from CSV files')
		.arguments('[command]');

	migrateCmd.configureHelp(require('./colors'));
	const migrateCommands = MigrateCommands();

	migrateCmd
		.command('users')
		.description('Import users from CSV file with organization memberships')
		.requiredOption('-f, --file <path>', 'Path to CSV file')
		.option('--skip-existing', 'Skip existing users instead of updating memberships', false)
		.option('--dry-run', 'Validate CSV without making changes', false)
		.action((...args) => execute(migrateCommands.users, args));

	migrateCmd
		.command('organizations')
		.description('Import organizations from CSV file')
		.requiredOption('-f, --file <path>', 'Path to CSV file')
		.option('--skip-existing', 'Skip existing organizations', false)
		.option('--dry-run', 'Validate CSV without making changes', false)
		.action((...args) => execute(migrateCommands.organizations, args));

	migrateCmd
		.command('departments')
		.description('Import departments from CSV file')
		.requiredOption('-f, --file <path>', 'Path to CSV file')
		.option('--skip-existing', 'Skip existing departments', false)
		.option('--dry-run', 'Validate CSV without making changes', false)
		.action((...args) => execute(migrateCommands.departments, args));

	migrateCmd
		.command('roles')
		.description('Import roles from CSV file')
		.requiredOption('-f, --file <path>', 'Path to CSV file')
		.option('--skip-existing', 'Skip existing roles', false)
		.option('--dry-run', 'Validate CSV without making changes', false)
		.action((...args) => execute(migrateCommands.roles, args));

	migrateCmd
		.command('link-user')
		.description('Link a user to organization, department, and role with intelligent flow control')
		.option('-u, --user-id <uid>', 'User ID')
		.option('-n, --username <username>', 'Username')
		.option('-o, --organization-id <orgId>', 'Organization ID', parseInt)
		.option('-d, --department-id <deptId>', 'Department ID', parseInt)
		.option('-r, --role-id <roleId>', 'Role ID', parseInt)
		.option('--dry-run', 'Show what would be done without making changes', false)
		.action((...args) => execute(migrateCommands.linkUser, args));

	migrateCmd
		.command('validate')
		.description('Validate a CSV file before importing')
		.requiredOption('-f, --file <path>', 'Path to CSV file')
		.requiredOption('-t, --type <type>', 'Type of data (users, organizations, departments, roles)')
		.action((...args) => execute(migrateCommands.validate, args));

	return migrateCmd;
};

function MigrateCommands() {
	const Commands = {};

	Commands.users = async function (opts) {
		const winston = require('winston');
		const chalk = require('chalk');
		const fs = require('fs').promises;
		const path = require('path');
		const db = require('../database');
		const user = require('../user');
		const organizations = require('../organizations');

		const filePath = path.resolve(opts.file);
		winston.info(`[migrate/users] Reading CSV file: ${filePath}`);

		try {
			// Check if file exists
			await fs.access(filePath);

			if (opts.dryRun) {
				winston.info('[migrate/users] Running in dry-run mode (no changes will be made)');
				await validateUsersCsv(filePath);
				console.log(chalk.green('\n✓ CSV validation successful'));
				return;
			}

			// Initialize database
			await db.init();

			// Process the CSV file
			const stats = await importUsersFromCsv(filePath, {
				skipExisting: opts.skipExisting,
			});

			console.log(chalk.green(`\n✓ Migration complete: ${stats.success} successful, ${stats.errors} errors`));
			process.exit(0);
		} catch (err) {
			winston.error(`[migrate/users] Error: ${err.message}`);
			console.error(chalk.red(`\n✗ Migration failed: ${err.message}`));
			process.exit(1);
		}
	};

	Commands.organizations = async function (opts) {
		const winston = require('winston');
		const chalk = require('chalk');
		const fs = require('fs').promises;
		const path = require('path');
		const db = require('../database');
		const organizations = require('../organizations');

		const filePath = path.resolve(opts.file);
		winston.info(`[migrate/organizations] Reading CSV file: ${filePath}`);

		try {
			await fs.access(filePath);

			if (opts.dryRun) {
				winston.info('[migrate/organizations] Running in dry-run mode (no changes will be made)');
				await validateOrganizationsCsv(filePath);
				console.log(chalk.green('\n✓ CSV validation successful'));
				return;
			}

			await db.init();

			const stats = await importOrganizationsFromCsv(filePath, {
				skipExisting: opts.skipExisting,
			});

			console.log(chalk.green(`\n✓ Migration complete: ${stats.success} successful, ${stats.errors} errors`));
			process.exit(0);
		} catch (err) {
			winston.error(`[migrate/organizations] Error: ${err.message}`);
			console.error(chalk.red(`\n✗ Migration failed: ${err.message}`));
			process.exit(1);
		}
	};

	Commands.departments = async function (opts) {
		const winston = require('winston');
		const chalk = require('chalk');
		const fs = require('fs').promises;
		const path = require('path');
		const db = require('../database');
		const organizations = require('../organizations');

		const filePath = path.resolve(opts.file);
		winston.info(`[migrate/departments] Reading CSV file: ${filePath}`);

		try {
			await fs.access(filePath);

			if (opts.dryRun) {
				winston.info('[migrate/departments] Running in dry-run mode (no changes will be made)');
				await validateDepartmentsCsv(filePath);
				console.log(chalk.green('\n✓ CSV validation successful'));
				return;
			}

			await db.init();

			const stats = await importDepartmentsFromCsv(filePath, {
				skipExisting: opts.skipExisting,
			});

			console.log(chalk.green(`\n✓ Migration complete: ${stats.success} successful, ${stats.errors} errors`));
			process.exit(0);
		} catch (err) {
			winston.error(`[migrate/departments] Error: ${err.message}`);
			console.error(chalk.red(`\n✗ Migration failed: ${err.message}`));
			process.exit(1);
		}
	};

	Commands.roles = async function (opts) {
		const winston = require('winston');
		const chalk = require('chalk');
		const fs = require('fs').promises;
		const path = require('path');
		const db = require('../database');
		const organizations = require('../organizations');

		const filePath = path.resolve(opts.file);
		winston.info(`[migrate/roles] Reading CSV file: ${filePath}`);

		try {
			await fs.access(filePath);

			if (opts.dryRun) {
				winston.info('[migrate/roles] Running in dry-run mode (no changes will be made)');
				await validateRolesCsv(filePath);
				console.log(chalk.green('\n✓ CSV validation successful'));
				return;
			}

			await db.init();

			const stats = await importRolesFromCsv(filePath, {
				skipExisting: opts.skipExisting,
			});

			console.log(chalk.green(`\n✓ Migration complete: ${stats.success} successful, ${stats.errors} errors`));
			process.exit(0);
		} catch (err) {
			winston.error(`[migrate/roles] Error: ${err.message}`);
			console.error(chalk.red(`\n✗ Migration failed: ${err.message}`));
			process.exit(1);
		}
	};

	Commands.linkUser = async function (opts) {
		const winston = require('winston');
		const chalk = require('chalk');
		const db = require('../database');
		const user = require('../user');
		const organizations = require('../organizations');

		// Validate input
		if (!opts.userId && !opts.username) {
			console.error(chalk.red('✗ Error: Either --user-id or --username must be provided'));
			process.exit(1);
		}

		if (!opts.organizationId) {
			console.error(chalk.red('✗ Error: --organization-id is required'));
			process.exit(1);
		}

		const startTime = Date.now();
		winston.info('[link-user] Starting user linking process');

		try {
			await db.init();

			// Step 1: User Validation
			console.log(chalk.blue('\n=== Step 1: User Validation ==='));
			let uid;

			if (opts.userId) {
				uid = opts.userId;
				const userExists = await user.exists(uid);
				if (!userExists) {
					throw new Error(`User with ID ${uid} does not exist`);
				}
			} else {
				uid = await db.sortedSetScore('username:uid', opts.username);
				if (!uid) {
					throw new Error(`User with username "${opts.username}" does not exist`);
				}
			}

			const userData = await user.getUserFields(uid, ['username', 'email', 'fullname']);
			console.log(chalk.green(`✓ User validated: ${userData.username} (uid: ${uid})`));

			// Step 2: Organization Validation
			console.log(chalk.blue('\n=== Step 2: Organization Validation ==='));
			const orgId = opts.organizationId;
			const orgExists = await organizations.exists(orgId);
			if (!orgExists) {
				throw new Error(`Organization ${orgId} does not exist`);
			}

			const org = await organizations.get(orgId);
			console.log(chalk.green(`✓ Organization validated: ${org.name} (ID: ${orgId})`));

			// Check if user is already member of organization
			const isMember = await organizations.isMember(orgId, uid);
			let membershipCreated = false;
			let membershipId = null;

			if (!isMember) {
				if (opts.dryRun) {
					console.log(chalk.yellow('  [DRY RUN] Would create membership in organization'));
				} else {
					// Create base membership
					const membershipData = {
						type: 'member',
					};
					const membership = await organizations.membership.join(orgId, uid, membershipData);
					membershipId = membership.membershipId;
					membershipCreated = true;
					winston.info(`[link-user] Created membership ${membershipId} for user ${uid} in org ${orgId}`);
					console.log(chalk.green(`✓ Organization membership: created (ID: ${membershipId})`));
				}
			} else {
				// Get existing membership
				const memberships = await organizations.getUserMembershipInOrganization(orgId, uid);
				if (memberships && memberships.length > 0) {
					membershipId = memberships[0].membershipId;
				}
				console.log(chalk.yellow(`✓ Organization membership: already exists (ID: ${membershipId})`));
			}

			// Step 3: Department Linking Logic
			if (opts.departmentId) {
				console.log(chalk.blue('\n=== Step 3: Department Linking ==='));
				const deptId = opts.departmentId;

				// Validate department exists
				const deptExists = await organizations.departmentExists(deptId);
				if (!deptExists) {
					throw new Error(`Department ${deptId} does not exist`);
				}

				const dept = await organizations.getDepartment(deptId);

				// Verify department belongs to organization
				if (String(dept.organizationId) !== String(orgId)) {
					throw new Error(`Department ${deptId} does not belong to organization ${orgId}`);
				}

				console.log(chalk.green(`✓ Department validated: ${dept.name} (ID: ${deptId})`));

				// Check if already linked to department
				const memberships = await organizations.getUserMembershipInOrganization(orgId, uid);
				const hasThisDept = memberships.some(m => String(m.departmentId) === String(deptId));

				if (!hasThisDept) {
					if (opts.dryRun) {
						console.log(chalk.yellow('  [DRY RUN] Would link user to department'));
					} else {
						// Update membership with department
						if (membershipId) {
							await organizations.membership.update(membershipId, { departmentId: deptId });
							winston.info(`[link-user] Linked user ${uid} to department ${deptId}`);
							console.log(chalk.green(`✓ Department link: created`));
						} else if (!membershipCreated) {
							// Need to create membership with department
							const membershipData = {
								type: 'member',
								departmentId: deptId,
							};
							const membership = await organizations.membership.join(orgId, uid, membershipData);
							membershipId = membership.membershipId;
							winston.info(`[link-user] Created membership ${membershipId} with department ${deptId}`);
							console.log(chalk.green(`✓ Department link: created (new membership ID: ${membershipId})`));
						}
					}
				} else {
					console.log(chalk.yellow(`✓ Department link: already exists`));
				}
			} else {
				console.log(chalk.blue('\n=== Step 3: Department Linking ==='));
				console.log(chalk.gray('  No department specified, skipping'));
			}

			// Step 4: Role Linking Logic
			if (opts.roleId) {
				console.log(chalk.blue('\n=== Step 4: Role Linking ==='));
				const roleId = opts.roleId;

				// Validate role exists
				const roleExists = await organizations.roleExists(roleId);
				if (!roleExists) {
					throw new Error(`Role ${roleId} does not exist`);
				}

				const role = await organizations.getRole(roleId);

				// Verify role belongs to organization
				if (String(role.organizationId) !== String(orgId)) {
					throw new Error(`Role ${roleId} does not belong to organization ${orgId}`);
				}

				// If role is department-scoped, verify department matches
				if (role.departmentId && opts.departmentId && String(role.departmentId) !== String(opts.departmentId)) {
					throw new Error(`Role ${roleId} belongs to department ${role.departmentId}, not ${opts.departmentId}`);
				}

				console.log(chalk.green(`✓ Role validated: ${role.name} (ID: ${roleId}, scope: ${role.scope})`));

				// Check if already linked to role
				const memberships = await organizations.getUserMembershipInOrganization(orgId, uid);
				const hasThisRole = memberships.some(m => String(m.roleId) === String(roleId));

				if (!hasThisRole) {
					if (opts.dryRun) {
						console.log(chalk.yellow('  [DRY RUN] Would link user to role'));
					} else {
						// Update membership with role
						if (membershipId) {
							await organizations.membership.update(membershipId, { roleId });
							winston.info(`[link-user] Linked user ${uid} to role ${roleId}`);
							console.log(chalk.green(`✓ Role link: created`));
						} else if (!membershipCreated) {
							// Need to create membership with role
							const membershipData = {
								type: 'member',
								roleId,
							};
							if (opts.departmentId) {
								membershipData.departmentId = opts.departmentId;
							}
							const membership = await organizations.membership.join(orgId, uid, membershipData);
							membershipId = membership.membershipId;
							winston.info(`[link-user] Created membership ${membershipId} with role ${roleId}`);
							console.log(chalk.green(`✓ Role link: created (new membership ID: ${membershipId})`));
						}
					}
				} else {
					console.log(chalk.yellow(`✓ Role link: already exists`));
				}
			} else {
				console.log(chalk.blue('\n=== Step 4: Role Linking ==='));
				console.log(chalk.gray('  No role specified, skipping'));
			}

			// Step 5: Completion
			const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
			console.log(chalk.blue('\n=== Summary ==='));
			console.log(chalk.green(`✓ User: ${userData.username} (${userData.email})`));
			console.log(chalk.green(`✓ Organization: ${org.name}`));
			if (opts.departmentId) {
				const dept = await organizations.getDepartment(opts.departmentId);
				console.log(chalk.green(`✓ Department: ${dept.name}`));
			}
			if (opts.roleId) {
				const role = await organizations.getRole(opts.roleId);
				console.log(chalk.green(`✓ Role: ${role.name}`));
			}
			console.log(chalk.green(`✓ Process completed successfully in ${elapsed}s`));

			if (opts.dryRun) {
				console.log(chalk.yellow('\n[DRY RUN] No changes were made to the database'));
			}

			process.exit(0);
		} catch (err) {
			winston.error(`[link-user] Error: ${err.message}`);
			console.error(chalk.red(`\n✗ Error: ${err.message}`));
			console.error(chalk.gray(err.stack));
			process.exit(1);
		}
	};

	Commands.validate = async function (opts) {
		const winston = require('winston');
		const chalk = require('chalk');
		const fs = require('fs').promises;
		const path = require('path');

		const filePath = path.resolve(opts.file);
		winston.info(`[migrate/validate] Validating ${opts.type} CSV: ${filePath}`);

		try {
			await fs.access(filePath);

			if (opts.type === 'users') {
				await validateUsersCsv(filePath);
			} else if (opts.type === 'organizations') {
				await validateOrganizationsCsv(filePath);
			} else if (opts.type === 'departments') {
				await validateDepartmentsCsv(filePath);
			} else if (opts.type === 'roles') {
				await validateRolesCsv(filePath);
			} else {
				throw new Error(`Unsupported validation type: ${opts.type}`);
			}

			console.log(chalk.green('\n✓ CSV validation successful'));
			process.exit(0);
		} catch (err) {
			winston.error(`[migrate/validate] Error: ${err.message}`);
			console.error(chalk.red(`\n✗ Validation failed: ${err.message}`));
			process.exit(1);
		}
	};

	async function validateUsersCsv(filePath) {
		const chalk = require('chalk');
		const fs = require('fs').promises;

		const csvContent = await fs.readFile(filePath, 'utf-8');
		const lines = csvContent.split('\n').filter(line => line.trim());

		if (lines.length <= 1) {
			throw new Error('CSV file is empty or has no data rows');
		}

		// Parse header
		const header = parseCSVRow(lines[0]).map(h => h.trim().replace(/"/g, ''));
		const rows = lines.slice(1);

		console.log(`\n${chalk.blue('CSV Statistics:')}`);
		console.log(`  Total lines: ${lines.length}`);
		console.log(`  Data rows: ${rows.length}`);
		console.log(`  Header fields: ${header.length}`);

		// Required columns
		const requiredColumns = ['Username', 'SU Email'];
		const missingColumns = requiredColumns.filter(col => !header.includes(col));

		if (missingColumns.length > 0) {
			throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
		}

		// Column indices
		const colMap = {
			username: header.indexOf('Username'),
			email: header.indexOf('SU Email'),
			fullname: header.indexOf('Student Unicorn'),
			orgId: header.indexOf('Organization ID'),
			deptId: header.indexOf('Department ID'),
			roleId: header.indexOf('Role ID'),
		};

		// Validate data
		let validCount = 0;
		let invalidCount = 0;
		const issues = [];

		for (let i = 0; i < rows.length; i++) {
			const fields = parseCSVRow(rows[i]);
			const username = fields[colMap.username] && fields[colMap.username].trim();
			const email = fields[colMap.email] && fields[colMap.email].trim();

			if (!username || !email) {
				invalidCount++;
				issues.push(`Row ${i + 2}: Missing username or email`);
			} else {
				validCount++;
			}
		}

		console.log(`\n${chalk.blue('Validation Results:')}`);
		console.log(`  ${chalk.green('Valid rows:')} ${validCount}`);
		console.log(`  ${chalk.red('Invalid rows:')} ${invalidCount}`);

		if (issues.length > 0 && issues.length <= 10) {
			console.log(`\n${chalk.yellow('Issues found:')}`);
			issues.forEach(issue => console.log(`  ${chalk.yellow('⚠')} ${issue}`));
		} else if (issues.length > 10) {
			console.log(`\n${chalk.yellow('Issues found:')} ${issues.length} (showing first 10)`);
			issues.slice(0, 10).forEach(issue => console.log(`  ${chalk.yellow('⚠')} ${issue}`));
		}

		if (invalidCount > 0) {
			throw new Error(`Found ${invalidCount} invalid rows in CSV`);
		}

		// Show sample
		console.log(`\n${chalk.blue('Sample data (first row):')}`);
		const firstRow = parseCSVRow(rows[0]);
		console.log(`  Username: ${firstRow[colMap.username]}`);
		console.log(`  Email: ${firstRow[colMap.email]}`);
		console.log(`  Full name: ${firstRow[colMap.fullname] || '(empty)'}`);
		console.log(`  Org ID: ${firstRow[colMap.orgId] || '(empty)'}`);

		return { validCount, invalidCount, issues };
	}

	async function importUsersFromCsv(filePath, options = {}) {
		const winston = require('winston');
		const chalk = require('chalk');
		const fs = require('fs').promises;
		const db = require('../database');
		const user = require('../user');
		const organizations = require('../organizations');

		const csvContent = await fs.readFile(filePath, 'utf-8');
		const lines = csvContent.split('\n').filter(line => line.trim());

		if (lines.length <= 1) {
			throw new Error('CSV file is empty or has no data rows');
		}

		// Parse header
		const header = parseCSVRow(lines[0]).map(h => h.trim().replace(/"/g, ''));
		const rows = lines.slice(1);

		// Column indices
		const colMap = {
			username: header.indexOf('Username'),
			userslug: header.indexOf('Userslug'),
			email: header.indexOf('SU Email'),
			fullname: header.indexOf('Student Unicorn'),
			orgId: header.indexOf('Organization ID'),
			deptId: header.indexOf('Department ID'),
			roleId: header.indexOf('Role ID'),
			memberType: header.indexOf('Member Type'),
			status: header.indexOf('Status'),
		};

		let successCount = 0;
		let errorCount = 0;
		const errors = [];

		for (let i = 0; i < rows.length; i++) {
			try {
				const fields = parseCSVRow(rows[i]);
				const username = fields[colMap.username] && fields[colMap.username].trim();
				const email = fields[colMap.email] && fields[colMap.email].trim();

				if (!username || !email) {
					winston.warn(`[migrate/users] Row ${i + 2}: Skipping - missing username or email`);
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

				// Check if user exists
				let uid = await getUserByUsernameOrEmail(username, email);

				if (uid && options.skipExisting) {
					winston.info(`[migrate/users] Row ${i + 2}: Skipping existing user ${username}`);
					successCount++;
					continue;
				}

				if (uid) {
					winston.info(`[migrate/users] Row ${i + 2}: User ${username} exists (uid: ${uid})`);
					if (orgId) {
						await removeUserFromOrganization(uid, orgId);
					}
				} else {
					winston.info(`[migrate/users] Row ${i + 2}: Creating new user ${username}`);
					uid = await user.create(userData);
				}

				// Add organization membership
				if (uid && orgId) {
					await addUserToOrganization(uid, orgId, deptId, roleId, memberType);
				}

				successCount++;
			} catch (err) {
				errorCount++;
				const errorMsg = `Row ${i + 2}: ${err.message}`;
				winston.error(`[migrate/users] ${errorMsg}`);
				errors.push(errorMsg);
			}
		}

		if (errors.length > 0 && errors.length <= 10) {
			console.log(`\n${chalk.yellow('Errors encountered:')}`);
			errors.forEach(err => console.log(`  ${chalk.red('✗')} ${err}`));
		} else if (errors.length > 10) {
			console.log(`\n${chalk.yellow('Errors encountered:')} ${errors.length} (showing first 10)`);
			errors.slice(0, 10).forEach(err => console.log(`  ${chalk.red('✗')} ${err}`));
		}

		return { success: successCount, errors: errorCount };
	}

	// Helper functions
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

	async function getUserByUsernameOrEmail(username, email) {
		const winston = require('winston');
		const db = require('../database');

		try {
			const uidByUsername = await db.sortedSetScore('username:uid', username);
			if (uidByUsername) {
				return uidByUsername;
			}

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

	async function removeUserFromOrganization(uid, orgId) {
		const winston = require('winston');
		const organizations = require('../organizations');

		try {
			await organizations.membership.leaveByOrgAndUid(orgId, uid);
			winston.info(`[migrate/users] Removed uid ${uid} from organization ${orgId}`);
		} catch (err) {
			if (err.message.includes('not-a-member')) {
				winston.info(`[migrate/users] User ${uid} is not a member of org ${orgId}`);
			} else {
				throw err;
			}
		}
	}

	async function addUserToOrganization(uid, orgId, deptId, roleId, memberType) {
		const winston = require('winston');
		const organizations = require('../organizations');

		const membershipData = { type: memberType };

		if (deptId) {
			// Validate department exists
			const deptExists = await organizations.departmentExists(deptId);
			if (!deptExists) {
				throw new Error(`Department ${deptId} does not exist`);
			}
			membershipData.departmentId = deptId;
		}

		if (roleId) {
			// Validate role exists
			const roleExists = await organizations.roleExists(roleId);
			if (!roleExists) {
				throw new Error(`Role ${roleId} does not exist`);
			}
			membershipData.roleId = roleId;
		}

		const orgExists = await organizations.exists(orgId);
		if (!orgExists) {
			throw new Error(`Organization ${orgId} does not exist`);
		}

		await organizations.membership.join(orgId, uid, membershipData);
		winston.info(`[migrate/users] Added uid ${uid} to organization ${orgId}`);
	}

	// ==================== ORGANIZATIONS ====================

	async function validateOrganizationsCsv(filePath) {
		const chalk = require('chalk');
		const fs = require('fs').promises;

		const csvContent = await fs.readFile(filePath, 'utf-8');
		const lines = csvContent.split('\n').filter(line => line.trim());

		if (lines.length <= 1) {
			throw new Error('CSV file is empty or has no data rows');
		}

		const header = parseCSVRow(lines[0]).map(h => h.trim().replace(/"/g, ''));
		const rows = lines.slice(1);

		console.log(`\n${chalk.blue('CSV Statistics:')}`);
		console.log(`  Total lines: ${lines.length}`);
		console.log(`  Data rows: ${rows.length}`);
		console.log(`  Header fields: ${header.length}`);

		const requiredColumns = ['Name'];
		const missingColumns = requiredColumns.filter(col => !header.includes(col));

		if (missingColumns.length > 0) {
			throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
		}

		const colMap = {
			name: header.indexOf('Name'),
			sector: header.indexOf('Sector'),
			website: header.indexOf('Website'),
			about: header.indexOf('About'),
		};

		let validCount = 0;
		let invalidCount = 0;
		const issues = [];

		for (let i = 0; i < rows.length; i++) {
			const fields = parseCSVRow(rows[i]);
			const name = fields[colMap.name] && fields[colMap.name].trim();

			if (!name) {
				invalidCount++;
				issues.push(`Row ${i + 2}: Missing organization name`);
			} else {
				validCount++;
			}
		}

		console.log(`\n${chalk.blue('Validation Results:')}`);
		console.log(`  ${chalk.green('Valid rows:')} ${validCount}`);
		console.log(`  ${chalk.red('Invalid rows:')} ${invalidCount}`);

		if (issues.length > 0 && issues.length <= 10) {
			console.log(`\n${chalk.yellow('Issues found:')}`);
			issues.forEach(issue => console.log(`  ${chalk.yellow('⚠')} ${issue}`));
		}

		if (invalidCount > 0) {
			throw new Error(`Found ${invalidCount} invalid rows in CSV`);
		}

		const firstRow = parseCSVRow(rows[0]);
		console.log(`\n${chalk.blue('Sample data (first row):')}`);
		console.log(`  Name: ${firstRow[colMap.name]}`);
		console.log(`  Sector: ${firstRow[colMap.sector] || '(empty)'}`);
		console.log(`  Website: ${firstRow[colMap.website] || '(empty)'}`);

		return { validCount, invalidCount, issues };
	}

	async function importOrganizationsFromCsv(filePath, options = {}) {
		const winston = require('winston');
		const chalk = require('chalk');
		const fs = require('fs').promises;
		const organizations = require('../organizations');

		const csvContent = await fs.readFile(filePath, 'utf-8');
		const lines = csvContent.split('\n').filter(line => line.trim());

		if (lines.length <= 1) {
			throw new Error('CSV file is empty or has no data rows');
		}

		const header = parseCSVRow(lines[0]).map(h => h.trim().replace(/"/g, ''));
		const rows = lines.slice(1);

		const colMap = {
			name: header.indexOf('Name'),
			sector: header.indexOf('Sector'),
			website: header.indexOf('Website'),
			about: header.indexOf('About'),
			employeeRange: header.indexOf('Employee Range'),
		};

		let successCount = 0;
		let errorCount = 0;
		const errors = [];

		for (let i = 0; i < rows.length; i++) {
			try {
				const fields = parseCSVRow(rows[i]);
				const name = fields[colMap.name] && fields[colMap.name].trim();

				if (!name) {
					winston.warn(`[migrate/organizations] Row ${i + 2}: Skipping - missing name`);
					continue;
				}

				// Check if organization already exists by name
				const existingOrgs = await organizations.list({ itemsPerPage: 1000 });
				const existing = existingOrgs.organizations.find(org => org.name === name);

				if (existing && options.skipExisting) {
					winston.info(`[migrate/organizations] Row ${i + 2}: Skipping existing organization ${name}`);
					successCount++;
					continue;
				}

				if (existing) {
					winston.info(`[migrate/organizations] Row ${i + 2}: Organization ${name} already exists (ID: ${existing.orgId})`);
					successCount++;
					continue;
				}

				const orgData = {
					name,
					sector: (fields[colMap.sector] && fields[colMap.sector].trim()) || '',
					website: (fields[colMap.website] && fields[colMap.website].trim()) || '',
					about: (fields[colMap.about] && fields[colMap.about].trim()) || '',
					employeeRange: (fields[colMap.employeeRange] && fields[colMap.employeeRange].trim()) || '',
				};

				winston.info(`[migrate/organizations] Row ${i + 2}: Creating organization ${name}`);
				const org = await organizations.create(orgData);
				winston.info(`[migrate/organizations] Created organization ${name} with ID ${org.orgId}`);

				successCount++;
			} catch (err) {
				errorCount++;
				const errorMsg = `Row ${i + 2}: ${err.message}`;
				winston.error(`[migrate/organizations] ${errorMsg}`);
				errors.push(errorMsg);
			}
		}

		if (errors.length > 0 && errors.length <= 10) {
			console.log(`\n${chalk.yellow('Errors encountered:')}`);
			errors.forEach(err => console.log(`  ${chalk.red('✗')} ${err}`));
		}

		return { success: successCount, errors: errorCount };
	}

	// ==================== DEPARTMENTS ====================

	async function validateDepartmentsCsv(filePath) {
		const chalk = require('chalk');
		const fs = require('fs').promises;

		const csvContent = await fs.readFile(filePath, 'utf-8');
		const lines = csvContent.split('\n').filter(line => line.trim());

		if (lines.length <= 1) {
			throw new Error('CSV file is empty or has no data rows');
		}

		const header = parseCSVRow(lines[0]).map(h => h.trim().replace(/"/g, ''));
		const rows = lines.slice(1);

		console.log(`\n${chalk.blue('CSV Statistics:')}`);
		console.log(`  Total lines: ${lines.length}`);
		console.log(`  Data rows: ${rows.length}`);
		console.log(`  Header fields: ${header.length}`);

		const requiredColumns = ['Name', 'Organization ID'];
		const missingColumns = requiredColumns.filter(col => !header.includes(col));

		if (missingColumns.length > 0) {
			throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
		}

		const colMap = {
			name: header.indexOf('Name'),
			orgId: header.indexOf('Organization ID'),
			description: header.indexOf('Description'),
		};

		let validCount = 0;
		let invalidCount = 0;
		const issues = [];

		for (let i = 0; i < rows.length; i++) {
			const fields = parseCSVRow(rows[i]);
			const name = fields[colMap.name] && fields[colMap.name].trim();
			const orgId = fields[colMap.orgId] && fields[colMap.orgId].trim();

			if (!name || !orgId) {
				invalidCount++;
				issues.push(`Row ${i + 2}: Missing name or organization ID`);
			} else {
				validCount++;
			}
		}

		console.log(`\n${chalk.blue('Validation Results:')}`);
		console.log(`  ${chalk.green('Valid rows:')} ${validCount}`);
		console.log(`  ${chalk.red('Invalid rows:')} ${invalidCount}`);

		if (issues.length > 0 && issues.length <= 10) {
			console.log(`\n${chalk.yellow('Issues found:')}`);
			issues.forEach(issue => console.log(`  ${chalk.yellow('⚠')} ${issue}`));
		}

		if (invalidCount > 0) {
			throw new Error(`Found ${invalidCount} invalid rows in CSV`);
		}

		const firstRow = parseCSVRow(rows[0]);
		console.log(`\n${chalk.blue('Sample data (first row):')}`);
		console.log(`  Name: ${firstRow[colMap.name]}`);
		console.log(`  Organization ID: ${firstRow[colMap.orgId]}`);
		console.log(`  Description: ${firstRow[colMap.description] || '(empty)'}`);

		return { validCount, invalidCount, issues };
	}

	async function importDepartmentsFromCsv(filePath, options = {}) {
		const winston = require('winston');
		const chalk = require('chalk');
		const fs = require('fs').promises;
		const organizations = require('../organizations');

		const csvContent = await fs.readFile(filePath, 'utf-8');
		const lines = csvContent.split('\n').filter(line => line.trim());

		if (lines.length <= 1) {
			throw new Error('CSV file is empty or has no data rows');
		}

		const header = parseCSVRow(lines[0]).map(h => h.trim().replace(/"/g, ''));
		const rows = lines.slice(1);

		const colMap = {
			name: header.indexOf('Name'),
			description: header.indexOf('Description'),
			orgId: header.indexOf('Organization ID'),
			parentDeptId: header.indexOf('Parent Department ID'),
			level: header.indexOf('Level'),
		};

		let successCount = 0;
		let errorCount = 0;
		const errors = [];

		for (let i = 0; i < rows.length; i++) {
			try {
				const fields = parseCSVRow(rows[i]);
				const name = fields[colMap.name] && fields[colMap.name].trim();
				const orgIdStr = fields[colMap.orgId] && fields[colMap.orgId].trim();

				if (!name || !orgIdStr) {
					winston.warn(`[migrate/departments] Row ${i + 2}: Skipping - missing name or organization ID`);
					continue;
				}

				const orgId = parseInt(orgIdStr, 10);

				// Check if organization exists
				const orgExists = await organizations.exists(orgId);
				if (!orgExists) {
					throw new Error(`Organization ${orgId} does not exist`);
				}

				// Check if department already exists
				const existingDepts = await organizations.getDepartmentsByOrganization(orgId);
				const existing = existingDepts.find(dept => dept.name === name);

				if (existing && options.skipExisting) {
					winston.info(`[migrate/departments] Row ${i + 2}: Skipping existing department ${name}`);
					successCount++;
					continue;
				}

				if (existing) {
					winston.info(`[migrate/departments] Row ${i + 2}: Department ${name} already exists in org ${orgId}`);
					successCount++;
					continue;
				}

				const deptData = {
					name,
					description: (fields[colMap.description] && fields[colMap.description].trim()) || '',
				};

				const parentDeptIdStr = fields[colMap.parentDeptId] && fields[colMap.parentDeptId].trim();
				if (parentDeptIdStr) {
					deptData.parentDepartmentId = parseInt(parentDeptIdStr, 10);
				}

				const levelStr = fields[colMap.level] && fields[colMap.level].trim();
				if (levelStr) {
					deptData.level = parseInt(levelStr, 10);
				}

				winston.info(`[migrate/departments] Row ${i + 2}: Creating department ${name} in organization ${orgId}`);
				const dept = await organizations.createDepartment(orgId, deptData);
				winston.info(`[migrate/departments] Created department ${name} with ID ${dept.deptId}`);

				successCount++;
			} catch (err) {
				errorCount++;
				const errorMsg = `Row ${i + 2}: ${err.message}`;
				winston.error(`[migrate/departments] ${errorMsg}`);
				errors.push(errorMsg);
			}
		}

		if (errors.length > 0 && errors.length <= 10) {
			console.log(`\n${chalk.yellow('Errors encountered:')}`);
			errors.forEach(err => console.log(`  ${chalk.red('✗')} ${err}`));
		}

		return { success: successCount, errors: errorCount };
	}

	// ==================== ROLES ====================

	async function validateRolesCsv(filePath) {
		const chalk = require('chalk');
		const fs = require('fs').promises;

		const csvContent = await fs.readFile(filePath, 'utf-8');
		const lines = csvContent.split('\n').filter(line => line.trim());

		if (lines.length <= 1) {
			throw new Error('CSV file is empty or has no data rows');
		}

		const header = parseCSVRow(lines[0]).map(h => h.trim().replace(/"/g, ''));
		const rows = lines.slice(1);

		console.log(`\n${chalk.blue('CSV Statistics:')}`);
		console.log(`  Total lines: ${lines.length}`);
		console.log(`  Data rows: ${rows.length}`);
		console.log(`  Header fields: ${header.length}`);

		const requiredColumns = ['Name', 'Organization ID'];
		const missingColumns = requiredColumns.filter(col => !header.includes(col));

		if (missingColumns.length > 0) {
			throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
		}

		const colMap = {
			name: header.indexOf('Name'),
			orgId: header.indexOf('Organization ID'),
			description: header.indexOf('Description'),
		};

		let validCount = 0;
		let invalidCount = 0;
		const issues = [];

		for (let i = 0; i < rows.length; i++) {
			const fields = parseCSVRow(rows[i]);
			const name = fields[colMap.name] && fields[colMap.name].trim();
			const orgId = fields[colMap.orgId] && fields[colMap.orgId].trim();

			if (!name || !orgId) {
				invalidCount++;
				issues.push(`Row ${i + 2}: Missing name or organization ID`);
			} else {
				validCount++;
			}
		}

		console.log(`\n${chalk.blue('Validation Results:')}`);
		console.log(`  ${chalk.green('Valid rows:')} ${validCount}`);
		console.log(`  ${chalk.red('Invalid rows:')} ${invalidCount}`);

		if (issues.length > 0 && issues.length <= 10) {
			console.log(`\n${chalk.yellow('Issues found:')}`);
			issues.forEach(issue => console.log(`  ${chalk.yellow('⚠')} ${issue}`));
		}

		if (invalidCount > 0) {
			throw new Error(`Found ${invalidCount} invalid rows in CSV`);
		}

		const firstRow = parseCSVRow(rows[0]);
		console.log(`\n${chalk.blue('Sample data (first row):')}`);
		console.log(`  Name: ${firstRow[colMap.name]}`);
		console.log(`  Organization ID: ${firstRow[colMap.orgId]}`);
		console.log(`  Description: ${firstRow[colMap.description] || '(empty)'}`);

		return { validCount, invalidCount, issues };
	}

	async function importRolesFromCsv(filePath, options = {}) {
		const winston = require('winston');
		const chalk = require('chalk');
		const fs = require('fs').promises;
		const organizations = require('../organizations');

		const csvContent = await fs.readFile(filePath, 'utf-8');
		const lines = csvContent.split('\n').filter(line => line.trim());

		if (lines.length <= 1) {
			throw new Error('CSV file is empty or has no data rows');
		}

		const header = parseCSVRow(lines[0]).map(h => h.trim().replace(/"/g, ''));
		const rows = lines.slice(1);

		const colMap = {
			name: header.indexOf('Name'),
			description: header.indexOf('Description'),
			orgId: header.indexOf('Organization ID'),
			deptId: header.indexOf('Department ID'),
			scope: header.indexOf('Scope'),
		};

		let successCount = 0;
		let errorCount = 0;
		const errors = [];

		for (let i = 0; i < rows.length; i++) {
			try {
				const fields = parseCSVRow(rows[i]);
				const name = fields[colMap.name] && fields[colMap.name].trim();
				const orgIdStr = fields[colMap.orgId] && fields[colMap.orgId].trim();

				if (!name || !orgIdStr) {
					winston.warn(`[migrate/roles] Row ${i + 2}: Skipping - missing name or organization ID`);
					continue;
				}

				const orgId = parseInt(orgIdStr, 10);

				// Check if organization exists
				const orgExists = await organizations.exists(orgId);
				if (!orgExists) {
					throw new Error(`Organization ${orgId} does not exist`);
				}

				// Check if role already exists
				const existingRoles = await organizations.getRolesByOrganization(orgId);
				const existing = existingRoles.find(role => role.name === name);

				if (existing && options.skipExisting) {
					winston.info(`[migrate/roles] Row ${i + 2}: Skipping existing role ${name}`);
					successCount++;
					continue;
				}

				if (existing) {
					winston.info(`[migrate/roles] Row ${i + 2}: Role ${name} already exists in org ${orgId}`);
					successCount++;
					continue;
				}

				const roleData = {
					name,
					description: (fields[colMap.description] && fields[colMap.description].trim()) || '',
					scope: (fields[colMap.scope] && fields[colMap.scope].trim()) || 'organization',
				};

				const deptIdStr = fields[colMap.deptId] && fields[colMap.deptId].trim();
				if (deptIdStr) {
					roleData.departmentId = parseInt(deptIdStr, 10);
					if (roleData.scope === 'organization') {
						roleData.scope = 'department';
					}
				}

				winston.info(`[migrate/roles] Row ${i + 2}: Creating role ${name} in organization ${orgId}`);
				const role = await organizations.createRole(orgId, roleData);
				winston.info(`[migrate/roles] Created role ${name} with ID ${role.roleId}`);

				successCount++;
			} catch (err) {
				errorCount++;
				const errorMsg = `Row ${i + 2}: ${err.message}`;
				winston.error(`[migrate/roles] ${errorMsg}`);
				errors.push(errorMsg);
			}
		}

		if (errors.length > 0 && errors.length <= 10) {
			console.log(`\n${chalk.yellow('Errors encountered:')}`);
			errors.forEach(err => console.log(`  ${chalk.red('✗')} ${err}`));
		}

		return { success: successCount, errors: errorCount };
	}

	return Commands;
}

function execute(fn, args) {
	fn.apply(null, args).catch((err) => {
		const winston = require('winston');
		winston.error(err.stack);
		process.exit(1);
	});
}
