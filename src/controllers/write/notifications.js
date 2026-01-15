'use strict';

const api = require('../../api');
const helpers = require('../helpers');

const Notifications = module.exports;

Notifications.generateAblyToken = async (req, res) => {
	const result = await api.notifications.generateAblyToken(req, {
		uid: req.body.uid || req.uid,
	});
	helpers.formatApiResponse(200, res, result);
};

Notifications.storePushSubscription = async (req, res) => {
	const result = await api.notifications.storePushSubscription(req, {
		uid: req.body.uid || req.uid,
		subscription: req.body.subscription,
	});
	helpers.formatApiResponse(200, res, result);
};

Notifications.removePushSubscription = async (req, res) => {
	const result = await api.notifications.removePushSubscription(req, {
		uid: req.body.uid || req.uid,
		endpoint: req.body.endpoint,
	});
	helpers.formatApiResponse(200, res, result);
};

Notifications.sendNotification = async (req, res) => {
	const result = await api.notifications.sendNotification(req, {
		uids: req.body.uids,
		title: req.body.title,
		message: req.body.message,
		type: req.body.type,
		actionUrl: req.body.actionUrl,
		icon: req.body.icon,
		metadata: req.body.metadata,
	});
	helpers.formatApiResponse(200, res, result);
};

Notifications.getNotificationHistory = async (req, res) => {
	const result = await api.notifications.getNotificationHistory(req, {
		uid: req.params.uid || req.uid,
		limit: parseInt(req.query.limit, 10) || 30,
		offset: parseInt(req.query.offset, 10) || 0,
	});
	helpers.formatApiResponse(200, res, result);
};
