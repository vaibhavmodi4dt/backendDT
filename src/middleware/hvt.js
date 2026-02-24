'use strict';

const HVT = require('../hvt');
const db = require('../database');

const Middleware = module.exports;

/**
 * Middleware: Check if user has minimum HVT role
 * Default minimum is 'viewer' (all logged-in users)
 */
Middleware.hasHVTRole = function (minimumRole = 'viewer') {
	return async function (req, res, next) {
		if (!req.uid) {
			return res.status(401).json({
				status: { code: 401, message: 'Unauthorized' },
				response: { error: '[[error:not-logged-in]]' },
			});
		}

		if (!req.organisation?.orgId) {
			return res.status(400).json({
				status: { code: 400, message: 'Bad Request' },
				response: { error: '[[error:organization-context-required]]' },
			});
		}

		const hasRole = await HVT.roles.hasMinimumRole(
			req.uid,
			req.organisation.orgId,
			minimumRole
		);

		if (!hasRole) {
			return res.status(403).json({
				status: { code: 403, message: 'Forbidden' },
				response: { error: `[[error:hvt-minimum-role-${minimumRole}-required]]` },
			});
		}

		next();
	};
};

/**
 * Middleware: Check if user can create/update problems
 * Requires 'contributor' or higher
 */
Middleware.canManageProblems = Middleware.hasHVTRole('contributor');

/**
 * Middleware: Check if user can create/update ideas
 * Requires 'contributor' or higher
 */
Middleware.canManageIdeas = Middleware.hasHVTRole('contributor');

/**
 * Middleware: Check if user can create/update experiments
 * Requires 'contributor' or higher
 */
Middleware.canManageExperiments = Middleware.hasHVTRole('contributor');

/**
 * Middleware: Check if user can manage modules
 * Requires 'admin'
 */
Middleware.canManageModules = Middleware.hasHVTRole('admin');

/**
 * Middleware: Check if user can manage roles
 * Requires 'admin'
 */
Middleware.canManageRoles = Middleware.hasHVTRole('admin');

/**
 * Middleware: Check if HVT module exists
 */
Middleware.moduleExists = async function (req, res, next) {
	const moduleId = req.params.moduleId || req.body.moduleId;
	
	if (!moduleId) {
		return res.status(400).json({
			status: { code: 400, message: 'Bad Request' },
			response: { error: '[[error:module-id-required]]' },
		});
	}

	const exists = await db.hvtModuleExists(moduleId);
	
	if (!exists) {
		return res.status(404).json({
			status: { code: 404, message: 'Not Found' },
			response: { error: '[[error:module-not-found]]' },
		});
	}

	next();
};

/**
 * Middleware: Check if HVT problem exists
 */
Middleware.problemExists = async function (req, res, next) {
	const problemId = req.params.problemId || req.body.problemId;
	
	if (!problemId) {
		return res.status(400).json({
			status: { code: 400, message: 'Bad Request' },
			response: { error: '[[error:problem-id-required]]' },
		});
	}

	const exists = await db.hvtProblemExists(problemId);
	
	if (!exists) {
		return res.status(404).json({
			status: { code: 404, message: 'Not Found' },
			response: { error: '[[error:problem-not-found]]' },
		});
	}

	next();
};

/**
 * Middleware: Check if HVT idea exists
 */
Middleware.ideaExists = async function (req, res, next) {
	const ideaId = req.params.ideaId || req.body.ideaId;
	
	if (!ideaId) {
		return res.status(400).json({
			status: { code: 400, message: 'Bad Request' },
			response: { error: '[[error:idea-id-required]]' },
		});
	}

	const exists = await db.hvtIdeaExists(ideaId);
	
	if (!exists) {
		return res.status(404).json({
			status: { code: 404, message: 'Not Found' },
			response: { error: '[[error:idea-not-found]]' },
		});
	}

	next();
};

/**
 * Middleware: Check if HVT experiment exists
 */
Middleware.experimentExists = async function (req, res, next) {
	const experimentId = req.params.experimentId || req.body.experimentId;
	
	if (!experimentId) {
		return res.status(400).json({
			status: { code: 400, message: 'Bad Request' },
			response: { error: '[[error:experiment-id-required]]' },
		});
	}

	const exists = await db.hvtExperimentExists(experimentId);
	
	if (!exists) {
		return res.status(404).json({
			status: { code: 404, message: 'Not Found' },
			response: { error: '[[error:experiment-not-found]]' },
		});
	}

	next();
};

/**
 * Middleware: Check if HVT learning exists
 */
Middleware.learningExists = async function (req, res, next) {
	const learningId = req.params.learningId || req.body.learningId;
	
	if (!learningId) {
		return res.status(400).json({
			status: { code: 400, message: 'Bad Request' },
			response: { error: '[[error:learning-id-required]]' },
		});
	}

	const exists = await db.hvtLearningExists(learningId);
	
	if (!exists) {
		return res.status(404).json({
			status: { code: 404, message: 'Not Found' },
			response: { error: '[[error:learning-not-found]]' },
		});
	}

	next();
};

/**
 * Middleware: Check if HVT escalation exists
 */
Middleware.escalationExists = async function (req, res, next) {
	const escalationId = req.params.escalationId || req.body.escalationId;
	
	if (!escalationId) {
		return res.status(400).json({
			status: { code: 400, message: 'Bad Request' },
			response: { error: '[[error:escalation-id-required]]' },
		});
	}

	const exists = await db.hvtEscalationExists(escalationId);
	
	if (!exists) {
		return res.status(404).json({
			status: { code: 404, message: 'Not Found' },
			response: { error: '[[error:escalation-not-found]]' },
		});
	}

	next();
};
