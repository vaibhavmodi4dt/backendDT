'use strict';

const storage = require('../supervisor/storage');
const Organizations = require('../organizations');
const User = require('../user');
const helpers = require('../supervisor/helpers');

const supervisor = module.exports;

// ============================================
// Dashboard (Summary + Scores)
// ============================================
supervisor.getDashboard = async (req, data) => {
    const { deptId, weekStart } = data;

    // All validations (auth, deptId, weekStart, permissions) are handled by middlewares
    const dashboard = await storage.getDepartmentDashboard(deptId, weekStart);
    if (!dashboard) throw new Error('[[error:dashboard-not-found]]');

    return dashboard;
};

// ============================================
// Reports (Daily/Weekly)
// ============================================
supervisor.getReports = async (req, data) => {
    const { deptId, uid, type, weekStart } = data;

    // All validations (auth, deptId, type, weekStart, permissions) are handled by middlewares
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


