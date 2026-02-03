'use strict';

const router = require('express').Router();
const middleware = require('../../middleware');
const controllers = require('../../controllers');
const routeHelpers = require('../helpers');

const { setupApiRoute } = routeHelpers;
const hvtMiddleware = require('../../middleware/hvt');

module.exports = function () {
	const middlewares = [middleware.ensureLoggedIn];

	// ==========================================
	// MODULES
	// ==========================================

	setupApiRoute(
		router,
		'post',
		'/modules',
		[...middlewares],
		controllers.write.hvt.createModule
	);

	setupApiRoute(
		router,
		'get',
		'/modules/:moduleId',
		[...middlewares],
		controllers.write.hvt.getModule
	);

	setupApiRoute(
		router,
		'get',
		'/modules',
		[...middlewares],
		controllers.write.hvt.getAllModules
	);

	setupApiRoute(
		router,
		'put',
		'/modules/:moduleId',
		[...middlewares],
		controllers.write.hvt.updateModule
	);

	setupApiRoute(
		router,
		'delete',
		'/modules/:moduleId',
		[...middlewares],
		controllers.write.hvt.deleteModule
	);

	setupApiRoute(
		router,
		'post',
		'/modules/seed',
		[...middlewares],
		controllers.write.hvt.seedModules
	);

	// ==========================================
	// PROBLEMS
	// ==========================================

	setupApiRoute(
		router,
		'post',
		'/problems',
		[...middlewares],
		controllers.write.hvt.createProblem
	);

	setupApiRoute(
		router,
		'get',
		'/problems/:problemId',
		[...middlewares],
		controllers.write.hvt.getProblem
	);

	setupApiRoute(
		router,
		'get',
		'/problems',
		[...middlewares],
		controllers.write.hvt.getProblemsByOrg
	);

	setupApiRoute(
		router,
		'get',
		'/modules/:moduleId/problems',
		[...middlewares],
		controllers.write.hvt.getProblemsByModule
	);

	setupApiRoute(
		router,
		'put',
		'/problems/:problemId',
		[...middlewares],
		controllers.write.hvt.updateProblem
	);

	setupApiRoute(
		router,
		'patch',
		'/problems/:problemId/status',
		[...middlewares],
		controllers.write.hvt.updateProblemStatus
	);

	setupApiRoute(
		router,
		'delete',
		'/problems/:problemId',
		[...middlewares],
		controllers.write.hvt.deleteProblem
	);

	setupApiRoute(
		router,
		'get',
		'/problems/:problemId/with-counts',
		[...middlewares],
		controllers.write.hvt.getProblemWithCounts
	);

	// ==========================================
	// IDEAS
	// ==========================================

	setupApiRoute(
		router,
		'post',
		'/problems/:problemId/ideas',
		[...middlewares],
		controllers.write.hvt.createIdea
	);

	setupApiRoute(
		router,
		'get',
		'/ideas/:ideaId',
		[...middlewares],
		controllers.write.hvt.getIdea
	);

	setupApiRoute(
		router,
		'get',
		'/problems/:problemId/ideas',
		[...middlewares],
		controllers.write.hvt.getIdeasByProblem
	);

	setupApiRoute(
		router,
		'put',
		'/ideas/:ideaId',
		[...middlewares],
		controllers.write.hvt.updateIdea
	);

	setupApiRoute(
		router,
		'post',
		'/ideas/:ideaId/score',
		[...middlewares],
		controllers.write.hvt.scoreIdea
	);

	setupApiRoute(
		router,
		'post',
		'/ideas/:ideaId/approve',
		[...middlewares],
		controllers.write.hvt.approveIdea
	);

	setupApiRoute(
		router,
		'post',
		'/ideas/:ideaId/reject',
		[...middlewares],
		controllers.write.hvt.rejectIdea
	);

	setupApiRoute(
		router,
		'patch',
		'/ideas/:ideaId/status',
		[...middlewares],
		controllers.write.hvt.updateIdeaStatus
	);

	// ==========================================
	// EXPERIMENTS
	// ==========================================

	setupApiRoute(
		router,
		'post',
		'/ideas/:ideaId/experiments',
		[...middlewares],
		controllers.write.hvt.createExperiment
	);

	setupApiRoute(
		router,
		'get',
		'/experiments/:experimentId',
		[...middlewares],
		controllers.write.hvt.getExperiment
	);

	setupApiRoute(
		router,
		'get',
		'/experiments',
		[...middlewares],
		controllers.write.hvt.getExperimentsByOrg
	);

	setupApiRoute(
		router,
		'get',
		'/experiments/status/:status',
		[...middlewares],
		controllers.write.hvt.getExperimentsByStatus
	);

	setupApiRoute(
		router,
		'put',
		'/experiments/:experimentId',
		[...middlewares],
		controllers.write.hvt.updateExperiment
	);

	setupApiRoute(
		router,
		'patch',
		'/experiments/:experimentId/status',
		[...middlewares],
		controllers.write.hvt.updateExperimentStatus
	);

	setupApiRoute(
		router,
		'post',
		'/experiments/:experimentId/halt',
		[...middlewares],
		controllers.write.hvt.haltExperiment
	);

	setupApiRoute(
		router,
		'post',
		'/experiments/:experimentId/verify',
		[...middlewares],
		controllers.write.hvt.verifyExperiment
	);

	setupApiRoute(
		router,
		'get',
		'/experiments/:experimentId/with-relations',
		[...middlewares],
		controllers.write.hvt.getExperimentWithRelations
	);

	// ==========================================
	// RESULTS
	// ==========================================

	setupApiRoute(
		router,
		'post',
		'/experiments/:experimentId/results',
		[...middlewares],
		controllers.write.hvt.createResult
	);

	setupApiRoute(
		router,
		'get',
		'/experiments/:experimentId/results',
		[...middlewares],
		controllers.write.hvt.getResultsByExperiment
	);

	// ==========================================
	// LEARNINGS
	// ==========================================

	setupApiRoute(
		router,
		'post',
		'/experiments/:experimentId/learnings',
		[...middlewares],
		controllers.write.hvt.createLearning
	);

	setupApiRoute(
		router,
		'get',
		'/learnings/:learningId',
		[...middlewares],
		controllers.write.hvt.getLearning
	);

	setupApiRoute(
		router,
		'get',
		'/learnings',
		[...middlewares],
		controllers.write.hvt.getLearningsByOrg
	);

	setupApiRoute(
		router,
		'get',
		'/modules/:moduleId/learnings',
		[...middlewares],
		controllers.write.hvt.getLearningsByModule
	);

	setupApiRoute(
		router,
		'get',
		'/learnings/:learningId/similar',
		[...middlewares],
		controllers.write.hvt.getSimilarLearnings
	);

	setupApiRoute(
		router,
		'put',
		'/learnings/:learningId',
		[...middlewares],
		controllers.write.hvt.updateLearning
	);

	setupApiRoute(
		router,
		'post',
		'/learnings/:learningId/archive',
		[...middlewares],
		controllers.write.hvt.archiveLearning
	);

	setupApiRoute(
		router,
		'post',
		'/learnings/:learningId/unarchive',
		[...middlewares],
		controllers.write.hvt.unarchiveLearning
	);

	setupApiRoute(
		router,
		'delete',
		'/learnings/:learningId',
		[...middlewares],
		controllers.write.hvt.deleteLearning
	);

	// ==========================================
	// ESCALATIONS
	// ==========================================

	setupApiRoute(
		router,
		'post',
		'/experiments/:experimentId/escalations',
		[...middlewares],
		controllers.write.hvt.createEscalation
	);

	setupApiRoute(
		router,
		'get',
		'/escalations/:escalationId',
		[...middlewares],
		controllers.write.hvt.getEscalation
	);

	setupApiRoute(
		router,
		'get',
		'/experiments/:experimentId/escalations',
		[...middlewares],
		controllers.write.hvt.getEscalationsByExperiment
	);

	setupApiRoute(
		router,
		'put',
		'/escalations/:escalationId',
		[...middlewares],
		controllers.write.hvt.updateEscalation
	);

	setupApiRoute(
		router,
		'patch',
		'/escalations/:escalationId/status',
		[...middlewares],
		controllers.write.hvt.updateEscalationStatus
	);

	setupApiRoute(
		router,
		'post',
		'/escalations/:escalationId/resolve',
		[...middlewares],
		controllers.write.hvt.resolveEscalation
	);

	setupApiRoute(
		router,
		'delete',
		'/escalations/:escalationId',
		[...middlewares],
		controllers.write.hvt.deleteEscalation
	);

	// ==========================================
	// TICKETS
	// ==========================================

	setupApiRoute(
		router,
		'post',
		'/ideas/:ideaId/tickets',
		[...middlewares],
		controllers.write.hvt.createTicket
	);

	setupApiRoute(
		router,
		'get',
		'/ideas/:ideaId/tickets',
		[...middlewares],
		controllers.write.hvt.getTicketsByIdea
	);

	// ==========================================
	// UPDATES
	// ==========================================

	setupApiRoute(
		router,
		'post',
		'/experiments/:experimentId/updates',
		[...middlewares],
		controllers.write.hvt.createUpdate
	);

	setupApiRoute(
		router,
		'get',
		'/experiments/:experimentId/updates',
		[...middlewares],
		controllers.write.hvt.getUpdatesByExperiment
	);

	// ==========================================
	// ROLES
	// ==========================================

	setupApiRoute(
		router,
		'post',
		'/roles',
		[...middlewares],
		controllers.write.hvt.setRole
	);

	setupApiRoute(
		router,
		'get',
		'/roles/:uid',
		[...middlewares],
		controllers.write.hvt.getRole
	);

	setupApiRoute(
		router,
		'get',
		'/roles',
		[...middlewares],
		controllers.write.hvt.getRolesByOrg
	);

	setupApiRoute(
		router,
		'delete',
		'/roles/:uid',
		[...middlewares],
		controllers.write.hvt.removeRole
	);

	// ==========================================
	// METRICS
	// ==========================================

	setupApiRoute(
		router,
		'get',
		'/metrics',
		[...middlewares],
		controllers.write.hvt.getMetricsByOrg
	);

	setupApiRoute(
		router,
		'get',
		'/metrics/module/:moduleId',
		[...middlewares],
		controllers.write.hvt.getMetricsByModule
	);

	setupApiRoute(
		router,
		'get',
		'/metrics/velocity',
		[...middlewares],
		controllers.write.hvt.getVelocity
	);

	return router;
};
