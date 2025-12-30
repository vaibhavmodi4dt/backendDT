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
// DAILY REPORTS (NEW)
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
