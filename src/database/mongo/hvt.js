'use strict';

const { collections } = require('./collections');
const hvtCache = require('../../hvt/cache');

module.exports = function (module) {
	const helpers = require('./helpers');

	// Collection option for HVT
	const hvtCollection = { collection: collections.HVT };

	// ==================== MODULES ====================

	module.createHVTModule = async function (data) {
		const moduleId = await module.incrObjectField('global', 'nextHVTModuleId');
		const timestamp = Date.now();

		const moduleData = {
			_key: `hvt:module:${moduleId}`,
			id: String(moduleId),
			name: data.name,
			description: data.description || null,
			color: data.color || '#6366F1',
			orgId: data.orgId,
			createdAt: new Date(timestamp).toISOString(),
			updatedAt: new Date(timestamp).toISOString(),
		};

		await module.setObject(`hvt:module:${moduleId}`, moduleData, hvtCollection);
		await module.sortedSetAdd('hvt:modules:sorted', timestamp, moduleId);
		// Fix: Add org-scoped index for multi-tenant isolation
		if (data.orgId) {
			await module.sortedSetAdd(`hvt:modules:org:${data.orgId}:sorted`, timestamp, moduleId);
		}

		return moduleData;
	};

	module.getHVTModule = async function (moduleId) {
		return await module.getObject(`hvt:module:${moduleId}`, [], hvtCollection);
	};

	module.getHVTModules = async function (moduleIds) {
		if (!Array.isArray(moduleIds) || !moduleIds.length) {
			return [];
		}
		return await module.getObjects(
			moduleIds.map(id => `hvt:module:${id}`),
			[],
			hvtCollection
		);
	};

	module.getAllHVTModules = async function () {
		const moduleIds = await module.getSortedSetRange('hvt:modules:sorted', 0, -1);
		if (!moduleIds || !moduleIds.length) {
			return [];
		}
		return await module.getHVTModules(moduleIds);
	};

	// Fix: Add org-scoped module retrieval for multi-tenant isolation
	module.getAllHVTModulesByOrg = async function (orgId) {
		if (!orgId) {
			return [];
		}
		const moduleIds = await module.getSortedSetRange(`hvt:modules:org:${orgId}:sorted`, 0, -1);
		if (!moduleIds || !moduleIds.length) {
			return [];
		}
		return await module.getHVTModules(moduleIds);
	};

	module.updateHVTModule = async function (moduleId, data) {
		const updateData = {
			...data,
			updatedAt: new Date().toISOString(),
		};
		await module.setObject(`hvt:module:${moduleId}`, updateData, hvtCollection);
		return await module.getHVTModule(moduleId);
	};

	module.deleteHVTModule = async function (moduleId) {
		const moduleData = await module.getHVTModule(moduleId);
		await module.delete(`hvt:module:${moduleId}`, hvtCollection);
		await module.sortedSetRemove('hvt:modules:sorted', moduleId);
		// Fix: Clean up org-scoped index
		if (moduleData && moduleData.orgId) {
			await module.sortedSetRemove(`hvt:modules:org:${moduleData.orgId}:sorted`, moduleId);
		}
	};

	// ==================== PROBLEMS ====================

	module.createHVTProblem = async function (data) {
		const problemId = await module.incrObjectField('global', 'nextHVTProblemId');
		const timestamp = Date.now();

		const problemData = {
			_key: `hvt:problem:${problemId}`,
			id: String(problemId),
			moduleId: data.moduleId,
			createdBy: data.createdBy,
			title: data.title,
			description: data.description || null,
			severity: data.severity,
			status: data.status || 'open',
			problemType: data.problemType || null,
			affectedSurfaces: data.affectedSurfaces || null,
			ideaCount: 0,
			createdAt: new Date(timestamp).toISOString(),
			updatedAt: new Date(timestamp).toISOString(),
			orgId: data.orgId,
		};

		await module.setObject(`hvt:problem:${problemId}`, problemData, hvtCollection);
		await module.sortedSetAdd(`hvt:problems:org:${data.orgId}:sorted`, timestamp, problemId);
		await module.setAdd(`hvt:problems:module:${data.moduleId}`, problemId);
		await module.setAdd(`hvt:problems:status:${problemData.status}`, problemId);

		return problemData;
	};

	module.getHVTProblem = async function (problemId) {
		// Performance: Check cache first
		const cacheKey = hvtCache.getProblemKey(problemId);
		const cached = hvtCache.get(cacheKey);
		if (cached) {
			return cached;
		}

		const problem = await module.getObject(`hvt:problem:${problemId}`, [], hvtCollection);
		if (problem) {
			hvtCache.set(cacheKey, problem);
		}
		return problem;
	};

	module.getHVTProblems = async function (problemIds) {
		if (!Array.isArray(problemIds) || !problemIds.length) {
			return [];
		}
		return await module.getObjects(
			problemIds.map(id => `hvt:problem:${id}`),
			[],
			hvtCollection
		);
	};

	module.getHVTProblemsByOrg = async function (orgId, start, stop) {
		const problemIds = await module.getSortedSetRevRange(`hvt:problems:org:${orgId}:sorted`, start, stop);
		return await module.getHVTProblems(problemIds);
	};

	module.getHVTProblemsByModule = async function (moduleId) {
		const problemIds = await module.getSetMembers(`hvt:problems:module:${moduleId}`);
		return await module.getHVTProblems(problemIds);
	};

	module.updateHVTProblem = async function (problemId, data) {
		const current = await module.getHVTProblem(problemId);
		const updateData = {
			...data,
			updatedAt: new Date().toISOString(),
		};

		// Update status set if status changed
		if (data.status && data.status !== current.status) {
			await module.setRemove(`hvt:problems:status:${current.status}`, problemId);
			await module.setAdd(`hvt:problems:status:${data.status}`, problemId);
		}

		await module.setObject(`hvt:problem:${problemId}`, updateData, hvtCollection);
		// Performance: Invalidate cache
		hvtCache.invalidateProblem(problemId);
		return await module.getHVTProblem(problemId);
	};

	module.deleteHVTProblem = async function (problemId) {
		const problem = await module.getHVTProblem(problemId);
		if (problem) {
			await module.sortedSetRemove(`hvt:problems:org:${problem.orgId}:sorted`, problemId);
			await module.setRemove(`hvt:problems:module:${problem.moduleId}`, problemId);
			await module.setRemove(`hvt:problems:status:${problem.status}`, problemId);
			// Performance: Invalidate cache
			hvtCache.invalidateProblem(problemId);
		}
		await module.delete(`hvt:problem:${problemId}`, hvtCollection);
	};

	module.incrementHVTProblemIdeaCount = async function (problemId, delta) {
		await module.incrObjectFieldBy(`hvt:problem:${problemId}`, 'ideaCount', delta, hvtCollection);
	};

	module.getHVTProblemCount = async function (orgId) {
		return await module.sortedSetCard(`hvt:problems:org:${orgId}:sorted`);
	};

	// ==================== IDEAS ====================

	module.createHVTIdea = async function (data) {
		const ideaId = await module.incrObjectField('global', 'nextHVTIdeaId');
		const timestamp = Date.now();

		const ideaData = {
			_key: `hvt:idea:${ideaId}`,
			id: String(ideaId),
			problemId: data.problemId,
			seededBy: data.seededBy,
			title: data.title,
			description: data.description || null,
			hypothesis: data.hypothesis || null,
			status: data.status || 'draft',
			impactScore: data.impactScore || null,
			confidenceScore: data.confidenceScore || null,
			easeScore: data.easeScore || null,
			totalScore: data.totalScore || null,
			approvedBy: data.approvedBy || null,
			createdAt: new Date(timestamp).toISOString(),
			updatedAt: new Date(timestamp).toISOString(),
			orgId: data.orgId,
		};

		await module.setObject(`hvt:idea:${ideaId}`, ideaData, hvtCollection);
		await module.sortedSetAdd(`hvt:ideas:problem:${data.problemId}`, timestamp, ideaId);
		await module.setAdd(`hvt:ideas:status:${ideaData.status}`, ideaId);
		// Performance: Add org-scoped idea counter
		await module.incrObjectField(`hvt:metrics:org:${data.orgId}`, 'ideaCount', hvtCollection);
		// Performance: Invalidate org metrics cache
		hvtCache.invalidateOrgMetrics(data.orgId);

		return ideaData;
	};

	module.getHVTIdea = async function (ideaId) {
		// Performance: Check cache first
		const cacheKey = hvtCache.getIdeaKey(ideaId);
		const cached = hvtCache.get(cacheKey);
		if (cached) {
			return cached;
		}

		const idea = await module.getObject(`hvt:idea:${ideaId}`, [], hvtCollection);
		if (idea) {
			hvtCache.set(cacheKey, idea);
		}
		return idea;
	};

	module.getHVTIdeas = async function (ideaIds) {
		if (!Array.isArray(ideaIds) || !ideaIds.length) {
			return [];
		}
		return await module.getObjects(
			ideaIds.map(id => `hvt:idea:${id}`),
			[],
			hvtCollection
		);
	};

	module.getHVTIdeasByProblem = async function (problemId, start, stop) {
		const ideaIds = await module.getSortedSetRevRange(`hvt:ideas:problem:${problemId}`, start, stop);
		return await module.getHVTIdeas(ideaIds);
	};

	module.updateHVTIdea = async function (ideaId, data) {
		const current = await module.getHVTIdea(ideaId);
		const updateData = {
			...data,
			updatedAt: new Date().toISOString(),
		};

		// Update status set if status changed
		if (data.status && data.status !== current.status) {
			await module.setRemove(`hvt:ideas:status:${current.status}`, ideaId);
			await module.setAdd(`hvt:ideas:status:${data.status}`, ideaId);
		}

		await module.setObject(`hvt:idea:${ideaId}`, updateData, hvtCollection);
		// Performance: Invalidate cache
		hvtCache.invalidateIdea(ideaId);
		return await module.getHVTIdea(ideaId);
	};

	module.getHVTIdeaCount = async function (orgId, problemId) {
		return await module.sortedSetCard(`hvt:ideas:problem:${problemId}`);
	};

	module.deleteHVTIdea = async function (ideaId) {
		const idea = await module.getHVTIdea(ideaId);
		if (idea) {
			await module.sortedSetRemove(`hvt:ideas:problem:${idea.problemId}`, ideaId);
			await module.setRemove(`hvt:ideas:status:${idea.status}`, ideaId);
			// Performance: Decrement org idea counter
			if (idea.orgId) {
				await module.incrObjectField(`hvt:metrics:org:${idea.orgId}`, 'ideaCount', -1, hvtCollection);
				// Performance: Invalidate org metrics cache
				hvtCache.invalidateOrgMetrics(idea.orgId);
			}
			// Performance: Invalidate cache
			hvtCache.invalidateIdea(ideaId);
		}
		await module.delete(`hvt:idea:${ideaId}`, hvtCollection);
	};

	// ==================== EXPERIMENTS ====================

	module.getNextHVTExperimentNumber = async function (orgId) {
		return await module.incrObjectField(`hvt:org:${orgId}`, 'nextExperimentNumber');
	};

	module.createHVTExperiment = async function (data) {
		const experimentId = await module.incrObjectField('global', 'nextHVTExperimentId');
		const timestamp = Date.now();

		const experimentData = {
			_key: `hvt:experiment:${experimentId}`,
			id: String(experimentId),
			ideaId: data.ideaId,
			problemId: data.problemId,
			moduleId: data.moduleId,
			designedBy: data.designedBy,
			verifiedBy: data.verifiedBy || null,
			assignedTo: data.assignedTo || null,
			title: data.title,
			ifStatement: data.ifStatement || null,
			thenStatement: data.thenStatement || null,
			kpis: data.kpis || null,
			executionNotes: data.executionNotes || null,
			status: data.status || 'seeded',
			haltedBy: data.haltedBy || null,
			haltReason: data.haltReason || null,
			experimentNumber: data.experimentNumber,
			createdAt: new Date(timestamp).toISOString(),
			updatedAt: new Date(timestamp).toISOString(),
			orgId: data.orgId,
		};

		await module.setObject(`hvt:experiment:${experimentId}`, experimentData, hvtCollection);
		await module.sortedSetAdd(`hvt:experiments:org:${data.orgId}:sorted`, timestamp, experimentId);
		await module.sortedSetAdd('hvt:experiments:all', timestamp, experimentId);
		await module.setAdd(`hvt:experiments:idea:${data.ideaId}`, experimentId);
		await module.setAdd(`hvt:experiments:status:${experimentData.status}`, experimentId);
		// Performance: Add org-scoped status index
		await module.sortedSetAdd(`hvt:experiments:org:${data.orgId}:status:${experimentData.status}`, timestamp, experimentId);
		// Performance: Add org-scoped module index
		if (data.moduleId) {
			await module.sortedSetAdd(`hvt:experiments:org:${data.orgId}:module:${data.moduleId}`, timestamp, experimentId);
		}

		return experimentData;
	};

	module.getHVTExperiment = async function (experimentId) {
		// Performance: Check cache first
		const cacheKey = hvtCache.getExperimentKey(experimentId);
		const cached = hvtCache.get(cacheKey);
		if (cached) {
			return cached;
		}

		const experiment = await module.getObject(`hvt:experiment:${experimentId}`, [], hvtCollection);
		if (experiment) {
			hvtCache.set(cacheKey, experiment);
		}
		return experiment;
	};

	module.getHVTExperiments = async function (experimentIds) {
		if (!Array.isArray(experimentIds) || !experimentIds.length) {
			return [];
		}
		return await module.getObjects(
			experimentIds.map(id => `hvt:experiment:${id}`),
			[],
			hvtCollection
		);
	};

	module.getHVTExperimentsByOrg = async function (orgId, start, stop) {
		const experimentIds = await module.getSortedSetRevRange(`hvt:experiments:org:${orgId}:sorted`, start, stop);
		return await module.getHVTExperiments(experimentIds);
	};

	module.getHVTExperimentsByStatus = async function (status, orgId, start, stop) {
		// Performance: Use org-scoped status index for efficient querying
		const experimentIds = await module.getSortedSetRevRange(`hvt:experiments:org:${orgId}:status:${status}`, start || 0, stop || -1);
		return await module.getHVTExperiments(experimentIds);
	};

	module.updateHVTExperiment = async function (experimentId, data) {
		const current = await module.getHVTExperiment(experimentId);
		const updateData = {
			...data,
			updatedAt: new Date().toISOString(),
		};

		// Update status set if status changed
		if (data.status && data.status !== current.status) {
			await module.setRemove(`hvt:experiments:status:${current.status}`, experimentId);
			await module.setAdd(`hvt:experiments:status:${data.status}`, experimentId);
			// Performance: Update org-scoped status index
			if (current.orgId) {
				await module.sortedSetRemove(`hvt:experiments:org:${current.orgId}:status:${current.status}`, experimentId);
				const timestamp = Date.now();
				await module.sortedSetAdd(`hvt:experiments:org:${current.orgId}:status:${data.status}`, timestamp, experimentId);
			}
		}

		await module.setObject(`hvt:experiment:${experimentId}`, updateData, hvtCollection);
		// Performance: Invalidate cache
		hvtCache.invalidateExperiment(experimentId);
		return await module.getHVTExperiment(experimentId);
	};

	module.getHVTExperimentCount = async function (orgId, status) {
		if (status) {
			// Performance: Use org-scoped status index for efficient count
			return await module.sortedSetCard(`hvt:experiments:org:${orgId}:status:${status}`);
		}
		return await module.sortedSetCard(`hvt:experiments:org:${orgId}:sorted`);
	};

	module.getHVTExperimentsByModule = async function (moduleId, orgId) {
		if (orgId) {
			// Performance: Use org-scoped module index for efficient querying
			const experimentIds = await module.getSortedSetRevRange(`hvt:experiments:org:${orgId}:module:${moduleId}`, 0, -1);
			return await module.getHVTExperiments(experimentIds);
		}
		// Fallback: Load from global set (for backward compatibility)
		const allExperimentIds = await module.getSortedSetRange('hvt:experiments:all', 0, -1);
		const experiments = await module.getHVTExperiments(allExperimentIds);
		return experiments.filter(exp => exp && exp.moduleId === moduleId);
	};

	// ==================== RESULTS ====================

	module.createHVTResult = async function (data) {
		const resultId = await module.incrObjectField('global', 'nextHVTResultId');
		const timestamp = Date.now();

		const resultData = {
			_key: `hvt:result:${resultId}`,
			id: String(resultId),
			experimentId: data.experimentId,
			loggedBy: data.loggedBy,
			description: data.description,
			outcome: data.outcome || null,
			metrics: data.metrics || null,
			createdAt: new Date(timestamp).toISOString(),
		};

		await module.setObject(`hvt:result:${resultId}`, resultData, hvtCollection);
		await module.sortedSetAdd(`hvt:results:experiment:${data.experimentId}`, timestamp, resultId);
		// Performance: Increment result counter in experiment metadata
		await module.incrObjectField(`hvt:experiment:${data.experimentId}`, 'resultCount', hvtCollection);

		return resultData;
	};

	module.getHVTResult = async function (resultId) {
		return await module.getObject(`hvt:result:${resultId}`, [], hvtCollection);
	};

	module.getHVTResults = async function (resultIds) {
		if (!Array.isArray(resultIds) || !resultIds.length) {
			return [];
		}
		return await module.getObjects(
			resultIds.map(id => `hvt:result:${id}`),
			[],
			hvtCollection
		);
	};

	module.getHVTResultsByExperiment = async function (experimentId) {
		const resultIds = await module.getSortedSetRange(`hvt:results:experiment:${experimentId}`, 0, -1);
		return await module.getHVTResults(resultIds);
	};

	// ==================== LEARNINGS ====================

	module.createHVTLearning = async function (data) {
		const learningId = await module.incrObjectField('global', 'nextHVTLearningId');
		const timestamp = Date.now();

		const learningData = {
			_key: `hvt:learning:${learningId}`,
			id: String(learningId),
			experimentId: data.experimentId,
			createdBy: data.createdBy,
			title: data.title,
			description: data.description,
			caveat: data.caveat || null,
			outcomeType: data.outcomeType || null,
			tags: data.tags || null,
			moduleId: data.moduleId || null,
			persona: data.persona || null,
			isHashed: data.isHashed !== undefined ? data.isHashed : false,
			createdAt: new Date(timestamp).toISOString(),
			updatedAt: new Date(timestamp).toISOString(),
			orgId: data.orgId,
		};

		await module.setObject(`hvt:learning:${learningId}`, learningData, hvtCollection);
		await module.sortedSetAdd(`hvt:learnings:org:${data.orgId}:sorted`, timestamp, learningId);
		if (data.moduleId) {
			// Performance: Use sorted set for pagination support
			await module.sortedSetAdd(`hvt:learnings:module:${data.moduleId}:sorted`, timestamp, learningId);
		}
		// Performance: Add tag indexes for learning search
		if (data.tags && Array.isArray(data.tags)) {
			for (const tag of data.tags) {
				if (tag && data.orgId) {
					await module.sortedSetAdd(`hvt:learnings:tag:${tag}:org:${data.orgId}`, timestamp, learningId);
				}
			}
		}

		return learningData;
	};

	module.getHVTLearning = async function (learningId) {
		// Performance: Check cache first
		const cacheKey = hvtCache.getLearningKey(learningId);
		const cached = hvtCache.get(cacheKey);
		if (cached) {
			return cached;
		}

		const learning = await module.getObject(`hvt:learning:${learningId}`, [], hvtCollection);
		if (learning) {
			hvtCache.set(cacheKey, learning);
		}
		return learning;
	};

	module.getHVTLearnings = async function (learningIds) {
		if (!Array.isArray(learningIds) || !learningIds.length) {
			return [];
		}
		return await module.getObjects(
			learningIds.map(id => `hvt:learning:${id}`),
			[],
			hvtCollection
		);
	};

	module.getHVTLearningsByOrg = async function (orgId, start = 0, stop = -1) {
		const learningIds = await module.getSortedSetRevRange(`hvt:learnings:org:${orgId}:sorted`, start, stop);
		return await module.getHVTLearnings(learningIds);
	};

	module.getHVTLearningsByModule = async function (moduleId, start = 0, stop = -1) {
		// Performance: Use sorted set for efficient pagination
		const learningIds = await module.getSortedSetRevRange(`hvt:learnings:module:${moduleId}:sorted`, start, stop);
		return await module.getHVTLearnings(learningIds);
	};

	module.updateHVTLearning = async function (learningId, data) {
		const updateData = {
			...data,
			updatedAt: new Date().toISOString(),
		};
		await module.setObject(`hvt:learning:${learningId}`, updateData, hvtCollection);
		// Performance: Invalidate cache
		hvtCache.invalidateLearning(learningId);
		return await module.getHVTLearning(learningId);
	};

	module.getHVTLearningCount = async function (orgId) {
		return await module.sortedSetCard(`hvt:learnings:org:${orgId}:sorted`);
	};

	// Performance: Tag-based learning search
	module.getHVTLearningsByTag = async function (tag, orgId, start = 0, stop = -1) {
		if (!tag || !orgId) {
			return [];
		}
		const learningIds = await module.getSortedSetRevRange(`hvt:learnings:tag:${tag}:org:${orgId}`, start, stop);
		return await module.getHVTLearnings(learningIds);
	};

	module.deleteHVTLearning = async function (learningId) {
		const learning = await module.getHVTLearning(learningId);
		if (!learning) {
			return false;
		}

		await module.deleteObject(`hvt:learning:${learningId}`, hvtCollection);

		if (learning.orgId) {
			await module.sortedSetRemove(`hvt:learnings:org:${learning.orgId}:sorted`, learningId);
		}

		if (learning.moduleId) {
			// Performance: Clean up sorted set index
			await module.sortedSetRemove(`hvt:learnings:module:${learning.moduleId}:sorted`, learningId);
		}

		// Performance: Clean up tag indexes
		if (learning.tags && Array.isArray(learning.tags) && learning.orgId) {
			for (const tag of learning.tags) {
				if (tag) {
					await module.sortedSetRemove(`hvt:learnings:tag:${tag}:org:${learning.orgId}`, learningId);
				}
			}
		}

		// Performance: Invalidate cache
		hvtCache.invalidateLearning(learningId);

		return true;
	};

	// ==================== ESCALATIONS ====================

	module.createHVTEscalation = async function (data) {
		const escalationId = await module.incrObjectField('global', 'nextHVTEscalationId');
		const timestamp = Date.now();

		const escalationData = {
			_key: `hvt:escalation:${escalationId}`,
			id: String(escalationId),
			experimentId: data.experimentId,
			raisedBy: data.raisedBy,
			resolvedBy: data.resolvedBy || null,
			reason: data.reason,
			severity: data.severity,
			status: data.status || 'open',
			assignedTo: data.assignedTo || null,
			createdAt: new Date(timestamp).toISOString(),
			resolvedAt: data.resolvedAt || null,
			orgId: data.orgId,
		};

		await module.setObject(`hvt:escalation:${escalationId}`, escalationData, hvtCollection);
		await module.sortedSetAdd(`hvt:escalations:experiment:${data.experimentId}`, timestamp, escalationId);
		// Performance: Add org-scoped status index for escalations
		if (data.orgId) {
			await module.sortedSetAdd(`hvt:escalations:org:${data.orgId}:status:${escalationData.status}`, timestamp, escalationId);
		}

		return escalationData;
	};

	module.getHVTEscalation = async function (escalationId) {
		// Performance: Check cache first
		const cacheKey = hvtCache.getEscalationKey(escalationId);
		const cached = hvtCache.get(cacheKey);
		if (cached) {
			return cached;
		}

		const escalation = await module.getObject(`hvt:escalation:${escalationId}`, [], hvtCollection);
		if (escalation) {
			hvtCache.set(cacheKey, escalation);
		}
		return escalation;
	};

	module.getHVTEscalations = async function (escalationIds) {
		if (!Array.isArray(escalationIds) || !escalationIds.length) {
			return [];
		}
		return await module.getObjects(
			escalationIds.map(id => `hvt:escalation:${id}`),
			[],
			hvtCollection
		);
	};

	module.getHVTEscalationsByExperiment = async function (experimentId) {
		const escalationIds = await module.getSortedSetRange(`hvt:escalations:experiment:${experimentId}`, 0, -1);
		return await module.getHVTEscalations(escalationIds);
	};

	module.updateHVTEscalation = async function (escalationId, data) {
		const current = await module.getHVTEscalation(escalationId);
		const updateData = { ...data };
		if (data.status === 'resolved' && !data.resolvedAt) {
			updateData.resolvedAt = new Date().toISOString();
		}

		// Performance: Update org-scoped status index if status changed
		if (data.status && current && data.status !== current.status && current.orgId) {
			await module.sortedSetRemove(`hvt:escalations:org:${current.orgId}:status:${current.status}`, escalationId);
			const timestamp = Date.now();
			await module.sortedSetAdd(`hvt:escalations:org:${current.orgId}:status:${data.status}`, timestamp, escalationId);
		}

		await module.setObject(`hvt:escalation:${escalationId}`, updateData, hvtCollection);
		// Performance: Invalidate cache
		hvtCache.invalidateEscalation(escalationId);
		return await module.getHVTEscalation(escalationId);
	};

	module.deleteHVTEscalation = async function (escalationId) {
		const escalation = await module.getHVTEscalation(escalationId);
		if (!escalation) {
			return false;
		}

		if (escalation.experimentId) {
			await module.sortedSetRemove(
				`hvt:escalations:experiment:${escalation.experimentId}`,
				escalationId
			);
		}

		// Performance: Clean up org-scoped status index
		if (escalation.orgId && escalation.status) {
			await module.sortedSetRemove(
				`hvt:escalations:org:${escalation.orgId}:status:${escalation.status}`,
				escalationId
			);
		}

		await module.deleteObject(`hvt:escalation:${escalationId}`, hvtCollection);
		// Performance: Invalidate cache
		hvtCache.invalidateEscalation(escalationId);
		return true;
	};

	// ==================== TICKETS ====================

	module.createHVTTicket = async function (data) {
		const ticketId = await module.incrObjectField('global', 'nextHVTTicketId');
		const timestamp = Date.now();

		const ticketData = {
			_key: `hvt:ticket:${ticketId}`,
			id: String(ticketId),
			// Fix: Use ideaId instead of experimentId to match domain logic
			ideaId: data.ideaId,
			createdBy: data.createdBy,
			externalTicketId: data.externalTicketId,
			ticketSystem: data.ticketSystem,
			ticketUrl: data.ticketUrl || null,
			status: data.status || 'open',
			createdAt: new Date(timestamp).toISOString(),
			resolvedAt: data.resolvedAt || null,
			orgId: data.orgId,
		};

		await module.setObject(`hvt:ticket:${ticketId}`, ticketData, hvtCollection);
		// Fix: Index by ideaId instead of experimentId
		await module.sortedSetAdd(`hvt:tickets:idea:${data.ideaId}`, timestamp, ticketId);

		return ticketData;
	};

	module.getHVTTicket = async function (ticketId) {
		return await module.getObject(`hvt:ticket:${ticketId}`, [], hvtCollection);
	};

	module.getHVTTickets = async function (ticketIds) {
		if (!Array.isArray(ticketIds) || !ticketIds.length) {
			return [];
		}
		return await module.getObjects(
			ticketIds.map(id => `hvt:ticket:${id}`),
			[],
			hvtCollection
		);
	};

	// Fix: Renamed to match domain logic - tickets belong to ideas
	module.getHVTTicketsByIdea = async function (ideaId) {
		const ticketIds = await module.getSortedSetRange(`hvt:tickets:idea:${ideaId}`, 0, -1);
		return await module.getHVTTickets(ticketIds);
	};

	module.deleteHVTTicket = async function (ticketId) {
		const ticket = await module.getHVTTicket(ticketId);
		if (!ticket) {
			return false;
		}

		// Fix: Clean up ideaId index instead of experimentId
		if (ticket.ideaId) {
			await module.sortedSetRemove(
				`hvt:tickets:idea:${ticket.ideaId}`,
				ticketId
			);
		}

		await module.deleteObject(`hvt:ticket:${ticketId}`, hvtCollection);
		return true;
	};

	// ==================== EXPERIMENT UPDATES ====================

	module.createHVTUpdate = async function (data) {
		const updateId = await module.incrObjectField('global', 'nextHVTUpdateId');
		const timestamp = Date.now();

		const updateData = {
			_key: `hvt:update:${updateId}`,
			id: String(updateId),
			experimentId: data.experimentId,
			postedBy: data.postedBy,
			updateType: data.updateType || null,
			content: data.content,
			createdAt: new Date(timestamp).toISOString(),
		};

		await module.setObject(`hvt:update:${updateId}`, updateData, hvtCollection);
		await module.sortedSetAdd(`hvt:updates:experiment:${data.experimentId}`, timestamp, updateId);

		return updateData;
	};

	module.getHVTUpdate = async function (updateId) {
		return await module.getObject(`hvt:update:${updateId}`, [], hvtCollection);
	};

	module.getHVTUpdates = async function (updateIds) {
		if (!Array.isArray(updateIds) || !updateIds.length) {
			return [];
		}
		return await module.getObjects(
			updateIds.map(id => `hvt:update:${id}`),
			[],
			hvtCollection
		);
	};

	module.getHVTUpdatesByExperiment = async function (experimentId) {
		const updateIds = await module.getSortedSetRange(`hvt:updates:experiment:${experimentId}`, 0, -1);
		return await module.getHVTUpdates(updateIds);
	};

	// ==================== USER ROLES ====================

	module.setHVTUserRole = async function (uid, orgId, role) {
		const roleKey = `hvt:role:${orgId}:${uid}`;
		const timestamp = Date.now();

		const roleData = {
			_key: roleKey,
			id: `${orgId}-${uid}`,
			userId: uid,
			orgId: orgId,
			role: role,
			createdAt: new Date(timestamp).toISOString(),
		};

		await module.setObject(roleKey, roleData, hvtCollection);
		await module.setAdd(`hvt:roles:org:${orgId}`, uid);
		await module.setAdd(`hvt:roles:user:${uid}`, orgId);

		return roleData;
	};

	module.getHVTUserRole = async function (uid, orgId) {
		const roleData = await module.getObject(`hvt:role:${orgId}:${uid}`, [], hvtCollection);
		return roleData ? roleData.role : null;
	};

	module.deleteHVTUserRole = async function (uid, orgId) {
		await module.delete(`hvt:role:${orgId}:${uid}`, hvtCollection);
		await module.setRemove(`hvt:roles:org:${orgId}`, uid);
		await module.setRemove(`hvt:roles:user:${uid}`, orgId);
	};

	module.getHVTRolesByOrg = async function (orgId) {
		const uids = await module.getSetMembers(`hvt:roles:org:${orgId}`);
		if (!uids || !uids.length) {
			return [];
		}
		
		const roles = await Promise.all(
			uids.map(async (uid) => {
				const roleData = await module.getObject(`hvt:role:${orgId}:${uid}`, [], hvtCollection);
				return roleData;
			})
		);
		
		return roles.filter(Boolean);
	};

	// ==================== EXISTENCE CHECKS ====================

	module.hvtModuleExists = async function (moduleId) {
		return await module.exists(`hvt:module:${moduleId}`, hvtCollection);
	};

	module.hvtProblemExists = async function (problemId) {
		return await module.exists(`hvt:problem:${problemId}`, hvtCollection);
	};

	module.hvtIdeaExists = async function (ideaId) {
		return await module.exists(`hvt:idea:${ideaId}`, hvtCollection);
	};

	module.hvtExperimentExists = async function (experimentId) {
		return await module.exists(`hvt:experiment:${experimentId}`, hvtCollection);
	};

	module.hvtLearningExists = async function (learningId) {
		return await module.exists(`hvt:learning:${learningId}`, hvtCollection);
	};

	module.hvtEscalationExists = async function (escalationId) {
		return await module.exists(`hvt:escalation:${escalationId}`, hvtCollection);
	};

	module.hvtResultExists = async function (resultId) {
		return await module.exists(`hvt:result:${resultId}`, hvtCollection);
	};

	module.hvtTicketExists = async function (ticketId) {
		return await module.exists(`hvt:ticket:${ticketId}`, hvtCollection);
	};

	module.hvtUpdateExists = async function (updateId) {
		return await module.exists(`hvt:update:${updateId}`, hvtCollection);
	};

	// ==================== COUNT METHODS (ALIASES) ====================

	module.countHVTProblems = async function (orgId) {
		return await module.sortedSetCard(`hvt:problems:org:${orgId}:sorted`);
	};

	module.countHVTIdeas = async function (orgId) {
		// Performance: Use cached counter if available
		const cachedCount = await module.getObjectField(`hvt:metrics:org:${orgId}`, 'ideaCount', hvtCollection);
		if (cachedCount !== null && cachedCount !== undefined) {
			return parseInt(cachedCount, 10) || 0;
		}

		// Fallback: Count all ideas across all problems in org with Promise.all
		const problems = await module.getHVTProblemsByOrg(orgId, 0, -1);
		if (!problems || problems.length === 0) {
			return 0;
		}

		// Performance: Batch all counts in parallel
		const counts = await Promise.all(
			problems.map((problem) =>
				module.sortedSetCard(`hvt:ideas:problem:${problem.id}`)
			)
		);

		const total = counts.reduce((sum, count) => sum + count, 0);
		// Cache the result
		await module.setObjectField(`hvt:metrics:org:${orgId}`, 'ideaCount', total, hvtCollection);
		return total;
	};

	module.countHVTExperiments = async function (orgId) {
		return await module.sortedSetCard(`hvt:experiments:org:${orgId}:sorted`);
	};

	module.countHVTLearnings = async function (orgId) {
		return await module.sortedSetCard(`hvt:learnings:org:${orgId}:sorted`);
	};
};
