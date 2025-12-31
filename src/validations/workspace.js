'use strict';

const { z } = require('zod');

const Workspaces = module.exports;

// ==========================================
// COMMON SCHEMAS
// ==========================================

const assetTypeEnum = z.enum(['threadbuilder']); // Extensible for future types

// ==========================================
// CREATE WORKSPACE SCHEMA
// ==========================================

Workspaces.create = z.object({
	title: z.string()
		.min(1, 'Workspace title is required')
		.max(200, 'Title too long (max 200 characters)'),
	description: z.string()
		.max(2000, 'Description too long (max 2000 characters)')
		.default(''),
	startTime: z.number()
		.int('Start time must be an integer')
		.positive('Start time must be positive'),
	endTime: z.number()
		.int('End time must be an integer')
		.positive('End time must be positive'),
	settings: z.object({
		maxParticipants: z.number()
			.int('Max participants must be an integer')
			.positive('Max participants must be positive')
			.nullable()
			.optional()
			.default(null),
		maxPitches: z.number()
			.int('Max pitches must be an integer')
			.positive('Max pitches must be positive')
			.nullable()
			.optional()
			.default(null),
		allowAssetSharing: z.boolean()
			.optional()
			.default(true),
	}).optional().default({}),
}).refine(
	(data) => data.endTime > data.startTime,
	{
		message: 'End time must be after start time',
		path: ['endTime'],
	}
).refine(
	(data) => {
		const maxDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
		return (data.endTime - data.startTime) <= maxDuration;
	},
	{
		message: 'Maximum duration is 24 hours',
		path: ['endTime'],
	}
);

// ==========================================
// UPDATE WORKSPACE SCHEMA
// ==========================================

Workspaces.update = z.object({
	title: z.string()
		.min(1, 'Workspace title is required')
		.max(200, 'Title too long (max 200 characters)')
		.optional(),
	description: z.string()
		.max(2000, 'Description too long (max 2000 characters)')
		.optional(),
	endTime: z.number()
		.int('End time must be an integer')
		.positive('End time must be positive')
		.optional(),
	settings: z.object({
		maxParticipants: z.number()
			.int('Max participants must be an integer')
			.positive('Max participants must be positive')
			.nullable()
			.optional(),
		allowAssetSharing: z.boolean()
			.optional(),
	}).optional(),
});

// ==========================================
// GET/DELETE BY ID SCHEMAS
// ==========================================

Workspaces.getById = z.object({
	id: z.string()
		.min(1, 'Workspace ID is required')
		.refine(val => !isNaN(parseInt(val, 10)), 'Invalid workspace ID'),
});

Workspaces.deleteById = z.object({
	id: z.string()
		.min(1, 'Workspace ID is required')
		.refine(val => !isNaN(parseInt(val, 10)), 'Invalid workspace ID'),
});

Workspaces.stopById = z.object({
	id: z.string()
		.min(1, 'Workspace ID is required')
		.refine(val => !isNaN(parseInt(val, 10)), 'Invalid workspace ID'),
});

// ==========================================
// JOIN BY TOKEN SCHEMA
// ==========================================

Workspaces.joinByToken = z.object({
	token: z.string()
		.min(1, 'Invite token is required')
		.length(32, 'Invalid invite token format'),
});

// ==========================================
// LINK ASSET SCHEMA
// ==========================================

Workspaces.linkAsset = z.object({
	assetType: assetTypeEnum,
	assetId: z.string()
		.min(1, 'Asset ID is required')
		.refine(val => !isNaN(parseInt(val, 10)), 'Invalid asset ID'),
});

// ==========================================
// PAGINATION SCHEMA
// ==========================================

Workspaces.list = z.object({
	page: z.string()
		.optional()
		.refine(val => !val || !isNaN(parseInt(val, 10)), 'Invalid page number')
		.transform(val => parseInt(val || '1', 10)),
	limit: z.string()
		.optional()
		.refine(val => !val || !isNaN(parseInt(val, 10)), 'Invalid limit')
		.transform(val => Math.min(parseInt(val || '20', 10), 100)), // Max 100
});