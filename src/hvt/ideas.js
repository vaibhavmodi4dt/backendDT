'use strict';

const db = require('../database');
const plugins = require('../plugins');
const helpers = require('./helpers');

const Ideas = module.exports;

/**
 * Create a new idea (seed from problem)
 */
Ideas.create = async function (problemId, data, uid) {
	if (!problemId) {
		throw new Error('[[error:problem-id-required]]');
	}

	helpers.validateIdeaData({ ...data, problemId });

	// Get problem to extract orgId
	const problem = await db.getHVTProblem(problemId);
	if (!problem) {
		throw new Error('[[error:problem-not-found]]');
	}

	const ideaData = {
		...data,
		problemId,
		seededBy: uid,
		orgId: problem.orgId,
	};

	// Fire pre-create hook
	const result = await plugins.hooks.fire('filter:hvt.idea.create', { data: ideaData });

	// Create idea
	const idea = await db.createHVTIdea(result.data);

	// Increment problem idea count
	await db.incrementHVTProblemIdeaCount(problemId, 1);

	// Fire post-create hook
	await plugins.hooks.fire('action:hvt.idea.created', { idea, uid });

	return helpers.sanitizeIdea(idea);
};

/**
 * Get idea by ID
 */
Ideas.get = async function (ideaId) {
	if (!ideaId) {
		throw new Error('[[error:invalid-idea-id]]');
	}

	const idea = await db.getHVTIdea(ideaId);

	if (!idea) {
		throw new Error('[[error:idea-not-found]]');
	}

	return helpers.sanitizeIdea(idea);
};

/**
 * Get ideas by problem with pagination
 */
Ideas.getByProblem = async function (problemId, options = {}) {
	if (!problemId) {
		throw new Error('[[error:problem-id-required]]');
	}

	const { page, limit, start, stop } = helpers.getPaginationData(options.page, options.limit);

	const ideas = await db.getHVTIdeasByProblem(problemId, start, stop);
	const total = await db.getHVTIdeaCount(null, problemId);

	return {
		ideas: helpers.sanitizeIdeas(ideas),
		page,
		limit,
		total,
		pages: Math.ceil(total / limit),
	};
};

/**
 * Update idea
 */
Ideas.update = async function (ideaId, data, uid) {
	if (!ideaId) {
		throw new Error('[[error:invalid-idea-id]]');
	}

	// Verify idea exists
	const existing = await Ideas.get(ideaId);

	// Validate status transition if status is being changed
	if (data.status && data.status !== existing.status) {
		const canTransition = helpers.canTransitionIdeaTo(existing.status, data.status);
		if (!canTransition.valid) {
			throw new Error(canTransition.error);
		}
	}

	// Fire pre-update hook
	const result = await plugins.hooks.fire('filter:hvt.idea.update', { 
		ideaId, 
		data,
		existing,
	});

	// Update idea
	const updated = await db.updateHVTIdea(ideaId, result.data);

	// Fire post-update hook
	await plugins.hooks.fire('action:hvt.idea.updated', { 
		idea: updated,
		uid,
	});

	return helpers.sanitizeIdea(updated);
};

/**
 * Score idea with ICE framework
 */
Ideas.score = async function (ideaId, scores, uid) {
	if (!ideaId) {
		throw new Error('[[error:invalid-idea-id]]');
	}

	const { impactScore, confidenceScore, easeScore } = scores;

	// Validate scores
	if (impactScore < 1 || impactScore > 10 || 
	    confidenceScore < 1 || confidenceScore > 10 || 
	    easeScore < 1 || easeScore > 10) {
		throw new Error('[[error:invalid-ice-scores]]');
	}

	// Calculate total score
	const totalScore = helpers.calculateICEScore(impactScore, confidenceScore, easeScore);

	// Update idea with scores and change status to 'scored'
	return await Ideas.update(ideaId, {
		impactScore,
		confidenceScore,
		easeScore,
		totalScore,
		status: 'scored',
	}, uid);
};

/**
 * Approve idea
 */
Ideas.approve = async function (ideaId, uid) {
	if (!ideaId) {
		throw new Error('[[error:invalid-idea-id]]');
	}

	return await Ideas.update(ideaId, {
		status: 'approved',
		approvedBy: uid,
	}, uid);
};

/**
 * Reject idea
 */
Ideas.reject = async function (ideaId, uid) {
	if (!ideaId) {
		throw new Error('[[error:invalid-idea-id]]');
	}

	return await Ideas.update(ideaId, {
		status: 'rejected',
	}, uid);
};

/**
 * Update idea status
 */
Ideas.updateStatus = async function (ideaId, status, uid) {
	return await Ideas.update(ideaId, { status }, uid);
};

/**
 * Check if idea exists
 */
Ideas.exists = async function (ideaId) {
	if (!ideaId) {
		return false;
	}

	const idea = await db.getHVTIdea(ideaId);
	return !!idea;
};
