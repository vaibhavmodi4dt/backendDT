'use strict';

const db = require('../database');
const { collections } = require('../database/mongo/collections');

const Storage = module.exports;

/**
 * Save complete department dashboard data
 */
Storage.saveDepartmentDashboard = async function (deptId, weekStart, data) {
    const key = `supervisor:dashboard:${deptId}:${weekStart}`;
    await db.setObject(key, {
        deptId,
        weekStart,
        department: data.department,
        members: data.members,
        teamSummary: data.teamSummary,
        calculatedAt: Date.now(),
    }, { collection: collections.SUPERVISOR });
};

/**
 * Get pre-calculated dashboard data
 */
Storage.getDepartmentDashboard = async function (deptId, weekStart) {
    const key = `supervisor:dashboard:${deptId}:${weekStart}`;
    return await db.getObject(key, [], { collection: collections.SUPERVISOR });
};

/**
 * Save individual member week scores
 */
Storage.saveMemberWeekScores = async function (uid, weekStart, memberData) {
    const key = `supervisor:member:${uid}:${weekStart}`;
    await db.setObject(key, memberData, { collection: collections.SUPERVISOR });
};

/**
 * Save team summary separately for quick access
 */
Storage.saveTeamSummary = async function (deptId, weekStart, teamSummary) {
    const key = `supervisor:summary:${deptId}:${weekStart}`;
    await db.setObject(key, teamSummary, { collection: collections.SUPERVISOR });
};
