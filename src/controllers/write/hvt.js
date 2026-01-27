'use strict';

const api = require('../../api');
const helpers = require('../helpers');

const HVT = module.exports;

// ==========================================
// MODULES
// ==========================================

/**
 * POST /api/v3/hvt/modules
 */
HVT.createModule = async function (req, res) {
	helpers.formatApiResponse(201, res, await api.hvt.createModule(req, req.body));
};

/**
 * GET /api/v3/hvt/modules/:moduleId
 */
HVT.getModule = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getModule(req, {
		moduleId: req.params.moduleId,
	}));
};

/**
 * GET /api/v3/hvt/modules
 */
HVT.getAllModules = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getAllModules(req, {}));
};

/**
 * PUT /api/v3/hvt/modules/:moduleId
 */
HVT.updateModule = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.updateModule(req, {
		moduleId: req.params.moduleId,
		updates: req.body,
	}));
};

/**
 * DELETE /api/v3/hvt/modules/:moduleId
 */
HVT.deleteModule = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.deleteModule(req, {
		moduleId: req.params.moduleId,
	}));
};

/**
 * POST /api/v3/hvt/modules/seed
 */
HVT.seedModules = async function (req, res) {
	helpers.formatApiResponse(201, res, await api.hvt.seedModules(req, {}));
};

// ==========================================
// PROBLEMS
// ==========================================

/**
 * POST /api/v3/hvt/problems
 */
HVT.createProblem = async function (req, res) {
	helpers.formatApiResponse(201, res, await api.hvt.createProblem(req, req.body));
};

/**
 * GET /api/v3/hvt/problems/:problemId
 */
HVT.getProblem = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getProblem(req, {
		problemId: req.params.problemId,
	}));
};

/**
 * GET /api/v3/hvt/problems
 */
HVT.getProblemsByOrg = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getProblemsByOrg(req, {}));
};

/**
 * GET /api/v3/hvt/modules/:moduleId/problems
 */
HVT.getProblemsByModule = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getProblemsByModule(req, {
		moduleId: req.params.moduleId,
	}));
};

/**
 * PUT /api/v3/hvt/problems/:problemId
 */
HVT.updateProblem = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.updateProblem(req, {
		problemId: req.params.problemId,
		updates: req.body,
	}));
};

/**
 * PATCH /api/v3/hvt/problems/:problemId/status
 */
HVT.updateProblemStatus = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.updateProblemStatus(req, {
		problemId: req.params.problemId,
		status: req.body.status,
	}));
};

/**
 * DELETE /api/v3/hvt/problems/:problemId
 */
HVT.deleteProblem = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.deleteProblem(req, {
		problemId: req.params.problemId,
	}));
};

/**
 * GET /api/v3/hvt/problems/:problemId/with-counts
 */
HVT.getProblemWithCounts = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getProblemWithCounts(req, {
		problemId: req.params.problemId,
	}));
};

// ==========================================
// IDEAS
// ==========================================

/**
 * POST /api/v3/hvt/problems/:problemId/ideas
 */
HVT.createIdea = async function (req, res) {
	helpers.formatApiResponse(201, res, await api.hvt.createIdea(req, {
		problemId: req.params.problemId,
		...req.body,
	}));
};

/**
 * GET /api/v3/hvt/ideas/:ideaId
 */
HVT.getIdea = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getIdea(req, {
		ideaId: req.params.ideaId,
	}));
};

/**
 * GET /api/v3/hvt/problems/:problemId/ideas
 */
HVT.getIdeasByProblem = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getIdeasByProblem(req, {
		problemId: req.params.problemId,
	}));
};

/**
 * PUT /api/v3/hvt/ideas/:ideaId
 */
HVT.updateIdea = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.updateIdea(req, {
		ideaId: req.params.ideaId,
		updates: req.body,
	}));
};

/**
 * POST /api/v3/hvt/ideas/:ideaId/score
 */
HVT.scoreIdea = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.scoreIdea(req, {
		ideaId: req.params.ideaId,
		...req.body,
	}));
};

/**
 * POST /api/v3/hvt/ideas/:ideaId/approve
 */
HVT.approveIdea = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.approveIdea(req, {
		ideaId: req.params.ideaId,
	}));
};

/**
 * POST /api/v3/hvt/ideas/:ideaId/reject
 */
HVT.rejectIdea = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.rejectIdea(req, {
		ideaId: req.params.ideaId,
	}));
};

/**
 * PATCH /api/v3/hvt/ideas/:ideaId/status
 */
HVT.updateIdeaStatus = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.updateIdeaStatus(req, {
		ideaId: req.params.ideaId,
		status: req.body.status,
	}));
};

// ==========================================
// EXPERIMENTS
// ==========================================

/**
 * POST /api/v3/hvt/ideas/:ideaId/experiments
 */
HVT.createExperiment = async function (req, res) {
	helpers.formatApiResponse(201, res, await api.hvt.createExperiment(req, {
		ideaId: req.params.ideaId,
		...req.body,
	}));
};

/**
 * GET /api/v3/hvt/experiments/:experimentId
 */
HVT.getExperiment = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getExperiment(req, {
		experimentId: req.params.experimentId,
	}));
};

/**
 * GET /api/v3/hvt/experiments
 */
HVT.getExperimentsByOrg = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getExperimentsByOrg(req, {}));
};

/**
 * GET /api/v3/hvt/experiments/status/:status
 */
HVT.getExperimentsByStatus = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getExperimentsByStatus(req, {
		status: req.params.status,
	}));
};

/**
 * PUT /api/v3/hvt/experiments/:experimentId
 */
HVT.updateExperiment = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.updateExperiment(req, {
		experimentId: req.params.experimentId,
		updates: req.body,
	}));
};

/**
 * PATCH /api/v3/hvt/experiments/:experimentId/status
 */
HVT.updateExperimentStatus = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.updateExperimentStatus(req, {
		experimentId: req.params.experimentId,
		status: req.body.status,
	}));
};

/**
 * POST /api/v3/hvt/experiments/:experimentId/halt
 */
HVT.haltExperiment = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.haltExperiment(req, {
		experimentId: req.params.experimentId,
		reason: req.body.reason,
	}));
};

/**
 * POST /api/v3/hvt/experiments/:experimentId/verify
 */
HVT.verifyExperiment = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.verifyExperiment(req, {
		experimentId: req.params.experimentId,
	}));
};

/**
 * GET /api/v3/hvt/experiments/:experimentId/with-relations
 */
HVT.getExperimentWithRelations = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getExperimentWithRelations(req, {
		experimentId: req.params.experimentId,
	}));
};

// ==========================================
// RESULTS
// ==========================================

/**
 * POST /api/v3/hvt/experiments/:experimentId/results
 */
HVT.createResult = async function (req, res) {
	helpers.formatApiResponse(201, res, await api.hvt.createResult(req, {
		experimentId: req.params.experimentId,
		...req.body,
	}));
};

/**
 * GET /api/v3/hvt/experiments/:experimentId/results
 */
HVT.getResultsByExperiment = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getResultsByExperiment(req, {
		experimentId: req.params.experimentId,
	}));
};

// ==========================================
// LEARNINGS
// ==========================================

/**
 * POST /api/v3/hvt/experiments/:experimentId/learnings
 */
HVT.createLearning = async function (req, res) {
	helpers.formatApiResponse(201, res, await api.hvt.createLearning(req, {
		experimentId: req.params.experimentId,
		...req.body,
	}));
};

/**
 * GET /api/v3/hvt/learnings/:learningId
 */
HVT.getLearning = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getLearning(req, {
		learningId: req.params.learningId,
	}));
};

/**
 * GET /api/v3/hvt/learnings
 */
HVT.getLearningsByOrg = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getLearningsByOrg(req, {}));
};

/**
 * GET /api/v3/hvt/modules/:moduleId/learnings
 */
HVT.getLearningsByModule = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getLearningsByModule(req, {
		moduleId: req.params.moduleId,
	}));
};

/**
 * GET /api/v3/hvt/learnings/:learningId/similar
 */
HVT.getSimilarLearnings = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getSimilarLearnings(req, {
		learningId: req.params.learningId,
	}));
};

/**
 * PUT /api/v3/hvt/learnings/:learningId
 */
HVT.updateLearning = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.updateLearning(req, {
		learningId: req.params.learningId,
		updates: req.body,
	}));
};

/**
 * POST /api/v3/hvt/learnings/:learningId/archive
 */
HVT.archiveLearning = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.archiveLearning(req, {
		learningId: req.params.learningId,
	}));
};

/**
 * POST /api/v3/hvt/learnings/:learningId/unarchive
 */
HVT.unarchiveLearning = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.unarchiveLearning(req, {
		learningId: req.params.learningId,
	}));
};

/**
 * DELETE /api/v3/hvt/learnings/:learningId
 */
HVT.deleteLearning = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.deleteLearning(req, {
		learningId: req.params.learningId,
	}));
};

// ==========================================
// ESCALATIONS
// ==========================================

/**
 * POST /api/v3/hvt/experiments/:experimentId/escalations
 */
HVT.createEscalation = async function (req, res) {
	helpers.formatApiResponse(201, res, await api.hvt.createEscalation(req, {
		experimentId: req.params.experimentId,
		...req.body,
	}));
};

/**
 * GET /api/v3/hvt/escalations/:escalationId
 */
HVT.getEscalation = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getEscalation(req, {
		escalationId: req.params.escalationId,
	}));
};

/**
 * GET /api/v3/hvt/experiments/:experimentId/escalations
 */
HVT.getEscalationsByExperiment = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getEscalationsByExperiment(req, {
		experimentId: req.params.experimentId,
	}));
};

/**
 * PUT /api/v3/hvt/escalations/:escalationId
 */
HVT.updateEscalation = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.updateEscalation(req, {
		escalationId: req.params.escalationId,
		updates: req.body,
	}));
};

/**
 * PATCH /api/v3/hvt/escalations/:escalationId/status
 */
HVT.updateEscalationStatus = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.updateEscalationStatus(req, {
		escalationId: req.params.escalationId,
		status: req.body.status,
	}));
};

/**
 * POST /api/v3/hvt/escalations/:escalationId/resolve
 */
HVT.resolveEscalation = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.resolveEscalation(req, {
		escalationId: req.params.escalationId,
		resolution: req.body.resolution,
	}));
};

/**
 * DELETE /api/v3/hvt/escalations/:escalationId
 */
HVT.deleteEscalation = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.deleteEscalation(req, {
		escalationId: req.params.escalationId,
	}));
};

// ==========================================
// TICKETS
// ==========================================

/**
 * POST /api/v3/hvt/ideas/:ideaId/tickets
 */
HVT.createTicket = async function (req, res) {
	helpers.formatApiResponse(201, res, await api.hvt.createTicket(req, {
		ideaId: req.params.ideaId,
		...req.body,
	}));
};

/**
 * GET /api/v3/hvt/ideas/:ideaId/tickets
 */
HVT.getTicketsByIdea = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getTicketsByIdea(req, {
		ideaId: req.params.ideaId,
	}));
};

// ==========================================
// UPDATES
// ==========================================

/**
 * POST /api/v3/hvt/experiments/:experimentId/updates
 */
HVT.createUpdate = async function (req, res) {
	helpers.formatApiResponse(201, res, await api.hvt.createUpdate(req, {
		experimentId: req.params.experimentId,
		...req.body,
	}));
};

/**
 * GET /api/v3/hvt/experiments/:experimentId/updates
 */
HVT.getUpdatesByExperiment = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getUpdatesByExperiment(req, {
		experimentId: req.params.experimentId,
	}));
};

// ==========================================
// ROLES
// ==========================================

/**
 * POST /api/v3/hvt/roles
 */
HVT.setRole = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.setRole(req, req.body));
};

/**
 * GET /api/v3/hvt/roles/:uid
 */
HVT.getRole = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getRole(req, {
		uid: req.params.uid,
	}));
};

/**
 * GET /api/v3/hvt/roles
 */
HVT.getRolesByOrg = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getRolesByOrg(req, {}));
};

/**
 * DELETE /api/v3/hvt/roles/:uid
 */
HVT.removeRole = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.removeRole(req, {
		uid: req.params.uid,
	}));
};

// ==========================================
// METRICS
// ==========================================

/**
 * GET /api/v3/hvt/metrics
 */
HVT.getMetricsByOrg = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getMetricsByOrg(req, {}));
};

/**
 * GET /api/v3/hvt/metrics/module/:moduleId
 */
HVT.getMetricsByModule = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getMetricsByModule(req, {
		moduleId: req.params.moduleId,
	}));
};

/**
 * GET /api/v3/hvt/metrics/velocity
 */
HVT.getVelocity = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.hvt.getVelocity(req, {
		days: req.query.days ? parseInt(req.query.days, 10) : 30,
	}));
};
