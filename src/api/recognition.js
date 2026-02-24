'use strict';

const db = require('../database');
const user = require('../user');
const collections = require('../database/mongo/collections');
const utils = require('../utils');

const Recognition = module.exports;

// ==========================================
// HELPER: Get current active game
// ==========================================

Recognition.getCurrentGame = async () => {
	const games = await db.getSortedSetRevRange('recognition:games:sorted', 0, 0);
	if (!games || games.length === 0) {
		return null;
	}

	const gameId = games[0];
	const game = await db.getObject(`recognition:game:${gameId}`, [], { collection: collections.RECOGNITION_GAMES });

	if (!game) {
		return null;
	}

	const now = Date.now();
	const canJoin = game.status === 'setup' && now < game.startTime;

	return {
		...game,
		canJoin,
		timeUntilStart: canJoin ? Math.max(0, Math.floor((game.startTime - now) / 1000)) : 0,
		timeRemaining: game.status === 'active' ? Math.max(0, Math.floor((game.endTime - now) / 1000)) : 0,
	};
};

// ==========================================
// GAME MANAGEMENT
// ==========================================

/**
 * Create a new game session
 */
Recognition.createGame = async (caller, data) => {
	// TODO: Add admin check
	// if (!await user.isAdministrator(caller.uid)) {
	//   throw new Error('[[error:no-privileges]]');
	// }

	const { gameId, title, startTime, endTime, questionsPerPlayer = 20 } = data;

	// Check if game already exists
	const exists = await db.getObject(`recognition:game:${gameId}`, [], { collection: collections.RECOGNITION_GAMES });
	if (exists) {
		throw new Error('[[error:game-already-exists]]');
	}

	const timestamp = utils.date.now();

	const game = {
		gameId,
		title,
		status: 'setup',
		startTime: new Date(startTime).getTime(),
		endTime: new Date(endTime).getTime(),
		createdAt: timestamp,
		questionsPerPlayer,
		totalPlayers: 0,
		totalQuestions: 0,
	};

	await db.setObject(`recognition:game:${gameId}`, game, { collection: collections.RECOGNITION_GAMES });
	await db.sortedSetAdd('recognition:games:sorted', timestamp, gameId);

	return game;
};

/**
 * Start game - assign questions to players
 */
Recognition.startGame = async (caller, data) => {
	// TODO: Add admin check

	const { gameId } = data;

	const game = await db.getObject(`recognition:game:${gameId}`, [], { collection: collections.RECOGNITION_GAMES });
	if (!game) {
		throw new Error('[[error:game-not-found]]');
	}

	if (game.status !== 'setup') {
		throw new Error('[[error:game-already-started]]');
	}

	// Get all players who submitted questions
	const playerUids = await db.getSortedSetMembers(`recognition:game:${gameId}:players`);
	if (!playerUids || playerUids.length === 0) {
		throw new Error('[[error:no-players-submitted-questions]]');
	}

	// Get all players data
	const playerKeys = playerUids.map(uid => `recognition:game:${gameId}:player:${uid}`);
	const players = await db.getObjects(playerKeys, { collection: collections.RECOGNITION_PLAYERS });

	const validPlayers = players.filter(p => p && p.hasSubmittedQuestions);

	if (validPlayers.length === 0) {
		throw new Error('[[error:no-players-submitted-questions]]');
	}

	// Get all questions
	const allQuestions = await db.getSortedSetMembers(`recognition:game:${gameId}:questions`);

	if (!allQuestions || allQuestions.length === 0) {
		throw new Error('[[error:no-questions-available]]');
	}

	// Get question data
	const questionKeys = allQuestions.map(qId => `recognition:question:${qId}`);
	const questionDocs = await db.getObjects(questionKeys, { collection: collections.RECOGNITION_QUESTIONS });

	let assignmentsCreated = 0;

	// Assign questions to each player
	for (const player of validPlayers) {
		// Get questions NOT created by this player
		const availableQuestions = questionDocs
			.map((q, idx) => ({ ...q, qId: allQuestions[idx] }))
			.filter(q => q && q.creatorUid !== player.uid);

		if (availableQuestions.length < game.questionsPerPlayer) {
			throw new Error(`[[error:not-enough-questions-for-player, ${player.username}]]`);
		}

		// Shuffle and pick N questions
		const shuffled = availableQuestions.sort(() => Math.random() - 0.5);
		const assigned = shuffled.slice(0, game.questionsPerPlayer);

		// Create assignment
		const assignment = {
			gameId,
			playerId: player.uid,
			assignedQuestions: assigned.map((q, index) => ({
				questionId: q.qId,
				order: index + 1,
				shown: false,
				answered: false,
			})),
			createdAt: utils.date.now(),
		};

		await db.setObject(
			`recognition:game:${gameId}:assignment:${player.uid}`,
			assignment,
			{ collection: collections.RECOGNITION_ASSIGNMENTS }
		);

		assignmentsCreated++;
	}

	// Update game status
	await db.setObjectField(`recognition:game:${gameId}`, 'status', 'active', { collection: collections.RECOGNITION_GAMES });
	await db.setObjectField(`recognition:game:${gameId}`, 'totalPlayers', validPlayers.length, { collection: collections.RECOGNITION_GAMES });
	await db.setObjectField(`recognition:game:${gameId}`, 'totalQuestions', questionDocs.length, { collection: collections.RECOGNITION_GAMES });

	return { assignmentsCreated, totalPlayers: validPlayers.length };
};

/**
 * End game - calculate final scores
 */
Recognition.endGame = async (caller, data) => {
	// TODO: Add admin check

	const { gameId } = data;

	const game = await db.getObject(`recognition:game:${gameId}`, [], { collection: collections.RECOGNITION_GAMES });
	if (!game) {
		throw new Error('[[error:game-not-found]]');
	}

	if (game.status !== 'active') {
		throw new Error('[[error:game-not-active]]');
	}

	// Get all players
	const playerUids = await db.getSortedSetMembers(`recognition:game:${gameId}:players`);
	const playerKeys = playerUids.map(uid => `recognition:game:${gameId}:player:${uid}`);
	const players = await db.getObjects(playerKeys, { collection: collections.RECOGNITION_PLAYERS });

	// Calculate scores for each player
	for (const player of players) {
		if (!player) continue;

		const scores = await Recognition.calculatePlayerScores(gameId, player.uid);

		await db.setObjectField(`recognition:game:${gameId}:player:${player.uid}`, 'questionMasterScore', scores.questionMasterScore, { collection: collections.RECOGNITION_PLAYERS });
		await db.setObjectField(`recognition:game:${gameId}:player:${player.uid}`, 'detectiveScore', scores.detectiveScore, { collection: collections.RECOGNITION_PLAYERS });
		await db.setObjectField(`recognition:game:${gameId}:player:${player.uid}`, 'finalScore', scores.finalScore, { collection: collections.RECOGNITION_PLAYERS });
		await db.setObjectField(`recognition:game:${gameId}:player:${player.uid}`, 'currentCredits', 100 + scores.finalScore, { collection: collections.RECOGNITION_PLAYERS });
	}

	// Calculate ranks
	const updatedPlayers = await db.getObjects(playerKeys, { collection: collections.RECOGNITION_PLAYERS });
	const sorted = updatedPlayers
		.filter(Boolean)
		.sort((a, b) => b.finalScore - a.finalScore);

	for (let i = 0; i < sorted.length; i++) {
		await db.setObjectField(
			`recognition:game:${gameId}:player:${sorted[i].uid}`,
			'rank',
			i + 1,
			{ collection: collections.RECOGNITION_PLAYERS }
		);
	}

	// Update game status
	await db.setObjectField(`recognition:game:${gameId}`, 'status', 'ended', { collection: collections.RECOGNITION_GAMES });

	return { winner: sorted[0] };
};

// ==========================================
// PLAYER MANAGEMENT
// ==========================================

/**
 * Join game
 */
Recognition.join = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const game = await Recognition.getCurrentGame();
	if (!game || !game.canJoin) {
		throw new Error('[[error:game-not-available]]');
	}

	// Check if already joined
	const existing = await db.getObject(
		`recognition:game:${game.gameId}:player:${caller.uid}`,
		[],
		{ collection: collections.RECOGNITION_PLAYERS }
	);

	if (existing) {
		return existing;
	}

	const timestamp = utils.date.now();

	const player = {
		gameId: game.gameId,
		uid: caller.uid,
		username: caller.username,
		picture: caller.picture,
		startingCredits: 100,
		currentCredits: 100,
		questionsCreated: 0,
		questionsBet: 0,
		questionsAnswered: 0,
		correctAnswers: 0,
		wrongAnswers: 0,
		totalBet: 0,
		questionMasterScore: 0,
		detectiveScore: 0,
		finalScore: 0,
		rank: 0,
		joinedAt: timestamp,
		lastActivity: timestamp,
		hasSubmittedQuestions: false,
		isActive: true,
	};

	await db.setObject(
		`recognition:game:${game.gameId}:player:${caller.uid}`,
		player,
		{ collection: collections.RECOGNITION_PLAYERS }
	);

	// Add to players sorted set
	await db.sortedSetAdd(`recognition:game:${game.gameId}:players`, timestamp, caller.uid);

	// Increment total players
	await db.incrObjectField(`recognition:game:${game.gameId}`, 'totalPlayers', { collection: collections.RECOGNITION_GAMES });

	return player;
};

// ==========================================
// QUESTION MANAGEMENT
// ==========================================

/**
 * Submit questions
 */
Recognition.submitQuestions = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const { questions } = data;

	const game = await Recognition.getCurrentGame();
	if (!game || game.status !== 'setup') {
		throw new Error('[[error:game-not-available]]');
	}

	// Check if player exists
	const player = await db.getObject(
		`recognition:game:${game.gameId}:player:${caller.uid}`,
		[],
		{ collection: collections.RECOGNITION_PLAYERS }
	);

	if (!player) {
		throw new Error('[[error:must-join-game-first]]');
	}

	// Check if already submitted
	if (player.hasSubmittedQuestions) {
		throw new Error('[[error:already-submitted-questions]]');
	}

	// Validate user can't create questions about themselves
	const selfQuestions = questions.filter(q => q.subjectUid === caller.uid);
	if (selfQuestions.length > 0) {
		throw new Error('[[error:cannot-create-questions-about-yourself]]');
	}

	// Calculate total bet
	const totalBet = questions.reduce((sum, q) => sum + q.difficulty, 0);
	if (totalBet !== 100) {
		throw new Error('[[error:total-must-equal-100]]');
	}

	const timestamp = utils.date.now();
	const questionIds = [];

	// Create questions
	for (const q of questions) {
		const qId = await db.incrObjectField('global', 'nextRecognitionQuestionId');

		const questionDoc = {
			qId,
			gameId: game.gameId,
			creatorUid: caller.uid,
			subjectUid: q.subjectUid,
			statement: q.statement,
			difficulty: q.difficulty,
			createdAt: timestamp,
			updatedAt: timestamp,
			timesShown: 0,
			correctGuesses: 0,
			wrongGuesses: 0,
			accuracy: 0,
		};

		await db.setObject(
			`recognition:question:${qId}`,
			questionDoc,
			{ collection: collections.RECOGNITION_QUESTIONS }
		);

		// Add to game's questions set
		await db.sortedSetAdd(`recognition:game:${game.gameId}:questions`, timestamp, qId);

		questionIds.push(qId);
	}

	// Update player
	await db.setObjectField(`recognition:game:${game.gameId}:player:${caller.uid}`, 'questionsCreated', questions.length, { collection: collections.RECOGNITION_PLAYERS });
	await db.setObjectField(`recognition:game:${game.gameId}:player:${caller.uid}`, 'questionsBet', totalBet, { collection: collections.RECOGNITION_PLAYERS });
	await db.setObjectField(`recognition:game:${game.gameId}:player:${caller.uid}`, 'hasSubmittedQuestions', true, { collection: collections.RECOGNITION_PLAYERS });
	await db.setObjectField(`recognition:game:${game.gameId}:player:${caller.uid}`, 'lastActivity', timestamp, { collection: collections.RECOGNITION_PLAYERS });

	return { questionsCreated: questions.length, totalBet, questionIds };
};

/**
 * Get user's submitted questions
 */
Recognition.getMyQuestions = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const game = await Recognition.getCurrentGame();
	if (!game) {
		throw new Error('[[error:no-active-game]]');
	}

	// Get all question IDs for this game
	const questionIds = await db.getSortedSetMembers(`recognition:game:${game.gameId}:questions`);

	// Get question data
	const questionKeys = questionIds.map(qId => `recognition:question:${qId}`);
	const allQuestions = await db.getObjects(questionKeys, { collection: collections.RECOGNITION_QUESTIONS });

	// Filter by creator
	const myQuestions = allQuestions.filter(q => q && q.creatorUid === caller.uid);
	const totalBet = myQuestions.reduce((sum, q) => sum + q.difficulty, 0);

	const canEdit = game.status === 'setup';

	return { questions: myQuestions, totalBet, canEdit };
};

/**
 * Update questions (before game starts)
 */
Recognition.updateMyQuestions = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const game = await Recognition.getCurrentGame();
	if (!game || game.status !== 'setup') {
		throw new Error('[[error:cannot-update-after-start]]');
	}

	// Delete existing questions
	const questionIds = await db.getSortedSetMembers(`recognition:game:${game.gameId}:questions`);
	const questionKeys = questionIds.map(qId => `recognition:question:${qId}`);
	const allQuestions = await db.getObjects(questionKeys, { collection: collections.RECOGNITION_QUESTIONS });

	const myQuestionIds = allQuestions
		.map((q, idx) => q && q.creatorUid === caller.uid ? questionIds[idx] : null)
		.filter(Boolean);

	for (const qId of myQuestionIds) {
		await db.delete(`recognition:question:${qId}`, { collection: collections.RECOGNITION_QUESTIONS });
		await db.sortedSetRemove(`recognition:game:${game.gameId}:questions`, qId);
	}

	// Reset player submission status
	await db.setObjectField(`recognition:game:${game.gameId}:player:${caller.uid}`, 'hasSubmittedQuestions', false, { collection: collections.RECOGNITION_PLAYERS });

	// Submit new questions
	return await Recognition.submitQuestions(caller, data);
};

/**
 * Delete questions (before game starts)
 */
Recognition.deleteMyQuestions = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const game = await Recognition.getCurrentGame();
	if (!game || game.status !== 'setup') {
		throw new Error('[[error:cannot-delete-after-start]]');
	}

	// Delete questions
	const questionIds = await db.getSortedSetMembers(`recognition:game:${game.gameId}:questions`);
	const questionKeys = questionIds.map(qId => `recognition:question:${qId}`);
	const allQuestions = await db.getObjects(questionKeys, { collection: collections.RECOGNITION_QUESTIONS });

	const myQuestionIds = allQuestions
		.map((q, idx) => q && q.creatorUid === caller.uid ? questionIds[idx] : null)
		.filter(Boolean);

	for (const qId of myQuestionIds) {
		await db.delete(`recognition:question:${qId}`, { collection: collections.RECOGNITION_QUESTIONS });
		await db.sortedSetRemove(`recognition:game:${game.gameId}:questions`, qId);
	}

	// Update player
	await db.setObjectField(`recognition:game:${game.gameId}:player:${caller.uid}`, 'questionsCreated', 0, { collection: collections.RECOGNITION_PLAYERS });
	await db.setObjectField(`recognition:game:${game.gameId}:player:${caller.uid}`, 'questionsBet', 0, { collection: collections.RECOGNITION_PLAYERS });
	await db.setObjectField(`recognition:game:${game.gameId}:player:${caller.uid}`, 'hasSubmittedQuestions', false, { collection: collections.RECOGNITION_PLAYERS });
	await db.setObjectField(`recognition:game:${game.gameId}:player:${caller.uid}`, 'lastActivity', utils.date.now(), { collection: collections.RECOGNITION_PLAYERS });

	return { success: true };
};

// ==========================================
// GAMEPLAY
// ==========================================

/**
 * Get next question for player
 */
Recognition.getNextQuestion = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const game = await Recognition.getCurrentGame();
	if (!game || game.status !== 'active') {
		throw new Error('[[error:game-not-active]]');
	}

	// Get player's assignment
	const assignment = await db.getObject(
		`recognition:game:${game.gameId}:assignment:${caller.uid}`,
		[],
		{ collection: collections.RECOGNITION_ASSIGNMENTS }
	);

	if (!assignment) {
		throw new Error('[[error:no-questions-assigned]]');
	}

	// Find next unanswered question
	const nextQuestion = assignment.assignedQuestions.find(q => !q.answered);
	if (!nextQuestion) {
		throw new Error('[[error:all-questions-answered]]');
	}

	// Get question details
	const question = await db.getObject(
		`recognition:question:${nextQuestion.questionId}`,
		[],
		{ collection: collections.RECOGNITION_QUESTIONS }
	);

	if (!question) {
		throw new Error('[[error:question-not-found]]');
	}

	// Get correct user
	const correctUser = await user.getUserFields(question.subjectUid, ['uid', 'username', 'picture']);

	// Get 3 random wrong users
	const allUserUids = await db.getSortedSetMembers(`recognition:game:${game.gameId}:players`);
	const wrongUserUids = allUserUids
		.filter(uid => parseInt(uid, 10) !== question.subjectUid)
		.sort(() => Math.random() - 0.5)
		.slice(0, 3);

	const wrongUsers = await user.getUsersFields(wrongUserUids, ['uid', 'username', 'picture']);

	// Shuffle options
	const options = [correctUser, ...wrongUsers].sort(() => Math.random() - 0.5);

	// Mark as shown
	const updatedQuestions = assignment.assignedQuestions.map(q =>
		q.questionId === nextQuestion.questionId ? { ...q, shown: true } : q
	);

	await db.setObjectField(
		`recognition:game:${game.gameId}:assignment:${caller.uid}`,
		'assignedQuestions',
		updatedQuestions,
		{ collection: collections.RECOGNITION_ASSIGNMENTS }
	);

	// Increment times shown
	await db.incrObjectField(`recognition:question:${nextQuestion.questionId}`, 'timesShown', { collection: collections.RECOGNITION_QUESTIONS });

	const answeredCount = assignment.assignedQuestions.filter(q => q.answered).length;

	return {
		questionId: nextQuestion.questionId.toString(),
		questionNumber: nextQuestion.order,
		totalQuestions: assignment.assignedQuestions.length,
		statement: question.statement,
		options,
		questionsAnswered: answeredCount,
		questionsRemaining: assignment.assignedQuestions.length - answeredCount,
	};
};

/**
 * Submit answer
 */
Recognition.submitAnswer = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const { questionId, guessedUid, creditsBet } = data;

	const game = await Recognition.getCurrentGame();
	if (!game || game.status !== 'active') {
		throw new Error('[[error:game-not-active]]');
	}

	// Get question
	const question = await db.getObject(
		`recognition:question:${questionId}`,
		[],
		{ collection: collections.RECOGNITION_QUESTIONS }
	);

	if (!question) {
		throw new Error('[[error:question-not-found]]');
	}

	// Check if already answered
	const answerId = `${game.gameId}:${caller.uid}:${questionId}`;
	const existingAnswer = await db.getObject(
		`recognition:answer:${answerId}`,
		[],
		{ collection: collections.RECOGNITION_ANSWERS }
	);

	if (existingAnswer) {
		throw new Error('[[error:already-answered]]');
	}

	// Check if correct
	const correct = guessedUid === question.subjectUid;

	// Calculate credits
	let creditsWon = 0;
	let creditsLost = 0;
	let netGain = 0;

	if (correct) {
		creditsWon = question.difficulty;
		netGain = creditsWon;
	} else {
		creditsLost = creditsBet;
		netGain = -creditsLost;
	}

	// Get usernames
	const [guessedUser, subjectUser, creatorUser] = await user.getUsersFields(
		[guessedUid, question.subjectUid, question.creatorUid],
		['username']
	);

	const timestamp = utils.date.now();

	// Save answer
	const answer = {
		answerId,
		gameId: game.gameId,
		answererId: caller.uid,
		answererUsername: caller.username,
		questionId,
		questionStatement: question.statement,
		creatorUid: question.creatorUid,
		creatorUsername: creatorUser?.username || 'Unknown',
		creatorDifficulty: question.difficulty,
		subjectUid: question.subjectUid,
		subjectUsername: subjectUser?.username || 'Unknown',
		guessedUid,
		guessedUsername: guessedUser?.username || 'Unknown',
		creditsBet,
		correct,
		creditsWon,
		creditsLost,
		netGain,
		answeredAt: timestamp,
	};

	await db.setObject(
		`recognition:answer:${answerId}`,
		answer,
		{ collection: collections.RECOGNITION_ANSWERS }
	);

	// Update question stats
	if (correct) {
		await db.incrObjectField(`recognition:question:${questionId}`, 'correctGuesses', { collection: collections.RECOGNITION_QUESTIONS });
	} else {
		await db.incrObjectField(`recognition:question:${questionId}`, 'wrongGuesses', { collection: collections.RECOGNITION_QUESTIONS });
	}

	// Mark question as answered in assignment
	const assignment = await db.getObject(
		`recognition:game:${game.gameId}:assignment:${caller.uid}`,
		[],
		{ collection: collections.RECOGNITION_ASSIGNMENTS }
	);

	const updatedQuestions = assignment.assignedQuestions.map(q =>
		q.questionId === questionId ? { ...q, answered: true } : q
	);

	await db.setObjectField(
		`recognition:game:${game.gameId}:assignment:${caller.uid}`,
		'assignedQuestions',
		updatedQuestions,
		{ collection: collections.RECOGNITION_ASSIGNMENTS }
	);

	// Update player stats
	await db.incrObjectField(`recognition:game:${game.gameId}:player:${caller.uid}`, 'questionsAnswered', { collection: collections.RECOGNITION_PLAYERS });
	await db.incrObjectField(`recognition:game:${game.gameId}:player:${caller.uid}`, 'currentCredits', netGain, { collection: collections.RECOGNITION_PLAYERS });
	await db.incrObjectField(`recognition:game:${game.gameId}:player:${caller.uid}`, 'totalBet', creditsBet, { collection: collections.RECOGNITION_PLAYERS });

	if (correct) {
		await db.incrObjectField(`recognition:game:${game.gameId}:player:${caller.uid}`, 'correctAnswers', { collection: collections.RECOGNITION_PLAYERS });
	} else {
		await db.incrObjectField(`recognition:game:${game.gameId}:player:${caller.uid}`, 'wrongAnswers', { collection: collections.RECOGNITION_PLAYERS });
	}

	await db.setObjectField(`recognition:game:${game.gameId}:player:${caller.uid}`, 'lastActivity', timestamp, { collection: collections.RECOGNITION_PLAYERS });

	// Get updated player
	const player = await db.getObject(
		`recognition:game:${game.gameId}:player:${caller.uid}`,
		[],
		{ collection: collections.RECOGNITION_PLAYERS }
	);

	const answeredCount = updatedQuestions.filter(q => q.answered).length;

	return {
		correct,
		correctUid: question.subjectUid,
		correctUsername: subjectUser?.username || 'Unknown',
		creatorUid: question.creatorUid,
		creatorUsername: creatorUser?.username || 'Unknown',
		creatorDifficulty: question.difficulty,
		yourBet: creditsBet,
		creditsWon,
		creditsLost,
		netGain,
		previousCredits: player.currentCredits - netGain,
		newCredits: player.currentCredits,
		questionsAnswered: answeredCount,
		questionsRemaining: assignment.assignedQuestions.length - answeredCount,
	};
};

// ==========================================
// STATS & LEADERBOARD
// ==========================================

/**
 * Calculate player scores
 */
Recognition.calculatePlayerScores = async (gameId, uid) => {
	// Question Master Score: Net from their questions
	const questionIds = await db.getSortedSetMembers(`recognition:game:${gameId}:questions`);
	const questionKeys = questionIds.map(qId => `recognition:question:${qId}`);
	const allQuestions = await db.getObjects(questionKeys, { collection: collections.RECOGNITION_QUESTIONS });

	const myQuestions = allQuestions
		.map((q, idx) => ({ ...q, qId: questionIds[idx] }))
		.filter(q => q && q.creatorUid === uid);

	let questionMasterScore = 0;

	for (const question of myQuestions) {
		// Get all answers to this question
		const playerUids = await db.getSortedSetMembers(`recognition:game:${gameId}:players`);

		for (const pUid of playerUids) {
			const answerId = `${gameId}:${pUid}:${question.qId}`;
			const answer = await db.getObject(
				`recognition:answer:${answerId}`,
				[],
				{ collection: collections.RECOGNITION_ANSWERS }
			);

			if (answer) {
				if (answer.correct) {
					questionMasterScore -= question.difficulty;
				} else {
					questionMasterScore += answer.creditsBet;
				}
			}
		}
	}

	// Detective Score: Net from answering
	const answerKeys = questionIds.map(qId => `recognition:answer:${gameId}:${uid}:${qId}`);
	const myAnswers = await db.getObjects(answerKeys, { collection: collections.RECOGNITION_ANSWERS });

	const detectiveScore = myAnswers
		.filter(Boolean)
		.reduce((sum, answer) => sum + answer.netGain, 0);

	return {
		questionMasterScore,
		detectiveScore,
		finalScore: questionMasterScore + detectiveScore,
	};
};

/**
 * Get my current stats
 */
Recognition.getMyStats = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const game = await Recognition.getCurrentGame();
	if (!game) {
		throw new Error('[[error:no-active-game]]');
	}

	const player = await db.getObject(
		`recognition:game:${game.gameId}:player:${caller.uid}`,
		[],
		{ collection: collections.RECOGNITION_PLAYERS }
	);

	if (!player) {
		throw new Error('[[error:player-not-found]]');
	}

	const scores = await Recognition.calculatePlayerScores(game.gameId, caller.uid);

	const accuracy = player.questionsAnswered > 0
		? Math.round((player.correctAnswers / player.questionsAnswered) * 100)
		: 0;

	return {
		credits: player.currentCredits,
		questionsAnswered: player.questionsAnswered,
		correctAnswers: player.correctAnswers,
		wrongAnswers: player.wrongAnswers,
		accuracy,
		questionMasterScore: scores.questionMasterScore,
		detectiveScore: scores.detectiveScore,
		rank: player.rank || 0,
	};
};

/**
 * Get live leaderboard
 */
Recognition.getLeaderboard = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const { limit = 10 } = data;

	const game = await Recognition.getCurrentGame();
	if (!game) {
		throw new Error('[[error:no-active-game]]');
	}

	// Get all players
	const playerUids = await db.getSortedSetMembers(`recognition:game:${game.gameId}:players`);
	const playerKeys = playerUids.map(uid => `recognition:game:${game.gameId}:player:${uid}`);
	const players = await db.getObjects(playerKeys, { collection: collections.RECOGNITION_PLAYERS });

	// Calculate current scores for each
	const playersWithScores = await Promise.all(
		players.filter(Boolean).map(async (player) => {
			const scores = await Recognition.calculatePlayerScores(game.gameId, player.uid);
			const accuracy = player.questionsAnswered > 0
				? Math.round((player.correctAnswers / player.questionsAnswered) * 100)
				: 0;

			return {
				...player,
				questionMasterScore: scores.questionMasterScore,
				detectiveScore: scores.detectiveScore,
				finalScore: scores.finalScore,
				currentCredits: 100 + scores.finalScore,
				accuracy,
			};
		})
	);

	// Sort by final score
	playersWithScores.sort((a, b) => b.finalScore - a.finalScore);

	// Assign ranks
	playersWithScores.forEach((player, index) => {
		player.rank = index + 1;
	});

	const leaderboard = playersWithScores.slice(0, limit).map(p => ({
		rank: p.rank,
		uid: p.uid,
		username: p.username,
		picture: p.picture,
		credits: p.currentCredits,
		questionMasterScore: p.questionMasterScore,
		detectiveScore: p.detectiveScore,
		questionsAnswered: p.questionsAnswered,
		accuracy: p.accuracy,
	}));

	const myPlayer = playersWithScores.find(p => p.uid === caller.uid);

	return {
		leaderboard,
		totalPlayers: playersWithScores.length,
		myRank: myPlayer ? myPlayer.rank : 0,
		lastUpdate: utils.date.now(),
	};
};

/**
 * Get all users for dropdown
 */
Recognition.getAllUsers = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const users = await user.getUsersFromSet('users:joindate', caller.uid, 0, 499);

	return {
		users: users.map(u => ({
			uid: u.uid,
			username: u.username,
			displayname: u.displayname || u.username,
			picture: u.picture,
		})),
	};
};

/**
 * Get game status
 */
Recognition.getStatus = async (caller, data) => {
	const game = await Recognition.getCurrentGame();

	if (!game) {
		return {
			status: 'none',
			message: 'No active game',
		};
	}

	const now = Date.now();
	let status = game.status;
	let timeRemaining = 0;

	if (now < game.startTime) {
		status = 'setup';
		timeRemaining = Math.floor((game.startTime - now) / 1000);
	} else if (now >= game.startTime && now < game.endTime) {
		status = 'active';
		timeRemaining = Math.floor((game.endTime - now) / 1000);
	} else {
		status = 'ended';
	}

	return {
		status,
		gameId: game.gameId,
		timeRemaining,
		startTime: game.startTime,
		endTime: game.endTime,
	};
};