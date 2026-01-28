'use strict';

const db = require('../database');
const plugins = require('../plugins');
const AiAgentService = require('../services/ai-agent');

const Learnings = module.exports;

/**
 * Create a learning from experiment results
 */
Learnings.create = async function (experimentId, data, uid) {
	if (!experimentId) {
		throw new Error('[[error:experiment-id-required]]');
	}

	if (!data.content || data.content.trim().length === 0) {
		throw new Error('[[error:learning-content-required]]');
	}

	// Verify experiment exists
	const experiment = await db.getHVTExperiment(experimentId);
	if (!experiment) {
		throw new Error('[[error:experiment-not-found]]');
	}

	const learningData = {
		experimentId,
		moduleId: experiment.moduleId,
		orgId: experiment.orgId,
		createdBy: uid,
		title: data.content,
		description: data.content,
		tags: data.tags || [],
		isArchived: false,
	};

	// Fire pre-create hook
	const result = await plugins.hooks.fire('filter:hvt.learning.create', { data: learningData });

	// Create learning
	const created = await db.createHVTLearning(result.data);

	// Fire post-create hook
	await plugins.hooks.fire('action:hvt.learning.created', { learning: created, uid });

	return created;
};

/**
 * Get a single learning
 */
Learnings.get = async function (learningId, orgId = null) {
	if (!learningId) {
		throw new Error('[[error:learning-id-required]]');
	}

	const learning = await db.getHVTLearning(learningId);
	if (!learning) {
		throw new Error('[[error:learning-not-found]]');
	}

	// Validate organization access if orgId provided
	if (orgId && learning.orgId !== orgId) {
		throw new Error('[[error:no-privileges]]');
	}

	return learning;
};

/**
 * Get learnings by organization
 */
Learnings.getByOrg = async function (orgId) {
	if (!orgId) {
		throw new Error('[[error:org-id-required]]');
	}

	const learnings = await db.getHVTLearningsByOrg(orgId);
	return learnings || [];
};

/**
 * Get learnings by module
 */
Learnings.getByModule = async function (moduleId) {
	if (!moduleId) {
		throw new Error('[[error:module-id-required]]');
	}

	const learnings = await db.getHVTLearningsByModule(moduleId);
	return learnings || [];
};

/**
 * Get similar learnings using AI service
 */
Learnings.getSimilar = async function (learningId) {
	if (!learningId) {
		throw new Error('[[error:learning-id-required]]');
	}

	const learning = await db.getHVTLearning(learningId);
	if (!learning) {
		throw new Error('[[error:learning-not-found]]');
	}

	try {
		// Call AI service to find similar learnings
		const response = await AiAgentService.post('/hvt/similar-learnings', {
			content: learning.content,
			tags: learning.tags,
			moduleId: learning.moduleId,
			orgId: learning.orgId,
		});

		return response.data || [];
	} catch (err) {
		throw new Error('[[error:ai-service-unavailable]]');
	}
};

/**
 * Update a learning
 */
Learnings.update = async function (learningId, updates) {
	if (!learningId) {
		throw new Error('[[error:learning-id-required]]');
	}

	const exists = await db.hvtLearningExists(learningId);
	if (!exists) {
		throw new Error('[[error:learning-not-found]]');
	}

	// Fire pre-update hook
	const result = await plugins.hooks.fire('filter:hvt.learning.update', {
		learningId,
		updates,
	});

	// Update learning
	const updated = await db.updateHVTLearning(learningId, result.updates);

	// Fire post-update hook
	await plugins.hooks.fire('action:hvt.learning.updated', { learning: updated });

	return updated;
};

/**
 * Archive a learning
 */
Learnings.archive = async function (learningId) {
	return await Learnings.update(learningId, { isArchived: true });
};

/**
 * Unarchive a learning
 */
Learnings.unarchive = async function (learningId) {
	return await Learnings.update(learningId, { isArchived: false });
};

/**
 * Delete a learning
 */
Learnings.delete = async function (learningId) {
	if (!learningId) {
		throw new Error('[[error:learning-id-required]]');
	}

	const exists = await db.hvtLearningExists(learningId);
	if (!exists) {
		throw new Error('[[error:learning-not-found]]');
	}

	await db.deleteHVTLearning(learningId);
};
