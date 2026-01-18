'use strict';

const _ = require('lodash');
const winston = require('winston');
const { CronJob } = require('cron');

const db = require('../database');
const AiAgentService = require('../services/ai-agent');
const utils = require('../utils');
const helpers = require('./helpers');
const { collections } = require('../database/mongo/collections');

const reportsCollection = { collection: collections.REPORTS };
const WeeklyReports = module.exports;

// ==========================================
// HELPER: GET RAW WEEKLY ENTRY
// ==========================================
WeeklyReports.getWeeklyRaw = async function (uid, weekStart) {
    const key = helpers.getWeeklyReportKey(uid, weekStart);
    return await db.getObject(key, [], reportsCollection);
};

// ==========================================
// SUBMIT WEEKLY PLAN
// ==========================================
WeeklyReports.submitPlan = async function (uid, weekStart, transcript, weeklyGoals) {
    const key = helpers.getWeeklyReportKey(uid, weekStart);
    const currentTime = utils.toISOString(utils.date.now());
    const timestamp = utils.date.now();

    const existing = await db.getObject(key, [], reportsCollection);

    // Call AI evaluation
    const response = await AiAgentService.post('/weekly-plan/evaluate', {
        transcript: transcript,
        goal: weeklyGoals,
        uid: uid,
        weekStart: weekStart,
        _key: key,
    });

    const evaluation = response?.data ?? null;

    // Save to database
    await db.setObject(key, {
        ...(existing || {}),
        uid,
        weekStart,
        week: helpers.getWeekNumber(weekStart),
        transcript,
        weeklyGoals,
        evaluation,
        submissionStatus: evaluation ? 'ok' : 'ai_error',
        createdAt: existing?.createdAt || currentTime,
        updatedAt: currentTime,
    }, reportsCollection);

    // Update indexes
    await Promise.all([
        db.sortedSetAdd(`user:${uid}:reports:weekly`, timestamp, key),
        db.sortedSetAdd(`reports:weekly:weekStart:${weekStart}`, timestamp, key),
        db.setAdd(`user:${uid}:reports:weekly:weeks`, weekStart),
    ].filter(Boolean));

    return {
        submitted: true,
        message: existing ? 'Weekly plan updated.' : 'Weekly plan submitted.',
        weekStart: weekStart,
        evaluation: evaluation,
    };
};

// ==========================================
// GET WEEKLY PLAN
// ==========================================
WeeklyReports.getWeekly = async function (uid, weekStart) {
    const entry = await WeeklyReports.getWeeklyRaw(uid, weekStart);
    return helpers.sanitizeWeeklyReport(entry);
};

// ==========================================
// UPDATE WEEKLY PLAN
// ==========================================
WeeklyReports.updateWeekly = async function (uid, weekStart, updates) {
    const key = helpers.getWeeklyReportKey(uid, weekStart);
    const currentTime = utils.toISOString(utils.date.now());

    const existing = await db.getObject(key, [], reportsCollection);

    await db.setObject(key, {
        ...existing,
        ...updates,
        uid,
        weekStart,
        updatedAt: currentTime,
    }, reportsCollection);

    return {
        ok: true,
        weekStart,
        updatedAt: currentTime,
    };
};

// ==========================================
// GET WEEKLY REPORT (6-day aggregation)
// ==========================================
WeeklyReports.getReport = async function (uid, weekDates) {
    const days = [];

    for (const dateISO of weekDates) {
        const key = helpers.getDailyReportKey(uid, dateISO);
        const entry = await db.getObject(key, [], reportsCollection);

        if (entry) {
            days.push({
                date: entry.date,
                plan: entry.plan || [],
                report: entry.report || null,
                evaluated: entry.evaluated || null,
                frameworks: entry.frameworks || [],
            });
        } else {
            days.push({
                date: dateISO,
                plan: [],
                report: null,
                evaluated: null,
                frameworks: [],
            });
        }
    }

    return {
        startDate: weekDates[0],
        endDate: weekDates[5],
        days,
    };
};

// ==========================================
// FETCH DAILY REPORTS FOR WEEK
// ==========================================
WeeklyReports.fetchDailyReports = async function (uid, weekDates) {
    const dailyReports = [];

    for (const dateISO of weekDates) {
        const key = helpers.getDailyReportKey(uid, dateISO);
        const entry = await db.getObject(key, [], reportsCollection);

        if (entry && entry.plan && entry.plan.length > 0) {
            dailyReports.push({
                date: entry.date,
                plan: entry.plan || [],
                frameworks: entry.frameworks || [],
                evaluated: entry.evaluated || null,
                report: entry.report || null,
            });
        }
    }

    return dailyReports;
};

// ==========================================
// CALL AI SERVICE FOR EVALUATION
// ==========================================
WeeklyReports.callAiEvaluation = async function (dailyReports) {
    const response = await AiAgentService.post('/weekly-report/evaluate', {
        dailyReports: dailyReports,
    });

    return response;
};

// ==========================================
// SAVE WEEKLY REPORT EVALUATION
// ==========================================
WeeklyReports.saveReportEvaluation = async function (uid, weekStart, generatedReport, existing) {
    const key = `reports:weekly-evaluation:user:${uid}:${weekStart}`;
    const currentTime = utils.toISOString(utils.date.now());
    const timestamp = utils.date.now();

    await db.setObject(key, {
        uid,
        weekStart,
        week: helpers.getWeekNumber(weekStart),
        generatedReport,
        editedReport: existing?.editedReport || null,
        status: existing?.status || 'draft',
        submittedAt: existing?.submittedAt || null,
        createdAt: existing?.createdAt || currentTime,
        updatedAt: currentTime,
    }, reportsCollection);

    // Update indexes
    await Promise.all([
        db.sortedSetAdd(`user:${uid}:reports:weekly-evaluation`, timestamp, key),
        db.sortedSetAdd(`reports:weekly-evaluation:weekStart:${weekStart}`, timestamp, key),
    ].filter(Boolean));

    return {
        uid,
        weekStart,
        week: helpers.getWeekNumber(weekStart),
        generatedReport,
        editedReport: existing?.editedReport || null,
        status: existing?.status || 'draft',
        submittedAt: existing?.submittedAt || null,
        createdAt: existing?.createdAt || currentTime,
        updatedAt: currentTime,
    };
};

// ==========================================
// GET WEEKLY REPORT EVALUATION
// ==========================================
WeeklyReports.getReportEvaluation = async function (uid, weekStart) {
    const key = `reports:weekly-evaluation:user:${uid}:${weekStart}`;
    const entry = await db.getObject(key, [], reportsCollection);
    return entry;
};

// ==========================================
// UPDATE WEEKLY REPORT EVALUATION
// ==========================================
WeeklyReports.updateReportEvaluation = async function (uid, weekStart, editedReport) {
    const key = `reports:weekly-evaluation:user:${uid}:${weekStart}`;
    const currentTime = utils.toISOString(utils.date.now());

    const existing = await db.getObject(key, [], reportsCollection);

    await db.setObject(key, {
        ...existing,
        editedReport,
        uid,
        weekStart,
        updatedAt: currentTime,
    }, reportsCollection);

    return {
        ok: true,
        weekStart,
        week: helpers.getWeekNumber(weekStart),
        updatedAt: currentTime,
    };
};

// ==========================================
// SUBMIT WEEKLY REPORT EVALUATION
// ==========================================
WeeklyReports.submitReportEvaluation = async function (uid, weekStart) {
    const key = `reports:weekly-evaluation:user:${uid}:${weekStart}`;
    const currentTime = utils.toISOString(utils.date.now());
    const timestamp = utils.date.now();

    const existing = await db.getObject(key, [], reportsCollection);

    await db.setObject(key, {
        ...existing,
        status: 'submitted',
        submittedAt: currentTime,
        updatedAt: currentTime,
    }, reportsCollection);

    // Update submitted index
    await db.sortedSetAdd(`user:${uid}:reports:weekly-evaluation:submitted`, timestamp, key);

    return {
        ok: true,
        weekStart,
        week: helpers.getWeekNumber(weekStart),
        status: 'submitted',
        submittedAt: currentTime,
    };
};

// ==========================================
// SCHEDULER: START CRON JOBS
// ==========================================

/**
 * Start weekly report cron job
 * Called from main application startup
 */
WeeklyReports.startScheduler = function () {
    winston.verbose('[reports:weekly] Starting scheduled jobs.');

    // Generate weekly reports every Sunday at 11:00 PM
    new CronJob('7 11 * * 0', async () => {
        try {
            winston.info('[reports:weekly] 🕐 Sunday 11 PM - Starting automated weekly report generation...');
            await WeeklyReports.generateAllWeeklyReports();
        } catch (err) {
            winston.error('[reports:weekly] ❌ Failed', {
                message: err?.message || err,
                stack: err?.stack,
            });
        }
    }, null, true);

    winston.info('[reports:weekly] ✅ Scheduler started: Weekly reports every Sunday at 11:00 PM');
};

// ==========================================
// SCHEDULER: GENERATE ALL WEEKLY REPORTS
// ==========================================

/**
 * Generate weekly reports for all active users
 * Called by cron job every Sunday at 11 PM
 * @param {Object} options - Optional parameters for testing
 * @param {string} options.weekStartStr - Override week start date (YYYY-MM-DD)
 * @param {string} options.weekEndStr - Override week end date (YYYY-MM-DD)
 */
WeeklyReports.generateAllWeeklyReports = async function (options = {}) {
    const startTime = utils.date.now();
    winston.info('[reports:weekly] 📊 Starting automated weekly report generation...');

    try {
        // Calculate the current week (or use provided dates for testing)
        let weekStartStr, weekEndStr;

        if (options.weekStartStr && options.weekEndStr) {
            // Testing mode: use provided dates
            weekStartStr = options.weekStartStr;
            weekEndStr = options.weekEndStr;
            winston.info(`[reports:weekly] 🧪 Testing mode: ${weekStartStr} to ${weekEndStr}`);
        } else {
            // Production mode: calculate current week
            const nowTimestamp = utils.date.now();
            const weekStartTimestamp = utils.date.startOfWeek(nowTimestamp);
            weekStartStr = utils.date.format(weekStartTimestamp, utils.date.formats.DATE);
            const weekDates = helpers.getWeekDates(weekStartStr);
            weekEndStr = weekDates[weekDates.length - 1];
            winston.info(`[reports:weekly] 📅 Production mode: ${weekStartStr} to ${weekEndStr}`);
        }

        // Get all active users who submitted at least 1 report this week
        const activeUsers = await WeeklyReports.getActiveUsers(weekStartStr, weekEndStr);

        if (activeUsers.length === 0) {
            winston.info('[reports:weekly] ℹ️  No active users found. Nothing to generate.');
            return { success: true, usersProcessed: 0 };
        }

        winston.info(`[reports:weekly] 👥 Found ${activeUsers.length} active users to process.`);

        // Process in batches
        const batchSize = 10;
        let successful = 0;
        let failed = 0;
        let skipped = 0;

        for (let i = 0; i < activeUsers.length; i += batchSize) {
            const batch = activeUsers.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(activeUsers.length / batchSize);

            winston.info(`[reports:weekly] 📦 Processing batch ${batchNum}/${totalBatches}`);

            await Promise.all(batch.map(async (uid) => {
                try {
                    const result = await WeeklyReports.generateForUser(uid, weekStartStr);

                    if (result.skipped) {
                        skipped++;
                        winston.verbose(`[reports:weekly] ⏭️  Skipped user ${uid}: ${result.reason}`);
                    } else {
                        successful++;
                        winston.verbose(`[reports:weekly] ✅ Generated for user ${uid} (${result.daysReported} days)`);
                    }
                } catch (error) {
                    failed++;
                    winston.error(`[reports:weekly] ❌ Failed for user ${uid}: ${error.message}`);
                }
            }));

            // Small delay between batches
            if (i + batchSize < activeUsers.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        const duration = ((utils.date.now() - startTime) / 1000).toFixed(2);
        winston.info(`[reports:weekly] ✨ Completed in ${duration}s`);
        winston.info(`[reports:weekly] 📈 Results: ${successful} successful, ${skipped} skipped, ${failed} failed`);

        return {
            success: true,
            total: activeUsers.length,
            successful,
            skipped,
            failed,
            duration
        };
    } catch (error) {
        winston.error('[reports:weekly] 💥 Criticawl error:', error.stack);
        throw error;
    }
};

// ==========================================
// SCHEDULER: GENERATE FOR SINGLE USER
// ==========================================

/**
 * Generate weekly report for a single user
 * @param {number} uid - User ID
 * @param {string} weekStartStr - Optional week start date (YYYY-MM-DD). If not provided, uses current week.
 */
WeeklyReports.generateForUser = async function (uid, weekStartStr = null) {
    // Use provided week start or calculate current week start (Monday)
    if (!weekStartStr) {
        const nowTimestamp = utils.date.now();
        const weekStartTimestamp = utils.date.startOfWeek(nowTimestamp);
        weekStartStr = utils.date.format(weekStartTimestamp, utils.date.formats.DATE);
    }
    const weekDates = helpers.getWeekDates(weekStartStr);

    // Fetch daily reports
    const dailyReports = await WeeklyReports.fetchDailyReports(uid, weekDates);

    // Skip if no reports
    if (dailyReports.length === 0) {
        return { skipped: true, reason: 'no_daily_reports' };
    }

    // Check if already exists
    const existing = await WeeklyReports.getReportEvaluation(uid, weekStartStr);

    // Skip if already submitted
    if (existing && existing.status === 'submitted') {
        return { skipped: true, reason: 'already_submitted' };
    }

    // Call AI
    let aiResponse;
    try {
        aiResponse = await WeeklyReports.callAiEvaluation(dailyReports);
    } catch (error) {
        if (existing && existing.generatedReport) {
            return { skipped: true, reason: 'cached', cached: true };
        }
        throw new Error(`AI service failed: ${error.message}`);
    }

    // Validate response
    if (!aiResponse || !aiResponse.success || !aiResponse.data) {
        if (existing && existing.generatedReport) {
            return { skipped: true, reason: 'cached', cached: true };
        }
        throw new Error('AI returned invalid response');
    }

    // Save
    await WeeklyReports.saveReportEvaluation(
        uid,
        weekStartStr,
        aiResponse.data,
        existing
    );

    return {
        success: true,
        daysReported: dailyReports.length,
        weekStart: weekStartStr
    };
};

// ==========================================
// SCHEDULER: GET ACTIVE USERS
// ==========================================

/**
 * Get users who submitted at least 1 daily report this week
 */
WeeklyReports.getActiveUsers = async function (startDate, endDate) {
    const weekDates = helpers.getDateRange(startDate, endDate);
    const activeUsers = new Set();

    for (const dateISO of weekDates) {
        // Use * wildcard for the UID portion
        const pattern = `reports:daily:user:*:${dateISO}`;

        // Pass collection as part of options object
        const allKeys = await db.scan(
            { match: pattern },
            reportsCollection
        );

        allKeys.forEach((key) => {
            const parts = key.split(':');
            // parts should be: ['reports', 'daily', 'user', '<uid>', '<date>']
            if (parts.length === 5) {
                const uid = parseInt(parts[3], 10);
                if (!isNaN(uid) && uid > 0) {
                    activeUsers.add(uid);
                }
            }
        });
    }

    return Array.from(activeUsers);
};

// ==========================================
// SCHEDULER: MANUAL TRIGGER
// ==========================================

/**
 * Manual trigger for testing
 *
 * Usage examples:
 * - Generate for current week: WeeklyReports.manualTrigger()
 * - Generate for specific week: WeeklyReports.manualTrigger({ weekStartStr: '2026-01-05', weekEndStr: '2026-01-11' })
 * - Generate for single user (current week): WeeklyReports.manualTrigger({ uid: 112 })
 * - Generate for single user (specific week): WeeklyReports.manualTrigger({ uid: 112, weekStartStr: '2026-01-05' })
 */
WeeklyReports.manualTrigger = async function (options = {}) {
    winston.info('[reports:weekly] 🔧 Manual trigger initiated', options);

    if (options.uid) {
        winston.info(`[reports:weekly] Generating for user ${options.uid}...`);
        return await WeeklyReports.generateForUser(options.uid, options.weekStartStr);
    } else {
        winston.info('[reports:weekly] Generating for all users...');
        return await WeeklyReports.generateAllWeeklyReports({
            weekStartStr: options.weekStartStr,
            weekEndStr: options.weekEndStr
        });
    }
};

/**
 * Get scheduler status
 */
WeeklyReports.getSchedulerStatus = function () {
    return {
        enabled: true,
        job: {
            name: 'Weekly Report Generation',
            schedule: '0 23 * * 0',
            description: 'Every Sunday at 11:00 PM',
        },
    };
};