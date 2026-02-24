'use strict';

const Reports = require('../reports');

const reportsApi = module.exports;

// ==========================================
// MONTHLY REPORTS (EXISTING)
// ==========================================

reportsApi.get = async function (caller, data) {
    return await Reports.get(caller.uid, data.month);
};

reportsApi.save = async function (caller, data) {
    Reports.validateReportsData(data);
    return await Reports.save({
        uid: caller.uid,
        status: data.status,
        steps: data.steps,
    });
};

// ==========================================
// DAILY REPORTS (EXISTING)
// ==========================================

/**
 * Submit daily plan
 */
reportsApi.submitPlan = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }
    return await Reports.submitPlan(caller.uid, data.plan);
};

/**
 * Submit daily report
 */
reportsApi.submitReport = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const today = data?.date || Reports.helpers.getTodayDate();

    // Check if plan exists
    const existing = await Reports.getDailyReportRaw(caller.uid, today);
    if (!existing?.plan?.length) {
        throw new Error('[[error:plan-required-first]]');
    }

    // Check retry eligibility
    if (existing.report) {
        const lastStatus = existing.evaluated?.submissionStatus;
        if (!['needs_nudge', 'evaluation_failed', 'pending'].includes(lastStatus)) {
            throw new Error('[[error:report-already-submitted]]');
        }
    }

    return await Reports.submitReport(caller.uid, data, existing);
};

/**
 * Get daily report by date
 */
reportsApi.getDailyReport = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }
    if (!data.date) {
        throw new Error('[[error:invalid-date]]');
    }
    return await Reports.getDailyReport(caller.uid, data.date);
};

/**
 * Get incomplete plans for current week
 */
reportsApi.getIncompletePlans = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }
    return await Reports.getIncompletePlans(caller.uid);
};

/**
 * Get daily report count for date range
 */
reportsApi.getCount = async function (caller, data) {
    if (!data.startDate || !data.endDate) {
        throw new Error('[[error:invalid-date-range]]');
    }
    return await Reports.getCount(data.startDate, data.endDate);
};

/**
 * Submit frameworks implemented
 */
reportsApi.submitFrameworks = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }
    return await Reports.submitFrameworks(caller.uid, data);
};

/**
 * Update daily reflection
 */
reportsApi.updateReflection = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    // Check if report exists
    const date = data.date || Reports.helpers.getTodayDate();
    const existing = await Reports.getDailyReportRaw(caller.uid, date);
    if (!existing) {
        throw new Error('[[error:no-report-found]]');
    }

    return await Reports.updateReflection(caller.uid, data, existing);
};

/**
 * Post chat/reflection message
 */
reportsApi.postChatMessage = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }
    if (!data.message) {
        throw new Error('[[error:message-required]]');
    }
    return await Reports.postChatMessage(caller.uid, data.message);
};

/**
 * Get chat/reflection messages
 */
reportsApi.getChatMessages = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }
    return await Reports.getChatMessages(caller.uid);
};

/**
 * Initiate daily session (login)
 */
reportsApi.initiateSession = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    // Check if session already exists
    const today = Reports.helpers.getTodayDate();
    const existing = await Reports.getDailyReportRaw(caller.uid, today);
    if (existing?.loginAt) {
        return { status: 'success', loginAt: existing.loginAt, message: 'Already logged in' };
    }

    return await Reports.initiateSession(caller.uid);
};

/**
 * Get session status (login/logout times)
 */
reportsApi.getSessionStatus = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }
    if (!data.date) {
        throw new Error('[[error:invalid-date]]');
    }

    const existing = await Reports.getDailyReportRaw(caller.uid, data.date);
    if (!existing) {
        throw new Error('[[error:no-session-found]]');
    }

    return {
        loginAt: existing.loginAt || null,
        logoutAt: existing.logoutAt || null,
        hasLoggedIn: !!existing.loginAt,
    };
};

/**
 * Submit logout session
 */
reportsApi.submitLogout = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const today = Reports.helpers.getTodayDate();
    const existing = await Reports.getDailyReportRaw(caller.uid, today);

    if (!existing) {
        throw new Error('[[error:no-session-found]]');
    }

    if (existing.logoutAt) {
        return { status: 'success', logoutAt: existing.logoutAt };
    }

    return await Reports.submitLogout(caller.uid);
};

// ==========================================
// WEEKLY REPORTS (NEW)
// ==========================================

/**
 * Submit weekly plan
 */
reportsApi.submitWeeklyPlan = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    // Normalize and validate inputs
    // Ensure weekStart is always normalized to Monday
    const anchor = data.weekStart ? new Date(data.weekStart) : new Date();
    const weekStartDate = Reports.helpers.getWeekStartDate(anchor);
    const weekStart = weekStartDate.toISOString().split('T')[0];
    const transcript = String(data.transcript || '').trim();
    const weeklyGoals = String(data.weeklyGoals || '').trim();

    if (!transcript) {
        throw new Error('[[error:transcript-required]]');
    }
    if (!weeklyGoals) {
        throw new Error('[[error:weekly-goals-required]]');
    }

    // Pass to business logic (which handles AI evaluation)
    return await Reports.submitWeeklyPlan(caller.uid, weekStart, transcript, weeklyGoals);
};

/**
 * Get weekly plan
 */
reportsApi.getWeeklyPlan = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    // Normalize weekStart - always normalize to Monday
    const anchor = data.weekStart ? new Date(data.weekStart) : new Date();
    const weekStartDate = Reports.helpers.getWeekStartDate(anchor);
    const weekStart = weekStartDate.toISOString().split('T')[0];

    // Get the entry
    const entry = await Reports.getWeekly(caller.uid, weekStart);

    // Validate entry exists
    if (!entry) {
        throw new Error('[[error:no-weekly-entry-found]]');
    }

    return entry;
};

/**
 * Update weekly plan
 */
reportsApi.updateWeeklyPlan = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    // Normalize weekStart - always normalize to Monday
    const anchor = data.weekStart ? new Date(data.weekStart) : new Date();
    const weekStartDate = Reports.helpers.getWeekStartDate(anchor);
    const weekStart = weekStartDate.toISOString().split('T')[0];

    // Check if weekly plan exists
    const existing = await Reports.getWeeklyRaw(caller.uid, weekStart);
    if (!existing) {
        throw new Error('[[error:no-weekly-entry-found]]');
    }

    // Validate and filter updates
    const allowedFields = [
        'transcript',
        'weeklyGoals',
        'evaluation.goal',
        'evaluation.plan',
        'evaluation.objectives',
        'evaluation.keyResults',
    ];

    const updates = {};
    if (data.updates && typeof data.updates === 'object') {
        Object.keys(data.updates).forEach((field) => {
            const isAllowed = allowedFields.some(allowed =>
                field === allowed || field.startsWith(allowed + '.')
            );

            if (!isAllowed) {
                throw new Error(`[[error:field-not-allowed]]: ${field}`);
            }

            updates[field] = data.updates[field];
        });
    }

    if (Object.keys(updates).length === 0) {
        throw new Error('[[error:no-valid-updates]]');
    }

    // Pass cleaned data to business logic
    return await Reports.updateWeekly(caller.uid, weekStart, updates, existing);
};

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

    // Determine week start - always normalize to Monday
    const anchor = data.weekStart ? new Date(data.weekStart) : new Date();
    const weekStartDate = Reports.helpers.getWeekStartDate(anchor);
    const weekStart = weekStartDate.toISOString().split('T')[0];

    // Fetch from evaluation storage (not user reports)
    let entry = await Reports.getReportEvaluation(caller.uid, weekStart);

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

    // Determine week start - always normalize to Monday
    const anchor = data.weekStart ? new Date(data.weekStart) : new Date();
    const weekStartDate = Reports.helpers.getWeekStartDate(anchor);
    const weekStart = weekStartDate.toISOString().split('T')[0];

    // Check if user report exists
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

    // Determine week start - always normalize to Monday
    const anchor = data.weekStart ? new Date(data.weekStart) : new Date();
    const weekStartDate = Reports.helpers.getWeekStartDate(anchor);
    const weekStart = weekStartDate.toISOString().split('T')[0];

    // Check if user report exists
    let existing = await Reports.getReportEvaluation(caller.uid, weekStart);

    // If no user report found, try to auto-generate it or create empty one for future weeks
    if (!existing) {
        try {
            console.log(`[submit] No report found for user ${caller.uid}, attempting auto-generation...`);
            const weekDates = Reports.helpers.getWeekDates(weekStart);
            const dailyReports = await Reports.fetchDailyReports(caller.uid, weekDates);

            if (dailyReports.length === 0) {
                // No daily reports - create empty report for future week
                console.log(`[submit] No daily reports found, creating empty report for future week`);
                existing = await Reports.saveReportEvaluation(
                    caller.uid,
                    weekStart,
                    {}, // Empty generated report
                    null // No existing
                );
            } else {
                // Auto-generate the report
                const result = await Reports.generateForUser(caller.uid, weekStart);
                if (result.skipped) {
                    throw new Error(`[[error:generation-skipped:${result.reason}]]`);
                }

                // Re-fetch after generation
                existing = await Reports.getReportEvaluation(caller.uid, weekStart);
                if (!existing) {
                    throw new Error('[[error:generation-failed-no-db-entry]]');
                }
                console.log(`[submit] Auto-generated report for user ${caller.uid}`);
            }
        } catch (error) {
            console.error(`[submit] Failed to auto-generate for user ${caller.uid}:`, error.message);
            throw error; // Re-throw with original error message
        }
    }

    // Check if already submitted
    if (existing.status === 'submitted') {
        throw new Error('[[error:already-submitted]]');
    }

    // Submit in database (pass insights from request if available)
    const result = await Reports.submitReportEvaluation(caller.uid, weekStart);

    console.log(`[submit] Successfully submitted report for user ${caller.uid}, week ${weekStart}`, result);

    // Verify submission was saved
    const verified = await Reports.getReportEvaluation(caller.uid, weekStart);
    console.log(`[submit] Verified submission - status: ${verified?.status}, submittedAt: ${verified?.submittedAt}`);

    // Transform to match frontend expectations
    return {
        success: true,
        message: 'Weekly report submitted successfully!',
        submittedAt: result.submittedAt,
    };
};

/**
 * Get weekly insights and submission status
 * GET /api/v3/reports/weekly/insights
 */
reportsApi.getWeeklyInsights = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    // Determine week start
    const anchor = data.weekStart ? new Date(data.weekStart) : new Date();
    const weekStart = Reports.helpers.getWeekStartDate(anchor);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndDate = new Date(weekStart);
    weekEndDate.setDate(weekEndDate.getDate() + 6); // Sunday
    const weekEndStr = weekEndDate.toISOString().split('T')[0];

    // Fetch from user weekly reports (new key pattern)
    let entry = await Reports.getReportEvaluation(caller.uid, weekStartStr);

    // If no user report exists, try to generate it (lazy-load pattern)
    if (!entry) {
        try {
            console.log(`[insights] Auto-generating evaluation for user ${caller.uid}, week ${weekStartStr}`);

            // Check if there are any daily reports for this week first
            const dailyReports = await Reports.fetchDailyReports(caller.uid, Reports.helpers.getWeekDates(weekStartStr));

            if (dailyReports.length === 0) {
                console.log(`[insights] No daily reports found for user ${caller.uid}, week ${weekStartStr}`);
                throw new Error('[[error:no-daily-reports-for-week]]');
            }

            console.log(`[insights] Found ${dailyReports.length} daily reports, generating evaluation...`);

            const result = await Reports.generateForUser(caller.uid, weekStartStr);

            // Check if generation was skipped
            if (result.skipped) {
                console.log(`[insights] Generation skipped: ${result.reason}`, result);
                throw new Error(`[[error:generation-skipped:${result.reason}]]`);
            }

            // Re-fetch after generation
            entry = await Reports.getReportEvaluation(caller.uid, weekStartStr);

            if (!entry) {
                console.error(`[insights] Generation returned success but no entry in DB for user ${caller.uid}`);
                throw new Error('[[error:generation-failed-no-db-entry]]');
            }

            console.log(`[insights] Successfully generated evaluation for user ${caller.uid}`);
        } catch (error) {
            console.error(`[insights] Failed to auto-generate for user ${caller.uid}:`, error.message);
            throw error; // Re-throw with original error message
        }
    }

    // Extract insights from user report (new format)
    const insights = entry.generatedReport || {
        weekAtGlance: '',
        highlights: '',
        blockers: '',
        carryForward: '',
        userFeedback: '',
    };

    // If not submitted yet and editedReport has userFeedback, use that (for draft display)
    if (entry.status !== 'submitted' && entry.editedReport?.userFeedback) {
        insights.userFeedback = entry.editedReport.userFeedback;
    }

    return {
        startDate: weekStartStr,
        endDate: weekEndStr,
        insights: insights,
        isSubmitted: entry.status === 'submitted',
        submittedAt: entry.submittedAt || null,
    };
};

/**
 * Get weekly report (7-day aggregation of daily reports)
 * GET /api/v3/reports/weekly/report
 */
reportsApi.getWeeklyReport = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    // Determine week start
    const anchor = data.date ? new Date(data.date) : new Date();
    const weekStart = Reports.helpers.getWeekStartDate(anchor);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    // Get week dates (Mon-Sun, 7 days)
    const weekDates = Reports.helpers.getWeekDates(weekStartStr);
    
    // Fetch daily reports and aggregate
    return await Reports.getWeeklyReport(caller.uid, weekDates);
};