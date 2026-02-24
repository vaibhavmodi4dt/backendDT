#!/usr/bin/env node
'use strict';

const upgrade = require('./src/upgrade');

(async () => {
	try {
		console.log('Fetching all upgrade scripts...');
		const files = await upgrade.getAll();
		console.log(`Total upgrades: ${files.length}`);
		
		const ourScript = files.find(f => f.includes('migrate-users-from-csv'));
		if (ourScript) {
			console.log('✓ Migration script found:', ourScript);
			
			// Load and check the script structure
			const script = require(ourScript);
			console.log('✓ Script name:', script.name);
			console.log('✓ Script timestamp:', new Date(script.timestamp));
			console.log('✓ Script has method:', typeof script.method === 'function');
		} else {
			console.log('✗ Migration script NOT found');
			console.log('Available upgrade files:');
			files.forEach(f => console.log('  -', f));
			process.exit(1);
		}
	} catch (err) {
		console.error('Error:', err.message);
		console.error(err.stack);
		process.exit(1);
	}
})();
