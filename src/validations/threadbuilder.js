'use strict';

const { z } = require('zod');

const ThreadBuilder = module.exports;

// ==========================================
// COMMON SCHEMAS
// ==========================================

// Thought type flags (0 or 1)
const thoughtFlag = z.union([z.literal(0), z.literal(1)]).default(0);

// Emotion types
const emotionType = z.enum([
	'eurekaEmphasis',
	'blissfullyPuzzled',
	'spirituallyDetermined',
	'upsetandmotivated',
]).default('blissfullyPuzzled');

// Category types
const categoryType = z.enum([
	'remark',
	'subargument',
	'subexplanation',
	'coreprinciple',
]).default('remark');

// Process types
const processType = z.enum([
	'question',
	'analogy',
	'sarcasm',
	'insight',
	'counterexample',
]).default('question');

// ==========================================
// SUBTHREAD SCHEMA
// ==========================================

const subThreadSchema = z.object({
	id: z.string().default(''),
	title: z.string().max(100, 'SubThread title too long (max 100 characters)').default(''),
	interpretation_title: z.string().max(100, 'Interpretation title too long (max 100 characters)').default(''),
	content: z.string().max(5000, 'Content too long (max 5000 characters)').default(''),
	interpretation: z.string().max(5000, 'Interpretation too long (max 5000 characters)').default(''),
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
	id: z.number().int().positive('Thread ID must be a positive integer').default(1),
	title: z.string().max(100, 'Thread title too long (max 100 characters)').default(''),
	emotions: emotionType,
	summary: z.object({
		title: z.string().max(100, 'Summary title too long (max 100 characters)').default(''),
		content: z.string().max(2000, 'Summary content too long (max 2000 characters)').default(''),
	}).default({ title: '', content: '' }),
	subthreads: z.array(subThreadSchema)
		.default([])
		.transform((subthreads) => {
			// Filter out null subthreads (empty ones)
			return subthreads.filter(st => st !== null);
		}),
});

// ==========================================
// STATS SCHEMA
// ==========================================

const statsSchema = z.object({
	timestamp: z.number().int().positive().default(() => Date.now()),
	count: z.object({
		characters: z.number().int().nonnegative().default(0),
		words: z.number().int().nonnegative().default(0),
		threads: z.number().int().positive().default(1),
	}).default({ characters: 0, words: 0, threads: 1 }),
	eureka: z.array(z.string()).default([]),
	answer: z.array(z.string()).default([]),
	question: z.array(z.string()).default([]),
	root: z.array(z.string()).default([]),
	remark: z.array(z.string()).default([]),
	process: z.array(z.string()).default([]),
}).default({});

// ==========================================
// CONFIG SCHEMA (Optional)
// ==========================================

const configSchema = z.object({
	enableDraft: z.boolean().default(false),
	enableAutoSave: z.boolean().default(true),
	autoSaveInterval: z.number().int().positive().default(30000),
	preventCopyPaste: z.boolean().default(false),
	showStats: z.boolean().default(true),
	showEmotions: z.boolean().default(true),
	enableTracking: z.boolean().default(true),
	minThreads: z.number().int().positive().default(1),
	maxThreads: z.number().int().positive().nullable().default(null),
	minSubthreads: z.number().int().positive().default(1),
}).default({});

// ==========================================
// CREATE/UPDATE SCHEMA
// ==========================================

ThreadBuilder.create = z.object({
	meta: z.object({
		title: z.string().max(100, 'Title too long (max 100 characters)').default(''),
	}).default({ title: '' }),
	threads: z.array(threadSchema).default([]),
	stats: statsSchema,
	config: configSchema,
});

ThreadBuilder.update = z.object({
	meta: z.object({
		title: z.string().max(100, 'Title too long (max 100 characters)').default(''),
	}).default({ title: '' }),
	threads: z.array(threadSchema).default([]),
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