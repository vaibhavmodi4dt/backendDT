'use strict';

const db = require('../database');
const plugins = require('../plugins');
const helpers = require('./helpers');
const AiAgentService = require('../services/ai-agent');

const Experiments = module.exports;

/**
 * Create a new experiment (design from idea)
 */
Experiments.create = async function (ideaId, data, uid) {
	if (!ideaId) {
		throw new Error('[[error:idea-id-required]]');
	}

	helpers.validateExperimentData({ ...data, ideaId });

	// Get idea to extract problemId and orgId
	const idea = await db.getHVTIdea(ideaId);
	if (!idea) {
		throw new Error('[[error:idea-not-found]]');
	}

	// Get problem to extract orgId
	const problem = await db.getHVTProblem(idea.problemId);
	if (!problem) {
		throw new Error('[[error:problem-not-found]]');
	}

	// Get next experiment number for this org
	const experimentNumber = await db.getNextHVTExperimentNumber(problem.orgId);

	const experimentData = {
		...data,
		ideaId,
		problemId: idea.problemId,
		designedBy: uid,
		experimentNumber,
		orgId: problem.orgId,
	};

	// Fire pre-create hook
	const result = await plugins.hooks.fire('filter:hvt.experiment.create', { data: experimentData });

	// Create experiment
	const experiment = await db.createHVTExperiment(result.data);

	// Fire post-create hook
	await plugins.hooks.fire('action:hvt.experiment.created', { experiment, uid });

	return helpers.sanitizeExperiment(experiment);
};

/**
 * Get experiment by ID
 */
Experiments.get = async function (experimentId) {
	if (!experimentId) {
		throw new Error('[[error:invalid-experiment-id]]');
	}

	const experiment = await db.getHVTExperiment(experimentId);

	if (!experiment) {
		throw new Error('[[error:experiment-not-found]]');
	}

	return helpers.sanitizeExperiment(experiment);
};

/**
 * Get experiments by organization with pagination
 */
Experiments.getByOrg = async function (orgId, options = {}) {
	if (!orgId) {
		throw new Error('[[error:organization-required]]');
	}

	const { page, limit, start, stop } = helpers.getPaginationData(options.page, options.limit);

	const experiments = await db.getHVTExperimentsByOrg(orgId, start, stop);
	const total = await db.getHVTExperimentCount(orgId);

	return {
		experiments: helpers.sanitizeExperiments(experiments),
		page,
		limit,
		total,
		pages: Math.ceil(total / limit),
	};
};

/**
 * Get experiments by idea
 */
Experiments.getByIdea = async function (ideaId) {
	if (!ideaId) {
		throw new Error('[[error:idea-id-required]]');
	}

	// Get all experiments and filter by ideaId
	const idea = await db.getHVTIdea(ideaId);
	if (!idea) {
		throw new Error('[[error:idea-not-found]]');
	}

	const allExperiments = await db.getHVTExperimentsByOrg(idea.orgId, 0, -1);
	const filtered = allExperiments.filter(exp => exp.ideaId === ideaId);

	return helpers.sanitizeExperiments(filtered);
};

/**
 * Get experiments by status
 */
Experiments.getByStatus = async function (orgId, status, options = {}) {
	if (!orgId) {
		throw new Error('[[error:organization-required]]');
	}

	const { page, limit, start, stop } = helpers.getPaginationData(options.page, options.limit);

	const experiments = await db.getHVTExperimentsByStatus(status, orgId, start, stop);
	const total = await db.getHVTExperimentCount(orgId, status);

	return {
		experiments: helpers.sanitizeExperiments(experiments),
		page,
		limit,
		total,
		pages: Math.ceil(total / limit),
	};
};

/**
 * Update experiment
 */
Experiments.update = async function (experimentId, data, uid) {
	if (!experimentId) {
		throw new Error('[[error:invalid-experiment-id]]');
	}

	// Verify experiment exists
	const existing = await Experiments.get(experimentId);

	// Fire pre-update hook
	const result = await plugins.hooks.fire('filter:hvt.experiment.update', { 
		experimentId, 
		data,
		existing,
	});

	// Update experiment
	const updated = await db.updateHVTExperiment(experimentId, result.data);

	// Fire post-update hook
	await plugins.hooks.fire('action:hvt.experiment.updated', { 
		experiment: updated,
		uid,
	});

	return helpers.sanitizeExperiment(updated);
};

/**
 * Update experiment status with state machine enforcement
 */
Experiments.updateStatus = async function (experimentId, status, uid) {
	if (!experimentId) {
		throw new Error('[[error:invalid-experiment-id]]');
	}

	// Get current experiment
	const existing = await Experiments.get(experimentId);

	// Validate transition
	const canTransition = helpers.canTransitionExperimentTo(existing.status, status);
	if (!canTransition.valid) {
		throw new Error(canTransition.error);
	}

	return await Experiments.update(experimentId, { status }, uid);
};

/**
 * Halt experiment with reason
 */
Experiments.halt = async function (experimentId, reason, uid) {
	if (!experimentId) {
		throw new Error('[[error:invalid-experiment-id]]');
	}

	if (!reason || reason.trim().length < 10) {
		throw new Error('[[error:halt-reason-required]]');
	}

	return await Experiments.update(experimentId, {
		status: 'halted',
		haltedBy: uid,
		haltReason: reason,
	}, uid);
};

/**
 * AI verify experiment design against hash dictionary
 */
Experiments.verify = async function (experimentId, uid) {
	if (!experimentId) {
		throw new Error('[[error:invalid-experiment-id]]');
	}

	const experiment = await Experiments.get(experimentId);

	try {
		// Call AI service to verify experiment
		const response = await AiAgentService.post('/hvt/verify-experiment', {
			experimentId,
			title: experiment.title,
			ifStatement: experiment.ifStatement,
			thenStatement: experiment.thenStatement,
			orgId: experiment.orgId,
		});

		// Update experiment with verification status
		await Experiments.update(experimentId, {
			verifiedBy: uid,
		}, uid);

		return {
			status: response.status || 'verified',
			message: response.message || 'Experiment verified successfully',
			conflicts: response.conflicts || [],
		};
	} catch (error) {
		return {
			status: 'error',
			message: error.message || 'Failed to verify experiment',
			conflicts: [],
		};
	}
};

/**
 * Get experiment with related entities
 */
Experiments.getWithRelations = async function (experimentId) {
	if (!experimentId) {
		throw new Error('[[error:invalid-experiment-id]]');
	}

	const experiment = await Experiments.get(experimentId);

	// Get related data
	const [updates, results, escalations] = await Promise.all([
		db.getHVTUpdatesByExperiment(experimentId),
		db.getHVTResultsByExperiment(experimentId),
		db.getHVTEscalationsByExperiment(experimentId),
	]);

	return {
		...experiment,
		updates: updates || [],
		results: results || [],
		escalations: escalations || [],
	};
};

/**
 * Check if experiment exists
 */
Experiments.exists = async function (experimentId) {
	if (!experimentId) {
		return false;
	}

	const experiment = await db.getHVTExperiment(experimentId);
	return !!experiment;
};
