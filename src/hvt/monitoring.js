'use strict';

/**
 * HVT Performance Monitoring
 * Provides query performance tracking and metrics
 */

const hvtCache = require('./cache');

const Monitoring = module.exports;

// Track query performance
const queryMetrics = {
	problemsGet: { count: 0, totalTime: 0 },
	ideasGet: { count: 0, totalTime: 0 },
	experimentsGet: { count: 0, totalTime: 0 },
	learningsGet: { count: 0, totalTime: 0 },
	escalationsGet: { count: 0, totalTime: 0 },
	orgMetrics: { count: 0, totalTime: 0 },
};

/**
 * Measure execution time of a function
 */
Monitoring.measureTime = async function (key, fn) {
	const start = Date.now();
	try {
		const result = await fn();
		const duration = Date.now() - start;
		
		if (queryMetrics[key]) {
			queryMetrics[key].count++;
			queryMetrics[key].totalTime += duration;
		}
		
		return result;
	} catch (error) {
		const duration = Date.now() - start;
		if (queryMetrics[key]) {
			queryMetrics[key].count++;
			queryMetrics[key].totalTime += duration;
		}
		throw error;
	}
};

/**
 * Get performance metrics
 */
Monitoring.getMetrics = function () {
	const metrics = {};
	
	Object.keys(queryMetrics).forEach((key) => {
		const data = queryMetrics[key];
		metrics[key] = {
			count: data.count,
			totalTime: data.totalTime,
			avgTime: data.count > 0 ? (data.totalTime / data.count).toFixed(2) + 'ms' : '0ms',
		};
	});
	
	return metrics;
};

/**
 * Get cache statistics
 */
Monitoring.getCacheStats = function () {
	return hvtCache.getStats();
};

/**
 * Get combined performance report
 */
Monitoring.getPerformanceReport = function () {
	return {
		cache: Monitoring.getCacheStats(),
		queries: Monitoring.getMetrics(),
		timestamp: new Date().toISOString(),
	};
};

/**
 * Reset all metrics (useful for testing)
 */
Monitoring.reset = function () {
	Object.keys(queryMetrics).forEach((key) => {
		queryMetrics[key].count = 0;
		queryMetrics[key].totalTime = 0;
	});
};

