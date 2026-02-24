'use strict';

const db = require('../database');
const plugins = require('../plugins');

const Results = module.exports;

/**
 * Create a result for an experiment
 */
Results.create = async function (experimentId, data, uid) {
	if (!experimentId) {
		throw new Error('[[error:experiment-id-required]]');
	}

	if (!data.description || data.description.trim().length === 0) {
		throw new Error('[[error:result-description-required]]');
	}

	// Verify experiment exists
	const experiment = await db.getHVTExperiment(experimentId);
	if (!experiment) {
		throw new Error('[[error:experiment-not-found]]');
	}

	const resultData = {
		experimentId,
		loggedBy: uid,
		description: data.description,
		outcome: data.outcome || null,
		metrics: data.metrics || null,
	};

	// Fire pre-create hook
	const result = await plugins.hooks.fire('filter:hvt.result.create', { data: resultData });

	// Create result
	const created = await db.createHVTResult(result.data);

	// Fire post-create hook
	await plugins.hooks.fire('action:hvt.result.created', { result: created, uid });

	return created;
};

/**
 * Get results for an experiment
 */
Results.getByExperiment = async function (experimentId) {
	if (!experimentId) {
		throw new Error('[[error:experiment-id-required]]');
	}

	const results = await db.getHVTResultsByExperiment(experimentId);
	return results || [];
};
