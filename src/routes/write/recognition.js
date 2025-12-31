'use strict';

const router = require('express').Router();
const middleware = require('../../middleware');
const controllers = require('../../controllers');
const routeHelpers = require('../helpers');

// Import Zod validation middleware
const validate = require('../../middleware/validate');
const schemas = require('../../validations');

const { setupApiRoute } = routeHelpers;

module.exports = function () {
	// ==========================================
	// SETUP PHASE
	// ==========================================

	// Get current active game
	setupApiRoute(
		router,
		'get',
		'/current',
		[middleware.ensureLoggedIn],
		controllers.write.recognition.getCurrent
	);

	// Join game
	setupApiRoute(
		router,
		'post',
		'/join',
		[middleware.ensureLoggedIn],
		controllers.write.recognition.join
	);

	// Submit questions
	setupApiRoute(
		router,
		'post',
		'/questions',
		[
			middleware.ensureLoggedIn,
			validate.body(schemas.recognition.submitQuestions),
		],
		controllers.write.recognition.submitQuestions
	);

	// Get my submitted questions
	setupApiRoute(
		router,
		'get',
		'/my-questions',
		[middleware.ensureLoggedIn],
		controllers.write.recognition.getMyQuestions
	);

	// Update my questions (before game starts)
	setupApiRoute(
		router,
		'put',
		'/my-questions',
		[
			middleware.ensureLoggedIn,
			validate.body(schemas.recognition.submitQuestions),
		],
		controllers.write.recognition.updateMyQuestions
	);

	// Delete my questions (before game starts)
	setupApiRoute(
		router,
		'delete',
		'/my-questions',
		[middleware.ensureLoggedIn],
		controllers.write.recognition.deleteMyQuestions
	);

	// ==========================================
	// GAME PHASE
	// ==========================================

	// Check game status
	setupApiRoute(
		router,
		'get',
		'/status',
		[middleware.ensureLoggedIn],
		controllers.write.recognition.getStatus
	);

	// Get next question
	setupApiRoute(
		router,
		'get',
		'/next-question',
		[middleware.ensureLoggedIn],
		controllers.write.recognition.getNextQuestion
	);

	// Submit answer
	setupApiRoute(
		router,
		'post',
		'/answer',
		[
			middleware.ensureLoggedIn,
			validate.body(schemas.recognition.submitAnswer),
		],
		controllers.write.recognition.submitAnswer
	);

	// Get my current stats
	setupApiRoute(
		router,
		'get',
		'/my-stats',
		[middleware.ensureLoggedIn],
		controllers.write.recognition.getMyStats
	);

	// Get live leaderboard
	setupApiRoute(
		router,
		'get',
		'/leaderboard',
		[
			middleware.ensureLoggedIn,
			validate.query(schemas.recognition.leaderboard),
		],
		controllers.write.recognition.getLeaderboard
	);

	// ==========================================
	// UTILITY
	// ==========================================

	// Get all users for dropdown
	setupApiRoute(
		router,
		'get',
		'/users',
		[middleware.ensureLoggedIn],
		controllers.write.recognition.getAllUsers
	);

	// ==========================================
	// ADMIN ROUTES
	// ==========================================

	// Create new game (admin only)
	setupApiRoute(
		router,
		'post',
		'/create',
		[
			middleware.ensureLoggedIn,
			validate.body(schemas.recognition.createGame),
		],
		controllers.write.recognition.createGame
	);

	// Start game - assign questions to players (admin only)
	setupApiRoute(
		router,
		'post',
		'/start/:gameId',
		[
			middleware.ensureLoggedIn,
			validate.params(schemas.recognition.gameIdParam),
		],
		controllers.write.recognition.startGame
	);

	// End game - calculate final scores (admin only)
	setupApiRoute(
		router,
		'post',
		'/end/:gameId',
		[
			middleware.ensureLoggedIn,
			validate.params(schemas.recognition.gameIdParam),
		],
		controllers.write.recognition.endGame
	);

	return router;
};