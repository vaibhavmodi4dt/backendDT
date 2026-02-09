'use strict';

const storage = require('../supervisor/storage');
const Organizations = require('../organizations');
const User = require('../user');
const helpers = require('../supervisor/helpers');

const supervisor = module.exports;

async function ensureManager(req, deptId, weekStart) {
    if (!req.uid) throw new Error('[[error:not-logged-in]]');
    if (!deptId) throw new Error('[[error:invalid-department-id]]');
    if (!weekStart) throw new Error('[[error:week-start-required]]');

    // Honor middleware-set privilege flags (admins and org/department managers)
    if (req.isAdmin || req.isOrgManager || req.isDeptManager) {
        return;
    }

    const isManager = await Organizations.isDepartmentManager(deptId, req.uid);
    if (!isManager) throw new Error('[[error:no-permission]]');
}

// Helper: Format user object
function formatUserObject(user) {
    return {
        username: user.username,
        fullname: user.fullname || user.username,
        picture: user.picture
    };
}

// Helper: Format daily report for a single date
function formatDailyReport(report, date) {
    if (!report) {
        return {
            date,
            plan: [],
            frameworks: [],
            hasPlan: false,
            hasReport: false
        };
    }

    return {
        date,
        plan: report.plan || [],
        frameworks: report.frameworks || [],
        hasPlan: report.plan?.length > 0,
        hasReport: !!(report.report || report.frameworks?.length > 0)
    };
}

// Helper: Get daily reports for a user across week dates
async function getDailyReportsForUser(uid, weekDates) {
    return await Promise.all(
        weekDates.map(async (date) => {
            const report = await helpers.fetchDailyReport(uid, date);
            return formatDailyReport(report, date);
        })
    );
}

// Helper: Format weekly report
function formatWeeklyReport(weeklyReport) {
    if (!weeklyReport) {
        return {
            submitted: false
        };
    }

    const generated = weeklyReport.generatedReport || {};

    return {
        submitted: true,
        submittedAt: weeklyReport.submittedAt || Date.now(),
        // Prefer fields from generatedReport, but fall back to top-level properties for compatibility
        planVsActual: generated.planVsActual ?? weeklyReport.planVsActual ?? null,
        bottlenecksAndInsights: generated.bottlenecksAndInsights ?? weeklyReport.bottlenecksAndInsights ?? null,
        ipToolsTemplates: generated.ipToolsTemplates ?? weeklyReport.ipToolsTemplates ?? null,
        externalExploration: generated.externalExploration ?? weeklyReport.externalExploration ?? null,
        // Previously dropped fields – restore them to the API response
        summary: generated.summary ?? weeklyReport.summary ?? null,
        highlights: generated.highlights ?? weeklyReport.highlights ?? null,
        escalations: generated.escalations ?? weeklyReport.escalations ?? null,
        suggestions: generated.suggestions ?? weeklyReport.suggestions ?? null,
    };
}

// ============================================
// Dashboard (Summary + Scores)
// ============================================
supervisor.getDashboard = async (req, data) => {
    const { deptId, weekStart, uid } = data;


    // Check permission using shared logic
    await ensureManager(req, deptId, weekStart);

    const dashboard = await storage.getDepartmentDashboard(deptId, weekStart);

    if (!dashboard) throw new Error('[[error:dashboard-not-found]]');
    // If uid provided, return single member + department info (NO teamSummary)
    if (uid) {
        // Use type coercion to handle uid as string or number
        const member = dashboard.members.find(m => m.uid === Number(uid));

        if (!member) throw new Error('[[error:member-not-found]]');

        return {
            department: dashboard.department,
            weekStart: dashboard.weekStart,
            member: member,
        };
    }

    // Return full dashboard (all members + teamSummary)
    return dashboard;
};

// ============================================
// Reports (Daily/Weekly)
// ============================================
supervisor.getReports = async (req, data) => {
    const { deptId, uid, type, weekStart } = data;

    // Validation
    if (!type) throw new Error('[[error:type-required]]');
    if (!['daily', 'weekly'].includes(type)) throw new Error('[[error:invalid-type]]');

    // Check permission
    await ensureManager(req, deptId, weekStart);

    const weekDates = helpers.getWeekDates(weekStart);

    // ============================================
    // Individual Member
    // ============================================
    if (uid) {
        const user = await User.getUserData(uid);

        if (type === 'daily') {
            const dailyReports = await getDailyReportsForUser(uid, weekDates);

            return {
                uid,
                weekStart,
                type: 'daily',
                user: formatUserObject(user),
                dailyReports
            };
        }

        // Weekly report
        const weeklyReport = await helpers.fetchWeeklyReport(uid, weekStart);

        return {
            uid,
            weekStart,
            type: 'weekly',
            user: formatUserObject(user),
            weeklyReport: formatWeeklyReport(weeklyReport)
        };
    }

    // ============================================
    // All Department Members
    // ============================================
    const membersData = await Organizations.getDepartmentMembers(deptId);

    if (type === 'daily') {
        const members = await Promise.all(
            membersData.members.map(async (memberInfo) => {
                const user = await User.getUserData(memberInfo.uid);
                const dailyReports = await getDailyReportsForUser(memberInfo.uid, weekDates);

                return {
                    uid: memberInfo.uid,
                    user: formatUserObject(user),
                    dailyReports
                };
            })
        );

        return {
            deptId,
            weekStart,
            type: 'daily',
            members
        };
    }

    // Weekly reports for all members
    const members = await Promise.all(
        membersData.members.map(async (memberInfo) => {
            const user = await User.getUserData(memberInfo.uid);
            const weeklyReport = await helpers.fetchWeeklyReport(memberInfo.uid, weekStart);

            return {
                uid: memberInfo.uid,
                user: formatUserObject(user),
                weeklyReport: formatWeeklyReport(weeklyReport)
            };
        })
    );

    return {
        deptId,
        weekStart,
        type: 'weekly',
        members
    };
};

// ============================================
// Update Member Rubric
// ============================================
supervisor.updateMemberRubric = async (req, data) => {
    const { deptId, uid, weekStart, rubricData } = data;


    // Validation
    if (!uid) throw new Error('[[error:invalid-user-id]]');

    // Check permission
    await ensureManager(req, deptId, weekStart);

    // Fetch dashboard once and validate member exists
    const dashboard = await storage.getDepartmentDashboard(deptId, weekStart);
    if (!dashboard) throw new Error('[[error:dashboard-not-found]]');
    // Use type coercion to handle uid as string or number
    const memberExists = dashboard.members.some(m => m.uid === Number(uid));
    if (!memberExists) throw new Error('[[error:member-not-found]]');

    // Prepare rubric data with audit trail
    const rubric = {
        score: rubricData.score,
        feedback: rubricData.feedback || '',
        updatedBy: req.uid,
        updatedAt: Date.now(),
    };

    // Update rubric in storage, passing the already-fetched dashboard
    await storage.updateMemberRubric(deptId, uid, weekStart, rubric, dashboard);

    return {
        success: true,
        message: 'Rubric updated successfully',
        data: {
            deptId,
            uid,
            weekStart,
            rubric,
        },
    };
};