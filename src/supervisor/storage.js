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

/**
 * Update member rubric in both dashboard and individual member documents
 * @param {string} deptId - Department ID
 * @param {string} uid - User ID
 * @param {string} weekStart - Week start date
 * @param {object} rubricData - Rubric data to update
 * @param {object} [existingDashboard] - Optional pre-fetched dashboard to avoid duplicate fetch
 */
Storage.updateMemberRubric = async function (deptId, uid, weekStart, rubricData, existingDashboard) {
    // 1. Use existing dashboard or fetch if not provided
    const dashboardKey = `supervisor:dashboard:${deptId}:${weekStart}`;
    const dashboard = existingDashboard || await db.getObject(dashboardKey, [], { collection: collections.SUPERVISOR });

    if (!dashboard) {
        throw new Error('[[error:dashboard-not-found]]');
    }

    // 2. Find member in members array

    const memberIndex = dashboard.members.findIndex(m => m.uid === Number(uid));
    if (memberIndex === -1) {
        throw new Error('[[error:member-not-found]]');
    }

    // 3. Update rubric in the member object
    dashboard.members[memberIndex].rubric = rubricData;

    // 4. Save updated dashboard back to database
    await db.setObject(dashboardKey, dashboard, { collection: collections.SUPERVISOR });

    // 5. Also update individual member document for consistency
    const memberKey = `supervisor:member:${uid}:${weekStart}`;
    const memberDoc = await db.getObject(memberKey, [], { collection: collections.SUPERVISOR });

    if (memberDoc) {
        // If member document exists, update it
        memberDoc.rubric = rubricData;
        await db.setObject(memberKey, memberDoc, { collection: collections.SUPERVISOR });
    }

    return rubricData;
};