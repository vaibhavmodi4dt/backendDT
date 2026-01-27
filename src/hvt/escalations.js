'use strict';

const db = require('../database');
const plugins = require('../plugins');
const helpers = require('./helpers');

const Escalations = module.exports;

/**
 * Create an escalation for a blocked experiment
 */
Escalations.create = async function (experimentId, data, uid) {
	if (!experimentId) {
		throw new Error('[[error:experiment-id-required]]');
	}

	if (!data.reason || data.reason.trim().length === 0) {
		throw new Error('[[error:escalation-reason-required]]');
	}

	if (!data.severity || !['low', 'medium', 'high', 'critical'].includes(data.severity)) {
		throw new Error('[[error:invalid-severity]]');
	}

	// Verify experiment exists and is blocked
	const experiment = await db.getHVTExperiment(experimentId);
	if (!experiment) {
		throw new Error('[[error:experiment-not-found]]');
	}

	if (experiment.status !== 'blocked') {
		throw new Error('[[error:experiment-not-blocked]]');
	}

	const escalationData = {
		experimentId,
		raisedBy: uid,
		reason: data.reason,
		severity: data.severity,
		status: 'open',
		assignedTo: data.assignedTo || null,
	};

	// Fire pre-create hook
	const result = await plugins.hooks.fire('filter:hvt.escalation.create', { data: escalationData });

	// Create escalation
	const created = await db.createHVTEscalation(result.data);

	// Fire post-create hook
	await plugins.hooks.fire('action:hvt.escalation.created', { escalation: created, uid });

	return created;
};

/**
 * Get a single escalation
 */
Escalations.get = async function (escalationId) {
	if (!escalationId) {
		throw new Error('[[error:escalation-id-required]]');
	}

	const escalation = await db.getHVTEscalation(escalationId);
	if (!escalation) {
		throw new Error('[[error:escalation-not-found]]');
	}

	return escalation;
};

/**
 * Get escalations for an experiment
 */
Escalations.getByExperiment = async function (experimentId) {
	if (!experimentId) {
		throw new Error('[[error:experiment-id-required]]');
	}

	const escalations = await db.getHVTEscalationsByExperiment(experimentId);
	return escalations || [];
};

/**
 * Update an escalation
 */
Escalations.update = async function (escalationId, updates) {
	if (!escalationId) {
		throw new Error('[[error:escalation-id-required]]');
	}

	const exists = await db.hvtEscalationExists(escalationId);
	if (!exists) {
		throw new Error('[[error:escalation-not-found]]');
	}

	// Fire pre-update hook
	const result = await plugins.hooks.fire('filter:hvt.escalation.update', {
		escalationId,
		updates,
	});

	// Update escalation
	const updated = await db.updateHVTEscalation(escalationId, result.updates);

	// Fire post-update hook
	await plugins.hooks.fire('action:hvt.escalation.updated', { escalation: updated });

	return updated;
};

/**
 * Update escalation status
 */
Escalations.updateStatus = async function (escalationId, newStatus) {
	if (!escalationId) {
		throw new Error('[[error:escalation-id-required]]');
	}

	const escalation = await db.getHVTEscalation(escalationId);
	if (!escalation) {
		throw new Error('[[error:escalation-not-found]]');
	}

	// Validate transition
	if (!helpers.canTransitionEscalationTo(escalation.status, newStatus)) {
		throw new Error(`[[error:invalid-escalation-transition-${escalation.status}-to-${newStatus}]]`);
	}

	return await Escalations.update(escalationId, { status: newStatus });
};

/**
 * Resolve an escalation
 */
Escalations.resolve = async function (escalationId, resolution) {
	if (!escalationId) {
		throw new Error('[[error:escalation-id-required]]');
	}

	if (!resolution || resolution.trim().length === 0) {
		throw new Error('[[error:resolution-required]]');
	}

	return await Escalations.update(escalationId, {
		status: 'resolved',
		resolution,
		resolvedAt: Date.now(),
	});
};

/**
 * Delete an escalation
 */
Escalations.delete = async function (escalationId) {
	if (!escalationId) {
		throw new Error('[[error:escalation-id-required]]');
	}

	const exists = await db.hvtEscalationExists(escalationId);
	if (!exists) {
		throw new Error('[[error:escalation-not-found]]');
	}

	await db.deleteHVTEscalation(escalationId);
};
