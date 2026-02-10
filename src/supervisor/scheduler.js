'use strict';

const winston = require('winston');
const { CronJob } = require('cron');
const db = require('../database');
const Organizations = require('../organizations');
const Supervisor = require('../supervisor');
const helpers = require('../supervisor/helpers');
const storage = require('../supervisor/storage');
const { collections } = require('../database/mongo/collections');

const SupervisorScheduler = module.exports;

/**
 * Start scheduler - runs every Sunday at 12:00 PM
 */
SupervisorScheduler.startJobs = function () {
    winston.verbose('[supervisor] Starting weekly calculation job.');

    // Every Sunday at 12:00 PM
    new CronJob('0 12 * * 0', async () => {
        try {
            winston.info('[supervisor] Running weekly calculation job...');
            await SupervisorScheduler.calculateWeeklyData();
            winston.info('[supervisor] Weekly calculation job completed.');
        } catch (err) {
            winston.error('[supervisor] Error in weekly calculation job:', err.stack);
        }
    }, null, true);

    winston.info('[supervisor] Scheduler started - runs every Sunday at 12:00 PM');
};

/**
 * Main function - calculates data for all departments in all organizations
 * @param {Object} options - Optional parameters for testing
 * @param {string} options.weekStart - Override week start date (YYYY-MM-DD)
 */
SupervisorScheduler.calculateWeeklyData = async function (options = {}) {
    winston.info('[supervisor] Starting weekly data calculation...');

    try {
        // Get all active organizations
        const orgIds = await db.getSetMembers('organizations:active');
        if (!orgIds || orgIds.length === 0) {
            winston.info('[supervisor] No active organizations found. Skipping.');
            return;
        }

        winston.info(`[supervisor] Found ${orgIds.length} active organizations.`);

        // Calculate the current week or use provided date for testing
        let currentWeekStart;

        if (options.weekStart) {
            // Testing mode: use provided week start
            currentWeekStart = options.weekStart;
            winston.info(`[supervisor] 🧪 Testing mode: Using week ${currentWeekStart}`);
        } else {
            // Production mode: calculate current week's Monday
            const today = new Date();
            currentWeekStart = helpers.getWeekStart(today.toISOString().split('T')[0]);
            winston.info(`[supervisor] 📅 Production mode: Calculating for week ${currentWeekStart}`);
        }

        // Process each organization
        for (const orgId of orgIds) {
            try {
                // Get all departments for this organization
                const departmentsResult = await Organizations.getDepartmentsByOrganization(orgId, {
                    page: 1,
                    itemsPerPage: 1000,
                });

                if (!departmentsResult.departments || departmentsResult.departments.length === 0) {
                    winston.info(`[supervisor] No departments in organization ${orgId}. Skipping.`);
                    continue;
                }

                winston.info(`[supervisor] Found ${departmentsResult.departments.length} departments in org ${orgId}`);

                // Process each department
                for (const department of departmentsResult.departments) {
                    try {
                        await SupervisorScheduler.processDepartment(department.deptId, currentWeekStart);
                    } catch (err) {
                        winston.error(`[supervisor] Error processing ${department.deptId}:`, err);
                    }
                }
            } catch (err) {
                winston.error(`[supervisor] Error processing organization ${orgId}:`, err);
            }
        }

        winston.info('[supervisor] All departments processed.');
    } catch (err) {
        winston.error('[supervisor] Error in calculateWeeklyData:', err);
        throw err;
    }
};

    /**
     * Process single department
     */
    SupervisorScheduler.processDepartment = async function (deptId, weekStart) {
        winston.info(`[supervisor] Processing ${deptId} for week ${weekStart}`);

        // Check if already processed
        const checkKey = `supervisor:weekly:${deptId}:${weekStart}`;
        const exists = await db.exists(checkKey, { collection: collections.SUPERVISOR });

        if (exists) {
            winston.info(`[supervisor] Already processed ${deptId} ${weekStart}. Skipping.`);
            return;
        }

        try {
            const membersResult = await Organizations.getDepartmentMembers(deptId, {
                page: 1,
                itemsPerPage: 1000,
            });

            if (!membersResult.members || membersResult.members.length === 0) {
                winston.info(`[supervisor] No members in ${deptId}. Skipping.`);
                return;
            }

            winston.info(`[supervisor] Found ${membersResult.members.length} members in ${deptId}`);

            // Calculate dashboard (scores + AI summary)
            const dashboardData = await Supervisor.calculateDashboard(deptId, weekStart);

            // Save to database
            await storage.saveDepartmentDashboard(deptId, weekStart, dashboardData);

            // Save individual member scores
            for (const member of dashboardData.members) {
                await storage.saveMemberWeekScores(member.uid, weekStart, member);
            }

            // Save team summary separately
            await storage.saveTeamSummary(deptId, weekStart, dashboardData.teamSummary);

            // Mark as processed
            await db.setObject(checkKey, {
                deptId,
                weekStart,
                processedAt: Date.now(),
                memberCount: dashboardData.members.length,
            }, { collection: collections.SUPERVISOR });

            winston.info(`[supervisor] Successfully processed ${deptId}`);
        } catch (err) {
            winston.error(`[supervisor] Error processing ${deptId}:`, err);
            throw err;
        }
    };
