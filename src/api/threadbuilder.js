'use strict';

const db = require('../database');
const user = require('../user');
const collections = require('../database/mongo/collections');
const pagination = require('../pagination');
const utils = require('../utils');


const ThreadBuilder = module.exports;

// ==========================================
// CREATE
// ==========================================

ThreadBuilder.create = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const { meta, threads, stats, config } = data;

	// Generate new ThreadBuilder ID
	const tbId = await db.incrObjectField('global', 'nextTbId');
	const timestamp = utils.date.now();

	// Prepare ThreadBuilder data
	const threadBuilderData = {
		tbId: tbId,
		uid: caller.uid,
		meta: meta,
		threads: threads,
		stats: stats,
		config: config || {},
		createdAt: timestamp,
		updatedAt: timestamp,
	};

	// Store in database
	await db.setObject(
		`threadbuilder:${tbId}`,
		threadBuilderData,
		{ collection: collections.THREADBUILDERS }
	);

	// Add to user's sorted set (sorted by updatedAt)
	await db.sortedSetAdd(`uid:${caller.uid}:threadbuilders`, timestamp, tbId);

	// Add to global sorted set
	await db.sortedSetAdd('threadbuilders:sorted', timestamp, tbId);


	return {
		_id: String(tbId),
		...threadBuilderData,
	};
};

// ==========================================
// GET BY ID
// ==========================================

ThreadBuilder.get = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const { id } = data;
	const tbId = parseInt(id, 10);

	// Get ThreadBuilder from database
	const threadBuilderData = await db.getObject(
		`threadbuilder:${tbId}`,
		[],
		{ collection: collections.THREADBUILDERS }
	);

	if (!threadBuilderData) {
		throw new Error('[[error:threadbuilder-not-found]]');
	}

	// Check ownership
	if (parseInt(threadBuilderData.uid, 10) !== parseInt(caller.uid, 10)) {
		throw new Error('[[error:no-privileges]]');
	}

	return {
		_id: String(tbId),
		...threadBuilderData,
	};
};

// ==========================================
// LIST (with pagination)
// ==========================================

ThreadBuilder.list = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const page = parseInt(data.page, 10) || 1;
	const limit = Math.min(parseInt(data.limit, 10) || 20, 100); // Max 100 per page

	// Calculate pagination
	const start = Math.max(0, (page - 1) * limit);
	const stop = start + limit - 1;

	// Get total count
	const total = await db.sortedSetCard(`uid:${caller.uid}:threadbuilders`);
	const pageCount = Math.ceil(total / limit);

	// Get ThreadBuilder IDs (sorted by updatedAt, newest first)
	const tbIds = await db.getSortedSetRevRange(
		`uid:${caller.uid}:threadbuilders`,
		start,
		stop
	);

	// Get ThreadBuilder data
	let threadBuilders = [];
	if (tbIds.length > 0) {
		const keys = tbIds.map(id => `threadbuilder:${id}`);
		const data = await Promise.all(
			keys.map(key => db.getObject(key, [], { collection: collections.THREADBUILDERS }))
		);

		threadBuilders = data
			.filter(Boolean)
			.map((tb, index) => ({
				_id: String(tbIds[index]),
				uid: tb.uid,
				meta: tb.meta,
				stats: {
					count: tb.stats.count,
				},
				createdAt: tb.createdAt,
				updatedAt: tb.updatedAt,
			}));
	}

	// Create pagination object
	const paginationData = pagination.create(page, pageCount, { page, limit });

	return {
		threadbuilders: threadBuilders,
		pagination: paginationData,
	};
};

// ==========================================
// LIST ALL (Global - Admin/Public)
// ==========================================

ThreadBuilder.listAll = async (caller, data) => {
	// Optional: Add admin check if needed
	// if (!await user.isAdministrator(caller.uid)) {
	//   throw new Error('[[error:no-privileges]]');
	// }

	const page = parseInt(data.page, 10) || 1;
	const limit = Math.min(parseInt(data.limit, 10) || 20, 100);

	const start = Math.max(0, (page - 1) * limit);
	const stop = start + limit - 1;

	const total = await db.sortedSetCard('threadbuilders:sorted');
	const pageCount = Math.ceil(total / limit);

	const tbIds = await db.getSortedSetRevRange(
		'threadbuilders:sorted',
		start,
		stop
	);

	let threadBuilders = [];
	if (tbIds.length > 0) {
		const keys = tbIds.map(id => `threadbuilder:${id}`);
		const data = await Promise.all(
			keys.map(key => db.getObject(key, [], { collection: collections.THREADBUILDERS }))
		);

		threadBuilders = data
			.filter(Boolean)
			.map((tb, index) => ({
				_id: String(tbIds[index]),
				uid: tb.uid,
				meta: tb.meta,
				stats: {
					count: tb.stats.count,
				},
				createdAt: tb.createdAt,
				updatedAt: tb.updatedAt,
			}));
	}

	const paginationData = pagination.create(page, pageCount, { page, limit });

	return {
		threadbuilders: threadBuilders,
		pagination: paginationData,
	};
};

// ==========================================
// UPDATE
// ==========================================

ThreadBuilder.update = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const { id, meta, threads, stats, config } = data;
	const tbId = parseInt(id, 10);

	// Check if exists
	const existingData = await db.getObject(
		`threadbuilder:${tbId}`,
		[],
		{ collection: collections.THREADBUILDERS }
	);

	if (!existingData) {
		throw new Error('[[error:threadbuilder-not-found]]');
	}

	// Check ownership
	if (parseInt(existingData.uid, 10) !== parseInt(caller.uid, 10)) {
		throw new Error('[[error:no-privileges]]');
	}

	const timestamp = utils.date.now();

	// Prepare updated data (REPLACE, not merge)
	const updatedData = {
		tbId: tbId,
		uid: caller.uid,
		meta: meta,
		threads: threads,
		stats: stats,
		config: config || existingData.config || {},
		createdAt: existingData.createdAt, // Keep original
		updatedAt: timestamp, // Update timestamp
	};

	// Update in database
	await db.setObject(
		`threadbuilder:${tbId}`,
		updatedData,
		{ collection: collections.THREADBUILDERS }
	);

	// Update score in sorted sets (re-score with new updatedAt)
	await db.sortedSetAdd(`uid:${caller.uid}:threadbuilders`, timestamp, tbId);
	await db.sortedSetAdd('threadbuilders:sorted', timestamp, tbId);

	return {
		_id: String(tbId),
		...updatedData,
	};
};

// ==========================================
// DELETE
// ==========================================

ThreadBuilder.delete = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const { id } = data;
	const tbId = parseInt(id, 10);

	// Check if exists
	const existingData = await db.getObject(
		`threadbuilder:${tbId}`,
		[],
		{ collection: collections.THREADBUILDERS }
	);

	if (!existingData) {
		throw new Error('[[error:threadbuilder-not-found]]');
	}

	// Check ownership
	if (parseInt(existingData.uid, 10) !== parseInt(caller.uid, 10)) {
		throw new Error('[[error:no-privileges]]');
	}

	// Delete from database
	await db.delete(
		`threadbuilder:${tbId}`,
		{ collection: collections.THREADBUILDERS }
	);

	// Remove from user's sorted set
	await db.sortedSetRemove(`uid:${caller.uid}:threadbuilders`, tbId);

	// Remove from global sorted set
	await db.sortedSetRemove('threadbuilders:sorted', tbId);


	return {};
};

// ==========================================
// DUPLICATE
// ==========================================

ThreadBuilder.duplicate = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const { id } = data;
	const sourceTbId = parseInt(id, 10);

	// Get source ThreadBuilder
	const sourceData = await db.getObject(
		`threadbuilder:${sourceTbId}`,
		[],
		{ collection: collections.THREADBUILDERS }
	);

	if (!sourceData) {
		throw new Error('[[error:threadbuilder-not-found]]');
	}

	// Check ownership
	if (parseInt(sourceData.uid, 10) !== parseInt(caller.uid, 10)) {
		throw new Error('[[error:no-privileges]]');
	}

	// Generate new ID
	const newTbId = await db.incrObjectField('global', 'nextTbId');
	const timestamp = utit;

	// Create duplicate with new ID and timestamp
	const duplicateData = {
		tbId: newTbId,
		uid: caller.uid,
		meta: {
			title: `${sourceData.meta.title} (Copy)`, // Append " (Copy)"
		},
		threads: sourceData.threads, // Keep same threads
		stats: sourceData.stats, // Keep same stats
		config: sourceData.config || {},
		createdAt: timestamp,
		updatedAt: timestamp,
	};

	// Store duplicate
	await db.setObject(
		`threadbuilder:${newTbId}`,
		duplicateData,
		{ collection: collections.THREADBUILDERS }
	);

	// Add to sorted sets
	await db.sortedSetAdd(`uid:${caller.uid}:threadbuilders`, timestamp, newTbId);
	await db.sortedSetAdd('threadbuilders:sorted', timestamp, newTbId);



	return {
		_id: String(newTbId),
		...duplicateData,
	};
};