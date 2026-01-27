'use strict';

const db = require('../database');
const plugins = require('../plugins');
const helpers = require('./helpers');

const Problems = module.exports;

/**
 * Create a new problem
 */
Problems.create = async function (orgId, data, uid) {
	if (!orgId) {
		throw new Error('[[error:organization-required]]');
	}

	helpers.validateProblemData(data);

	const problemData = {
		...data,
		orgId,
		createdBy: uid,
	};

	// Fire pre-create hook
	const result = await plugins.hooks.fire('filter:hvt.problem.create', { data: problemData });

	// Create problem
	const problem = await db.createHVTProblem(result.data);

	// Fire post-create hook
	await plugins.hooks.fire('action:hvt.problem.created', { problem, uid });

	return helpers.sanitizeProblem(problem);
};

/**
 * Get problem by ID
 */
Problems.get = async function (problemId) {
	if (!problemId) {
		throw new Error('[[error:invalid-problem-id]]');
	}

	const problem = await db.getHVTProblem(problemId);

	if (!problem) {
		throw new Error('[[error:problem-not-found]]');
	}

	return helpers.sanitizeProblem(problem);
};

/**
 * Get problems by organization with pagination
 */
Problems.getByOrg = async function (orgId, options = {}) {
	if (!orgId) {
		throw new Error('[[error:organization-required]]');
	}

	const { page, limit, start, stop } = helpers.getPaginationData(options.page, options.limit);

	const problems = await db.getHVTProblemsByOrg(orgId, start, stop);
	const total = await db.getHVTProblemCount(orgId);

	return {
		problems: helpers.sanitizeProblems(problems),
		page,
		limit,
		total,
		pages: Math.ceil(total / limit),
	};
};

/**
 * Get problems by module
 */
Problems.getByModule = async function (moduleId, options = {}) {
	if (!moduleId) {
		throw new Error('[[error:module-id-required]]');
	}

	const problems = await db.getHVTProblemsByModule(moduleId);
	return helpers.sanitizeProblems(problems);
};

/**
 * Update problem
 */
Problems.update = async function (problemId, data, uid) {
	if (!problemId) {
		throw new Error('[[error:invalid-problem-id]]');
	}

	// Verify problem exists
	const existing = await Problems.get(problemId);

	// Validate status transition if status is being changed
	if (data.status && data.status !== existing.status) {
		const canTransition = helpers.canTransitionProblemTo(existing.status, data.status);
		if (!canTransition.valid) {
			throw new Error(canTransition.error);
		}
	}

	// Fire pre-update hook
	const result = await plugins.hooks.fire('filter:hvt.problem.update', { 
		problemId, 
		data,
		existing,
	});

	// Update problem
	const updated = await db.updateHVTProblem(problemId, result.data);

	// Fire post-update hook
	await plugins.hooks.fire('action:hvt.problem.updated', { 
		problem: updated,
		uid,
	});

	return helpers.sanitizeProblem(updated);
};

/**
 * Update problem status
 */
Problems.updateStatus = async function (problemId, status, uid) {
	return await Problems.update(problemId, { status }, uid);
};

/**
 * Delete problem (soft delete)
 */
Problems.delete = async function (problemId) {
	if (!problemId) {
		throw new Error('[[error:invalid-problem-id]]');
	}

	// Verify problem exists
	const existing = await Problems.get(problemId);

	// Fire pre-delete hook
	await plugins.hooks.fire('filter:hvt.problem.delete', { 
		problemId,
		problem: existing,
	});

	// Delete problem
	await db.deleteHVTProblem(problemId);

	// Fire post-delete hook
	await plugins.hooks.fire('action:hvt.problem.deleted', { 
		problemId,
		problem: existing,
	});
};

/**
 * Check if problem exists
 */
Problems.exists = async function (problemId) {
	if (!problemId) {
		return false;
	}

	const problem = await db.getHVTProblem(problemId);
	return !!problem;
};

/**
 * Get problem with idea/learning counts
 */
Problems.getWithCounts = async function (problemId) {
	const problem = await Problems.get(problemId);
	
	// ideaCount is already stored on the problem
	// You could also count learnings if needed
	
	return problem;
};
