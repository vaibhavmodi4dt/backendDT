'use strict';

const { collections } = require('./collections');

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
			createdAt: new Date(timestamp).toISOString(),
			updatedAt: new Date(timestamp).toISOString(),
		};

		await module.setObject(`hvt:module:${moduleId}`, moduleData, hvtCollection);
		await module.sortedSetAdd('hvt:modules:sorted', timestamp, moduleId);

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

	module.updateHVTModule = async function (moduleId, data) {
		const updateData = {
			...data,
			updatedAt: new Date().toISOString(),
		};
		await module.setObject(`hvt:module:${moduleId}`, updateData, hvtCollection);
		return await module.getHVTModule(moduleId);
	};

	module.deleteHVTModule = async function (moduleId) {
		await module.delete(`hvt:module:${moduleId}`, hvtCollection);
		await module.sortedSetRemove('hvt:modules:sorted', moduleId);
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
		return await module.getObject(`hvt:problem:${problemId}`, [], hvtCollection);
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
		return await module.getHVTProblem(problemId);
	};

	module.deleteHVTProblem = async function (problemId) {
		const problem = await module.getHVTProblem(problemId);
		if (problem) {
			await module.sortedSetRemove(`hvt:problems:org:${problem.orgId}:sorted`, problemId);
			await module.setRemove(`hvt:problems:module:${problem.moduleId}`, problemId);
			await module.setRemove(`hvt:problems:status:${problem.status}`, problemId);
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

		return ideaData;
	};

	module.getHVTIdea = async function (ideaId) {
		return await module.getObject(`hvt:idea:${ideaId}`, [], hvtCollection);
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
		return await module.getHVTIdea(ideaId);
	};

	module.getHVTIdeaCount = async function (orgId, problemId) {
		return await module.sortedSetCard(`hvt:ideas:problem:${problemId}`);
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
		await module.setAdd(`hvt:experiments:idea:${data.ideaId}`, experimentId);
		await module.setAdd(`hvt:experiments:status:${experimentData.status}`, experimentId);

		return experimentData;
	};

	module.getHVTExperiment = async function (experimentId) {
		return await module.getObject(`hvt:experiment:${experimentId}`, [], hvtCollection);
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
		const allIds = await module.getSetMembers(`hvt:experiments:status:${status}`);
		// Filter by org
		const experiments = await module.getHVTExperiments(allIds);
		const filtered = experiments.filter(exp => exp && exp.orgId === orgId);
		return filtered.slice(start, stop + 1);
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
		}

		await module.setObject(`hvt:experiment:${experimentId}`, updateData, hvtCollection);
		return await module.getHVTExperiment(experimentId);
	};

	module.getHVTExperimentCount = async function (orgId, status) {
		if (status) {
			const allIds = await module.getSetMembers(`hvt:experiments:status:${status}`);
			const experiments = await module.getHVTExperiments(allIds);
			return experiments.filter(exp => exp && exp.orgId === orgId).length;
		}
		return await module.sortedSetCard(`hvt:experiments:org:${orgId}:sorted`);
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
			hashedBy: data.hashedBy,
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
			await module.setAdd(`hvt:learnings:module:${data.moduleId}`, learningId);
		}

		return learningData;
	};

	module.getHVTLearning = async function (learningId) {
		return await module.getObject(`hvt:learning:${learningId}`, [], hvtCollection);
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

	module.getHVTLearningsByOrg = async function (orgId, start, stop) {
		const learningIds = await module.getSortedSetRevRange(`hvt:learnings:org:${orgId}:sorted`, start, stop);
		return await module.getHVTLearnings(learningIds);
	};

	module.getHVTLearningsByModule = async function (moduleId) {
		const learningIds = await module.getSetMembers(`hvt:learnings:module:${moduleId}`);
		return await module.getHVTLearnings(learningIds);
	};

	module.updateHVTLearning = async function (learningId, data) {
		const updateData = {
			...data,
			updatedAt: new Date().toISOString(),
		};
		await module.setObject(`hvt:learning:${learningId}`, updateData, hvtCollection);
		return await module.getHVTLearning(learningId);
	};

	module.getHVTLearningCount = async function (orgId) {
		return await module.sortedSetCard(`hvt:learnings:org:${orgId}:sorted`);
	};

	// ==================== ESCALATIONS ====================

	module.createHVTEscalation = async function (data) {
		const escalationId = await module.incrObjectField('global', 'nextHVTEscalationId');
		const timestamp = Date.now();

		const escalationData = {
			_key: `hvt:escalation:${escalationId}`,
			id: String(escalationId),
			experimentId: data.experimentId,
			createdBy: data.createdBy,
			resolvedBy: data.resolvedBy || null,
			title: data.title,
			description: data.description || null,
			status: data.status || 'open',
			resolutionNotes: data.resolutionNotes || null,
			createdAt: new Date(timestamp).toISOString(),
			resolvedAt: data.resolvedAt || null,
			orgId: data.orgId,
		};

		await module.setObject(`hvt:escalation:${escalationId}`, escalationData, hvtCollection);
		await module.sortedSetAdd(`hvt:escalations:experiment:${data.experimentId}`, timestamp, escalationId);

		return escalationData;
	};

	module.getHVTEscalation = async function (escalationId) {
		return await module.getObject(`hvt:escalation:${escalationId}`, [], hvtCollection);
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
		const updateData = { ...data };
		if (data.status === 'resolved' && !data.resolvedAt) {
			updateData.resolvedAt = new Date().toISOString();
		}
		await module.setObject(`hvt:escalation:${escalationId}`, updateData, hvtCollection);
		return await module.getHVTEscalation(escalationId);
	};

	// ==================== TICKETS ====================

	module.createHVTTicket = async function (data) {
		const ticketId = await module.incrObjectField('global', 'nextHVTTicketId');
		const timestamp = Date.now();

		const ticketData = {
			_key: `hvt:ticket:${ticketId}`,
			id: String(ticketId),
			experimentId: data.experimentId,
			createdBy: data.createdBy,
			title: data.title,
			description: data.description || null,
			status: data.status || 'open',
			priority: data.priority,
			createdAt: new Date(timestamp).toISOString(),
			resolvedAt: data.resolvedAt || null,
			orgId: data.orgId,
		};

		await module.setObject(`hvt:ticket:${ticketId}`, ticketData, hvtCollection);
		await module.sortedSetAdd(`hvt:tickets:experiment:${data.experimentId}`, timestamp, ticketId);

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

	module.getHVTTicketsByExperiment = async function (experimentId) {
		const ticketIds = await module.getSortedSetRange(`hvt:tickets:experiment:${experimentId}`, 0, -1);
		return await module.getHVTTickets(ticketIds);
	};

	// ==================== EXPERIMENT UPDATES ====================

	module.createHVTUpdate = async function (data) {
		const updateId = await module.incrObjectField('global', 'nextHVTUpdateId');
		const timestamp = Date.now();

		const updateData = {
			_key: `hvt:update:${updateId}`,
			id: String(updateId),
			experimentId: data.experimentId,
			createdBy: data.createdBy,
			updateType: data.updateType,
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

	module.setHVTUserRole = async function (orgId, uid, role) {
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

	module.getHVTUserRole = async function (orgId, uid) {
		return await module.getObject(`hvt:role:${orgId}:${uid}`, [], hvtCollection);
	};

	module.removeHVTUserRole = async function (orgId, uid) {
		await module.delete(`hvt:role:${orgId}:${uid}`, hvtCollection);
		await module.setRemove(`hvt:roles:org:${orgId}`, uid);
		await module.setRemove(`hvt:roles:user:${uid}`, orgId);
	};
};
