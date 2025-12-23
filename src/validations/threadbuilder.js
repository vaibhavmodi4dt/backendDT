'use strict';

const { z } = require('zod');

const ThreadBuilder = module.exports;

// ==========================================
// COMMON SCHEMAS
// ==========================================

// Thought type flags (0 or 1)
const thoughtFlag = z.union([z.literal(0), z.literal(1)]);

// Emotion types
const emotionType = z.enum([
	'eurekaEmphasis',
	'blissfullyPuzzled',
	'spirituallyDetermined',
	'upsetandmotivated',
]);

// Category types
const categoryType = z.enum([
	'remark',
	'subargument',
	'subexplanation',
	'coreprinciple',
]);

// Process types
const processType = z.enum([
	'question',
	'analogy',
	'sarcasm',
	'insight',
	'counterexample',
]);

// ==========================================
// SUBTHREAD SCHEMA
// ==========================================

const subThreadSchema = z.object({
	id: z.string().min(1, 'SubThread ID is required'),
	title: z.string()
		.min(1, 'SubThread title cannot be empty')
		.max(100, 'SubThread title too long (max 100 characters)'),
	interpretation_title: z.string()
		.min(1, 'Interpretation title cannot be empty')
		.max(100, 'Interpretation title too long (max 100 characters)'),
	content: z.string()
		.min(10, 'Content must be at least 10 characters')
		.max(5000, 'Content too long (max 5000 characters)'),
	interpretation: z.string()
		.min(10, 'Interpretation must be at least 10 characters')
		.max(5000, 'Interpretation too long (max 5000 characters)'),
	category: categoryType,
	process: processType,
	eureka: thoughtFlag,
	answer: thoughtFlag,
	question: thoughtFlag,
	root: thoughtFlag,
});

// ==========================================
// THREAD SCHEMA
// ==========================================

const threadSchema = z.object({
	id: z.number().int().positive('Thread ID must be a positive integer'),
	title: z.string()
		.min(1, 'Thread title cannot be empty')
		.max(100, 'Thread title too long (max 100 characters)'),
	emotions: emotionType,
	summary: z.object({
		title: z.string()
			.min(1, 'Summary title cannot be empty')
			.max(100, 'Summary title too long (max 100 characters)'),
		content: z.string()
			.min(10, 'Summary content must be at least 10 characters')
			.max(2000, 'Summary content too long (max 2000 characters)'),
	}),
	subthreads: z.array(subThreadSchema)
		.min(1, 'Thread must have at least 1 subthread'),
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
	enableDraft: z.boolean().optional(),
	enableAutoSave: z.boolean().optional(),
	autoSaveInterval: z.number().int().positive().optional(),
	preventCopyPaste: z.boolean().optional(),
	showStats: z.boolean().optional(),
	showEmotions: z.boolean().optional(),
	enableTracking: z.boolean().optional(),
	minThreads: z.number().int().positive().optional(),
	maxThreads: z.number().int().positive().nullable().optional(),
	minSubthreads: z.number().int().positive().optional(),
}).optional();

// ==========================================
// CREATE/UPDATE SCHEMA
// ==========================================

ThreadBuilder.create = z.object({
	meta: z.object({
		title: z.string()
			.min(1, 'Title cannot be empty')
			.max(100, 'Title too long (max 100 characters)'),
	}),
	threads: z.array(threadSchema)
		.min(1, 'ThreadBuilder must have at least 1 thread'),
	stats: statsSchema,
	config: configSchema,
});

ThreadBuilder.update = z.object({
	meta: z.object({
		title: z.string()
			.min(1, 'Title cannot be empty')
			.max(100, 'Title too long (max 100 characters)'),
	}),
	threads: z.array(threadSchema)
		.min(1, 'ThreadBuilder must have at least 1 thread'),
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