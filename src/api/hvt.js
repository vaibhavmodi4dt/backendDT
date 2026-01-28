'use strict';

const HVT = require('../hvt');

const hvtApi = module.exports;

// ==========================================
// MODULES
// ==========================================

hvtApi.createModule = async function (caller, data) {
	if (!caller.organisation?.orgId) {
		throw new Error('[[error:organization-context-required]]');
	}
	return await HVT.modules.create({ ...data, orgId: caller.organisation.orgId }, caller.uid);
};

hvtApi.getModule = async function (caller, data) {
	return await HVT.modules.get(data.moduleId);
};

hvtApi.getAllModules = async function (caller, data) {
	if (!caller.organisation?.orgId) {
		throw new Error('[[error:organization-context-required]]');
	}
	return await HVT.modules.getAll(caller.organisation.orgId);
};

hvtApi.updateModule = async function (caller, data) {
	return await HVT.modules.update(data.moduleId, data.updates);
};

hvtApi.deleteModule = async function (caller, data) {
	await HVT.modules.delete(data.moduleId);
	return { success: true };
};

hvtApi.seedModules = async function (caller, data) {
	if (!caller.organisation?.orgId) {
		throw new Error('[[error:organization-context-required]]');
	}
	return await HVT.modules.seedDefaults(caller.organisation.orgId, caller.uid);
};

// ==========================================
// PROBLEMS
// ==========================================

hvtApi.createProblem = async function (caller, data) {
	if (!caller.organisation?.orgId) {
		throw new Error('[[error:organization-context-required]]');
	}
	return await HVT.problems.create(
		{ ...data, orgId: caller.organisation.orgId },
		caller.uid
	);
};

hvtApi.getProblem = async function (caller, data) {
	if (!caller.organisation?.orgId) {
		throw new Error('[[error:organization-context-required]]');
	}
	return await HVT.problems.get(data.problemId, caller.organisation.orgId);
};

hvtApi.getProblemsByOrg = async function (caller, data) {
	if (!caller.organisation?.orgId) {
		throw new Error('[[error:organization-context-required]]');
	}
	return await HVT.problems.getByOrg(caller.organisation.orgId);
};

hvtApi.getProblemsByModule = async function (caller, data) {
	return await HVT.problems.getByModule(data.moduleId);
};

hvtApi.updateProblem = async function (caller, data) {
	return await HVT.problems.update(data.problemId, data.updates, caller.uid);
};

hvtApi.updateProblemStatus = async function (caller, data) {
	return await HVT.problems.updateStatus(data.problemId, data.status, caller.uid);
};

hvtApi.deleteProblem = async function (caller, data) {
	await HVT.problems.delete(data.problemId);
	return { success: true };
};

hvtApi.getProblemWithCounts = async function (caller, data) {
	return await HVT.problems.getWithCounts(data.problemId);
};

// ==========================================
// IDEAS
// ==========================================

hvtApi.createIdea = async function (caller, data) {
	return await HVT.ideas.create(data.problemId, data, caller.uid);
};

hvtApi.getIdea = async function (caller, data) {
	if (!caller.organisation?.orgId) {
		throw new Error('[[error:organization-context-required]]');
	}
	return await HVT.ideas.get(data.ideaId, caller.organisation.orgId);
};

hvtApi.getIdeasByProblem = async function (caller, data) {
	return await HVT.ideas.getByProblem(data.problemId);
};

hvtApi.updateIdea = async function (caller, data) {
	return await HVT.ideas.update(data.ideaId, data.updates, caller.uid);
};

hvtApi.scoreIdea = async function (caller, data) {
	return await HVT.ideas.score(data.ideaId, {
		impactScore: data.impact,
		confidenceScore: data.confidence,
		easeScore: data.ease,
	}, caller.uid);
};

hvtApi.approveIdea = async function (caller, data) {
	return await HVT.ideas.approve(data.ideaId, caller.uid);
};

hvtApi.rejectIdea = async function (caller, data) {
	return await HVT.ideas.reject(data.ideaId, caller.uid);
};

hvtApi.updateIdeaStatus = async function (caller, data) {
	return await HVT.ideas.updateStatus(data.ideaId, data.status, caller.uid);
};

// ==========================================
// EXPERIMENTS
// ==========================================

hvtApi.createExperiment = async function (caller, data) {
	if (!caller.organisation?.orgId) {
		throw new Error('[[error:organization-context-required]]');
	}
	return await HVT.experiments.create(
		data.ideaId,
		{ ...data, orgId: caller.organisation.orgId },
		caller.uid
	);
};

hvtApi.getExperiment = async function (caller, data) {
	if (!caller.organisation?.orgId) {
		throw new Error('[[error:organization-context-required]]');
	}
	return await HVT.experiments.get(data.experimentId, caller.organisation.orgId);
};

hvtApi.getExperimentsByOrg = async function (caller, data) {
	if (!caller.organisation?.orgId) {
		throw new Error('[[error:organization-context-required]]');
	}
	return await HVT.experiments.getByOrg(caller.organisation.orgId);
};

hvtApi.getExperimentsByStatus = async function (caller, data) {
	if (!caller.organisation?.orgId) {
		throw new Error('[[error:organization-context-required]]');
	}
	return await HVT.experiments.getByStatus(caller.organisation.orgId, data.status);
};

hvtApi.updateExperiment = async function (caller, data) {
	return await HVT.experiments.update(data.experimentId, data.updates, caller.uid);
};

hvtApi.updateExperimentStatus = async function (caller, data) {
	return await HVT.experiments.updateStatus(data.experimentId, data.status, caller.uid);
};

hvtApi.haltExperiment = async function (caller, data) {
	return await HVT.experiments.halt(data.experimentId, data.reason, caller.uid);
};

hvtApi.verifyExperiment = async function (caller, data) {
	return await HVT.experiments.verify(data.experimentId, caller.uid);
};

hvtApi.getExperimentWithRelations = async function (caller, data) {
	return await HVT.experiments.getWithRelations(data.experimentId);
};

// ==========================================
// RESULTS
// ==========================================

hvtApi.createResult = async function (caller, data) {
	return await HVT.results.create(data.experimentId, data, caller.uid);
};

hvtApi.getResultsByExperiment = async function (caller, data) {
	return await HVT.results.getByExperiment(data.experimentId);
};

// ==========================================
// LEARNINGS
// ==========================================

hvtApi.createLearning = async function (caller, data) {
	return await HVT.learnings.create(data.experimentId, data, caller.uid);
};

hvtApi.getLearning = async function (caller, data) {
	if (!caller.organisation?.orgId) {
		throw new Error('[[error:organization-context-required]]');
	}
	return await HVT.learnings.get(data.learningId, caller.organisation.orgId);
};

hvtApi.getLearningsByOrg = async function (caller, data) {
	if (!caller.organisation?.orgId) {
		throw new Error('[[error:organization-context-required]]');
	}
	return await HVT.learnings.getByOrg(caller.organisation.orgId);
};

hvtApi.getLearningsByModule = async function (caller, data) {
	return await HVT.learnings.getByModule(data.moduleId);
};

hvtApi.getSimilarLearnings = async function (caller, data) {
	return await HVT.learnings.getSimilar(data.learningId);
};

hvtApi.updateLearning = async function (caller, data) {
	return await HVT.learnings.update(data.learningId, data.updates);
};

hvtApi.archiveLearning = async function (caller, data) {
	return await HVT.learnings.archive(data.learningId);
};

hvtApi.unarchiveLearning = async function (caller, data) {
	return await HVT.learnings.unarchive(data.learningId);
};

hvtApi.deleteLearning = async function (caller, data) {
	await HVT.learnings.delete(data.learningId);
	return { success: true };
};

// ==========================================
// ESCALATIONS
// ==========================================

hvtApi.createEscalation = async function (caller, data) {
	return await HVT.escalations.create(data.experimentId, data, caller.uid);
};

hvtApi.getEscalation = async function (caller, data) {
	if (!caller.organisation?.orgId) {
		throw new Error('[[error:organization-context-required]]');
	}
	return await HVT.escalations.get(data.escalationId, caller.organisation.orgId);
};

hvtApi.getEscalationsByExperiment = async function (caller, data) {
	return await HVT.escalations.getByExperiment(data.experimentId);
};

hvtApi.updateEscalation = async function (caller, data) {
	return await HVT.escalations.update(data.escalationId, data.updates);
};

hvtApi.updateEscalationStatus = async function (caller, data) {
	return await HVT.escalations.updateStatus(data.escalationId, data.status);
};

hvtApi.resolveEscalation = async function (caller, data) {
	return await HVT.escalations.resolve(data.escalationId, data.resolution);
};

hvtApi.deleteEscalation = async function (caller, data) {
	await HVT.escalations.delete(data.escalationId);
	return { success: true };
};

// ==========================================
// TICKETS
// ==========================================

hvtApi.createTicket = async function (caller, data) {
	return await HVT.tickets.create(data.ideaId, data, caller.uid);
};

hvtApi.getTicketsByIdea = async function (caller, data) {
	return await HVT.tickets.getByIdea(data.ideaId);
};

// ==========================================
// UPDATES
// ==========================================

hvtApi.createUpdate = async function (caller, data) {
	return await HVT.updates.create(data.experimentId, data, caller.uid);
};

hvtApi.getUpdatesByExperiment = async function (caller, data) {
	return await HVT.updates.getByExperiment(data.experimentId);
};

// ==========================================
// ROLES
// ==========================================

hvtApi.setRole = async function (caller, data) {
	if (!caller.organisation?.orgId) {
		throw new Error('[[error:organization-context-required]]');
	}
	return await HVT.roles.set(data.uid, caller.organisation.orgId, data.role);
};

hvtApi.getRole = async function (caller, data) {
	if (!caller.organisation?.orgId) {
		throw new Error('[[error:organization-context-required]]');
	}
	const role = await HVT.roles.get(data.uid, caller.organisation.orgId);
	return { uid: data.uid, orgId: caller.organisation.orgId, role };
};

hvtApi.getRolesByOrg = async function (caller, data) {
	if (!caller.organisation?.orgId) {
		throw new Error('[[error:organization-context-required]]');
	}
	return await HVT.roles.getByOrg(caller.organisation.orgId);
};

hvtApi.removeRole = async function (caller, data) {
	if (!caller.organisation?.orgId) {
		throw new Error('[[error:organization-context-required]]');
	}
	await HVT.roles.remove(data.uid, caller.organisation.orgId);
	return { success: true };
};

// ==========================================
// METRICS
// ==========================================

hvtApi.getMetricsByOrg = async function (caller, data) {
	if (!caller.organisation?.orgId) {
		throw new Error('[[error:organization-context-required]]');
	}
	return await HVT.metrics.getByOrg(caller.organisation.orgId);
};

hvtApi.getMetricsByModule = async function (caller, data) {
	if (!caller.organisation?.orgId) {
		throw new Error('[[error:organization-context-required]]');
	}
	return await HVT.metrics.getByModule(data.moduleId, caller.organisation.orgId);
};

hvtApi.getVelocity = async function (caller, data) {
	if (!caller.organisation?.orgId) {
		throw new Error('[[error:organization-context-required]]');
	}
	const days = data.days || 30;
	return await HVT.metrics.getVelocity(caller.organisation.orgId, days);
};
