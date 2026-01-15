'use strict';

const Ably = require('ably');
const webpush = require('web-push');
const nconf = require('nconf');
const winston = require('winston');
const validator = require('validator');

const db = require('../database');
const user = require('../user');
const meta = require('../meta');
const utils = require('../utils');

const notificationsAPI = module.exports;

let ablyClient = null;

// Initialize Ably client
function getAblyClient() {
	if (!ablyClient) {
		const ablyApiKey = nconf.get('ably:apiKey') || meta.config.ablyApiKey;
		if (!ablyApiKey) {
			throw new Error('[[error:ably-api-key-not-configured]]');
		}
		ablyClient = new Ably.Rest(ablyApiKey);
	}
	return ablyClient;
}

// Initialize web-push VAPID keys
function initializeWebPush() {
	const vapidPublicKey = nconf.get('vapid:publicKey') || meta.config.vapidPublicKey;
	const vapidPrivateKey = nconf.get('vapid:privateKey') || meta.config.vapidPrivateKey;
	const vapidEmail = nconf.get('vapid:email') || meta.config.vapidEmail;

	if (vapidPublicKey && vapidPrivateKey && vapidEmail) {
		webpush.setVapidDetails(
			`mailto:${vapidEmail}`,
			vapidPublicKey,
			vapidPrivateKey
		);
		return true;
	}
	winston.warn('[notifications] Web push VAPID keys not configured');
	return false;
}

/**
 * Generate Ably authentication token for a user
 */
notificationsAPI.generateAblyToken = async function (caller, data) {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const { uid } = data;

	// Validate that the requesting user matches the uid (prevent impersonation)
	if (parseInt(uid, 10) !== parseInt(caller.uid, 10)) {
		throw new Error('[[error:no-privileges]]');
	}

	// Verify user exists
	const exists = await user.exists(uid);
	if (!exists) {
		throw new Error('[[error:invalid-uid]]');
	}

	try {
		const client = getAblyClient();
		const tokenParams = {
			clientId: `user:${uid}`,
			capability: {
				[`notifications:user:${uid}`]: ['subscribe', 'history'],
				'notifications:global': ['subscribe', 'history'],
			},
			ttl: 3600000, // 1 hour in milliseconds
		};

		const tokenRequest = await client.auth.createTokenRequest(tokenParams);

		winston.verbose(`[notifications] Generated Ably token for user ${uid}`);

		return {
			token: tokenRequest.keyName,
			tokenRequest: tokenRequest,
			expires: Date.now() + 3600000,
		};
	} catch (err) {
		winston.error(`[notifications] Error generating Ably token: ${err.message}`);
		throw new Error('[[error:failed-to-generate-token]]');
	}
};

/**
 * Store or update push subscription for a user
 */
notificationsAPI.storePushSubscription = async function (caller, data) {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const { uid, subscription } = data;

	// Validate that the requesting user matches the uid
	if (parseInt(uid, 10) !== parseInt(caller.uid, 10)) {
		throw new Error('[[error:no-privileges]]');
	}

	// Validate subscription structure
	if (!subscription || !subscription.endpoint || !subscription.keys) {
		throw new Error('[[error:invalid-subscription-data]]');
	}

	if (!subscription.keys.p256dh || !subscription.keys.auth) {
		throw new Error('[[error:invalid-subscription-keys]]');
	}

	// Sanitize endpoint
	if (!validator.isURL(subscription.endpoint)) {
		throw new Error('[[error:invalid-subscription-endpoint]]');
	}

	// Generate subscription ID first
	const subscriptionId = utils.generateUUID();

	const subscriptionData = {
		uid: uid,
		subscriptionId: subscriptionId,
		endpoint: subscription.endpoint,
		p256dh: subscription.keys.p256dh,
		auth: subscription.keys.auth,
		createdAt: Date.now(),
		updatedAt: Date.now(),
		active: true,
	};

	// Store in database using sorted set for user's subscriptions
	const subscriptionKey = `pushSubscription:${subscriptionId}`;

	await Promise.all([
		db.setObject(subscriptionKey, subscriptionData),
		db.sortedSetAdd(`uid:${uid}:pushSubscriptions`, Date.now(), subscriptionId),
		db.sortedSetAdd('pushSubscriptions:all', Date.now(), subscriptionId),
	]);

	winston.verbose(`[notifications] Stored push subscription for user ${uid}`);

	return {
		success: true,
		subscriptionId: subscriptionId,
	};
};

/**
 * Remove push subscription for a user
 */
notificationsAPI.removePushSubscription = async function (caller, data) {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const { uid, endpoint } = data;

	// Validate that the requesting user matches the uid
	if (parseInt(uid, 10) !== parseInt(caller.uid, 10)) {
		throw new Error('[[error:no-privileges]]');
	}

	if (!endpoint) {
		// Remove all subscriptions for user
		const subscriptionIds = await db.getSortedSetMembers(`uid:${uid}:pushSubscriptions`);

		await Promise.all([
			...subscriptionIds.map(id => db.delete(`pushSubscription:${id}`)),
			...subscriptionIds.map(id => db.sortedSetRemove('pushSubscriptions:all', id)),
			db.delete(`uid:${uid}:pushSubscriptions`),
		]);

		winston.verbose(`[notifications] Removed all push subscriptions for user ${uid}`);
	} else {
		// Remove specific subscription by endpoint
		const subscriptionIds = await db.getSortedSetMembers(`uid:${uid}:pushSubscriptions`);
		const subscriptions = await Promise.all(
			subscriptionIds.map(id => db.getObject(`pushSubscription:${id}`))
		);

		const toRemove = subscriptions
			.map((sub, idx) => (sub && sub.endpoint === endpoint ? subscriptionIds[idx] : null))
			.filter(Boolean);

		if (toRemove.length > 0) {
			await Promise.all([
				...toRemove.map(id => db.delete(`pushSubscription:${id}`)),
				...toRemove.map(id => db.sortedSetRemove(`uid:${uid}:pushSubscriptions`, id)),
				...toRemove.map(id => db.sortedSetRemove('pushSubscriptions:all', id)),
			]);

			winston.verbose(`[notifications] Removed push subscription for user ${uid}`);
		}
	}

	return {
		success: true,
	};
};

/**
 * Send notification to users
 */
notificationsAPI.sendNotification = async function (caller, data) {
	// Check if caller is admin
	const isAdmin = await user.isAdministrator(caller.uid);
	if (!isAdmin) {
		throw new Error('[[error:no-privileges]]');
	}

	const { uids, title, message, type, actionUrl, icon, metadata } = data;

	if (!uids || !Array.isArray(uids) || uids.length === 0) {
		throw new Error('[[error:invalid-uids]]');
	}

	if (!title || !message) {
		throw new Error('[[error:invalid-notification-data]]');
	}

	// Sanitize inputs (validate but don't escape for push notifications)
	const sanitizedTitle = validator.escape(title);
	const sanitizedMessage = validator.escape(message);

	const notificationId = utils.generateUUID();
	const timestamp = Date.now();

	const notificationData = {
		nid: notificationId,
		title: sanitizedTitle,
		message: sanitizedMessage,
		type: type || 'info',
		timestamp: timestamp,
		actionUrl: actionUrl || '',
		icon: icon || '',
		metadata: metadata || {},
	};

	// Initialize web push if available
	const webPushEnabled = initializeWebPush();

	// Send to each user
	const results = await Promise.all(
		uids.map(async (uid) => {
			try {
				// Publish to Ably channel
				try {
					const client = getAblyClient();
					const channel = client.channels.get(`notifications:user:${uid}`);
					await channel.publish('notification', {
						...notificationData,
						uid: uid,
					});
				} catch (ablyErr) {
					winston.error(`[notifications] Ably publish error for user ${uid}: ${ablyErr.message}`);
				}

				// Send web push notification if enabled
				if (webPushEnabled) {
					const subscriptionIds = await db.getSortedSetMembers(`uid:${uid}:pushSubscriptions`);
					const subscriptions = await Promise.all(
						subscriptionIds.map(id => db.getObject(`pushSubscription:${id}`))
					);

					await Promise.all(
						subscriptions.map(async (sub) => {
							if (!sub || !sub.active) return;

							try {
								const pushSubscription = {
									endpoint: sub.endpoint,
									keys: {
										p256dh: sub.p256dh,
										auth: sub.auth,
									},
								};

								const payload = JSON.stringify({
									title: sanitizedTitle,
									body: sanitizedMessage,
									icon: icon,
									data: {
										url: actionUrl,
										...metadata,
									},
								});

								await webpush.sendNotification(pushSubscription, payload);
							} catch (pushErr) {
								// Handle 410 Gone status (expired subscription)
								if (pushErr.statusCode === 410 && sub.subscriptionId) {
									winston.verbose(`[notifications] Removing expired subscription for user ${uid}`);
									await db.delete(`pushSubscription:${sub.subscriptionId}`);
									await db.sortedSetRemove(`uid:${uid}:pushSubscriptions`, sub.subscriptionId);
									await db.sortedSetRemove('pushSubscriptions:all', sub.subscriptionId);
								} else {
									winston.error(`[notifications] Web push error for user ${uid}: ${pushErr.message}`);
								}
							}
						})
					);
				}

				return { uid, success: true };
			} catch (err) {
				winston.error(`[notifications] Error sending notification to user ${uid}: ${err.message}`);
				return { uid, success: false, error: err.message };
			}
		})
	);

	winston.info(`[notifications] Sent notification ${notificationId} to ${uids.length} users`);

	return {
		notificationId: notificationId,
		results: results,
	};
};

/**
 * Get notification history for a user (optional feature)
 */
notificationsAPI.getNotificationHistory = async function (caller, data) {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const { uid, limit = 30, offset = 0 } = data;

	// Validate that the requesting user matches the uid
	if (parseInt(uid, 10) !== parseInt(caller.uid, 10)) {
		throw new Error('[[error:no-privileges]]');
	}

	// This is a placeholder - in a full implementation, you would store notifications
	// in the database and retrieve them here
	// For now, we'll return an empty array with a note about integration with NodeBB's
	// existing notification system

	winston.verbose(`[notifications] Notification history requested for user ${uid}`);

	return {
		notifications: [],
		pagination: {
			limit: limit,
			offset: offset,
			total: 0,
		},
		note: 'Consider integrating with NodeBB existing notification system',
	};
};
