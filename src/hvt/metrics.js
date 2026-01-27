'use strict';

const db = require('../database');

const Metrics = module.exports;

/**
 * Get HVT metrics for an organization
 */
Metrics.getByOrg = async function (orgId) {
	if (!orgId) {
		throw new Error('[[error:org-id-required]]');
	}

	const [
		problemCount,
		ideaCount,
		experimentCount,
		learningCount,
		activeExperiments,
		blockedExperiments,
		completedExperiments,
	] = await Promise.all([
		db.countHVTProblems(orgId),
		db.countHVTIdeas(orgId),
		db.countHVTExperiments(orgId),
		db.countHVTLearnings(orgId),
		db.getHVTExperimentsByStatus(orgId, 'active'),
		db.getHVTExperimentsByStatus(orgId, 'blocked'),
		db.getHVTExperimentsByStatus(orgId, 'completed'),
	]);

	return {
		orgId,
		totalProblems: problemCount,
		totalIdeas: ideaCount,
		totalExperiments: experimentCount,
		totalLearnings: learningCount,
		activeExperiments: activeExperiments.length,
		blockedExperiments: blockedExperiments.length,
		completedExperiments: completedExperiments.length,
		generatedAt: Date.now(),
	};
};

/**
 * Get HVT metrics for a specific module
 */
Metrics.getByModule = async function (moduleId, orgId) {
	if (!moduleId) {
		throw new Error('[[error:module-id-required]]');
	}

	if (!orgId) {
		throw new Error('[[error:org-id-required]]');
	}

	const [problems, experiments, learnings] = await Promise.all([
		db.getHVTProblemsByModule(moduleId),
		db.getHVTExperimentsByModule(moduleId),
		db.getHVTLearningsByModule(moduleId),
	]);

	// Filter by organization
	const orgProblems = problems.filter(p => p.orgId === orgId);
	const orgExperiments = experiments.filter(e => e.orgId === orgId);
	const orgLearnings = learnings.filter(l => l.orgId === orgId);

	// Calculate idea count from problems
	const totalIdeas = orgProblems.reduce((sum, p) => sum + (p.ideaCount || 0), 0);

	return {
		moduleId,
		orgId,
		totalProblems: orgProblems.length,
		totalIdeas,
		totalExperiments: orgExperiments.length,
		totalLearnings: orgLearnings.length,
		activeExperiments: orgExperiments.filter(e => e.status === 'active').length,
		completedExperiments: orgExperiments.filter(e => e.status === 'completed').length,
		generatedAt: Date.now(),
	};
};

/**
 * Get experiment velocity metrics
 */
Metrics.getVelocity = async function (orgId, days = 30) {
	if (!orgId) {
		throw new Error('[[error:org-id-required]]');
	}

	const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);

	const experiments = await db.getHVTExperimentsByOrg(orgId);

	// Filter experiments created in the time window
	const recentExperiments = experiments.filter(e => e.createdAt >= cutoffTime);

	// Calculate completion rate
	const completedCount = recentExperiments.filter(e => e.status === 'completed').length;
	const completionRate = recentExperiments.length > 0
		? (completedCount / recentExperiments.length) * 100
		: 0;

	// Calculate average cycle time for completed experiments
	const completedWithDuration = recentExperiments
		.filter(e => e.status === 'completed' && e.completedAt && e.createdAt)
		.map(e => e.completedAt - e.createdAt);

	const avgCycleTime = completedWithDuration.length > 0
		? completedWithDuration.reduce((sum, time) => sum + time, 0) / completedWithDuration.length
		: 0;

	return {
		orgId,
		periodDays: days,
		experimentsStarted: recentExperiments.length,
		experimentsCompleted: completedCount,
		completionRate: Math.round(completionRate * 100) / 100, // Round to 2 decimals
		avgCycleTimeMs: Math.round(avgCycleTime),
		generatedAt: Date.now(),
	};
};
