'use strict';

const crypto = require('crypto');
const db = require('../database');
const user = require('../user');
const collections = require('../database/mongo/collections');
const pagination = require('../pagination');
const utils = require('../utils');

const Workspace = module.exports;

// ==========================================
// HELPER METHODS
// ==========================================

/**
 * Generate a secure random invite token
 */
Workspace.generateInviteToken = () => crypto.randomBytes(16).toString('hex');

/**
 * Compute workspace status based on current time and workspace data
 */
Workspace.computeStatus = (workspaceData, currentTime) => {
	if (!currentTime) {
		currentTime = utils.date.now();
	}

	if (workspaceData.status === 'stopped') {
		return 'stopped';
	}

	if (currentTime >= workspaceData.endTime) {
		return 'expired';
	}

	return 'active';
};

/**
 * Check if workspace is active (not stopped or expired)
 */
Workspace.isActive = (workspaceData, currentTime) => Workspace.computeStatus(workspaceData, currentTime) === 'active';

/**
 * Build complete workspace response with participants and their assets
 */
Workspace.buildWorkspaceResponse = async (wsId, workspaceData) => {
	const currentTime = utils.date.now();
	const status = Workspace.computeStatus(workspaceData, currentTime);

	// Get participant UIDs
	const participantUids = await db.getSortedSetRangeWithScores(
		`workspace:${wsId}:participants`,
		0,
		-1
	);

	let participants = [];
	let totalAssets = 0;
	const assetsByType = { threadbuilder: 0, pitch: 0 }; // ✨ ADDED pitch

	if (participantUids.length > 0) {
		// Get user data for all participants
		const uids = participantUids.map(p => p.value);
		const users = await user.getUsersFields(uids, [
			'uid', 'username', 'userslug', 'picture',
		]);

		// Get all threadbuilder assets
		const threadbuilderIds = await db.getSortedSetRangeWithScores(
			`workspace:${wsId}:assets:threadbuilder`,
			0,
			-1
		);

		// ✨ NEW: Get all pitch assets
		const pitchIds = await db.getSortedSetRangeWithScores(
			`workspace:${wsId}:assets:pitch`,
			0,
			-1
		);

		// Build participants array with their assets
		participants = await Promise.all(participantUids.map(async (p, index) => {
			const uid = parseInt(p.value, 10);
			const joinedAt = parseInt(p.score, 10);

			// Get threadbuilder assets for this user
			const threadbuilderAssets = await Promise.all(
				threadbuilderIds.map(async (asset) => {
					const assetMeta = await db.getObject(
						`workspace:${wsId}:asset:threadbuilder:${asset.value}`
					);
					if (assetMeta && parseInt(assetMeta.uid, 10) === uid) {
						return {
							id: asset.value,
							linkedAt: parseInt(assetMeta.linkedAt, 10),
						};
					}
					return null;
				})
			);

			const userThreadbuilders = threadbuilderAssets.filter(Boolean);

			// ✨ NEW: Get pitch assets for this user
			const pitchAssets = await Promise.all(
				pitchIds.map(async (asset) => {
					const assetMeta = await db.getObject(
						`workspace:${wsId}:asset:pitch:${asset.value}`
					);
					if (assetMeta && parseInt(assetMeta.uid, 10) === uid) {
						return {
							id: asset.value,
							linkedAt: parseInt(assetMeta.linkedAt, 10),
						};
					}
					return null;
				})
			);

			const userPitches = pitchAssets.filter(Boolean);

			// Update totals
			totalAssets += userThreadbuilders.length + userPitches.length;
			assetsByType.threadbuilder += userThreadbuilders.length;
			assetsByType.pitch += userPitches.length;

			return {
				uid: uid,
				username: users[index]?.username || '',
				userslug: users[index]?.userslug || '',
				picture: users[index]?.picture || '',
				joinedAt: joinedAt,
				isCreator: uid === parseInt(workspaceData.uid, 10),
				assets: {
					threadbuilder: userThreadbuilders,
					pitch: userPitches, // ✨ NEW
				},
			};
		}));
	}

	return {
		_id: String(wsId),
		wsId: wsId,
		uid: workspaceData.uid,
		title: workspaceData.title,
		description: workspaceData.description || '',
		startTime: workspaceData.startTime,
		endTime: workspaceData.endTime,
		status: status,
		inviteToken: workspaceData.inviteToken,
		inviteLink: `${nconf.get("app_url")}/workspace/join/${workspaceData.inviteToken}`,
		settings: {
			maxParticipants: workspaceData.settings?.maxParticipants || null,
			allowAssetSharing: workspaceData.settings?.allowAssetSharing !== false,
			maxPitches: workspaceData.settings?.maxPitches || null, // ✨ NEW
		},
		participants: participants,
		stats: {
			participantCount: participants.length,
			totalAssets: totalAssets,
			assetsByType: assetsByType,
		},
		createdAt: workspaceData.createdAt,
		updatedAt: workspaceData.updatedAt,
	};
};

// ==========================================
// CREATE
// ==========================================

Workspace.create = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const { title, description, startTime, endTime, settings } = data;

	// Generate workspace ID and invite token
	const wsId = await db.incrObjectField('global', 'nextWsId');
	const inviteToken = Workspace.generateInviteToken();
	const timestamp = utils.date.now();

	// Prepare workspace data
	const workspaceData = {
		wsId: wsId,
		uid: caller.uid,
		title: title,
		description: description || '',
		startTime: startTime,
		endTime: endTime,
		status: 'active',
		inviteToken: inviteToken,
		settings: {
			maxParticipants: settings?.maxParticipants || null,
			allowAssetSharing: settings?.allowAssetSharing !== false,
			maxPitches: settings?.maxPitches || null, // ✨ NEW
		},
		createdAt: timestamp,
		updatedAt: timestamp,
	};

	// Bulk operations for workspace creation
	const bulkAdd = [
		['workspaces:sorted', timestamp, wsId],
		[`uid:${caller.uid}:workspaces:created`, timestamp, wsId],
		[`uid:${caller.uid}:workspaces:joined`, timestamp, wsId],
		[`workspace:${wsId}:participants`, timestamp, caller.uid],
	];

	await Promise.all([
		db.setObject(`workspace:${wsId}`, workspaceData, { collection: collections.WORKSPACES }),
		db.setObjectField(`workspace:invite:${inviteToken}`, 'wsId', wsId),
		db.setObjectField(`workspace:${wsId}:invite`, 'token', inviteToken),
		db.sortedSetAddBulk(bulkAdd),
	]);

	return Workspace.buildWorkspaceResponse(wsId, workspaceData);
};

// ==========================================
// GET BY ID
// ==========================================

Workspace.get = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const { id } = data;
	const wsId = parseInt(id, 10);

	// Get workspace data
	const workspaceData = await db.getObject(
		`workspace:${wsId}`,
		[],
		{ collection: collections.WORKSPACES }
	);

	if (!workspaceData) {
		throw new Error('[[error:workspace-not-found]]');
	}

	// Check if user is a participant
	const isMember = await db.isSortedSetMember(
		`workspace:${wsId}:participants`,
		caller.uid
	);

	if (!isMember) {
		throw new Error('[[error:not-workspace-member]]');
	}

	return Workspace.buildWorkspaceResponse(wsId, workspaceData);
};

// ==========================================
// LIST (Created by me)
// ==========================================

Workspace.list = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const page = parseInt(data.page, 10) || 1;
	const limit = Math.min(parseInt(data.limit, 10) || 20, 100);

	const start = Math.max(0, (page - 1) * limit);
	const stop = start + limit - 1;

	// Get total count
	const total = await db.sortedSetCard(`uid:${caller.uid}:workspaces:created`);
	const pageCount = Math.ceil(total / limit);

	// Get workspace IDs (sorted by creation time, newest first)
	const wsIds = await db.getSortedSetRevRange(
		`uid:${caller.uid}:workspaces:created`,
		start,
		stop
	);

	let workspaces = [];
	if (wsIds.length > 0) {
		const keys = wsIds.map(id => `workspace:${id}`);
		const workspaceDataArray = await db.getObjects(keys, { collection: collections.WORKSPACES });

		workspaces = await Promise.all(
			wsIds.map(async (id, index) => {
				const wsData = workspaceDataArray[index];
				if (!wsData) return null;

				const currentTime = utils.date.now();
				const status = Workspace.computeStatus(wsData, currentTime);
				const participantCount = await db.sortedSetCard(`workspace:${id}:participants`);

				return {
					_id: String(id),
					wsId: parseInt(id, 10),
					uid: wsData.uid,
					title: wsData.title,
					description: wsData.description || '',
					startTime: wsData.startTime,
					endTime: wsData.endTime,
					status: status,
					participantCount: participantCount,
					createdAt: wsData.createdAt,
					updatedAt: wsData.updatedAt,
				};
			})
		);

		workspaces = workspaces.filter(Boolean);
	}

	const paginationData = pagination.create(page, pageCount, { page, limit });

	return {
		data: workspaces,
		pagination: paginationData,
	};
};

// ==========================================
// LIST JOINED
// ==========================================

Workspace.listJoined = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const page = parseInt(data.page, 10) || 1;
	const limit = Math.min(parseInt(data.limit, 10) || 20, 100);

	const start = Math.max(0, (page - 1) * limit);
	const stop = start + limit - 1;

	// Get total count
	const total = await db.sortedSetCard(`uid:${caller.uid}:workspaces:joined`);
	const pageCount = Math.ceil(total / limit);

	// Get workspace IDs (sorted by join time, newest first)
	const wsIds = await db.getSortedSetRevRange(
		`uid:${caller.uid}:workspaces:joined`,
		start,
		stop
	);

	let workspaces = [];
	if (wsIds.length > 0) {
		const keys = wsIds.map(id => `workspace:${id}`);
		const workspaceDataArray = await db.getObjects(keys, { collection: collections.WORKSPACES });

		workspaces = await Promise.all(
			wsIds.map(async (id, index) => {
				const wsData = workspaceDataArray[index];
				if (!wsData) return null;

				const currentTime = utils.date.now();
				const status = Workspace.computeStatus(wsData, currentTime);
				const participantCount = await db.sortedSetCard(`workspace:${id}:participants`);

				// Get creator info
				const creator = await user.getUserFields(wsData.uid, ['username', 'userslug', 'picture']);

				return {
					_id: String(id),
					wsId: parseInt(id, 10),
					uid: wsData.uid,
					creator: creator,
					title: wsData.title,
					description: wsData.description || '',
					startTime: wsData.startTime,
					endTime: wsData.endTime,
					status: status,
					participantCount: participantCount,
					createdAt: wsData.createdAt,
					updatedAt: wsData.updatedAt,
				};
			})
		);

		workspaces = workspaces.filter(Boolean);
	}

	const paginationData = pagination.create(page, pageCount, { page, limit });

	return {
		data: workspaces,
		pagination: paginationData,
	};
};

// ==========================================
// UPDATE
// ==========================================

Workspace.update = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const { id, title, description, endTime, settings } = data;
	const wsId = parseInt(id, 10);

	// Get existing workspace
	const existingData = await db.getObject(
		`workspace:${wsId}`,
		[],
		{ collection: collections.WORKSPACES }
	);

	if (!existingData) {
		throw new Error('[[error:workspace-not-found]]');
	}

	// Check if user is the creator
	if (parseInt(existingData.uid, 10) !== parseInt(caller.uid, 10)) {
		throw new Error('[[error:not-workspace-creator]]');
	}

	const timestamp = utils.date.now();

	// Prepare updated data (merge with existing)
	const updatedData = {
		...existingData,
		updatedAt: timestamp,
	};

	if (title !== undefined) {
		updatedData.title = title;
	}

	if (description !== undefined) {
		updatedData.description = description;
	}

	if (endTime !== undefined) {
		// Validate new endTime
		const maxDuration = 24 * 60 * 60 * 1000;
		if (endTime - existingData.startTime > maxDuration) {
			throw new Error('[[error:max-duration-exceeded]]');
		}
		if (endTime <= existingData.startTime) {
			throw new Error('[[error:invalid-time-range]]');
		}
		updatedData.endTime = endTime;
	}

	if (settings !== undefined) {
		updatedData.settings = {
			...existingData.settings,
			...settings,
		};
	}

	// Update in database
	await Promise.all([
		db.setObject(`workspace:${wsId}`, updatedData, { collection: collections.WORKSPACES }),
		db.sortedSetAdd('workspaces:sorted', timestamp, wsId),
	]);

	return Workspace.buildWorkspaceResponse(wsId, updatedData);
};

// ==========================================
// STOP
// ==========================================

Workspace.stop = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const { id } = data;
	const wsId = parseInt(id, 10);

	// Get existing workspace
	const existingData = await db.getObject(
		`workspace:${wsId}`,
		[],
		{ collection: collections.WORKSPACES }
	);

	if (!existingData) {
		throw new Error('[[error:workspace-not-found]]');
	}

	// Check if user is the creator
	if (parseInt(existingData.uid, 10) !== parseInt(caller.uid, 10)) {
		throw new Error('[[error:not-workspace-creator]]');
	}

	const timestamp = utils.date.now();

	// Update status to stopped
	const updatedData = {
		...existingData,
		status: 'stopped',
		updatedAt: timestamp,
	};

	await Promise.all([
		db.setObject(`workspace:${wsId}`, updatedData, { collection: collections.WORKSPACES }),
		db.sortedSetAdd('workspaces:sorted', timestamp, wsId),
	]);

	return Workspace.buildWorkspaceResponse(wsId, updatedData);
};

// ==========================================
// DELETE
// ==========================================

Workspace.delete = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const { id } = data;
	const wsId = parseInt(id, 10);

	// Get existing workspace
	const existingData = await db.getObject(
		`workspace:${wsId}`,
		[],
		{ collection: collections.WORKSPACES }
	);

	if (!existingData) {
		throw new Error('[[error:workspace-not-found]]');
	}

	// Check if user is the creator
	if (parseInt(existingData.uid, 10) !== parseInt(caller.uid, 10)) {
		throw new Error('[[error:not-workspace-creator]]');
	}

	// Get all participants
	const participantUids = await db.getSortedSetRange(
		`workspace:${wsId}:participants`,
		0,
		-1
	);

	// Get all threadbuilder assets
	const threadbuilderIds = await db.getSortedSetRange(
		`workspace:${wsId}:assets:threadbuilder`,
		0,
		-1
	);

	// ✨ NEW: Get all pitch assets
	const pitchIds = await db.getSortedSetRange(
		`workspace:${wsId}:assets:pitch`,
		0,
		-1
	);

	// Prepare bulk delete operations
	const deleteOps = [
		db.delete(`workspace:${wsId}`, { collection: collections.WORKSPACES }),
		db.delete(`workspace:${wsId}:invite`),
		db.delete(`workspace:invite:${existingData.inviteToken}`),
		db.sortedSetRemove('workspaces:sorted', wsId),
		db.sortedSetRemove(`uid:${caller.uid}:workspaces:created`, wsId),
		db.delete(`workspace:${wsId}:participants`),
		db.delete(`workspace:${wsId}:assets:threadbuilder`),
		db.delete(`workspace:${wsId}:assets:pitch`), // ✨ NEW
	];

	// Remove from all participants' joined lists
	participantUids.forEach((uid) => {
		deleteOps.push(db.sortedSetRemove(`uid:${uid}:workspaces:joined`, wsId));
	});

	// Delete all threadbuilder asset metadata
	threadbuilderIds.forEach((tbId) => {
		deleteOps.push(db.delete(`workspace:${wsId}:asset:threadbuilder:${tbId}`));
	});

	// ✨ NEW: Delete all pitch asset metadata
	pitchIds.forEach((pitchId) => {
		deleteOps.push(db.delete(`workspace:${wsId}:asset:pitch:${pitchId}`));
	});

	await Promise.all(deleteOps);

	return {};
};

// ==========================================
// JOIN (via invite token)
// ==========================================

Workspace.join = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const { token } = data;

	// Get workspace ID from token
	const inviteData = await db.getObject(`workspace:invite:${token}`);

	if (!inviteData || !inviteData.wsId) {
		throw new Error('[[error:invalid-invite-token]]');
	}

	const wsId = parseInt(inviteData.wsId, 10);

	// Get workspace data
	const workspaceData = await db.getObject(
		`workspace:${wsId}`,
		[],
		{ collection: collections.WORKSPACES }
	);

	if (!workspaceData) {
		throw new Error('[[error:workspace-not-found]]');
	}

	// Check if workspace is active
	if (!Workspace.isActive(workspaceData)) {
		throw new Error('[[error:workspace-not-active]]');
	}

	// Check if already a member
	const isMember = await db.isSortedSetMember(
		`workspace:${wsId}:participants`,
		caller.uid
	);

	if (isMember) {
		throw new Error('[[error:already-joined]]');
	}

	// Check participant limit
	if (workspaceData.settings?.maxParticipants) {
		const currentCount = await db.sortedSetCard(`workspace:${wsId}:participants`);
		if (currentCount >= workspaceData.settings.maxParticipants) {
			throw new Error('[[error:workspace-full]]');
		}
	}

	const timestamp = utils.date.now();

	// Add user to workspace
	const bulkAdd = [
		[`workspace:${wsId}:participants`, timestamp, caller.uid],
		[`uid:${caller.uid}:workspaces:joined`, timestamp, wsId],
	];

	await db.sortedSetAddBulk(bulkAdd);

	// Return full workspace detail
	return Workspace.buildWorkspaceResponse(wsId, workspaceData);
};

// ==========================================
// LEAVE
// ==========================================

Workspace.leave = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const { id } = data;
	const wsId = parseInt(id, 10);

	// Get workspace data
	const workspaceData = await db.getObject(
		`workspace:${wsId}`,
		[],
		{ collection: collections.WORKSPACES }
	);

	if (!workspaceData) {
		throw new Error('[[error:workspace-not-found]]');
	}

	// Check if user is a member
	const isMember = await db.isSortedSetMember(
		`workspace:${wsId}:participants`,
		caller.uid
	);

	if (!isMember) {
		throw new Error('[[error:not-workspace-member]]');
	}

	// Prevent creator from leaving
	if (parseInt(workspaceData.uid, 10) === parseInt(caller.uid, 10)) {
		throw new Error('[[error:cannot-leave-own-workspace]]');
	}

	// Remove user from workspace
	await Promise.all([
		db.sortedSetRemove(`workspace:${wsId}:participants`, caller.uid),
		db.sortedSetRemove(`uid:${caller.uid}:workspaces:joined`, wsId),
	]);

	return {};
};

// ==========================================
// LINK ASSET
// ==========================================

Workspace.linkAsset = async (caller, data) => {
	if (!caller.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	const { id, assetType, assetId } = data;
	const wsId = parseInt(id, 10);
	const parsedAssetId = parseInt(assetId, 10);

	// Get workspace data
	const workspaceData = await db.getObject(
		`workspace:${wsId}`,
		[],
		{ collection: collections.WORKSPACES }
	);

	if (!workspaceData) {
		throw new Error('[[error:workspace-not-found]]');
	}

	// Check if workspace is active
	if (!Workspace.isActive(workspaceData)) {
		throw new Error('[[error:workspace-not-active]]');
	}

	// Check if user is a member
	const isMember = await db.isSortedSetMember(
		`workspace:${wsId}:participants`,
		caller.uid
	);

	if (!isMember) {
		throw new Error('[[error:not-workspace-member]]');
	}

	// Check if asset sharing is allowed
	if (workspaceData.settings?.allowAssetSharing === false) {
		throw new Error('[[error:asset-sharing-disabled]]');
	}

	// Verify asset exists and user owns it
	if (assetType === 'threadbuilder') {
		const threadbuilder = require('./threadbuilder');
		let assetData;

		try {
			assetData = await threadbuilder.get(caller, { id: assetId });
		} catch (err) {
			throw new Error('[[error:asset-not-found]]');
		}

		// Verify ownership
		if (parseInt(assetData.uid, 10) !== parseInt(caller.uid, 10)) {
			throw new Error('[[error:not-asset-owner]]');
		}
	}

	// ✨ NEW: Handle pitch asset type
	if (assetType === 'pitch') {
		// Check pitch limit
		const maxPitches = workspaceData.settings?.maxPitches;
		if (maxPitches !== null && maxPitches !== undefined) {
			// Count existing pitches for this user
			const allPitchIds = await db.getSortedSetRange(
				`workspace:${wsId}:assets:pitch`,
				0,
				-1
			);

			let userPitchCount = 0;
			for (const pitchId of allPitchIds) {
				const pitchMeta = await db.getObject(
					`workspace:${wsId}:asset:pitch:${pitchId}`
				);
				if (pitchMeta && parseInt(pitchMeta.uid, 10) === parseInt(caller.uid, 10)) {
					userPitchCount++;
				}
			}

			if (userPitchCount >= maxPitches) {
				throw new Error('[[error:max-pitches-reached]]');
			}
		}

		// Verify pitch exists and user owns it
		const pitch = require('./pitch');
		let assetData;

		try {
			assetData = await pitch.get(caller, { id: assetId });
		} catch (err) {
			throw new Error('[[error:asset-not-found]]');
		}

		// Verify ownership
		if (parseInt(assetData.uid, 10) !== parseInt(caller.uid, 10)) {
			throw new Error('[[error:not-asset-owner]]');
		}
	}

	// Check if already linked
	const isLinked = await db.isSortedSetMember(
		`workspace:${wsId}:assets:${assetType}`,
		parsedAssetId
	);

	if (isLinked) {
		throw new Error('[[error:asset-already-linked]]');
	}

	const timestamp = utils.date.now();

	// Link asset
	await Promise.all([
		db.sortedSetAdd(`workspace:${wsId}:assets:${assetType}`, timestamp, parsedAssetId),
		db.setObject(`workspace:${wsId}:asset:${assetType}:${parsedAssetId}`, {
			assetId: String(parsedAssetId),
			uid: caller.uid,
			linkedAt: timestamp,
		}),
	]);

	return {
		success: true,
		linkedAt: timestamp,
	};
};