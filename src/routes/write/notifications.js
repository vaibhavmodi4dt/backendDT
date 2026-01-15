'use strict';

const router = require('express').Router();
const middleware = require('../../middleware');
const controllers = require('../../controllers');
const routeHelpers = require('../helpers');

const { setupApiRoute } = routeHelpers;

module.exports = function () {
	const middlewares = [middleware.ensureLoggedIn];

	// Generate Ably authentication token
	setupApiRoute(router, 'post', '/ably-token', [...middlewares], controllers.write.notifications.generateAblyToken);

	// Store push subscription
	setupApiRoute(router, 'post', '/push-subscription', [...middlewares], controllers.write.notifications.storePushSubscription);

	// Remove push subscription
	setupApiRoute(router, 'delete', '/push-subscription', [...middlewares], controllers.write.notifications.removePushSubscription);

	// Send notification (admin only)
	setupApiRoute(router, 'post', '/send', [...middlewares], controllers.write.notifications.sendNotification);

	// Get notification history (optional)
	setupApiRoute(router, 'get', '/:uid/history', [...middlewares], controllers.write.notifications.getNotificationHistory);

	return router;
};
