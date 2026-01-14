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
		.command('validate')
		.description('Validate a CSV file before importing')
		.requiredOption('-f, --file <path>', 'Path to CSV file')
		.requiredOption('-t, --type <type>', 'Type of data (users, organizations, etc.)')
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
				console.log(chalk.green('\n✓ CSV validation successful'));
			} else {
				throw new Error(`Unsupported validation type: ${opts.type}`);
			}

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
			membershipData.departmentId = deptId;
		}

		if (roleId) {
			membershipData.roleId = roleId;
		}

		const orgExists = await organizations.exists(orgId);
		if (!orgExists) {
			throw new Error(`Organization ${orgId} does not exist`);
		}

		await organizations.membership.join(orgId, uid, membershipData);
		winston.info(`[migrate/users] Added uid ${uid} to organization ${orgId}`);
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
