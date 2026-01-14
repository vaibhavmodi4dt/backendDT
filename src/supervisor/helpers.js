'use strict';

const db = require('../database');
const utils = require('../utils');
const moment = require('moment');
const axios = require('axios');
const nconf = require('nconf')
const { collections } = require('../database/mongo/collections');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const token = nconf.get('masterToken')

const helpers = module.exports;

// ==========================================
// CONFIGURATION
// ==========================================

/**
 * External API endpoints configuration
 * These should be set via environment variables or config file
 */
helpers.config = {
    ldiApiBaseUrl: process.env.LDI_API_BASE_URL || 'https://beta.deepthought.education',
    sdApiBaseUrl: process.env.SD_API_BASE_URL || 'https://beta.deepthought.education',
    happinessApiBaseUrl: process.env.HAPPINESS_API_BASE_URL || 'https://beta.deepthought.education',
};

// ==========================================
// DATE UTILITIES
// ==========================================

/**
 * Get week start date (Monday) from date string
 */
helpers.getWeekStart = function (dateStr) {
    const timestamp = new Date(dateStr).getTime();
    const weekStartTimestamp = utils.date.startOfWeek(timestamp);
    return utils.date.format(weekStartTimestamp, utils.date.formats.DATE);
};

/**
 * Get all weeks between start and end date
 */
helpers.getWeeksBetween = function (startDate, endDate) {
    const weeks = [];
    let currentWeek = helpers.getWeekStart(startDate);
    const endTimestamp = new Date(endDate).getTime();

    while (new Date(currentWeek).getTime() <= endTimestamp) {
        weeks.push(currentWeek);
        const currentTimestamp = new Date(currentWeek).getTime();
        const nextWeekTimestamp = utils.date.addDays(currentTimestamp, 7);
        currentWeek = utils.date.format(nextWeekTimestamp, utils.date.formats.DATE);
    }

    return weeks;
};

/**
 * Get week dates (Monday to Saturday - 6 days)
 */
helpers.getWeekDates = function (weekStart) {
    const dates = [];
    const startTimestamp = new Date(weekStart).getTime();

    for (let i = 0; i < 6; i++) {
        const dayTimestamp = utils.date.addDays(startTimestamp, i);
        const dateStr = utils.date.format(dayTimestamp, utils.date.formats.DATE);
        dates.push(dateStr);
    }

    return dates;
};

/**
 * Get previous week's Monday
 */
helpers.getPreviousWeekStart = function (dateStr) {
    const currentWeekStart = helpers.getWeekStart(dateStr);
    const currentTimestamp = new Date(currentWeekStart).getTime();
    const prevWeekTimestamp = utils.date.subDays(currentTimestamp, 7);
    return utils.date.format(prevWeekTimestamp, utils.date.formats.DATE);
};

/**
 * Get year and week number from date
 */
helpers.getYearAndWeek = function (weekStart) {
    const date = new Date(weekStart);
    const year = date.getFullYear();
    const week = moment(weekStart).isoWeek();
    return { year, week };
};

// ==========================================
// DATA FETCHING
// ==========================================

/**
 * Fetch daily report for a specific date
 */
helpers.fetchDailyReport = async function (uid, date) {
    const key = `reports:daily:user:${uid}:${date}`;
    return await db.getObject(key, [], { collection: collections.REPORTS });

};


/**
 * Fetch weekly report for a specific week
 */
helpers.fetchWeeklyReport = async function (uid, weekStart) {
    const key = `reports:weekly-evaluation:user:${uid}:${weekStart}`;
    return await db.getObject(key, [], { collection: collections.REPORTS });
};

/**
 * Fetch happiness scorecard for a specific week from external API
 * 
 * ⚠️ TEMPORARY: Using hardcoded data until proper API is available
 */
helpers.fetchHappinessScorecard = async function (uid, weekStart) {
    // ⭐ HARDCODED DATA - Replace with real API call when available
    console.log('⚠️  Using hardcoded happiness data (API not available yet)');

    return {
        totalHappiness: 85,  // Mock happiness score
        currentWeek: {
            start: weekStart,
            end: new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
        response: [
            { question: 'Overall happiness', answer: '8.5' },
            { question: 'Work satisfaction', answer: '8.0' },
            { question: 'Team collaboration', answer: '9.0' },
        ]
    };

    /* ========================
     * COMMENTED OUT - Real API call (enable when API is ready)
     * ========================
    try {
        // Convert weekStart to ISO format for API
        const weekStartDate = new Date(weekStart).toISOString();

        const response = await axios.get(
            `${helpers.config.happinessApiBaseUrl}/api/v3/scorecard/happiness/submissions`,
            {
                params: {
                    uid: uid,
                    weekStart: weekStartDate,
                },
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                timeout: 10000,
            }
        );

        if (response.data && response.data.response) {
            // Check if response is an array or single object
            const submissions = Array.isArray(response.data.response)
                ? response.data.response
                : [response.data.response];

            // Find the scorecard for this specific week
            const scorecard = submissions.find(s => {
                if (!s.currentWeek || !s.currentWeek.start) return false;
                const scorecardWeekStart = new Date(s.currentWeek.start).toISOString().split('T')[0];
                return scorecardWeekStart === weekStart;
            });

            return scorecard || null;
        }

        return null;
    } catch (error) {
        console.error('Error fetching happiness scorecard:', error.response?.data || error.message);
        return null;
    }
    ======================== */
};

/**
 * Fetch LDI pitch data from external API
 */
helpers.fetchLdiPitch = async function (uid, weekStart) {
    try {
        const { year, week } = helpers.getYearAndWeek(weekStart);
        const ldiKey = `ldi:${year}-week-${String(week)}`;

        const response = await axios.get(
            `${helpers.config.ldiApiBaseUrl}/api/v3/globals/ldi-participants`,
            {
                params: {
                    key: ldiKey,
                    _uid: uid,
                },
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                timeout: 10000,
            }
        );

        if (response.data && response.data.response) {
            return response.data.response;
        }

        return null;
    } catch (error) {
        console.error('Error fetching LDI pitch:', error.response?.data || error.message);
        return null;
    }
};

/**
 * Fetch SD pitch data from external API
 */
helpers.fetchSdPitch = async function (uid, weekStart) {
    try {
        const { year, week } = helpers.getYearAndWeek(weekStart);

        const response = await axios.get(
            `${helpers.config.sdApiBaseUrl}/api/v3/globals/sd-pitch/`,
            {
                params: {
                    week: week,
                    year: year,
                    _uid: uid,
                },
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                timeout: 10000,
            }
        );

        if (response.data && response.data.response) {
            return response.data.response;
        }

        return null;
    } catch (error) {
        console.error('Error fetching SD pitch:', error.response?.data || error.message);
        return null;
    }
};

// ==========================================
// VALIDATION HELPERS
// ==========================================

/**
 * Check if user has submitted plan for a date
 */
helpers.hasPlan = function (report) {
    return !!(report && report.plan && Array.isArray(report.plan) && report.plan.length > 0);
};

/**
 * Check if user has submitted report for a date
 */
helpers.hasReport = function (report) {
    return !!(report && report.report && report.report.length > 0);
};

/**
 * Check if user attended (has both plan AND report)
 */
helpers.hasAttended = function (report) {
    return helpers.hasPlan(report) && helpers.hasReport(report);
};

// ==========================================
// SCORE CALCULATION HELPERS
// ==========================================

/**
 * Calculate plan score for a week
 */
helpers.calculatePlanScore = function (planCount, maxDays = 6) {
    return (planCount / maxDays) * 12.5;
};

/**
 * Calculate report score for a week
 */
helpers.calculateReportScore = function (reportCount, maxDays = 6) {
    return (reportCount / maxDays) * 12.5;
};

/**
 * Scale raw UBS score to 100
 */
helpers.scaleUbsScore = function (rawScore, maxScore = 41) {
    return (rawScore / maxScore) * 100;
};

/**
 * Calculate happiness from scorecard responses
 */
helpers.calculateHappinessFromScorecard = function (scorecard) {
    if (!scorecard || !scorecard.response) {
        return { happiness: 0, hasScorecard: false };
    }

    const numericResponses = scorecard.response
        .map(r => parseFloat(r.answer))
        .filter(val => !isNaN(val));

    if (numericResponses.length === 0) {
        return {
            happiness: 0,
            hasScorecard: true,
            responseCount: 0,
        };
    }

    const average = numericResponses.reduce((sum, val) => sum + val, 0) / numericResponses.length;
    const happiness = average * 10;

    return {
        happiness: parseFloat(happiness.toFixed(2)),
        hasScorecard: true,
        responseCount: numericResponses.length,
        average: parseFloat(average.toFixed(2)),
    };
};

/**
 * Calculate attendance percentage
 */
helpers.calculateAttendancePercentage = function (attendanceCount, maxDays = 6) {
    return (attendanceCount / maxDays) * 100;
};

/**
 * Round number to 2 decimal places
 */
helpers.round = function (number) {
    return parseFloat(number.toFixed(2));
};
