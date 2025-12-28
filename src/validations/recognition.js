'use strict';

const { z } = require('zod');

const Recognition = module.exports;

// ==========================================
// QUESTION SCHEMA
// ==========================================

const questionSchema = z.object({
	statement: z.string()
		.min(20, 'Statement must be at least 20 characters')
		.max(200, 'Statement must be less than 200 characters'),
	subjectUid: z.number()
		.int('Subject UID must be an integer')
		.positive('Subject UID must be positive'),
	difficulty: z.number()
		.int('Difficulty must be an integer')
		.refine(val => [5, 10, 15].includes(val), {
			message: 'Difficulty must be 5, 10, or 15 credits',
		}),
});

// ==========================================
// SUBMIT QUESTIONS SCHEMA
// ==========================================

Recognition.submitQuestions = z.object({
	questions: z.array(questionSchema)
		.min(5, 'You must create at least 5 questions')
		.max(50, 'Maximum 50 questions allowed')
		.refine(questions => {
			// Must spend exactly 100 credits
			const total = questions.reduce((sum, q) => sum + q.difficulty, 0);
			return total === 100;
		}, {
			message: 'Total difficulty must equal exactly 100 credits',
		})
		.refine(questions => {
			// Cannot create multiple questions about same person
			const subjects = questions.map(q => q.subjectUid);
			return subjects.length === new Set(subjects).size;
		}, {
			message: 'Cannot create multiple questions about the same person',
		}),
});

// ==========================================
// SUBMIT ANSWER SCHEMA
// ==========================================

Recognition.submitAnswer = z.object({
	questionId: z.string()
		.regex(/^[0-9a-fA-F]{24}$/, 'Invalid question ID format'),
	guessedUid: z.number()
		.int('Guessed UID must be an integer')
		.positive('Guessed UID must be positive'),
	creditsBet: z.number()
		.int('Credits bet must be an integer')
		.refine(val => [5, 10, 15].includes(val), {
			message: 'Credits bet must be 5, 10, or 15',
		}),
});

// ==========================================
// CREATE GAME SCHEMA (Admin)
// ==========================================

Recognition.createGame = z.object({
	gameId: z.string()
		.min(3, 'Game ID must be at least 3 characters')
		.max(50, 'Game ID must be less than 50 characters')
		.regex(/^[a-z0-9-]+$/, 'Game ID must be lowercase letters, numbers, and hyphens only'),
	title: z.string()
		.min(5, 'Title must be at least 5 characters')
		.max(100, 'Title must be less than 100 characters'),
	startTime: z.string()
		.datetime('Invalid start time format'),
	endTime: z.string()
		.datetime('Invalid end time format'),
	questionsPerPlayer: z.number()
		.int('Questions per player must be an integer')
		.min(10, 'Minimum 10 questions per player')
		.max(50, 'Maximum 50 questions per player')
		.default(20),
}).refine(data => {
	const start = new Date(data.startTime);
	const end = new Date(data.endTime);
	return end > start;
}, {
	message: 'End time must be after start time',
}).refine(data => {
	const start = new Date(data.startTime);
	const end = new Date(data.endTime);
	const duration = (end - start) / 1000 / 60; // minutes
	return duration >= 5 && duration <= 60;
}, {
	message: 'Game duration must be between 5 and 60 minutes',
});

// ==========================================
// LEADERBOARD QUERY SCHEMA
// ==========================================

Recognition.leaderboard = z.object({
	limit: z.string()
		.optional()
		.refine(val => !val || !isNaN(parseInt(val, 10)), 'Invalid limit')
		.transform(val => parseInt(val || '10', 10))
		.refine(val => val >= 1 && val <= 100, {
			message: 'Limit must be between 1 and 100',
		}),
});

// ==========================================
// GAME ID PARAM SCHEMA
// ==========================================

Recognition.gameIdParam = z.object({
	gameId: z.string()
		.min(1, 'Game ID is required'),
});