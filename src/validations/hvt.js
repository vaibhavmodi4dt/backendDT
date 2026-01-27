'use strict';

const { z } = require('zod');

/**
 * HVT Validation Schemas
 * 
 * These schemas validate incoming requests for the HVT module,
 * matching the TypeScript interfaces from the frontend.
 */

// Enums matching frontend types and state machines
const problemStatusEnum = z.enum(['open', 'in_progress', 'resolved', 'archived']);
const ideaStatusEnum = z.enum(['draft', 'pending_review', 'approved', 'rejected', 'scored']);
const experimentStatusEnum = z.enum([
	'seeded',
	'probing',
	'active',
	'blocked',
	'logging',
	'ready_for_hash',
	'completed',
	'halted',
]);
const severityEnum = z.enum(['low', 'medium', 'high', 'critical']);
const escalationStatusEnum = z.enum(['open', 'in_progress', 'resolved']);
const roleEnum = z.enum(['admin', 'contributor', 'viewer']);

// Module schemas
const createModuleSchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().optional(),
	color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
	icon: z.string().optional(),
	isActive: z.boolean().default(true),
});

const updateModuleSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().optional(),
	color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
	icon: z.string().optional(),
	isActive: z.boolean().optional(),
});

// Problem schemas
const createProblemSchema = z.object({
	moduleId: z.string().min(1),
	title: z.string().min(1).max(200),
	description: z.string().min(1),
	impact: z.string().optional(),
	affectedUsers: z.string().optional(),
});

const updateProblemSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().min(1).optional(),
	status: problemStatusEnum.optional(),
	impact: z.string().optional(),
	affectedUsers: z.string().optional(),
});

const updateProblemStatusSchema = z.object({
	status: problemStatusEnum,
});

// Idea schemas
const createIdeaSchema = z.object({
	problemId: z.string().min(1),
	title: z.string().min(1).max(200),
	description: z.string().min(1),
	proposedSolution: z.string().min(1),
});

const updateIdeaSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().min(1).optional(),
	proposedSolution: z.string().min(1).optional(),
	status: ideaStatusEnum.optional(),
});

const scoreIdeaSchema = z.object({
	impact: z.number().int().min(1).max(10),
	confidence: z.number().int().min(1).max(10),
	ease: z.number().int().min(1).max(10),
});

const updateIdeaStatusSchema = z.object({
	status: ideaStatusEnum,
});

// Experiment schemas
const createExperimentSchema = z.object({
	ideaId: z.string().min(1),
	hypothesis: z.string().min(1),
	successCriteria: z.string().min(1),
	startDate: z.number().int().positive().optional(),
	endDate: z.number().int().positive().optional(),
});

const updateExperimentSchema = z.object({
	hypothesis: z.string().min(1).optional(),
	successCriteria: z.string().min(1).optional(),
	status: experimentStatusEnum.optional(),
	startDate: z.number().int().positive().optional(),
	endDate: z.number().int().positive().optional(),
});

const updateExperimentStatusSchema = z.object({
	status: experimentStatusEnum,
});

const verifyExperimentSchema = z.object({
	experimentId: z.string().min(1),
});

// Result schemas
const createResultSchema = z.object({
	description: z.string().min(1),
	outcome: z.string().optional(),
	metrics: z.record(z.any()).optional(),
});

// Learning schemas
const createLearningSchema = z.object({
	content: z.string().min(1),
	tags: z.array(z.string()).default([]),
});

const updateLearningSchema = z.object({
	content: z.string().min(1).optional(),
	tags: z.array(z.string()).optional(),
	isArchived: z.boolean().optional(),
});

// Escalation schemas
const createEscalationSchema = z.object({
	reason: z.string().min(1),
	severity: severityEnum,
	assignedTo: z.string().optional(),
});

const updateEscalationSchema = z.object({
	reason: z.string().min(1).optional(),
	severity: severityEnum.optional(),
	status: escalationStatusEnum.optional(),
	assignedTo: z.string().optional(),
	resolution: z.string().optional(),
});

const resolveEscalationSchema = z.object({
	resolution: z.string().min(1),
});

// Ticket schemas
const createTicketSchema = z.object({
	externalTicketId: z.string().min(1),
	ticketSystem: z.string().min(1),
	ticketUrl: z.string().url().optional(),
});

// Update schemas
const createUpdateSchema = z.object({
	content: z.string().min(1),
});

// Role schemas
const setRoleSchema = z.object({
	uid: z.string().min(1),
	role: roleEnum,
});

// Pagination schema (reusable)
const paginationSchema = z.object({
	page: z.number().int().positive().default(1),
	perPage: z.number().int().positive().max(100).default(20),
});

// Export all schemas
module.exports = {
	// Enums
	problemStatusEnum,
	ideaStatusEnum,
	experimentStatusEnum,
	severityEnum,
	escalationStatusEnum,
	roleEnum,

	// Module schemas
	createModuleSchema,
	updateModuleSchema,

	// Problem schemas
	createProblemSchema,
	updateProblemSchema,
	updateProblemStatusSchema,

	// Idea schemas
	createIdeaSchema,
	updateIdeaSchema,
	scoreIdeaSchema,
	updateIdeaStatusSchema,

	// Experiment schemas
	createExperimentSchema,
	updateExperimentSchema,
	updateExperimentStatusSchema,
	verifyExperimentSchema,

	// Result schemas
	createResultSchema,

	// Learning schemas
	createLearningSchema,
	updateLearningSchema,

	// Escalation schemas
	createEscalationSchema,
	updateEscalationSchema,
	resolveEscalationSchema,

	// Ticket schemas
	createTicketSchema,

	// Update schemas
	createUpdateSchema,

	// Role schemas
	setRoleSchema,

	// Utility schemas
	paginationSchema,
};
