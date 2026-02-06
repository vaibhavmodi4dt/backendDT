#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

// CSV parser from the migration script
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

(async () => {
	try {
		const csvPath = path.join(__dirname, 'user.csv');
		console.log('Reading CSV file:', csvPath);

		const csvContent = await fs.readFile(csvPath, 'utf-8');
		const lines = csvContent.split('\n').filter(line => line.trim());

		console.log(`Total lines: ${lines.length}`);
		console.log(`Data rows: ${lines.length - 1}\n`);

		// Parse header
		const header = parseCSVRow(lines[0]).map(h => h.trim().replace(/"/g, ''));
		console.log('Header fields:', header.length);
		console.log('Headers:', header.slice(0, 5).join(' | '), '...');

		// Column indices
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

		console.log('\nColumn mappings:');
		Object.keys(colMap).forEach(key => {
			console.log(`  ${key}: ${colMap[key]} = ${header[colMap[key]]}`);
		});

		// Validate data
		const rows = lines.slice(1);
		let validCount = 0;
		let invalidCount = 0;
		const issues = [];

		for (let i = 0; i < rows.length; i++) {
			const fields = parseCSVRow(rows[i]);
			const username = fields[colMap.username] && fields[colMap.username].trim();
			const email = fields[colMap.email] && fields[colMap.email].trim();
			const orgId = fields[colMap.orgId] && fields[colMap.orgId].trim();

			if (!username || !email) {
				invalidCount++;
				issues.push(`Row ${i + 2}: Missing username or email`);
			} else if (!orgId) {
				invalidCount++;
				issues.push(`Row ${i + 2}: Missing organization ID for ${username}`);
			} else {
				validCount++;
			}
		}

		console.log(`\nValidation results:`);
		console.log(`  Valid rows: ${validCount}`);
		console.log(`  Invalid rows: ${invalidCount}`);

		if (issues.length > 0) {
			console.log('\nIssues found:');
			issues.forEach(issue => console.log(`  - ${issue}`));
		}

		// Show sample data
		console.log('\nSample data (first row):');
		const firstRow = parseCSVRow(rows[0]);
		console.log(`  Username: ${firstRow[colMap.username]}`);
		console.log(`  Email: ${firstRow[colMap.email]}`);
		console.log(`  Full name: ${firstRow[colMap.fullname]}`);
		console.log(`  Org ID: ${firstRow[colMap.orgId]}`);
		console.log(`  Dept ID: ${firstRow[colMap.deptId]}`);
		console.log(`  Role ID: ${firstRow[colMap.roleId]}`);
		console.log(`  Member Type: ${firstRow[colMap.memberType]}`);
		console.log(`  Status: ${firstRow[colMap.status]}`);

		console.log('\n✓ CSV validation complete');
	} catch (err) {
		console.error('Error:', err.message);
		process.exit(1);
	}
})();
