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
    const weekStart = data.weekStart || Reports.helpers.getCurrentWeekStart();
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

    // Normalize weekStart
    const weekStart = data.weekStart || Reports.helpers.getCurrentWeekStart();

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

    // Normalize weekStart
    const weekStart = data.weekStart || Reports.helpers.getCurrentWeekStart();

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

/**
 * Get weekly report (7-day aggregation)
 */
reportsApi.getWeeklyReport = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    // Compute week dates
    const anchor = data.date ? new Date(data.date) : new Date();
    const weekStart = Reports.helpers.getWeekStartDate(anchor);
    const weekDates = Reports.helpers.getWeekDates(weekStart);

    // Pass computed dates to business logic
    return await Reports.getWeeklyReport(caller.uid, weekDates);
};