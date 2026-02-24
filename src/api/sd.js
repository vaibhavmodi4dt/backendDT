'use strict';

const db = require('../database');
const utils = require('../utils');
const user = require('../user');
const collections = require('../database/mongo/collections');
const moment = require('moment');

const SD = module.exports;

// ============================================================================
// HELPERS
// ============================================================================

SD.getWeekStart = (timestamp) => {
	return moment(timestamp).startOf('isoWeek').format('YYYY-MM-DD');
};

SD.buildTopicResponse = async (topicData) => {
	// Get pitch count for this topic's week
	const pitchCount = await db.sortedSetCard(`sd:pitches:weekstart:${topicData.weekStart}:topic:${topicData.topicId}`);

	return {
		_id: topicData.topicId,
		title: topicData.title,
		description: topicData.description,
		createdBy: String(topicData.createdBy),
		weekStart: topicData.weekStart,
		week: moment(topicData.weekStart).isoWeek(),
		createdAt: topicData.createdAt,
		updatedAt: topicData.updatedAt,
		isActive: topicData.isActive,
		pitchCount,
	};
};

SD.buildPitchResponse = async (pitchData) => {
	// Get user details
	const userFields = ['username', 'displayname', 'picture'];
	const userData = await user.getUserFields(pitchData.userId, userFields);

	return {
		_id: pitchData.pitchId,
		topicId: pitchData.topicId,
		userId: String(pitchData.userId),
		description: pitchData.description,
		weekStart: pitchData.weekStart,
		createdAt: pitchData.createdAt,
		updatedAt: pitchData.updatedAt,
		user: userData,
	};
};

SD.buildTopicWithPitches = async (topicData) => {
	const baseResponse = await SD.buildTopicResponse(topicData);

	// Get all pitches for this topic's week
	const pitchIds = await db.getSortedSetRevRange(`sd:pitches:weekstart:${topicData.weekStart}:topic:${topicData.topicId}`, 0, -1);

	const pitches = await Promise.all(
		pitchIds.map(async (pitchId) => {
			const pitchData = await db.getObject(`sd:pitch:${pitchId}`, [], { collection: collections.SD_PITCHES });
			if (!pitchData) return null;
			return SD.buildPitchResponse(pitchData);
		})
	);

	return {
		...baseResponse,
		pitches: pitches.filter(Boolean),
	};
};

SD.ensureAdminOrManager = async (req) => {
	if (!req.uid) throw new Error('[[error:not-logged-in]]');
	db.isManager(req.uid);
};

// ============================================================================
// TOPIC OPERATIONS
// ============================================================================

SD.createTopic = async (req, data) => {
	await SD.ensureAdminOrManager(req);

	// Deactivate current active topic
	const activeTopicIds = await db.getSortedSetRange('sd:topics:active', 0, -1);
	if (activeTopicIds.length > 0) {
		await Promise.all(activeTopicIds.map(async (topicId) => {
			const topic = await db.getObject(`sd:topic:${topicId}`, [], { collection: collections.SD_PITCHES });
			if (topic) {
				topic.isActive = false;
				await db.setObject(`sd:topic:${topicId}`, topic, { collection: collections.SD_PITCHES });
			}
		}));
		await db.delete('sd:topics:active');
	}

	const timestamp = utils.date.now();
	const weekStart = SD.getWeekStart(timestamp);
	const topicId = String(await db.incrObjectField('global', 'nextSDTopicId'));

	const topicData = {
		topicId,
		type: 'topic',
		title: data.title,
		description: data.description,
		createdBy: req.uid,
		weekStart,
		createdAt: timestamp,
		updatedAt: timestamp,
		isActive: true,
	};

	await Promise.all([
		db.setObject(`sd:topic:${topicId}`, topicData, { collection: collections.SD_PITCHES }),
		db.sortedSetAdd(`sd:topics:weekstart:${weekStart}`, timestamp, topicId),
		db.sortedSetAdd('sd:topics:active', timestamp, topicId),
	]);

	return SD.buildTopicResponse(topicData);
};

SD.getActiveTopic = async (req) => {
	if (!req.uid) throw new Error('[[error:not-logged-in]]');

	const topicIds = await db.getSortedSetRevRange('sd:topics:active', 0, 0);
	if (!topicIds || topicIds.length === 0) {
		return null;
	}

	const topicId = topicIds[0];
	const topicData = await db.getObject(`sd:topic:${topicId}`, [], { collection: collections.SD_PITCHES });

	if (!topicData) {
		return null;
	}

	return SD.buildTopicWithPitches(topicData);
};

SD.getTopicById = async (req, topicId) => {
	if (!req.uid) throw new Error('[[error:not-logged-in]]');

	const topicData = await db.getObject(`sd:topic:${topicId}`, [], { collection: collections.SD_PITCHES });
	if (!topicData || topicData.type !== 'topic') {
		throw new Error('[[error:no-topic]]');
	}

	return SD.buildTopicWithPitches(topicData);
};

SD.listTopics = async (req, weekStart) => {
	if (!req.uid) throw new Error('[[error:not-logged-in]]');

	const page = parseInt(req.query.page, 10) || 1;
	const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

	const start = (page - 1) * limit;
	const end = start + limit - 1;

	const topicIds = await db.getSortedSetRevRange(`sd:topics:weekstart:${weekStart}`, start, end);
	const total = await db.sortedSetCard(`sd:topics:weekstart:${weekStart}`);

	const topics = await Promise.all(
		topicIds.map(async (topicId) => {
			const topicData = await db.getObject(`sd:topic:${topicId}`, [], { collection: collections.SD_PITCHES });
			if (!topicData) return null;
			return SD.buildTopicWithPitches(topicData);
		})
	);

	return {
		data: topics.filter(Boolean),
		pagination: {
			page,
			limit,
			total,
			hasNext: end < total - 1,
			hasPrev: page > 1,
		},
	};
};

SD.updateTopic = async (req, topicId, data) => {
	await SD.ensureAdminOrManager(req);

	const topicData = await db.getObject(`sd:topic:${topicId}`, [], { collection: collections.SD_PITCHES });
	if (!topicData || topicData.type !== 'topic') {
		throw new Error('[[error:no-topic]]');
	}

	const updates = {
		title: data.title,
		description: data.description,
		updatedAt: utils.date.now(),
	};

	await db.setObject(`sd:topic:${topicId}`, updates, { collection: collections.SD_PITCHES });

	return SD.buildTopicResponse({ ...topicData, ...updates });
};

SD.deleteTopic = async (req, topicId) => {
	await SD.ensureAdminOrManager(req);

	const topicData = await db.getObject(`sd:topic:${topicId}`, [], { collection: collections.SD_PITCHES });
	if (!topicData || topicData.type !== 'topic') {
		throw new Error('[[error:no-topic]]');
	}

	// Delete all pitches for this topic's week
	const pitchIds = await db.getSortedSetRange(`sd:pitches:weekstart:${topicData.weekStart}:topic:${topicId}`, 0, -1);
	await Promise.all(pitchIds.map(async (pitchId) => {
		const pitchData = await db.getObject(`sd:pitch:${pitchId}`, [], { collection: collections.SD_PITCHES });
		if (pitchData) {
			await Promise.all([
				db.delete(`sd:pitch:${pitchId}`),
				db.sortedSetRemove(`sd:pitches:weekstart:${topicData.weekStart}`, pitchId),
				db.sortedSetRemove(`uid:${pitchData.userId}:sd:pitches:weekstart:${topicData.weekStart}`, pitchId),
			]);
		}
	}));

	// Delete topic
	await Promise.all([
		db.delete(`sd:topic:${topicId}`),
		db.sortedSetRemove(`sd:topics:weekstart:${topicData.weekStart}`, topicId),
		db.sortedSetRemove('sd:topics:active', topicId),
	]);

	return { success: true };
};

// ============================================================================
// PITCH OPERATIONS
// ============================================================================

SD.createPitch = async (req, data) => {
	if (!req.uid) throw new Error('[[error:not-logged-in]]');

	// Check if topic exists
	const topicData = await db.getObject(`sd:topic:${data.topicId}`, [], { collection: collections.SD_PITCHES });
	if (!topicData || topicData.type !== 'topic') {
		throw new Error('[[error:no-topic]]');
	}

	// Check if user already has a pitch for this topic's week
	const existingPitchIds = await db.getSortedSetRange(`sd:pitches:weekstart:${topicData.weekStart}:topic:${data.topicId}`, 0, -1);
	for (const pitchId of existingPitchIds) {
		const existingPitch = await db.getObject(`sd:pitch:${pitchId}`, [], { collection: collections.SD_PITCHES });
		if (existingPitch && existingPitch.userId === req.uid) {
			throw new Error('[[error:already-submitted-pitch]]');
		}
	}

	const timestamp = utils.date.now();
	const weekStart = topicData.weekStart;
	const pitchId = String(await db.incrObjectField('global', 'nextSDPitchId'));

	const pitchData = {
		pitchId,
		type: 'pitch',
		topicId: data.topicId,
		userId: req.uid,
		description: data.description,
		weekStart,
		createdAt: timestamp,
		updatedAt: timestamp,
	};

	await Promise.all([
		db.setObject(`sd:pitch:${pitchId}`, pitchData, { collection: collections.SD_PITCHES }),
		db.sortedSetAdd(`sd:pitches:weekstart:${weekStart}:topic:${data.topicId}`, timestamp, pitchId),
		db.sortedSetAdd(`sd:pitches:weekstart:${weekStart}`, timestamp, pitchId),
		db.sortedSetAdd(`uid:${req.uid}:sd:pitches:weekstart:${weekStart}`, timestamp, pitchId),
	]);

	return SD.buildPitchResponse(pitchData);
};

SD.getPitchById = async (req, pitchId) => {
	if (!req.uid) throw new Error('[[error:not-logged-in]]');

	const pitchData = await db.getObject(`sd:pitch:${pitchId}`, [], { collection: collections.SD_PITCHES });
	if (!pitchData || pitchData.type !== 'pitch') {
		throw new Error('[[error:no-pitch]]');
	}

	return SD.buildPitchResponse(pitchData);
};

SD.listPitchesByTopic = async (req, topicId, weekStart) => {
	if (!req.uid) throw new Error('[[error:not-logged-in]]');

	// Verify topic exists
	const topicData = await db.getObject(`sd:topic:${topicId}`, [], { collection: collections.SD_PITCHES });
	if (!topicData || topicData.type !== 'topic') {
		throw new Error('[[error:no-topic]]');
	}

	const page = parseInt(req.query.page, 10) || 1;
	const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

	const start = (page - 1) * limit;
	const end = start + limit - 1;

	const pitchIds = await db.getSortedSetRevRange(`sd:pitches:weekstart:${weekStart}:topic:${topicId}`, start, end);
	const total = await db.sortedSetCard(`sd:pitches:weekstart:${weekStart}:topic:${topicId}`);

	const pitches = await Promise.all(
		pitchIds.map(async (pitchId) => {
			const pitchData = await db.getObject(`sd:pitch:${pitchId}`, [], { collection: collections.SD_PITCHES });
			if (!pitchData) return null;
			return SD.buildPitchResponse(pitchData);
		})
	);

	return {
		data: pitches.filter(Boolean),
		pagination: {
			page,
			limit,
			total,
			hasNext: end < total - 1,
			hasPrev: page > 1,
		},
	};
};

SD.getMyPitch = async (req, topicId) => {
	if (!req.uid) throw new Error('[[error:not-logged-in]]');

	// Get topic to find its weekStart
	const topicData = await db.getObject(`sd:topic:${topicId}`, [], { collection: collections.SD_PITCHES });
	if (!topicData || topicData.type !== 'topic') {
		throw new Error('[[error:no-topic]]');
	}

	const pitchIds = await db.getSortedSetRange(`sd:pitches:weekstart:${topicData.weekStart}:topic:${topicId}`, 0, -1);
	for (const pitchId of pitchIds) {
		const pitchData = await db.getObject(`sd:pitch:${pitchId}`, [], { collection: collections.SD_PITCHES });
		if (pitchData && pitchData.type === 'pitch' && pitchData.userId === req.uid) {
			return SD.buildPitchResponse(pitchData);
		}
	}

	return null;
};

SD.updatePitch = async (req, pitchId, data) => {
	if (!req.uid) throw new Error('[[error:not-logged-in]]');

	const pitchData = await db.getObject(`sd:pitch:${pitchId}`, [], { collection: collections.SD_PITCHES });
	if (!pitchData || pitchData.type !== 'pitch') {
		throw new Error('[[error:no-pitch]]');
	}

	if (pitchData.userId !== req.uid) {
		throw new Error('[[error:no-privileges]]');
	}

	const updates = {
		description: data.description,
		updatedAt: utils.date.now(),
	};

	await db.setObject(`sd:pitch:${pitchId}`, updates, { collection: collections.SD_PITCHES });

	return SD.buildPitchResponse({ ...pitchData, ...updates });
};

SD.deletePitch = async (req, pitchId) => {
	if (!req.uid) throw new Error('[[error:not-logged-in]]');

	const pitchData = await db.getObject(`sd:pitch:${pitchId}`, [], { collection: collections.SD_PITCHES });
	if (!pitchData || pitchData.type !== 'pitch') {
		throw new Error('[[error:no-pitch]]');
	}

	if (pitchData.userId !== req.uid) {
		const isAdmin = await user.isAdministrator(req.uid);
		if (!isAdmin) {
			throw new Error('[[error:no-privileges]]');
		}
	}

	await Promise.all([
		db.delete(`sd:pitch:${pitchId}`),
		db.sortedSetRemove(`sd:pitches:weekstart:${pitchData.weekStart}:topic:${pitchData.topicId}`, pitchId),
		db.sortedSetRemove(`sd:pitches:weekstart:${pitchData.weekStart}`, pitchId),
		db.sortedSetRemove(`uid:${pitchData.userId}:sd:pitches:weekstart:${pitchData.weekStart}`, pitchId),
	]);

	return { success: true };
};
