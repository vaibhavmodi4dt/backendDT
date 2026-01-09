'use strict';

const Reports = require('../reports');

const reportsApi = module.exports;

// ... (keeping all existing methods unchanged until WEEKLY REPORT EVALUATION section)

// ==========================================
// WEEKLY REPORT EVALUATION (NEW) - WITH BUSINESS LOGIC
// ==========================================

/**
 * Generate weekly report evaluation using AI
 * POST /api/v3/reports/weekly/report/generate
 */
reportsApi.generateWeeklyReportEvaluation = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    // Determine week start
    const anchor = data.date ? new Date(data.date) : new Date();
    const weekStart = Reports.helpers.getWeekStartDate(anchor);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const week = Reports.helpers.getWeekNumber(weekStartStr);
    const weekDates = Reports.helpers.getWeekDates(weekStartStr);

    // Check for existing evaluation (for caching)
    const existing = await Reports.getReportEvaluation(caller.uid, weekStartStr);

    // Fetch daily reports from database
    const dailyReports = await Reports.fetchDailyReports(caller.uid, weekDates);

    // Validate: Check if any daily reports exist
    if (dailyReports.length === 0) {
        return {
            success: false,
            error: 'No daily reports found for this week',
            weekStart: weekStartStr,
            week,
            daysFound: 0,
        };
    }

    // Call AI service to evaluate
    let aiResponse;
    try {
        aiResponse = await Reports.callAiEvaluation(dailyReports);
    } catch (error) {
        // AI service error - check if we have cached evaluation
        console.error('AI service error:', error);

        if (existing && existing.generatedReport) {
            // Return cached evaluation
            return {
                success: true,
                cached: true,
                message: 'AI service unavailable. Returning cached evaluation.',
                weekStart: weekStartStr,
                week,
                daysFound: dailyReports.length,
                generatedReport: existing.generatedReport,
                editedReport: existing.editedReport,
                status: existing.status,
                submittedAt: existing.submittedAt,
            };
        }

        // No cache available - return error with raw data
        return {
            success: false,
            error: 'AI service unavailable and no cached evaluation found',
            weekStart: weekStartStr,
            week,
            daysFound: dailyReports.length,
            dailyReports: dailyReports,
        };
    }

    // Validate AI response
    if (!aiResponse || !aiResponse.success || !aiResponse.data) {
        // AI returned error but we have cache
        if (existing && existing.generatedReport) {
            return {
                success: true,
                cached: true,
                message: 'AI evaluation failed. Returning cached evaluation.',
                weekStart: weekStartStr,
                week,
                daysFound: dailyReports.length,
                generatedReport: existing.generatedReport,
                editedReport: existing.editedReport,
                status: existing.status,
                submittedAt: existing.submittedAt,
            };
        }

        // No cache, return error with raw data
        return {
            success: false,
            error: aiResponse?.error || 'AI evaluation failed',
            weekStart: weekStartStr,
            week,
            daysFound: dailyReports.length,
            dailyReports: dailyReports,
        };
    }

    // AI success - save to database
    const generatedReport = aiResponse.data;
    const saved = await Reports.saveReportEvaluation(
        caller.uid,
        weekStartStr,
        generatedReport,
        existing
    );

    return {
        success: true,
        cached: false,
        weekStart: weekStartStr,
        week,
        daysFound: dailyReports.length,
        generatedReport: saved.generatedReport,
        editedReport: saved.editedReport,
        status: saved.status,
        submittedAt: saved.submittedAt,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
    };
};

/**
 * Get existing weekly report evaluation
 * GET /api/v3/reports/weekly/report/evaluation
 */
reportsApi.getWeeklyReportEvaluation = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    // Determine week start
    const weekStart = data.weekStart || Reports.helpers.getCurrentWeekStart();

    // Fetch from database
    const entry = await Reports.getReportEvaluation(caller.uid, weekStart);

    // Validate entry exists
    if (!entry) {
        throw new Error('[[error:no-weekly-evaluation-found]]');
    }

    // Return sanitized data
    return Reports.helpers.sanitizeWeeklyReportEvaluation(entry);
};

/**
 * Update weekly report evaluation (edit generated report)
 * PUT /api/v3/reports/weekly/report/evaluation
 */
reportsApi.updateWeeklyReportEvaluation = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    // Determine week start
    const weekStart = data.weekStart || Reports.helpers.getCurrentWeekStart();

    // Validate editedReport exists
    if (!data.editedReport) {
        throw new Error('[[error:edited-report-required]]');
    }

    // Check if evaluation exists
    const existing = await Reports.getReportEvaluation(caller.uid, weekStart);
    if (!existing) {
        throw new Error('[[error:no-weekly-evaluation-found]]');
    }

    // Check if already submitted (cannot edit after submission)
    if (existing.status === 'submitted') {
        throw new Error('[[error:cannot-edit-submitted-report]]');
    }

    // Update in database
    return await Reports.updateReportEvaluation(
        caller.uid,
        weekStart,
        data.editedReport
    );
};

/**
 * Submit weekly report evaluation (finalize)
 * POST /api/v3/reports/weekly/report/submit
 */
reportsApi.submitWeeklyReportEvaluation = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    // Determine week start
    const weekStart = data.weekStart || Reports.helpers.getCurrentWeekStart();

    // Check if evaluation exists
    const existing = await Reports.getReportEvaluation(caller.uid, weekStart);
    if (!existing) {
        throw new Error('[[error:no-weekly-evaluation-found]]');
    }

    // Check if already submitted
    if (existing.status === 'submitted') {
        throw new Error('[[error:already-submitted]]');
    }

    // Submit in database
    return await Reports.submitReportEvaluation(caller.uid, weekStart);
};