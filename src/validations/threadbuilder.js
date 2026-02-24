'use strict';

const { z } = require('zod');

const ThreadBuilder = module.exports;

// ==========================================
// COMMON SCHEMAS
// ==========================================

// Thought type flags (0 or 1)
const thoughtFlag = z.union([z.literal(0), z.literal(1)]);

// Emotion types - allow empty string OR enum values
const emotionType = z.union([
	z.literal(''),
	z.enum([
		'eurekaEmphasis',
		'blissfullyPuzzled',
		'spirituallyDetermined',
		'upsetandmotivated',
	])
]);

// Category types - allow empty string OR enum values
const categoryType = z.union([
	z.literal(''),
	z.enum([
		'remark',
		'subargument',
		'subexplanation',
		'coreprinciple',
	])
]);

// Process types - allow empty string OR enum values
const processType = z.union([
	z.literal(''),
	z.enum([
		'question',
		'analogy',
		'sarcasm',
		'insight',
		'counterexample',
	])
]);

// ==========================================
// SUBTHREAD SCHEMA
// ==========================================

const subThreadSchema = z.object({
	id: z.string(),
	title: z.string().max(100, 'SubThread title too long (max 100 characters)'),
	interpretation_title: z.string().max(100, 'Interpretation title too long (max 100 characters)'),
	content: z.string().max(5000, 'Content too long (max 5000 characters)'),
	interpretation: z.string().max(5000, 'Interpretation too long (max 5000 characters)'),
	category: categoryType,
	process: processType,
	eureka: thoughtFlag,
	answer: thoughtFlag,
	question: thoughtFlag,
	root: thoughtFlag,
}).transform((data) => {
	// If all critical fields are empty, mark for removal
	const isEmpty = !data.id && !data.title && !data.content && !data.interpretation;
	if (isEmpty) {
		return null; // Mark for removal
	}
	return data;
});

// ==========================================
// THREAD SCHEMA
// ==========================================

const threadSchema = z.object({
	id: z.number().int().positive('Thread ID must be a positive integer'),
	title: z.string().max(100, 'Thread title too long (max 100 characters)'),
	emotions: emotionType,
	summary: z.object({
		title: z.string().max(100, 'Summary title too long (max 100 characters)'),
		content: z.string().max(2000, 'Summary content too long (max 2000 characters)'),
	}),
	subthreads: z.array(subThreadSchema)
		.transform((subthreads) => {
			// Filter out null subthreads (empty ones)
			return subthreads.filter(st => st !== null);
		}),
});

// ==========================================
// STATS SCHEMA
// ==========================================

const statsSchema = z.object({
	timestamp: z.number().int().positive(),
	count: z.object({
		characters: z.number().int().nonnegative(),
		words: z.number().int().nonnegative(),
		threads: z.number().int().positive(),
	}),
	eureka: z.array(z.string()),
	answer: z.array(z.string()),
	question: z.array(z.string()),
	root: z.array(z.string()),
	remark: z.array(z.string()),
	process: z.array(z.string()),
});

// ==========================================
// CONFIG SCHEMA (Optional)
// ==========================================

const configSchema = z.object({
	enableDraft: z.boolean(),
	enableAutoSave: z.boolean(),
	autoSaveInterval: z.number().int().positive(),
	preventCopyPaste: z.boolean(),
	showStats: z.boolean(),
	showEmotions: z.boolean(),
	enableTracking: z.boolean(),
	minThreads: z.number().int().positive(),
	maxThreads: z.number().int().positive().nullable(),
	minSubthreads: z.number().int().positive(),
});

// ==========================================
// CREATE/UPDATE SCHEMA
// ==========================================

ThreadBuilder.create = z.object({
	meta: z.object({
		title: z.string().max(100, 'Title too long (max 100 characters)'),
	}),
	threads: z.array(threadSchema),
	stats: statsSchema,
	config: configSchema,
	workspaceId: z.string()
		.optional()
		.refine(val => !val || !isNaN(parseInt(val, 10)), 'Invalid workspace ID'),
});

ThreadBuilder.update = z.object({
	meta: z.object({
		title: z.string().max(100, 'Title too long (max 100 characters)'),
	}),
	threads: z.array(threadSchema),
	stats: statsSchema,
	config: configSchema,
});

// ==========================================
// GET/DELETE SCHEMAS
// ==========================================

ThreadBuilder.getById = z.object({
	id: z.string()
		.min(1, 'ThreadBuilder ID is required')
		.refine(val => !isNaN(parseInt(val, 10)), 'Invalid ThreadBuilder ID'),
});

ThreadBuilder.deleteById = z.object({
	id: z.string()
		.min(1, 'ThreadBuilder ID is required')
		.refine(val => !isNaN(parseInt(val, 10)), 'Invalid ThreadBuilder ID'),
});

ThreadBuilder.duplicateById = z.object({
	id: z.string()
		.min(1, 'ThreadBuilder ID is required')
		.refine(val => !isNaN(parseInt(val, 10)), 'Invalid ThreadBuilder ID'),
});

// ==========================================
// LIST/PAGINATION SCHEMA
// ==========================================

ThreadBuilder.list = z.object({
	page: z.string()
		.optional()
		.refine(val => !val || !isNaN(parseInt(val, 10)), 'Invalid page number')
		.transform(val => parseInt(val || '1', 10)),
	limit: z.string()
		.optional()
		.refine(val => !val || !isNaN(parseInt(val, 10)), 'Invalid limit')
		.transform(val => parseInt(val || '20', 10)),
});