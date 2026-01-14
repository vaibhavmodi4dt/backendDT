'use strict';

const axios = require('axios');
const nconf = require('nconf');

// Disable TLS verification for development (should be removed in production)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

/**
 * External API Service
 * Centralizes all external API calls for supervisor functionality
 * Handles authentication, error handling, and response formatting
 */

const ExternalApiService = module.exports;

// Configuration
const masterToken = nconf.get('masterToken');

ExternalApiService.config = {
    ldiApiBaseUrl: process.env.LDI_API_BASE_URL || 'https://beta.deepthought.education',
    sdApiBaseUrl: process.env.SD_API_BASE_URL || 'https://beta.deepthought.education',
    happinessApiBaseUrl: process.env.HAPPINESS_API_BASE_URL || 'https://beta.deepthought.education',
    timeout: 10000, // 10 seconds default timeout
};

/**
 * Generic API call handler with error handling
 */
async function callExternalApi(url, params = {}, config = {}) {
    try {
        const response = await axios.get(url, {
            params,
            headers: {
                'Authorization': `Bearer ${masterToken}`,
                ...config.headers,
            },
            timeout: config.timeout || ExternalApiService.config.timeout,
        });

        if (response.data && response.data.response) {
            return response.data.response;
        }

        return null;
    } catch (error) {
        console.error(`Error calling external API: ${url}`, error.response?.data || error.message);
        return null;
    }
}

/**
 * Fetch happiness scorecard for a specific week from external API
 * 
 * @param {string} uid - User ID
 * @param {string} weekStart - Week start date in YYYY-MM-DD format (Monday)
 * @returns {Promise<Object|null>} Happiness scorecard data or null
 */
ExternalApiService.fetchHappinessScorecard = async function (uid, weekStart) {
    // ⚠️ TEMPORARY: Using hardcoded data until proper API is available
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

        const url = `${ExternalApiService.config.happinessApiBaseUrl}/api/v3/scorecard/happiness/submissions`;
        const params = {
            uid: uid,
            weekStart: weekStartDate,
        };

        const data = await callExternalApi(url, params);
        
        if (data) {
            // Check if response is an array or single object
            const submissions = Array.isArray(data) ? data : [data];

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
        console.error('Error fetching happiness scorecard:', error);
        return null;
    }
    ======================== */
};

/**
 * Fetch LDI pitch data from external API
 * 
 * @param {string} uid - User ID
 * @param {number} year - Year
 * @param {number} week - Week number
 * @returns {Promise<Object|null>} LDI pitch data or null
 */
ExternalApiService.fetchLdiPitch = async function (uid, year, week) {
    try {
        const ldiKey = `ldi:${year}-week-${String(week)}`;
        const url = `${ExternalApiService.config.ldiApiBaseUrl}/api/v3/globals/ldi-participants`;
        const params = {
            key: ldiKey,
            _uid: uid,
        };

        return await callExternalApi(url, params);
    } catch (error) {
        console.error('Error fetching LDI pitch:', error);
        return null;
    }
};

/**
 * Fetch SD pitch data from external API
 * 
 * @param {string} uid - User ID
 * @param {number} year - Year
 * @param {number} week - Week number
 * @returns {Promise<Object|null>} SD pitch data or null
 */
ExternalApiService.fetchSdPitch = async function (uid, year, week) {
    try {
        const url = `${ExternalApiService.config.sdApiBaseUrl}/api/v3/globals/sd-pitch/`;
        const params = {
            week: week,
            year: year,
            _uid: uid,
        };

        return await callExternalApi(url, params);
    } catch (error) {
        console.error('Error fetching SD pitch:', error);
        return null;
    }
};
