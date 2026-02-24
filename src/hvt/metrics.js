'use strict';

const db = require('../database');
const hvtCache = require('./cache');
const monitoring = require('./monitoring');

const Metrics = module.exports;

/**
 * Get HVT metrics for an organization with caching
 */
Metrics.getByOrg = async function (orgId) {
	if (!orgId) {
		throw new Error('[[error:org-id-required]]');
	}

	// Performance: Check cache first
	const cacheKey = hvtCache.getMetricsKey(orgId);
	const cached = hvtCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	return await monitoring.measureTime('orgMetrics', async () => {
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
			db.getHVTExperimentsByStatus('active', orgId, 0, -1),
			db.getHVTExperimentsByStatus('blocked', orgId, 0, -1),
			db.getHVTExperimentsByStatus('completed', orgId, 0, -1),
		]);

		const metrics = {
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

		// Performance: Cache for 5 minutes
		hvtCache.set(cacheKey, metrics, 1000 * 60 * 5);
		return metrics;
	});
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
		db.getHVTExperimentsByModule(moduleId, orgId), // Performance: Pass orgId for optimized query
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

/**
 * Get performance monitoring report
 */
Metrics.getPerformanceReport = function () {
	return monitoring.getPerformanceReport();
};
