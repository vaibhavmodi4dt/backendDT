'use strict';

const Helpers = module.exports;

// ==================== KEY GENERATORS ====================

Helpers.getModuleKey = function (id) {
	return `hvt:module:${id}`;
};

Helpers.getProblemKey = function (id) {
	return `hvt:problem:${id}`;
};

Helpers.getIdeaKey = function (id) {
	return `hvt:idea:${id}`;
};

Helpers.getExperimentKey = function (id) {
	return `hvt:experiment:${id}`;
};

Helpers.getResultKey = function (id) {
	return `hvt:result:${id}`;
};

Helpers.getLearningKey = function (id) {
	return `hvt:learning:${id}`;
};

Helpers.getEscalationKey = function (id) {
	return `hvt:escalation:${id}`;
};

Helpers.getTicketKey = function (id) {
	return `hvt:ticket:${id}`;
};

Helpers.getUpdateKey = function (id) {
	return `hvt:update:${id}`;
};

// ==================== ICE SCORE CALCULATION ====================

Helpers.calculateICEScore = function (impact, confidence, ease) {
	if (!impact || !confidence || !ease) {
		return null;
	}
	return Math.round(((impact + confidence + ease) / 3) * 10) / 10;
};

// ==================== STATE MACHINE DEFINITIONS ====================

Helpers.EXPERIMENT_TRANSITIONS = {
	seeded: ['probing', 'halted'],
	probing: ['active', 'halted'],
	active: ['blocked', 'logging', 'halted'],
	blocked: ['active', 'halted'],
	logging: ['ready_for_hash', 'halted'],
	ready_for_hash: ['completed', 'halted'],
	completed: [], // Terminal state
	halted: [], // Terminal state
};

Helpers.PROBLEM_TRANSITIONS = {
	open: ['in_progress', 'archived'],
	in_progress: ['resolved', 'open', 'archived'],
	resolved: ['archived'],
	archived: [], // Can be re-opened manually if needed
};

Helpers.IDEA_TRANSITIONS = {
	draft: ['pending_review'],
	pending_review: ['approved', 'rejected', 'draft', 'pending_review', 'scored'], // Allow re-review and direct scoring
	approved: ['scored'],
	rejected: [], // Terminal unless manually changed
	scored: [], // Terminal - idea is ready for experiments
};

Helpers.ESCALATION_TRANSITIONS = {
	open: ['in_progress', 'resolved'],
	in_progress: ['resolved', 'open'],
	resolved: [], // Terminal state
};

// ==================== STATE VALIDATION ====================

Helpers.canTransitionExperimentTo = function (currentStatus, targetStatus) {
	const validTransitions = Helpers.EXPERIMENT_TRANSITIONS[currentStatus];
	
	if (!validTransitions) {
		return {
			valid: false,
			error: `Unknown experiment status: ${currentStatus}`,
		};
	}

	if (validTransitions.includes(targetStatus)) {
		return { valid: true };
	}

	return {
		valid: false,
		error: `Cannot transition experiment from '${currentStatus}' to '${targetStatus}'. Valid transitions: ${validTransitions.join(', ')}`,
	};
};

Helpers.canTransitionProblemTo = function (currentStatus, targetStatus) {
	const validTransitions = Helpers.PROBLEM_TRANSITIONS[currentStatus];
	
	if (!validTransitions) {
		return {
			valid: false,
			error: `Unknown problem status: ${currentStatus}`,
		};
	}

	if (validTransitions.includes(targetStatus)) {
		return { valid: true };
	}

	return {
		valid: false,
		error: `Cannot transition problem from '${currentStatus}' to '${targetStatus}'. Valid transitions: ${validTransitions.join(', ')}`,
	};
};

Helpers.canTransitionIdeaTo = function (currentStatus, targetStatus) {
	const validTransitions = Helpers.IDEA_TRANSITIONS[currentStatus];
	
	if (!validTransitions) {
		return {
			valid: false,
			error: `Unknown idea status: ${currentStatus}`,
		};
	}

	if (validTransitions.includes(targetStatus)) {
		return { valid: true };
	}

	return {
		valid: false,
		error: `Cannot transition idea from '${currentStatus}' to '${targetStatus}'. Valid transitions: ${validTransitions.join(', ')}`,
	};
};

Helpers.canTransitionEscalationTo = function (currentStatus, targetStatus) {
	const validTransitions = Helpers.ESCALATION_TRANSITIONS[currentStatus];
	
	if (!validTransitions) {
		return {
			valid: false,
			error: `Unknown escalation status: ${currentStatus}`,
		};
	}

	if (validTransitions.includes(targetStatus)) {
		return { valid: true };
	}

	return {
		valid: false,
		error: `Cannot transition escalation from '${currentStatus}' to '${targetStatus}'. Valid transitions: ${validTransitions.join(', ')}`,
	};
};

// ==================== SANITIZATION ====================

Helpers.sanitizeProblem = function (problem) {
	if (!problem) return null;
	
	const sanitized = { ...problem };
	delete sanitized._key;
	return sanitized;
};

Helpers.sanitizeProblems = function (problems) {
	return problems.map(Helpers.sanitizeProblem).filter(Boolean);
};

Helpers.sanitizeIdea = function (idea) {
	if (!idea) return null;
	
	const sanitized = { ...idea };
	delete sanitized._key;
	return sanitized;
};

Helpers.sanitizeIdeas = function (ideas) {
	return ideas.map(Helpers.sanitizeIdea).filter(Boolean);
};

Helpers.sanitizeExperiment = function (experiment) {
	if (!experiment) return null;
	
	const sanitized = { ...experiment };
	delete sanitized._key;
	return sanitized;
};

Helpers.sanitizeExperiments = function (experiments) {
	return experiments.map(Helpers.sanitizeExperiment).filter(Boolean);
};

Helpers.sanitizeLearning = function (learning) {
	if (!learning) return null;
	
	const sanitized = { ...learning };
	delete sanitized._key;
	return sanitized;
};

Helpers.sanitizeLearnings = function (learnings) {
	return learnings.map(Helpers.sanitizeLearning).filter(Boolean);
};

Helpers.sanitizeModule = function (module) {
	if (!module) return null;
	
	const sanitized = { ...module };
	delete sanitized._key;
	return sanitized;
};

Helpers.sanitizeModules = function (modules) {
	return modules.map(Helpers.sanitizeModule).filter(Boolean);
};

// ==================== VALIDATION ====================

Helpers.validateProblemData = function (data) {
	if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
		throw new Error('[[error:invalid-problem-title]]');
	}
	
	if (!data.moduleId) {
		throw new Error('[[error:module-id-required]]');
	}
	
	if (!data.severity) {
		throw new Error('[[error:severity-required]]');
	}
	
	const validSeverities = ['low', 'medium', 'high', 'critical'];
	if (!validSeverities.includes(data.severity)) {
		throw new Error('[[error:invalid-severity]]');
	}
};

Helpers.validateIdeaData = function (data) {
	if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
		throw new Error('[[error:invalid-idea-title]]');
	}
	
	if (!data.problemId) {
		throw new Error('[[error:problem-id-required]]');
	}
};

Helpers.validateExperimentData = function (data) {
	if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
		throw new Error('[[error:invalid-experiment-title]]');
	}
	
	if (!data.ideaId) {
		throw new Error('[[error:idea-id-required]]');
	}
	
	if (!data.problemId) {
		throw new Error('[[error:problem-id-required]]');
	}
	
	if (!data.moduleId) {
		throw new Error('[[error:module-id-required]]');
	}
};

Helpers.validateLearningData = function (data) {
	if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
		throw new Error('[[error:invalid-learning-title]]');
	}
	
	if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
		throw new Error('[[error:invalid-learning-description]]');
	}
	
	if (!data.experimentId) {
		throw new Error('[[error:experiment-id-required]]');
	}
};

// ==================== ROLE HIERARCHY ====================

Helpers.ROLE_HIERARCHY = {
	admin: 3,
	contributor: 2,
	viewer: 1,
};

Helpers.hasMinimumRole = function (userRole, requiredRole) {
	const userLevel = Helpers.ROLE_HIERARCHY[userRole] || 0;
	const requiredLevel = Helpers.ROLE_HIERARCHY[requiredRole] || 0;
	return userLevel >= requiredLevel;
};

// ==================== PAGINATION ====================

Helpers.getPaginationData = function (page, limit) {
	const parsedPage = parseInt(page, 10) || 1;
	const parsedLimit = Math.min(parseInt(limit, 10) || 20, 100); // Max 100 items per page
	
	const start = (parsedPage - 1) * parsedLimit;
	const stop = start + parsedLimit - 1;
	
	return {
		page: parsedPage,
		limit: parsedLimit,
		start,
		stop,
	};
};
