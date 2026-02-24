'use strict';

const assert = require('assert');
const nconf = require('nconf');

const db = require('./mocks/databasemock');
const api = require('../src/api');
const user = require('../src/user');

describe('Ably Notifications API', () => {
	let adminUid;
	let testUid;

	before(async () => {
		// Create admin user
		adminUid = await user.create({ username: 'notifadmin', password: '123456', email: 'notifadmin@example.com' });
		await db.setObjectField(`user:${adminUid}`, 'administrator', 1);

		// Create test user
		testUid = await user.create({ username: 'notiftestuser', password: '123456', email: 'notiftestuser@example.com' });

		// Set up mock configuration
		nconf.set('ably:apiKey', 'test.key:secret');
		nconf.set('vapid:publicKey', 'test-public-key');
		nconf.set('vapid:privateKey', 'test-private-key');
		nconf.set('vapid:email', 'test@example.com');
	});

	describe('generateAblyToken', () => {
		it('should fail if user is not logged in', async () => {
			const caller = { uid: 0 };
			try {
				await api.notifications.generateAblyToken(caller, { uid: testUid });
				assert.fail('Should have thrown an error');
			} catch (err) {
				assert.strictEqual(err.message, '[[error:not-logged-in]]');
			}
		});

		it('should fail if requesting user does not match uid', async () => {
			const caller = { uid: testUid };
			try {
				await api.notifications.generateAblyToken(caller, { uid: adminUid });
				assert.fail('Should have thrown an error');
			} catch (err) {
				assert.strictEqual(err.message, '[[error:no-privileges]]');
			}
		});

		it('should fail if uid is invalid', async () => {
			const caller = { uid: 99999 };
			try {
				await api.notifications.generateAblyToken(caller, { uid: 99999 });
				assert.fail('Should have thrown an error');
			} catch (err) {
				assert.strictEqual(err.message, '[[error:invalid-uid]]');
			}
		});

		// Note: Full token generation test would require a valid Ably API key
		// which we don't have in the test environment
	});

	describe('storePushSubscription', () => {
		it('should fail if user is not logged in', async () => {
			const caller = { uid: 0 };
			const subscription = {
				endpoint: 'https://example.com/push',
				keys: { p256dh: 'key1', auth: 'key2' },
			};
			try {
				await api.notifications.storePushSubscription(caller, { uid: testUid, subscription });
				assert.fail('Should have thrown an error');
			} catch (err) {
				assert.strictEqual(err.message, '[[error:not-logged-in]]');
			}
		});

		it('should fail if requesting user does not match uid', async () => {
			const caller = { uid: testUid };
			const subscription = {
				endpoint: 'https://example.com/push',
				keys: { p256dh: 'key1', auth: 'key2' },
			};
			try {
				await api.notifications.storePushSubscription(caller, { uid: adminUid, subscription });
				assert.fail('Should have thrown an error');
			} catch (err) {
				assert.strictEqual(err.message, '[[error:no-privileges]]');
			}
		});

		it('should fail if subscription data is invalid', async () => {
			const caller = { uid: testUid };
			try {
				await api.notifications.storePushSubscription(caller, { uid: testUid, subscription: {} });
				assert.fail('Should have thrown an error');
			} catch (err) {
				assert.strictEqual(err.message, '[[error:invalid-subscription-data]]');
			}
		});

		it('should fail if subscription keys are invalid', async () => {
			const caller = { uid: testUid };
			const subscription = {
				endpoint: 'https://example.com/push',
				keys: {},
			};
			try {
				await api.notifications.storePushSubscription(caller, { uid: testUid, subscription });
				assert.fail('Should have thrown an error');
			} catch (err) {
				assert.strictEqual(err.message, '[[error:invalid-subscription-keys]]');
			}
		});

		it('should fail if endpoint is not a valid URL', async () => {
			const caller = { uid: testUid };
			const subscription = {
				endpoint: 'not-a-url',
				keys: { p256dh: 'key1', auth: 'key2' },
			};
			try {
				await api.notifications.storePushSubscription(caller, { uid: testUid, subscription });
				assert.fail('Should have thrown an error');
			} catch (err) {
				assert.strictEqual(err.message, '[[error:invalid-subscription-endpoint]]');
			}
		});

		it('should store a valid push subscription', async () => {
			const caller = { uid: testUid };
			const subscription = {
				endpoint: 'https://example.com/push',
				keys: { p256dh: 'key1', auth: 'key2' },
			};
			const result = await api.notifications.storePushSubscription(caller, { uid: testUid, subscription });
			assert(result.success);
			assert(result.subscriptionId);

			// Verify subscription was stored
			const storedSub = await db.getObject(`pushSubscription:${result.subscriptionId}`);
			assert(storedSub);
			assert.strictEqual(storedSub.endpoint, subscription.endpoint);
			assert.strictEqual(storedSub.p256dh, subscription.keys.p256dh);
			assert.strictEqual(storedSub.auth, subscription.keys.auth);
		});
	});

	describe('removePushSubscription', () => {
		let subscriptionId;

		beforeEach(async () => {
			// Store a subscription first
			const caller = { uid: testUid };
			const subscription = {
				endpoint: 'https://example.com/push/remove',
				keys: { p256dh: 'key1', auth: 'key2' },
			};
			const result = await api.notifications.storePushSubscription(caller, { uid: testUid, subscription });
			subscriptionId = result.subscriptionId;
		});

		it('should fail if user is not logged in', async () => {
			const caller = { uid: 0 };
			try {
				await api.notifications.removePushSubscription(caller, { uid: testUid, endpoint: 'https://example.com/push/remove' });
				assert.fail('Should have thrown an error');
			} catch (err) {
				assert.strictEqual(err.message, '[[error:not-logged-in]]');
			}
		});

		it('should fail if requesting user does not match uid', async () => {
			const caller = { uid: testUid };
			try {
				await api.notifications.removePushSubscription(caller, { uid: adminUid, endpoint: 'https://example.com/push/remove' });
				assert.fail('Should have thrown an error');
			} catch (err) {
				assert.strictEqual(err.message, '[[error:no-privileges]]');
			}
		});

		it('should remove a specific subscription by endpoint', async () => {
			const caller = { uid: testUid };
			const result = await api.notifications.removePushSubscription(caller, { uid: testUid, endpoint: 'https://example.com/push/remove' });
			assert(result.success);

			// Verify subscription was removed
			const storedSub = await db.getObject(`pushSubscription:${subscriptionId}`);
			assert(!storedSub || !storedSub.endpoint);
		});

		it('should remove all subscriptions if endpoint is not provided', async () => {
			const caller = { uid: testUid };
			const result = await api.notifications.removePushSubscription(caller, { uid: testUid });
			assert(result.success);

			// Verify all subscriptions were removed
			const subscriptionIds = await db.getSortedSetMembers(`uid:${testUid}:pushSubscriptions`);
			assert.strictEqual(subscriptionIds.length, 0);
		});
	});

	describe('sendNotification', () => {
		it('should fail if caller is not admin', async () => {
			const caller = { uid: testUid };
			try {
				await api.notifications.sendNotification(caller, {
					uids: [testUid],
					title: 'Test',
					message: 'Test message',
				});
				assert.fail('Should have thrown an error');
			} catch (err) {
				assert.strictEqual(err.message, '[[error:no-privileges]]');
			}
		});

		it('should fail if uids is not an array', async () => {
			const caller = { uid: adminUid };
			try {
				await api.notifications.sendNotification(caller, {
					uids: null,
					title: 'Test',
					message: 'Test message',
				});
				assert.fail('Should have thrown an error');
			} catch (err) {
				assert.strictEqual(err.message, '[[error:invalid-uids]]');
			}
		});

		it('should fail if title or message is missing', async () => {
			const caller = { uid: adminUid };
			try {
				await api.notifications.sendNotification(caller, {
					uids: [testUid],
					title: '',
					message: 'Test message',
				});
				assert.fail('Should have thrown an error');
			} catch (err) {
				assert.strictEqual(err.message, '[[error:invalid-notification-data]]');
			}
		});

		// Note: Full notification sending test would require valid Ably credentials
		// which we don't have in the test environment
	});

	describe('getNotificationHistory', () => {
		it('should fail if user is not logged in', async () => {
			const caller = { uid: 0 };
			try {
				await api.notifications.getNotificationHistory(caller, { uid: testUid });
				assert.fail('Should have thrown an error');
			} catch (err) {
				assert.strictEqual(err.message, '[[error:not-logged-in]]');
			}
		});

		it('should fail if requesting user does not match uid', async () => {
			const caller = { uid: testUid };
			try {
				await api.notifications.getNotificationHistory(caller, { uid: adminUid });
				assert.fail('Should have thrown an error');
			} catch (err) {
				assert.strictEqual(err.message, '[[error:no-privileges]]');
			}
		});

		it('should return empty notification history', async () => {
			const caller = { uid: testUid };
			const result = await api.notifications.getNotificationHistory(caller, { uid: testUid });
			assert(result.notifications);
			assert.strictEqual(result.notifications.length, 0);
			assert(result.pagination);
		});
	});
});
