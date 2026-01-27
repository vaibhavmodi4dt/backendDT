'use strict';

const router = require('express').Router();
const middleware = require('../../middleware');
const controllers = require('../../controllers');
const routeHelpers = require('../helpers');

const { setupApiRoute } = routeHelpers;
const hvtMiddleware = require('../../middleware/hvt');

module.exports = function () {
	const middlewares = [middleware.ensureLoggedIn, middleware.organization.attachOrganization];

	// ==========================================
	// MODULES
	// ==========================================

	setupApiRoute(
		router,
		'post',
		'/modules',
		[...middlewares, hvtMiddleware.canManageModules],
		controllers.write.hvt.createModule
	);

	setupApiRoute(
		router,
		'get',
		'/modules/:moduleId',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer')],
		controllers.write.hvt.getModule
	);

	setupApiRoute(
		router,
		'get',
		'/modules',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer')],
		controllers.write.hvt.getAllModules
	);

	setupApiRoute(
		router,
		'put',
		'/modules/:moduleId',
		[...middlewares, hvtMiddleware.canManageModules, hvtMiddleware.moduleExists],
		controllers.write.hvt.updateModule
	);

	setupApiRoute(
		router,
		'delete',
		'/modules/:moduleId',
		[...middlewares, hvtMiddleware.canManageModules, hvtMiddleware.moduleExists],
		controllers.write.hvt.deleteModule
	);

	setupApiRoute(
		router,
		'post',
		'/modules/seed',
		[...middlewares, hvtMiddleware.canManageModules],
		controllers.write.hvt.seedModules
	);

	// ==========================================
	// PROBLEMS
	// ==========================================

	setupApiRoute(
		router,
		'post',
		'/problems',
		[...middlewares, hvtMiddleware.canManageProblems],
		controllers.write.hvt.createProblem
	);

	setupApiRoute(
		router,
		'get',
		'/problems/:problemId',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer'), hvtMiddleware.problemExists],
		controllers.write.hvt.getProblem
	);

	setupApiRoute(
		router,
		'get',
		'/problems',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer')],
		controllers.write.hvt.getProblemsByOrg
	);

	setupApiRoute(
		router,
		'get',
		'/modules/:moduleId/problems',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer'), hvtMiddleware.moduleExists],
		controllers.write.hvt.getProblemsByModule
	);

	setupApiRoute(
		router,
		'put',
		'/problems/:problemId',
		[...middlewares, hvtMiddleware.canManageProblems, hvtMiddleware.problemExists],
		controllers.write.hvt.updateProblem
	);

	setupApiRoute(
		router,
		'patch',
		'/problems/:problemId/status',
		[...middlewares, hvtMiddleware.canManageProblems, hvtMiddleware.problemExists],
		controllers.write.hvt.updateProblemStatus
	);

	setupApiRoute(
		router,
		'delete',
		'/problems/:problemId',
		[...middlewares, hvtMiddleware.canManageProblems, hvtMiddleware.problemExists],
		controllers.write.hvt.deleteProblem
	);

	setupApiRoute(
		router,
		'get',
		'/problems/:problemId/with-counts',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer'), hvtMiddleware.problemExists],
		controllers.write.hvt.getProblemWithCounts
	);

	// ==========================================
	// IDEAS
	// ==========================================

	setupApiRoute(
		router,
		'post',
		'/problems/:problemId/ideas',
		[...middlewares, hvtMiddleware.canManageIdeas, hvtMiddleware.problemExists],
		controllers.write.hvt.createIdea
	);

	setupApiRoute(
		router,
		'get',
		'/ideas/:ideaId',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer'), hvtMiddleware.ideaExists],
		controllers.write.hvt.getIdea
	);

	setupApiRoute(
		router,
		'get',
		'/problems/:problemId/ideas',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer'), hvtMiddleware.problemExists],
		controllers.write.hvt.getIdeasByProblem
	);

	setupApiRoute(
		router,
		'put',
		'/ideas/:ideaId',
		[...middlewares, hvtMiddleware.canManageIdeas, hvtMiddleware.ideaExists],
		controllers.write.hvt.updateIdea
	);

	setupApiRoute(
		router,
		'post',
		'/ideas/:ideaId/score',
		[...middlewares, hvtMiddleware.canManageIdeas, hvtMiddleware.ideaExists],
		controllers.write.hvt.scoreIdea
	);

	setupApiRoute(
		router,
		'post',
		'/ideas/:ideaId/approve',
		[...middlewares, hvtMiddleware.canManageIdeas, hvtMiddleware.ideaExists],
		controllers.write.hvt.approveIdea
	);

	setupApiRoute(
		router,
		'post',
		'/ideas/:ideaId/reject',
		[...middlewares, hvtMiddleware.canManageIdeas, hvtMiddleware.ideaExists],
		controllers.write.hvt.rejectIdea
	);

	setupApiRoute(
		router,
		'patch',
		'/ideas/:ideaId/status',
		[...middlewares, hvtMiddleware.canManageIdeas, hvtMiddleware.ideaExists],
		controllers.write.hvt.updateIdeaStatus
	);

	// ==========================================
	// EXPERIMENTS
	// ==========================================

	setupApiRoute(
		router,
		'post',
		'/ideas/:ideaId/experiments',
		[...middlewares, hvtMiddleware.canManageExperiments, hvtMiddleware.ideaExists],
		controllers.write.hvt.createExperiment
	);

	setupApiRoute(
		router,
		'get',
		'/experiments/:experimentId',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer'), hvtMiddleware.experimentExists],
		controllers.write.hvt.getExperiment
	);

	setupApiRoute(
		router,
		'get',
		'/experiments',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer')],
		controllers.write.hvt.getExperimentsByOrg
	);

	setupApiRoute(
		router,
		'get',
		'/experiments/status/:status',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer')],
		controllers.write.hvt.getExperimentsByStatus
	);

	setupApiRoute(
		router,
		'put',
		'/experiments/:experimentId',
		[...middlewares, hvtMiddleware.canManageExperiments, hvtMiddleware.experimentExists],
		controllers.write.hvt.updateExperiment
	);

	setupApiRoute(
		router,
		'patch',
		'/experiments/:experimentId/status',
		[...middlewares, hvtMiddleware.canManageExperiments, hvtMiddleware.experimentExists],
		controllers.write.hvt.updateExperimentStatus
	);

	setupApiRoute(
		router,
		'post',
		'/experiments/:experimentId/halt',
		[...middlewares, hvtMiddleware.canManageExperiments, hvtMiddleware.experimentExists],
		controllers.write.hvt.haltExperiment
	);

	setupApiRoute(
		router,
		'post',
		'/experiments/:experimentId/verify',
		[...middlewares, hvtMiddleware.canManageExperiments, hvtMiddleware.experimentExists],
		controllers.write.hvt.verifyExperiment
	);

	setupApiRoute(
		router,
		'get',
		'/experiments/:experimentId/with-relations',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer'), hvtMiddleware.experimentExists],
		controllers.write.hvt.getExperimentWithRelations
	);

	// ==========================================
	// RESULTS
	// ==========================================

	setupApiRoute(
		router,
		'post',
		'/experiments/:experimentId/results',
		[...middlewares, hvtMiddleware.canManageExperiments, hvtMiddleware.experimentExists],
		controllers.write.hvt.createResult
	);

	setupApiRoute(
		router,
		'get',
		'/experiments/:experimentId/results',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer'), hvtMiddleware.experimentExists],
		controllers.write.hvt.getResultsByExperiment
	);

	// ==========================================
	// LEARNINGS
	// ==========================================

	setupApiRoute(
		router,
		'post',
		'/experiments/:experimentId/learnings',
		[...middlewares, hvtMiddleware.canManageExperiments, hvtMiddleware.experimentExists],
		controllers.write.hvt.createLearning
	);

	setupApiRoute(
		router,
		'get',
		'/learnings/:learningId',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer'), hvtMiddleware.learningExists],
		controllers.write.hvt.getLearning
	);

	setupApiRoute(
		router,
		'get',
		'/learnings',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer')],
		controllers.write.hvt.getLearningsByOrg
	);

	setupApiRoute(
		router,
		'get',
		'/modules/:moduleId/learnings',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer'), hvtMiddleware.moduleExists],
		controllers.write.hvt.getLearningsByModule
	);

	setupApiRoute(
		router,
		'get',
		'/learnings/:learningId/similar',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer'), hvtMiddleware.learningExists],
		controllers.write.hvt.getSimilarLearnings
	);

	setupApiRoute(
		router,
		'put',
		'/learnings/:learningId',
		[...middlewares, hvtMiddleware.canManageExperiments, hvtMiddleware.learningExists],
		controllers.write.hvt.updateLearning
	);

	setupApiRoute(
		router,
		'post',
		'/learnings/:learningId/archive',
		[...middlewares, hvtMiddleware.canManageExperiments, hvtMiddleware.learningExists],
		controllers.write.hvt.archiveLearning
	);

	setupApiRoute(
		router,
		'post',
		'/learnings/:learningId/unarchive',
		[...middlewares, hvtMiddleware.canManageExperiments, hvtMiddleware.learningExists],
		controllers.write.hvt.unarchiveLearning
	);

	setupApiRoute(
		router,
		'delete',
		'/learnings/:learningId',
		[...middlewares, hvtMiddleware.canManageExperiments, hvtMiddleware.learningExists],
		controllers.write.hvt.deleteLearning
	);

	// ==========================================
	// ESCALATIONS
	// ==========================================

	setupApiRoute(
		router,
		'post',
		'/experiments/:experimentId/escalations',
		[...middlewares, hvtMiddleware.canManageExperiments, hvtMiddleware.experimentExists],
		controllers.write.hvt.createEscalation
	);

	setupApiRoute(
		router,
		'get',
		'/escalations/:escalationId',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer'), hvtMiddleware.escalationExists],
		controllers.write.hvt.getEscalation
	);

	setupApiRoute(
		router,
		'get',
		'/experiments/:experimentId/escalations',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer'), hvtMiddleware.experimentExists],
		controllers.write.hvt.getEscalationsByExperiment
	);

	setupApiRoute(
		router,
		'put',
		'/escalations/:escalationId',
		[...middlewares, hvtMiddleware.canManageExperiments, hvtMiddleware.escalationExists],
		controllers.write.hvt.updateEscalation
	);

	setupApiRoute(
		router,
		'patch',
		'/escalations/:escalationId/status',
		[...middlewares, hvtMiddleware.canManageExperiments, hvtMiddleware.escalationExists],
		controllers.write.hvt.updateEscalationStatus
	);

	setupApiRoute(
		router,
		'post',
		'/escalations/:escalationId/resolve',
		[...middlewares, hvtMiddleware.canManageExperiments, hvtMiddleware.escalationExists],
		controllers.write.hvt.resolveEscalation
	);

	setupApiRoute(
		router,
		'delete',
		'/escalations/:escalationId',
		[...middlewares, hvtMiddleware.canManageExperiments, hvtMiddleware.escalationExists],
		controllers.write.hvt.deleteEscalation
	);

	// ==========================================
	// TICKETS
	// ==========================================

	setupApiRoute(
		router,
		'post',
		'/ideas/:ideaId/tickets',
		[...middlewares, hvtMiddleware.canManageIdeas, hvtMiddleware.ideaExists],
		controllers.write.hvt.createTicket
	);

	setupApiRoute(
		router,
		'get',
		'/ideas/:ideaId/tickets',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer'), hvtMiddleware.ideaExists],
		controllers.write.hvt.getTicketsByIdea
	);

	// ==========================================
	// UPDATES
	// ==========================================

	setupApiRoute(
		router,
		'post',
		'/experiments/:experimentId/updates',
		[...middlewares, hvtMiddleware.canManageExperiments, hvtMiddleware.experimentExists],
		controllers.write.hvt.createUpdate
	);

	setupApiRoute(
		router,
		'get',
		'/experiments/:experimentId/updates',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer'), hvtMiddleware.experimentExists],
		controllers.write.hvt.getUpdatesByExperiment
	);

	// ==========================================
	// ROLES
	// ==========================================

	setupApiRoute(
		router,
		'post',
		'/roles',
		[...middlewares, hvtMiddleware.canManageRoles],
		controllers.write.hvt.setRole
	);

	setupApiRoute(
		router,
		'get',
		'/roles/:uid',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer')],
		controllers.write.hvt.getRole
	);

	setupApiRoute(
		router,
		'get',
		'/roles',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer')],
		controllers.write.hvt.getRolesByOrg
	);

	setupApiRoute(
		router,
		'delete',
		'/roles/:uid',
		[...middlewares, hvtMiddleware.canManageRoles],
		controllers.write.hvt.removeRole
	);

	// ==========================================
	// METRICS
	// ==========================================

	setupApiRoute(
		router,
		'get',
		'/metrics',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer')],
		controllers.write.hvt.getMetricsByOrg
	);

	setupApiRoute(
		router,
		'get',
		'/metrics/module/:moduleId',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer'), hvtMiddleware.moduleExists],
		controllers.write.hvt.getMetricsByModule
	);

	setupApiRoute(
		router,
		'get',
		'/metrics/velocity',
		[...middlewares, hvtMiddleware.hasHVTRole('viewer')],
		controllers.write.hvt.getVelocity
	);

	return router;
};
