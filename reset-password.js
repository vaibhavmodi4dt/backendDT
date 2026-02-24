'use strict';

// Usage: node reset-password.js <uid> <newpassword>
// Example: node reset-password.js 1 admin123

const nconf = require('nconf');
nconf.file({ file: './config.json' });
nconf.defaults({ base_dir: __dirname });

const db = require('./src/database');

async function main() {
	const uid = process.argv[2];
	const newPassword = process.argv[3];

	if (!uid || !newPassword) {
		// If no args, list all admins and usage
		await db.init();
		const adminUids = await db.getSortedSetRange('group:administrators:members', 0, -1);
		console.log('\nAdmin users in this database:');
		for (const id of adminUids) {
			const u = await db.getObjectFields(`user:${id}`, ['username', 'email']);
			console.log(`  uid: ${id} | username: ${u.username} | email: ${u.email}`);
		}
		console.log('\nUsage: node reset-password.js <uid> <newpassword>');
		console.log('Example: node reset-password.js 1 admin123');
		process.exit(0);
	}

	await db.init();

	// Verify user exists
	const userData = await db.getObjectFields(`user:${uid}`, ['username', 'email']);
	if (!userData.username) {
		console.error(`No user found with uid: ${uid}`);
		process.exit(1);
	}

	console.log(`Resetting password for uid:${uid} (${userData.username} / ${userData.email})`);

	const Password = require('./src/password');
	const hash = await Password.hash(12, newPassword);

	await db.setObjectField(`user:${uid}`, 'password', hash);
	await db.setObjectField(`user:${uid}`, 'password:shaWrapped', 1);

	console.log(`\n✓ Password reset to: "${newPassword}"`);
	console.log('New hash written to MongoDB.');
	console.log('⚠ Restart the server (Render/local) for the in-memory cache to clear.');
	process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
