'use strict';

const db = require('../database');
const AiAgentService = require('../services/ai-agent');
const User = require('../user');
const utils = require('../utils');
const helpers = require('./helpers');
const { collections } = require('../database/mongo/collections');


const reportsCollection = { collection: collections.REPORTS };
const DailyReports = module.exports;

// ==========================================
// HELPER: GET RAW REPORT (for API validation)
// ==========================================
DailyReports.getDailyReportRaw = async function (uid, date) {
    const key = helpers.getDailyReportKey(uid, date);
    return await db.getObject(key, [], reportsCollection);
};

// ==========================================
// SUBMIT DAILY PLAN
// ==========================================
DailyReports.submitPlan = async function (uid, plan) {
    const today = helpers.getTodayDate();
    const key = helpers.getDailyReportKey(uid, today);
    const currentTime = utils.toISOString(utils.date.now());
    const timestamp = utils.date.now();

    const existing = await db.getObject(key, [], reportsCollection);

    await db.setObject(key, {
        ...(existing || {}),
        uid,
        date: today,
        plan,
        loginAt: existing?.loginAt || currentTime,
        createdAt: existing?.createdAt || currentTime,
        updatedAt: currentTime,
        updatedCount: (existing?.updatedCount || 0) + 1,
    }, reportsCollection);

    await Promise.all([
        db.sortedSetAdd(`user:${uid}:reports:daily`, timestamp, key),
        db.sortedSetAdd(`reports:daily:date:${today.substring(0, 7)}`, timestamp, key),
        db.setAdd(`user:${uid}:reports:daily:days`, today),

    ].filter(Boolean));

    return existing
        ? { updated: true, message: 'Plan updated successfully.' }
        : { submitted: true, message: 'Plan submitted successfully.' };
};

// ==========================================
// SUBMIT DAILY REPORT
// ==========================================
DailyReports.submitReport = async function (uid, data, existing) {
    const today = helpers.getTodayDate();
    const key = helpers.getDailyReportKey(uid, today);

    // Call AI evaluation
    const response = await AiAgentService.post('daily-report/evaluate', {
        transcript: data.report,
        uid,
        date: today,
        _key: key,
    });

    const evaluated = response?.data?.rawEvaluation ?? response?.data ?? {};

    // Return early if evaluation failed (don't persist)
    if (['needs_nudge', 'evaluation_failed', 'pending'].includes(evaluated.submissionStatus)) {
        return {
            submitted: false,
            message: evaluated.submissionStatus === 'needs_nudge'
                ? 'Your report needs clarification.'
                : 'AI evaluation failed. Please retry.',
            evaluated,
            date: today,
        };
    }

    // Update plan statuses
    const plan = existing.plan.map((item, index) => ({
        ...item,
        status: data.plan?.[index]?.status ||
            data.planUpdates?.find(u => u.index === index)?.status ||
            (data.selectedPlanIndexes?.includes(index) ? 'Completed' : item.status),
    }));

    // Save successful report
    await db.setObject(key, {
        ...existing,
        report: data.report,
        evaluated,
        plan,
        logoutAt: existing.logoutAt ,
        updatedAt: utils.date.toISO(utils.date.now()),
        updatedCount: (existing.updatedCount || 0) + 1,
    }, reportsCollection);

    const timestamp = utils.date.now();
    await Promise.all([
        db.sortedSetAdd(`user:${uid}:reports:daily`, timestamp, key),
        db.sortedSetAdd('reports:daily:status:submitted', timestamp, key),
    ]);

    return {
        submitted: true,
        message: 'Report submitted successfully.',
        evaluated,
        conversationId: existing.conversationId,
        date: today,
    };
};

// ==========================================
// GET DAILY REPORT BY DATE
// ==========================================
DailyReports.getDailyReport = async function (uid, date) {
    const entry = await DailyReports.getDailyReportRaw(uid, date);
    return helpers.sanitizeDailyReport(entry);
};

// ==========================================
// GET INCOMPLETE PLANS
// ==========================================
DailyReports.getIncompletePlans = async function (uid) {
    // Get current week start (Monday)
    const weekStart = utils.date.startOfWeek(utils.date.now());
    const startDate = utils.date.format(weekStart, utils.date.formats.DATE);


    // Get yesterday
    const yesterday = utils.date.subDays(utils.date.now(), 1);
    const endDate = utils.date.format(yesterday, utils.date.formats.DATE);

    const entries = await db.Aggregate(reportsCollection, [
        {
            $match: {
                uid,
                date: {
                    $gte: startDate,
                    $lte: endDate
                },
                plan: {
                    $elemMatch: {
                        status: { $in: ["notStarted", "inProcess"] }
                    }
                }
            }
        },
        {
            $project: {
                date: 1,
                plan: {
                    $filter: {
                        input: "$plan",
                        as: "task",
                        cond: { $in: ["$$task.status", ["notStarted", "inProcess"]] }
                    }
                }
            }
        },
        { $sort: { date: -1 } }
    ]);


    if (!entries || entries.length === 0) {
        return [];
    }

    return entries;
};


// ==========================================
// GET DAILY REPORT COUNT
// ==========================================
DailyReports.getCount = async function (startDate, endDate) {
    const entries = await db.findFields(reportsCollection, {
        date: { $gte: startDate, $lte: endDate },
        uid: { $ne: null },
    });

    const summary = {};
    entries.forEach((e) => {
        if (!summary[e.uid]) {
            summary[e.uid] = { uid: e.uid, planCount: 0, reportCount: 0, lastUpdate: e.updatedAt };
        }
        if (e.plan?.length) summary[e.uid].planCount++;
        if (e.report) summary[e.uid].reportCount++;
    });

    const users = await User.getUsersFields(Object.keys(summary), ['username', 'fullname']);
    users.forEach((u) => {
        if (summary[u.uid]) summary[u.uid].name = u.fullname || u.username;
    });

    return Object.values(summary).map((s) => ({
        uid: s.uid,
        from: startDate,
        to: endDate,
        name: s.name || 'Unknown',
        planCount: s.planCount,
        reportCount: s.reportCount,
        lastUpdated: s.lastUpdate,
    }));
};

// ==========================================
// SUBMIT FRAMEWORKS
// ==========================================
DailyReports.submitFrameworks = async function (uid, data) {
    const date = data.date || helpers.getTodayDate();
    const key = helpers.getDailyReportKey(uid, date);
    const existing = await db.getObject(key, [], reportsCollection);

    // ✅ Get existing frameworks
    const existingFrameworks = existing?.frameworks || [];

    // ✅ Merge: Update existing or add new
    const updatedFrameworks = [...existingFrameworks];

    data.frameworks.forEach(newFw => {
        const index = updatedFrameworks.findIndex(fw => fw.text === newFw.text);

        if (index >= 0) {
            // ✅ Update existing framework
            updatedFrameworks[index] = newFw;
        } else {
            // ✅ Add new framework
            updatedFrameworks.push(newFw);
        }
    });

    await db.setObject(key, {
        ...(existing || {}),
        uid,
        date,
        frameworks: updatedFrameworks,
        modifiedAt: utils.date.toISO(utils.date.now()),
    }, reportsCollection);

    return {
        success: true,
        frameworksAdded: data.frameworks.length,
        totalFrameworks: updatedFrameworks.length,
    };
};


// ==========================================
// UPDATE REFLECTION
// ==========================================
DailyReports.updateReflection = async function (uid, data, existing) {
    const date = data.date || helpers.getTodayDate();
    const key = helpers.getDailyReportKey(uid, date);
    const [fieldKey] = Object.keys(data.dailyReflection);
    const newText = data.dailyReflection[fieldKey];

    const evaluated = existing.evaluated || {};
    evaluated.dailyReflection = evaluated.dailyReflection || {};
    evaluated.dailyReflection[fieldKey] = {
        question: evaluated.dailyReflection[fieldKey]?.question || fieldKey,
        response: newText,
    };

    await db.setObject(key, {
        ...existing,
        evaluated,
        updatedAt: utils.date.toISO(utils.date.now()),
        updatedCount: (existing.updatedCount || 0) + 1,
    }, reportsCollection);

    return {
        success: true,
        message: `Updated reflection field: ${fieldKey}`,
        date,
        evaluated,
    };
};

// ==========================================
// POST CHAT MESSAGE
// ==========================================
DailyReports.postChatMessage = async function (uid, message) {
    const today = helpers.getTodayDate();
    const key = helpers.getDailyReportKey(uid, today);
    const existing = await db.getObject(key, [], reportsCollection);

    let conversationId = existing?.conversationId;

    // Start or continue conversation
    if (!conversationId) {
        const initResponse = await AiAgentService.post('/chat-reflection', { message });
        conversationId = initResponse.conversationId;

        await db.setObject(key, {
            ...(existing || {}),
            uid,
            date: today,
            conversationId,
            createdAt: existing?.createdAt || new Date(),
            updatedAt: new Date(),
        }, reportsCollection);
    } else {
        await AiAgentService.post(`/chat-reflection/${conversationId}`, { message });
    }

    // Get latest AI response
    const messagesResponse = await AiAgentService.get(`/chat-reflection/${conversationId}/messages`);
    const latestAI = messagesResponse?.messages?.find((msg) => msg.role === 'assistant');

    return {
        success: true,
        conversationId,
        userMessage: message,
        aiResponse: latestAI?.text || '',
    };
};

// ==========================================
// GET CHAT MESSAGES
// ==========================================
DailyReports.getChatMessages = async function (uid) {
    const today = helpers.getTodayDate();
    const key = helpers.getDailyReportKey(uid, today);
    const existing = await db.getObject(key, [], reportsCollection);

    if (!existing?.conversationId) {
        return { success: true, conversationId: null, messages: [] };
    }

    const messagesResponse = await AiAgentService.get(
        `/chat-reflection/${existing.conversationId}/messages`
    );

    return {
        success: true,
        conversationId: existing.conversationId,
        messages: (messagesResponse?.messages || []).reverse(),
    };
};

// ==========================================
// INITIATE SESSION (LOGIN)
// ==========================================
DailyReports.initiateSession = async function (uid) {
    const today = helpers.getTodayDate();
    const key = helpers.getDailyReportKey(uid, today);
    const currentTime = utils.date.toISO(utils.date.now());
    const startChat = await AiAgentService.post('/chat-reflection', { message: 'Hello there!' });

    await db.setObject(key, {
        uid,
        date: today,
        conversationId: startChat.conversationId,
        loginAt: currentTime,
        createdAt: currentTime,
    }, reportsCollection);

    return { status: 'success', loginAt: currentTime };
};

// ==========================================
// SUBMIT LOGOUT
// ==========================================
DailyReports.submitLogout = async function (uid) {
    const today = helpers.getTodayDate();
    const key = helpers.getDailyReportKey(uid, today);
    const currentTime = utils.date.toISO(utils.date.now())

    await db.setObjectField(key, 'logoutAt', currentTime, reportsCollection);

    return { status: 'success', logoutAt: currentTime };
};
