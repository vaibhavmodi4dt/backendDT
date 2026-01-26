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
    const isManager = await Organizations.isDepartmentManager(deptId, req.uid);
    if (!isManager) throw new Error('[[error:no-permission]]');
}

// ============================================
// Dashboard (Summary + Scores)
// ============================================
supervisor.getDashboard = async (req, data) => {
    const { deptId, weekStart, uid } = data;

    if (!req.uid) throw new Error('[[error:not-logged-in]]');
    if (!deptId) throw new Error('[[error:invalid-department-id]]');
    if (!weekStart) throw new Error('[[error:week-start-required]]');

    const isManager = await Organizations.isDepartmentManager(deptId, req.uid);
    if (!isManager) throw new Error('[[error:no-permission]]');

    const dashboard = await storage.getDepartmentDashboard(deptId, weekStart);
    if (!dashboard) throw new Error('[[error:dashboard-not-found]]');

    // If uid provided, return single member + department info (NO teamSummary)
    if (uid) {
        const member = dashboard.members.find(m => m.uid === uid);
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

        // Daily reports
        if (type === 'daily') {
            const dailyReports = await Promise.all(
                weekDates.map(async (date) => {
                    const report = await helpers.fetchDailyReport(uid, date);

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
                })
            );

            return {
                uid,
                weekStart,
                type: 'daily',
                user: {
                    username: user.username,
                    fullname: user.fullname || user.username,
                    picture: user.picture
                },
                dailyReports
            };
        }

        // Weekly report
        const weeklyReport = await helpers.fetchWeeklyReport(uid, weekStart);

        return {
            uid,
            weekStart,
            type: 'weekly',
            user: {
                username: user.username,
                fullname: user.fullname || user.username,
                picture: user.picture
            },
            weeklyReport: weeklyReport ? {
                submitted: true,
                submittedAt: weeklyReport.submittedAt || Date.now(),
                planVsActual: weeklyReport.planVsActual || null,
                bottlenecksAndInsights: weeklyReport.bottlenecksAndInsights || null,
                ipToolsTemplates: weeklyReport.ipToolsTemplates || null,
                externalExploration: weeklyReport.externalExploration || null,
            } : {
                submitted: false
            }
        };
    }

    // ============================================
    // All Department Members
    // ============================================
    const membersData = await Organizations.getDepartmentMembers(deptId);

    // Daily reports for all members
    if (type === 'daily') {
        const members = await Promise.all(
            membersData.members.map(async (memberInfo) => {
                const user = await User.getUserData(memberInfo.uid);

                const dailyReports = await Promise.all(
                    weekDates.map(async (date) => {
                        const report = await helpers.fetchDailyReport(memberInfo.uid, date);

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
                    })
                );

                return {
                    uid: memberInfo.uid,
                    user: {
                        username: user.username,
                        fullname: user.fullname || user.username,
                        picture: user.picture
                    },
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
                user: {
                    username: user.username,
                    fullname: user.fullname || user.username,
                    picture: user.picture
                },
                weeklyReport: weeklyReport ? {
                    submitted: true,
                    submittedAt: weeklyReport.submittedAt || Date.now(),
                    planVsActual: weeklyReport.planVsActual || null,
                    bottlenecksAndInsights: weeklyReport.bottlenecksAndInsights || null,
                    ipToolsTemplates: weeklyReport.ipToolsTemplates || null,
                    externalExploration: weeklyReport.externalExploration || null,
                } : {
                    submitted: false
                }
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

    // Check if dashboard exists
    const dashboard = await storage.getDepartmentDashboard(deptId, weekStart);
    if (!dashboard) throw new Error('[[error:dashboard-not-found]]');

    // Check if member exists in dashboard
    const memberExists = dashboard.members.some(m => m.uid === uid);
    if (!memberExists) throw new Error('[[error:member-not-found]]');

    // Prepare rubric data with audit trail
    const rubric = {
        score: rubricData.score,
        feedback: rubricData.feedback || '',
        updatedBy: req.uid,
        updatedAt: Date.now(),
    };

    // Update rubric in storage (updates both dashboard and member documents)
    await storage.updateMemberRubric(deptId, uid, weekStart, rubric);

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