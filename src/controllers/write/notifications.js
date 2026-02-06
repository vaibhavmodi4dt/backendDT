'use strict';

const api = require('../../api');
const helpers = require('../helpers');

const Notifications = module.exports;

Notifications.generateAblyToken = async (req, res) => {
	// Validate that uid matches authenticated user
	const requestedUid = req.body.uid ? parseInt(req.body.uid, 10) : req.uid;
	if (requestedUid !== req.uid) {
		return helpers.formatApiResponse(403, res, new Error('[[error:no-privileges]]'));
	}

	const result = await api.notifications.generateAblyToken(req, {
		uid: req.uid,
	});
	helpers.formatApiResponse(200, res, result);
};

Notifications.storePushSubscription = async (req, res) => {
	// Validate that uid matches authenticated user
	const requestedUid = req.body.uid ? parseInt(req.body.uid, 10) : req.uid;
	if (requestedUid !== req.uid) {
		return helpers.formatApiResponse(403, res, new Error('[[error:no-privileges]]'));
	}

	const result = await api.notifications.storePushSubscription(req, {
		uid: req.uid,
		subscription: req.body.subscription,
	});
	helpers.formatApiResponse(200, res, result);
};

Notifications.removePushSubscription = async (req, res) => {
	// Validate that uid matches authenticated user
	const requestedUid = req.body.uid ? parseInt(req.body.uid, 10) : req.uid;
	if (requestedUid !== req.uid) {
		return helpers.formatApiResponse(403, res, new Error('[[error:no-privileges]]'));
	}

	const result = await api.notifications.removePushSubscription(req, {
		uid: req.uid,
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
	// Validate that uid matches authenticated user
	const requestedUid = req.params.uid ? parseInt(req.params.uid, 10) : req.uid;
	if (requestedUid !== req.uid) {
		return helpers.formatApiResponse(403, res, new Error('[[error:no-privileges]]'));
	}

	const result = await api.notifications.getNotificationHistory(req, {
		uid: requestedUid,
		limit: parseInt(req.query.limit, 10) || 30,
		offset: parseInt(req.query.offset, 10) || 0,
	});
	helpers.formatApiResponse(200, res, result);
};
