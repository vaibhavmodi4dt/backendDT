'use strict';

const utils = require('../utils');

const helpers = module.exports;

/**
 * Get current month info (yearMonth, year, month)
 */
helpers.getCurrentMonth = function () {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return {
        yearMonth: `${year}-${month}`,
        year: year,
        month: month
    };
};

/**
 * Validate monthly report data
 */
helpers.validateReportData = function (data) {
    if (data.status && !['draft', 'submitted'].includes(data.status)) {
        throw new Error('[[error:invalid-status]]');
    }
};

/**
 * Generate report key
 */
helpers.getReportKey = function (uid, yearMonth) {
    return `reports:monthly:user:${uid}:${yearMonth}`;
};

/**
 * Sanitize report data for output
 */
helpers.sanitizeReport = function (report) {
    if (!report) {
        return null;
    }

    return {
        _key: report._key,
        uid: report.uid,
        month: report.month,
        year: report.year,
        monthNumber: report.monthNumber,
        status: report.status,
        timestamp: report.timestamp,
        edited: report.edited,
        submitted: report.submitted,
        steps: report.steps || [],
    };
};

/**
 * Sanitize multiple reports
 */
helpers.sanitizeReports = function (reports) {
    return reports.map(helpers.sanitizeReport).filter(Boolean);
};

/**
 * Prepare report data for storage
 */
helpers.prepareReportData = function (data, existing, year, month, yearMonth) {
    const now = utils.date.now();
    const isNew = !existing;

    const reportData = {
        _key: helpers.getReportKey(data.uid, yearMonth),
        uid: data.uid,
        month: yearMonth,
        year: year,
        monthNumber: month,
        status: data.status || 'draft',
        edited: now,
        steps: data.steps || [],
    };

    reportData.timestamp = isNew ? now : existing.timestamp;
    reportData.submitted = helpers.calculateSubmittedTimestamp(data.status, existing, now);

    return reportData;
};

/**
 * Calculate submitted timestamp based on status change
 */
helpers.calculateSubmittedTimestamp = function (status, existing, now) {
    const wasSubmitted = existing && existing.status === 'submitted';
    const isSubmitted = status === 'submitted';

    if (isSubmitted && !wasSubmitted) {
        return now;
    }

    return existing ? (existing.submitted || 0) : (isSubmitted ? now : 0);
};

// ==========================================
// DAILY HELPERS
// ==========================================

/**
 * Get today's date in YYYY-MM-DD format (local time)
 */
helpers.getTodayDate = () => utils.date.format(utils.date.now(), utils.date.formats.DATE);

/**
 * Generate daily report key
 */
helpers.getDailyReportKey = function (uid, date) {
    return `reports:daily:user:${uid}:${date}`;
};

/**
 * Check if value is set (not undefined, null, or empty string)
 */
helpers.isset = function (value) {
    return value !== undefined && value !== null && value !== '';
};

/**
 * Sanitize daily report for output
 */
helpers.sanitizeDailyReport = function (report) {
    if (!report) return null;

    return {
        uid: report.uid,
        date: report.date,
        plan: report.plan || [],
        report: report.report || null,
        frameworks: report.frameworks || [],
        evaluated: report.evaluated || null,
        conversationId: report.conversationId || null,
        loginAt: report.loginAt || null,
        logoutAt: report.logoutAt || null,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
    };
};

// ==========================================
// WEEKLY HELPERS
// ==========================================

/**
 * Get current week start (Monday) in YYYY-MM-DD format
 */
helpers.getCurrentWeekStart = function () {
    const nowTs = utils.date.now();
    const mondayTs = utils.date.startOfWeek(nowTs);
    return utils.date.format(mondayTs, utils.date.formats.DATE);
};

helpers.getDateRange = function (startDate, endDate) {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        dates.push(utils.date.format(date.getTime(), utils.date.formats.DATE));
    }

    return dates;
};

/**
 * Generate weekly report key
 */
helpers.getWeeklyReportKey = function (uid, weekStart) {
    return `reports:weekly:user:${uid}:${weekStart}`;
};

/**
 * Get week start date (Monday) from any date
 */
helpers.getWeekStartDate = function (date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day + 6) % 7; // Days to subtract to get Monday

    const monday = new Date(d);
    monday.setDate(d.getDate() - diff);

    return monday;
};

/**
 * Get array of 6 dates (Mon-Sat) from week start
 * Updated to return 6 days instead of 7
 */
helpers.getWeekDates = function (weekStart) {
    const dates = [];
    const start = new Date(weekStart);

    for (let i = 0; i < 6; i++) { // Changed from 7 to 6
        const date = new Date(start);
        date.setDate(start.getDate() + i);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        dates.push(`${year}-${month}-${day}`);
    }

    return dates;
};

/**
 * Get week number from date (YYYY-Www format)
 */
helpers.getWeekNumber = function (date) {
    const d = new Date(date);
    const oneJan = new Date(d.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((d - oneJan) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
};

/**
 * Sanitize weekly report for output
 */
helpers.sanitizeWeeklyReport = function (report) {
    if (!report) return null;

    return {
        uid: report.uid,
        weekStart: report.weekStart,
        week: report.week || null,
        transcript: report.transcript || null,
        weeklyGoals: report.weeklyGoals || null,
        evaluation: report.evaluation || null,
        submissionStatus: report.submissionStatus || null,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
    };
};

/**
 * Sanitize weekly report evaluation for output
 */
helpers.sanitizeWeeklyReportEvaluation = function (report) {
    if (!report) return null;

    return {
        uid: report.uid,
        weekStart: report.weekStart,
        week: report.week || null,
        generatedReport: report.generatedReport || null,
        editedReport: report.editedReport || null,
        status: report.status || 'draft',
        submittedAt: report.submittedAt || null,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
    };
};