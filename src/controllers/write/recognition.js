'use strict';

const api = require('../../api');
const helpers = require('../../helpers');

const Recognition = module.exports;

// ==========================================
// GAME MANAGEMENT
// ==========================================

Recognition.createGame = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.recognition.createGame(req, req.body)
	);
};

Recognition.startGame = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.recognition.startGame(req, { gameId: req.params.gameId })
	);
};

Recognition.endGame = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.recognition.endGame(req, { gameId: req.params.gameId })
	);
};

// ==========================================
// PLAYER MANAGEMENT
// ==========================================

Recognition.getCurrent = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.recognition.getCurrentGame()
	);
};

Recognition.join = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.recognition.join(req, {})
	);
};

// ==========================================
// QUESTION MANAGEMENT
// ==========================================

Recognition.submitQuestions = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.recognition.submitQuestions(req, req.body)
	);
};

Recognition.getMyQuestions = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.recognition.getMyQuestions(req, {})
	);
};

Recognition.updateMyQuestions = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.recognition.updateMyQuestions(req, req.body)
	);
};

Recognition.deleteMyQuestions = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.recognition.deleteMyQuestions(req, {})
	);
};

// ==========================================
// GAMEPLAY
// ==========================================

Recognition.getStatus = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.recognition.getStatus(req, {})
	);
};

Recognition.getNextQuestion = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.recognition.getNextQuestion(req, {})
	);
};

Recognition.submitAnswer = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.recognition.submitAnswer(req, req.body)
	);
};

// ==========================================
// STATS & LEADERBOARD
// ==========================================

Recognition.getMyStats = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.recognition.getMyStats(req, {})
	);
};

Recognition.getLeaderboard = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.recognition.getLeaderboard(req, { limit: req.query.limit })
	);
};

// ==========================================
// UTILITY
// ==========================================

Recognition.getAllUsers = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.recognition.getAllUsers(req, {})
	);
};