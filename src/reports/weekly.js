'use strict';

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