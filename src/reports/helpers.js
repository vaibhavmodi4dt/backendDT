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
    return `report:monthly:user:${uid}:${yearMonth}`;
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
