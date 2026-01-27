'use strict';

const db = require('../database');
const plugins = require('../plugins');

const Tickets = module.exports;

/**
 * Create a ticket from an approved idea
 */
Tickets.create = async function (ideaId, data, uid) {
	if (!ideaId) {
		throw new Error('[[error:idea-id-required]]');
	}

	if (!data.externalTicketId || data.externalTicketId.trim().length === 0) {
		throw new Error('[[error:external-ticket-id-required]]');
	}

	if (!data.ticketSystem || data.ticketSystem.trim().length === 0) {
		throw new Error('[[error:ticket-system-required]]');
	}

	// Verify idea exists and is approved
	const idea = await db.getHVTIdea(ideaId);
	if (!idea) {
		throw new Error('[[error:idea-not-found]]');
	}

	if (idea.status !== 'approved') {
		throw new Error('[[error:idea-not-approved]]');
	}

	const ticketData = {
		ideaId,
		createdBy: uid,
		externalTicketId: data.externalTicketId,
		ticketSystem: data.ticketSystem,
		ticketUrl: data.ticketUrl || null,
	};

	// Fire pre-create hook
	const result = await plugins.hooks.fire('filter:hvt.ticket.create', { data: ticketData });

	// Create ticket
	const created = await db.createHVTTicket(result.data);

	// Fire post-create hook
	await plugins.hooks.fire('action:hvt.ticket.created', { ticket: created, uid });

	return created;
};

/**
 * Get tickets for an idea
 */
Tickets.getByIdea = async function (ideaId) {
	if (!ideaId) {
		throw new Error('[[error:idea-id-required]]');
	}

	const tickets = await db.getHVTTicketsByIdea(ideaId);
	return tickets || [];
};
