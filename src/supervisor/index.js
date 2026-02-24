'use strict';

const User = require('../user');
const Organizations = require('../organizations');
const AiAgentService = require('../services/ai-agent');
const helpers = require('./helpers');

const Supervisor = module.exports;

// Export helpers and storage
Supervisor.helpers = helpers;
Supervisor.storage = require('./storage');
Supervisor.schedule = require("./scheduler");

// ==========================================
// SCORE CALCULATION FUNCTIONS
// ==========================================

/**
 * Calculate Daily Plan & Report Score (25 points)
 */
Supervisor.calculateDailyScore = async function (uid, weekDates) {
    let planCount = 0;
    let reportCount = 0;

    for (const date of weekDates) {
        const report = await helpers.fetchDailyReport(uid, date);
        if (helpers.hasPlan(report)) planCount++;
        if (helpers.hasReport(report)) reportCount++;
    }

    const planScore = helpers.calculatePlanScore(planCount);
    const reportScore = helpers.calculateReportScore(reportCount);

    return {
        score: planScore + reportScore,
        planCount,
        reportCount,
        details: {
            planScore: helpers.round(planScore),
            reportScore: helpers.round(reportScore),
        },
    };
};

/**
 * Calculate LDI Pitch Score (10 points)
 */
Supervisor.calculateLdiScore = async function (uid, weekStart) {
    try {
        const ldiData = await helpers.fetchLdiPitch(uid, weekStart);
        if (!ldiData?.response?.participants) {
            return { score: 0, pitched: false };
        }

        const participant = ldiData.response.participants.find(p => p.uid === uid);
        const pitched = participant?.pitched === true;

        return {
            score: pitched ? 10 : 0,
            pitched
        };
    } catch (error) {
        console.error('Error calculating LDI score:', error);
        return { score: 0, pitched: false };
    }
};

/**
 * Calculate SD Pitch Score (6 points)
 */
Supervisor.calculateSdScore = async function (uid, weekStart) {
    try {
        const sdData = await helpers.fetchSdPitch(uid, weekStart);
        if (!Array.isArray(sdData?.response)) {
            return { score: 0, eligible: false };
        }

        const eligible = sdData.response.some(u => u.uid === uid);

        return {
            score: eligible ? 6 : 0,
            eligible
        };
    } catch (error) {
        console.error('Error calculating SD score:', error);
        return { score: 0, eligible: false };
    }
};

/**
 * Calculate UBS (41 points scaled to 100)
 */
Supervisor.calculateUBS = async function (uid, weekStart) {
    const weekDates = helpers.getWeekDates(weekStart);

    const [dailyResult, ldiResult, sdResult] = await Promise.all([
        Supervisor.calculateDailyScore(uid, weekDates),
        Supervisor.calculateLdiScore(uid, weekStart),
        Supervisor.calculateSdScore(uid, weekStart),
    ]);

    const rawScore = dailyResult.score + ldiResult.score + sdResult.score;
    const scaledScore = helpers.scaleUbsScore(rawScore);

    return {
        ubs: helpers.round(scaledScore),
        breakdown: {
            daily: helpers.round(dailyResult.score),
            ldi: ldiResult.score,
            sd: sdResult.score,
            total: helpers.round(rawScore),
        },
        details: {
            planCount: dailyResult.planCount,
            reportCount: dailyResult.reportCount,
            ldiPitched: ldiResult.pitched,
            sdPitched: sdResult.pitched,
        },
    };
};

/**
 * Calculate Happiness Score
 */
Supervisor.calculateHappinessScore = async function (uid, weekStart) {
    try {
        const scorecard = await helpers.fetchHappinessScorecard(uid, weekStart);
        return helpers.calculateHappinessFromScorecard(scorecard);
    } catch (error) {
        console.error('Error calculating happiness score:', error);
        return { happiness: 0, hasScorecard: false };
    }
};

/**
 * Calculate Attendance (L&D)
 */
Supervisor.calculateAttendance = async function (uid, weekDates) {
    let attendanceCount = 0;

    for (const date of weekDates) {
        const report = await helpers.fetchDailyReport(uid, date);
        if (helpers.hasAttended(report)) attendanceCount++;
    }

    const percentage = helpers.calculateAttendancePercentage(attendanceCount);

    return {
        attendance: attendanceCount,
        lnd: helpers.round(percentage),
        percentage: helpers.round(percentage),
    };
};

/**
 * Calculate Health Score
 */
Supervisor.calculateHealthScore = function (ubs, happiness, attendancePercentage) {
    return helpers.round((ubs + happiness + attendancePercentage) / 3);
};

// ==========================================
// MEMBER DATA
// ==========================================

/**
 * Get member's complete data for a week
 */
Supervisor.getMemberWeekData = async function (uid, weekStart) {
    const weekDates = helpers.getWeekDates(weekStart);

    const [ubsResult, happinessResult, attendanceResult] = await Promise.all([
        Supervisor.calculateUBS(uid, weekStart),
        Supervisor.calculateHappinessScore(uid, weekStart),
        Supervisor.calculateAttendance(uid, weekDates),
    ]);

    const healthScore = Supervisor.calculateHealthScore(
        ubsResult.ubs,
        happinessResult.happiness,
        attendanceResult.lnd
    );

    const userFields = await User.getUserFields(uid, [
        'uid', 'username', 'fullname', 'picture', 'email',
    ]);

    return {
        uid,
        name: userFields.fullname || userFields.username,
        username: userFields.username,
        picture: userFields.picture,
        email: userFields.email,
        healthScore,
        attendance: attendanceResult.attendance,
        lnd: `${attendanceResult.lnd}%`,
        ubs: ubsResult.ubs,
        happiness: happinessResult.happiness,
        ubsBreakdown: ubsResult.breakdown,
        ubsDetails: ubsResult.details,
        happinessDetails: {
            hasScorecard: happinessResult.hasScorecard,
            responseCount: happinessResult.responseCount || 0,
        },
    };
};

/**
 * Get member's weekly report
 */
Supervisor.getMemberWeeklyReport = async function (uid, weekStart) {
    const report = await helpers.fetchWeeklyReport(uid, weekStart);
    if (!report) return null;

    return {
        weekStart,
        planVsActual: report.generatedReport.planVsActual || null,
        bottlenecksAndInsights: report.generatedReport.bottlenecksAndInsights || null,
        ipToolsTemplates: report.generatedReport.ipToolsTemplates || null,
        externalExploration: report.generatedReport.externalExploration || null,
        summary: report.generatedReport.summary || null,
        highlights: report.generatedReport.highlights || null,
        escalations: report.generatedReport.escalations || null,
        suggestions: report.generatedReport.suggestions || null
    };
};

// ==========================================
// TEAM SUMMARY (AI)
// ==========================================

/**
 * Generate team summary using AI
 */
Supervisor.generateTeamSummary = async function (members, weekStart) {
    try {
        // Fetch all weekly reports
        const weeklyReports = await Promise.all(
            members.map(async (member) => {
                const weeklyReport = await Supervisor.getMemberWeeklyReport(member.uid, weekStart);

                if (!weeklyReport) return null;

                // ⭐ Format for AI - add weekIdentifier
                const { year, week } = helpers.getYearAndWeek(weekStart);

                return {

                    weekIdentifier: `${year}-W${String(week).padStart(2, '0')}`,
                    planVsActual: weeklyReport.planVsActual,
                    bottlenecksAndInsights: weeklyReport.bottlenecksAndInsights,
                    ipToolsTemplates: weeklyReport.ipToolsTemplates,
                    externalExploration: weeklyReport.externalExploration,
                };
            })
        );

        // Filter out null reports
        const reportsWithData = weeklyReports.filter(r => r !== null);

        if (reportsWithData.length === 0) {
            return {
                highlights: 'No weekly reports available for this period.',
                escalations: 'No data available.',
                suggestions: 'No data available.',
                summary: 'No team members have submitted weekly reports for this period.',
            };
        }

        // ⭐ Send structured data to AI
        const aiResponse = await AiAgentService.post('team-summary/evaluate', {
            weeklyReports: reportsWithData,
        });

        if (aiResponse && aiResponse.data) {
            return {
                highlights: aiResponse.data.highlights || '',
                escalations: aiResponse.data.escalations || '',
                suggestions: aiResponse.data.suggestions || '',
                summary: aiResponse.data.summary || '',
            };
        }

        return {
            highlights: 'AI evaluation unavailable.',
            escalations: 'AI evaluation unavailable.',
            suggestions: 'AI evaluation unavailable.',
            summary: 'AI service did not return valid data.',
        };
    } catch (error) {
        console.error('Error generating team summary:', error);
        return {
            highlights: 'Error generating summary.',
            escalations: 'Error generating summary.',
            suggestions: 'Error generating summary.',
            summary: `Error: ${error.message}`,
        };
    }
};
// ==========================================
// MAIN FUNCTION
// ==========================================

/**
 * Calculate dashboard data for a department
 */
Supervisor.calculateDashboard = async function (deptId, weekStart) {
    const department = await Organizations.getDepartment(deptId);
    if (!department) {
        throw new Error('[[error:department-not-found]]');
    }

    const membersResult = await Organizations.getDepartmentMembers(deptId, {
        page: 1,
        itemsPerPage: 1000,
    });

    // ⭐ Filter out managers - only analyze regular team members
    const memberUids = membersResult.members
        .filter(m => m.uid) // Has UID
        .map(m => m.uid);

    // Optional: Filter out managers from the list
    const managers = await Organizations.getDepartmentManagers(deptId);
    const managerUids = managers.map(m => m.uid);
    const teamMemberUids = memberUids.filter(uid => !managerUids.includes(uid));

    if (teamMemberUids.length === 0) {
        return {
            department: { id: department.deptId, name: department.name },
            weekStart,
            members: [],
            teamSummary: null,
        };
    }

    // Calculate for team members only (not managers)
    const membersData = await Promise.all(
        teamMemberUids.map(uid => Supervisor.getMemberWeekData(uid, weekStart))
    );

    // Generate AI team summary
    const teamSummary = await Supervisor.generateTeamSummary(membersData, weekStart);

    return {
        department: {
            id: department.deptId,
            name: department.name,
            description: department.description,
        },
        weekStart,
        members: membersData,
        teamSummary,
    };
};

