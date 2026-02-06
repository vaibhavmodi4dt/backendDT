'use strict';

const db = require('../database');
const user = require('../user');
const collections = require('../database/mongo/collections');
const pagination = require('../pagination');
const utils = require('../utils');

const Pitch = module.exports;

// ==========================================
// HELPER: Extract content preview
// ==========================================

/**
 * Extracts a preview/snippet from Pitch content
 * @param {Object} content - The content object
 * @returns {string} - Preview text (first 200 chars)
 */
Pitch.extractContentPreview = (content) => {
    try {
        if (content && content.text) {
            const text = content.text.trim();
            return text.length > 200 ? text.substring(0, 200) + '...' : text;
        }
    } catch (error) {
        console.error('Error extracting pitch preview:', error);
    }
    return '';
};

// ==========================================
// CREATE
// ==========================================

Pitch.create = async (caller, data) => {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const { meta, content, stats, workspaceId } = data;

    // Generate new Pitch ID
    const pitchId = await db.incrObjectField('global', 'nextPitchId');
    const timestamp = utils.date.now();

    // Prepare Pitch data
    const pitchData = {
        pitchId: pitchId,
        uid: caller.uid,
        meta: meta,
        content: content,
        stats: stats,
        createdAt: timestamp,
        updatedAt: timestamp,
    };

    // Store in database
    await db.setObject(
        `pitch:${pitchId}`,
        pitchData,
        { collection: collections.PITCHES }
    );

    // Add to user's sorted set (sorted by updatedAt)
    await db.sortedSetAdd(`uid:${caller.uid}:pitches`, timestamp, pitchId);

    // Add to global sorted set
    await db.sortedSetAdd('pitches:sorted', timestamp, pitchId);

    // Auto-link to workspace if workspaceId provided
    if (workspaceId) {
        try {
            const workspaces = require('./workspace');
            await workspaces.linkAsset(caller, {
                id: workspaceId,
                assetType: 'pitch',
                assetId: String(pitchId),
            });
        } catch (err) {
            console.error(`Failed to link Pitch ${pitchId} to workspace ${workspaceId}:`, err.message);
        }
    }

    return {
        _id: String(pitchId),
        ...pitchData,
    };
};

// ==========================================
// GET BY ID
// ==========================================

Pitch.get = async (caller, data) => {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const { id } = data;
    const pitchId = parseInt(id, 10);

    const pitchData = await db.getObject(
        `pitch:${pitchId}`,
        [],
        { collection: collections.PITCHES }
    );

    if (!pitchData) {
        throw new Error('[[error:pitch-not-found]]');
    }

    // Check ownership
    if (parseInt(pitchData.uid, 10) !== parseInt(caller.uid, 10)) {
        throw new Error('[[error:no-privileges]]');
    }

    return {
        _id: String(pitchId),
        ...pitchData,
    };
};

// ==========================================
// LIST (with pagination)
// ==========================================

Pitch.list = async (caller, data) => {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const page = parseInt(data.page, 10) || 1;
    const limit = Math.min(parseInt(data.limit, 10) || 20, 100);

    const start = Math.max(0, (page - 1) * limit);
    const stop = start + limit - 1;

    const total = await db.sortedSetCard(`uid:${caller.uid}:pitches`);
    const pageCount = Math.ceil(total / limit);

    const pitchIds = await db.getSortedSetRevRange(
        `uid:${caller.uid}:pitches`,
        start,
        stop
    );

    let pitches = [];
    if (pitchIds.length > 0) {
        const keys = pitchIds.map(id => `pitch:${id}`);
        const data = await db.getObjects(keys, { collection: collections.PITCHES });

        pitches = pitchIds
            .map((id, index) => {
                const pitch = data[index];
                if (!pitch) return null;

                return {
                    _id: String(id),
                    uid: pitch.uid,
                    meta: pitch.meta,
                    stats: pitch.stats,
                    preview: Pitch.extractContentPreview(pitch.content),
                    createdAt: pitch.createdAt,
                    updatedAt: pitch.updatedAt,
                };
            })
            .filter(Boolean);
    }

    const paginationData = pagination.create(page, pageCount, { page, limit });

    return {
        data: pitches,
        pagination: paginationData,
    };
};

// ==========================================
// LIST ALL (Global)
// ==========================================

Pitch.listAll = async (caller, data) => {
    const page = parseInt(data.page, 10) || 1;
    const limit = Math.min(parseInt(data.limit, 10) || 20, 100);

    const start = Math.max(0, (page - 1) * limit);
    const stop = start + limit - 1;

    const total = await db.sortedSetCard('pitches:sorted');
    const pageCount = Math.ceil(total / limit);

    const pitchIds = await db.getSortedSetRevRange(
        'pitches:sorted',
        start,
        stop
    );

    let pitches = [];
    if (pitchIds.length > 0) {
        const keys = pitchIds.map(id => `pitch:${id}`);
        const data = await db.getObjects(keys, { collection: collections.PITCHES });

        const userKeys = data
            .filter(Boolean)
            .map(pitch => pitch.uid);

        const users = await user.getUsersFields(userKeys, [
            'uid', 'username', 'userslug', 'picture', 'status', 'lastonline',
        ]);

        pitches = pitchIds
            .map((id, index) => {
                const pitch = data[index];
                if (!pitch) return null;

                return {
                    _id: String(id),
                    uid: pitch.uid,
                    user: users[index] || null,
                    meta: pitch.meta,
                    stats: pitch.stats,
                    preview: Pitch.extractContentPreview(pitch.content),
                    createdAt: pitch.createdAt,
                    updatedAt: pitch.updatedAt,
                };
            })
            .filter(Boolean);
    }

    const paginationData = pagination.create(page, pageCount, { page, limit });

    return {
        data: pitches,
        pagination: paginationData,
    };
};

// ==========================================
// UPDATE
// ==========================================

Pitch.update = async (caller, data) => {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const { id, meta, content, stats } = data;
    const pitchId = parseInt(id, 10);

    const existingData = await db.getObject(
        `pitch:${pitchId}`,
        [],
        { collection: collections.PITCHES }
    );

    if (!existingData) {
        throw new Error('[[error:pitch-not-found]]');
    }

    if (parseInt(existingData.uid, 10) !== parseInt(caller.uid, 10)) {
        throw new Error('[[error:no-privileges]]');
    }

    const timestamp = utils.date.now();

    const updatedData = {
        pitchId: pitchId,
        uid: caller.uid,
        meta: meta || existingData.meta,
        content: content || existingData.content,
        stats: stats || existingData.stats,
        createdAt: existingData.createdAt,
        updatedAt: timestamp,
    };

    await db.setObject(
        `pitch:${pitchId}`,
        updatedData,
        { collection: collections.PITCHES }
    );

    await db.sortedSetAdd(`uid:${caller.uid}:pitches`, timestamp, pitchId);
    await db.sortedSetAdd('pitches:sorted', timestamp, pitchId);

    return {
        _id: String(pitchId),
        ...updatedData,
    };
};

// ==========================================
// DELETE
// ==========================================

Pitch.delete = async (caller, data) => {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const { id } = data;
    const pitchId = parseInt(id, 10);

    const existingData = await db.getObject(
        `pitch:${pitchId}`,
        [],
        { collection: collections.PITCHES }
    );

    if (!existingData) {
        throw new Error('[[error:pitch-not-found]]');
    }

    if (parseInt(existingData.uid, 10) !== parseInt(caller.uid, 10)) {
        throw new Error('[[error:no-privileges]]');
    }

    await db.delete(
        `pitch:${pitchId}`,
        { collection: collections.PITCHES }
    );

    await db.sortedSetRemove(`uid:${caller.uid}:pitches`, pitchId);
    await db.sortedSetRemove('pitches:sorted', pitchId);

    return {};
};

// ==========================================
// DUPLICATE
// ==========================================

Pitch.duplicate = async (caller, data) => {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const { id } = data;
    const sourcePitchId = parseInt(id, 10);

    const sourceData = await db.getObject(
        `pitch:${sourcePitchId}`,
        [],
        { collection: collections.PITCHES }
    );

    if (!sourceData) {
        throw new Error('[[error:pitch-not-found]]');
    }

    if (parseInt(sourceData.uid, 10) !== parseInt(caller.uid, 10)) {
        throw new Error('[[error:no-privileges]]');
    }

    const newPitchId = await db.incrObjectField('global', 'nextPitchId');
    const timestamp = utils.date.now();

    const duplicateData = {
        pitchId: newPitchId,
        uid: caller.uid,
        meta: {
            ...sourceData.meta,
            title: `${sourceData.meta.title} (Copy)`,
        },
        content: sourceData.content,
        stats: sourceData.stats,
        createdAt: timestamp,
        updatedAt: timestamp,
    };

    await db.setObject(
        `pitch:${newPitchId}`,
        duplicateData,
        { collection: collections.PITCHES }
    );

    await db.sortedSetAdd(`uid:${caller.uid}:pitches`, timestamp, newPitchId);
    await db.sortedSetAdd('pitches:sorted', timestamp, newPitchId);

    return {
        _id: String(newPitchId),
        ...duplicateData,
    };
};