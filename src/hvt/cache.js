'use strict';

/**
 * HVT Cache Layer
 * Provides LRU caching for frequently accessed HVT entities
 * Uses existing NodeBB cache infrastructure
 */

const cacheCreate = require('../cacheCreate');

// Create HVT-specific cache with 30-minute TTL
const hvtCache = cacheCreate({
	name: 'hvt',
	max: 5000, // Max 5000 entities cached
	ttl: 1000 * 60 * 30, // 30 minutes
	enabled: true,
});

const HVTCache = module.exports;

// ==================== KEY GENERATORS ====================

HVTCache.getModuleKey = (moduleId) => `hvt:module:${moduleId}`;
HVTCache.getProblemKey = (problemId) => `hvt:problem:${problemId}`;
HVTCache.getIdeaKey = (ideaId) => `hvt:idea:${ideaId}`;
HVTCache.getExperimentKey = (experimentId) => `hvt:experiment:${experimentId}`;
HVTCache.getLearningKey = (learningId) => `hvt:learning:${learningId}`;
HVTCache.getEscalationKey = (escalationId) => `hvt:escalation:${escalationId}`;
HVTCache.getMetricsKey = (orgId) => `hvt:metrics:org:${orgId}`;

// ==================== CACHE OPERATIONS ====================

HVTCache.get = function (key) {
	return hvtCache.get(key);
};

HVTCache.set = function (key, value, ttl) {
	return hvtCache.set(key, value, ttl);
};

HVTCache.del = function (keys) {
	return hvtCache.del(keys);
};

HVTCache.reset = function () {
	return hvtCache.reset();
};

// ==================== ENTITY-SPECIFIC INVALIDATION ====================

HVTCache.invalidateModule = function (moduleId) {
	hvtCache.del(HVTCache.getModuleKey(moduleId));
};

HVTCache.invalidateProblem = function (problemId) {
	hvtCache.del(HVTCache.getProblemKey(problemId));
};

HVTCache.invalidateIdea = function (ideaId) {
	hvtCache.del(HVTCache.getIdeaKey(ideaId));
};

HVTCache.invalidateExperiment = function (experimentId) {
	hvtCache.del(HVTCache.getExperimentKey(experimentId));
};

HVTCache.invalidateLearning = function (learningId) {
	hvtCache.del(HVTCache.getLearningKey(learningId));
};

HVTCache.invalidateEscalation = function (escalationId) {
	hvtCache.del(HVTCache.getEscalationKey(escalationId));
};

HVTCache.invalidateOrgMetrics = function (orgId) {
	hvtCache.del(HVTCache.getMetricsKey(orgId));
};

// ==================== BULK INVALIDATION ====================

HVTCache.invalidateOrgData = function (orgId) {
	// Invalidate all org-related metrics when org data changes
	HVTCache.invalidateOrgMetrics(orgId);
};

// ==================== CACHE STATS ====================

HVTCache.getStats = function () {
	return {
		name: hvtCache.name,
		hits: hvtCache.hits,
		misses: hvtCache.misses,
		size: hvtCache.size,
		max: hvtCache.max,
		hitRate: hvtCache.hits + hvtCache.misses > 0
			? (hvtCache.hits / (hvtCache.hits + hvtCache.misses) * 100).toFixed(2) + '%'
			: '0%',
	};
};

