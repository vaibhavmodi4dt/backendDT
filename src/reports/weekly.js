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

    // Call AI evaluation (part of business operation)
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
WeeklyReports.updateWeekly = async function (uid, weekStart, updates, existing) {
    const key = helpers.getWeeklyReportKey(uid, weekStart);
    const currentTime = utils.toISOString(utils.date.now());

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
// GET WEEKLY REPORT (7-day aggregation)
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
        endDate: weekDates[6],
        days,
    };
};