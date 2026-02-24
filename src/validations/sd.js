'use strict';

const { z } = require('zod');

const SD = module.exports;

// ==========================================
// TOPIC VALIDATION SCHEMAS
// ==========================================

SD.createTopicBody = z.object({
	title: z.string()
		.min(1, 'Topic title is required')
		.max(200, 'Title too long (max 200 characters)'),
	description: z.string()
		.min(1, 'Topic description is required')
		.max(1000, 'Description too long (max 1000 characters)'),
});

SD.updateTopicBody = z.object({
	title: z.string()
		.min(1, 'Topic title is required')
		.max(200, 'Title too long (max 200 characters)'),
	description: z.string()
		.min(1, 'Topic description is required')
		.max(1000, 'Description too long (max 1000 characters)'),
});

SD.getTopicParams = z.object({
	id: z.string()
		.min(1, 'Topic ID is required'),
});

SD.listTopicsParams = z.object({
	weekStart: z.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD'),
});

// ==========================================
// PITCH VALIDATION SCHEMAS
// ==========================================

SD.createPitchBody = z.object({
	topicId: z.string()
		.min(1, 'Topic ID is required'),
	description: z.string()
		.min(1, 'Pitch description is required')
		.max(5000, 'Description too long (max 5000 characters)'),
});

SD.updatePitchBody = z.object({
	description: z.string()
		.min(1, 'Pitch description is required')
		.max(5000, 'Description too long (max 5000 characters)'),
});

SD.getPitchParams = z.object({
	id: z.string()
		.min(1, 'Pitch ID is required'),
});

SD.getTopicPitchesParams = z.object({
	topicId: z.string()
		.min(1, 'Topic ID is required'),
	weekStart: z.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD'),
});

SD.getMyPitchParams = z.object({
	topicId: z.string()
		.min(1, 'Topic ID is required'),
});
