'use strict';

/**
 * HVT Module Seeding Script
 * 
 * This script seeds the default 8 HVT modules for each organization.
 * Can be run manually or called during organization creation.
 * 
 * Usage:
 *   node seed-hvt-modules.js <orgId>
 */

const HVT = require('./hvt');
const Organizations = require('./organizations');

async function seedHVTModulesForOrg(orgId, adminUid = 1) {
	console.log(`Seeding HVT modules for organization ${orgId}...`);
	
	try {
		// Check if organization exists
		const orgExists = await Organizations.exists(orgId);
		if (!orgExists) {
			throw new Error(`Organization ${orgId} does not exist`);
		}

		// Seed modules using the default seeding function
		const modules = await HVT.modules.seedDefaults(orgId, adminUid);
		
		console.log(`Successfully seeded ${modules.length} HVT modules for organization ${orgId}:`);
		modules.forEach(mod => {
			console.log(`  - ${mod.name} (${mod.moduleId})`);
		});
		
		return modules;
	} catch (err) {
		console.error(`Error seeding HVT modules for org ${orgId}:`, err.message);
		throw err;
	}
}

async function seedHVTModulesForAllOrgs(adminUid = 1) {
	console.log('Seeding HVT modules for all organizations...');
	
	try {
		// Get all organizations
		const orgs = await Organizations.getAll();
		
		if (!orgs || orgs.length === 0) {
			console.log('No organizations found. Skipping HVT module seeding.');
			return;
		}
		
		console.log(`Found ${orgs.length} organizations`);
		
		// Seed modules for each organization
		const results = [];
		for (const org of orgs) {
			try {
				const modules = await seedHVTModulesForOrg(org.orgId, adminUid);
				results.push({ orgId: org.orgId, modules, success: true });
			} catch (err) {
				console.error(`Failed to seed org ${org.orgId}:`, err.message);
				results.push({ orgId: org.orgId, error: err.message, success: false });
			}
		}
		
		// Summary
		const successful = results.filter(r => r.success).length;
		const failed = results.filter(r => !r.success).length;
		
		console.log('\nSeeding Summary:');
		console.log(`  Successful: ${successful}`);
		console.log(`  Failed: ${failed}`);
		
		return results;
	} catch (err) {
		console.error('Error seeding HVT modules for all orgs:', err.message);
		throw err;
	}
}

// CLI execution
if (require.main === module) {
	(async () => {
		try {
			const orgId = process.argv[2];
			
			if (orgId) {
				// Seed for specific organization
				await seedHVTModulesForOrg(orgId);
			} else {
				// Seed for all organizations
				await seedHVTModulesForAllOrgs();
			}
			
			console.log('\nHVT module seeding completed successfully!');
			process.exit(0);
		} catch (err) {
			console.error('\nHVT module seeding failed:', err);
			process.exit(1);
		}
	})();
}

module.exports = {
	seedHVTModulesForOrg,
	seedHVTModulesForAllOrgs,
};
