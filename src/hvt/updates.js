'use strict';

const db = require('../database');
const plugins = require('../plugins');

const Updates = module.exports;

/**
 * Create an update for an experiment
 */
Updates.create = async function (experimentId, data, uid) {
	if (!experimentId) {
		throw new Error('[[error:experiment-id-required]]');
	}

	if (!data.content || data.content.trim().length === 0) {
		throw new Error('[[error:update-content-required]]');
	}

	// Verify experiment exists
	const experiment = await db.getHVTExperiment(experimentId);
	if (!experiment) {
		throw new Error('[[error:experiment-not-found]]');
	}

	const updateData = {
		experimentId,
		postedBy: uid,
		content: data.content,
	};

	// Fire pre-create hook
	const result = await plugins.hooks.fire('filter:hvt.update.create', { data: updateData });

	// Create update
	const created = await db.createHVTUpdate(result.data);

	// Fire post-create hook
	await plugins.hooks.fire('action:hvt.update.created', { update: created, uid });

	return created;
};

/**
 * Get updates for an experiment
 */
Updates.getByExperiment = async function (experimentId) {
	if (!experimentId) {
		throw new Error('[[error:experiment-id-required]]');
	}

	const updates = await db.getHVTUpdatesByExperiment(experimentId);
	return updates || [];
};
