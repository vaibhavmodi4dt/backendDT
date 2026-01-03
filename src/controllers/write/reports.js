'use strict';

const api = require('../../api');
const helpers = require('../helpers');

const Reports = module.exports;

// ==========================================
// MONTHLY REPORT
// ==========================================

/**
 * GET /api/v3/reports
 */
Reports.get = async function (req, res) {
    const { month } = req.query;

    helpers.formatApiResponse(200, res, await api.reports.get(req, {
        month: month,
    }));
};

/**
 * POST /api/v3/reports
 */
Reports.save = async function (req, res) {
    helpers.formatApiResponse(200, res, await api.reports.save(req, req.body));
};

// ==========================================
// DAILY REPORTS
// ==========================================

/**
 * POST /api/v3/reports/daily/plan
 */
Reports.submitPlan = async function (req, res) {
    helpers.formatApiResponse(200, res, await api.reports.submitPlan(req, req.body));
};

/**
 * POST /api/v3/reports/daily/report
 */
Reports.submitReport = async function (req, res) {
    helpers.formatApiResponse(200, res, await api.reports.submitReport(req, req.body));
};

/**
 * GET /api/v3/reports/daily/:date
 */
Reports.getDailyReport = async function (req, res) {
    helpers.formatApiResponse(200, res, await api.reports.getDailyReport(req, {
        date: req.params.date,
    }));
};

/**
 * GET /api/v3/reports/daily/incomplete-plans
 */
Reports.getIncompletePlans = async function (req, res) {
    helpers.formatApiResponse(200, res, await api.reports.getIncompletePlans(req));
};

/**
 * GET /api/v3/reports/daily/count
 */
Reports.getCount = async function (req, res) {
    helpers.formatApiResponse(200, res, await api.reports.getCount(req, {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
    }));
};

/**
 * POST /api/v3/reports/daily/frameworks
 */
Reports.submitFrameworks = async function (req, res) {
    helpers.formatApiResponse(200, res, await api.reports.submitFrameworks(req, req.body));
};

/**
 * POST /api/v3/reports/daily/reflection
 */
Reports.updateReflection = async function (req, res) {
    helpers.formatApiResponse(200, res, await api.reports.updateReflection(req, req.body));
};

/**
 * POST /api/v3/reports/daily/chat
 */
Reports.postChatMessage = async function (req, res) {
    helpers.formatApiResponse(200, res, await api.reports.postChatMessage(req, req.body));
};

/**
 * GET /api/v3/reports/daily/chat/messages
 */
Reports.getChatMessages = async function (req, res) {
    helpers.formatApiResponse(200, res, await api.reports.getChatMessages(req, {}));
};

/**
 * POST /api/v3/reports/daily/session/login
 */
Reports.initiateSession = async function (req, res) {
    helpers.formatApiResponse(200, res, await api.reports.initiateSession(req, {}));
};

/**
 * GET /api/v3/reports/daily/session/status
 */
Reports.getSessionStatus = async function (req, res) {
    helpers.formatApiResponse(200, res, await api.reports.getSessionStatus(req, {
        date: req.query.date,
    }));
};

/**
 * POST /api/v3/reports/daily/session/logout
 */
Reports.submitLogout = async function (req, res) {
    helpers.formatApiResponse(200, res, await api.reports.submitLogout(req, {}));
};

// ==========================================
// WEEKLY REPORTS
// ==========================================

/**
 * POST /api/v3/reports/weekly/plan
 */
Reports.submitWeeklyPlan = async function (req, res) {
    helpers.formatApiResponse(200, res, await api.reports.submitWeeklyPlan(req, req.body));
};

/**
 * GET /api/v3/reports/weekly/plan
 */
Reports.getWeeklyPlan = async function (req, res) {
    helpers.formatApiResponse(200, res, await api.reports.getWeeklyPlan(req, {
        weekStart: req.query.weekStart,
    }));
};

/**
 * PUT /api/v3/reports/weekly/plan
 */
Reports.updateWeeklyPlan = async function (req, res) {
    helpers.formatApiResponse(200, res, await api.reports.updateWeeklyPlan(req, req.body));
};

/**
 * GET /api/v3/reports/weekly/report
 */
Reports.getWeeklyReport = async function (req, res) {
    helpers.formatApiResponse(200, res, await api.reports.getWeeklyReport(req, {
        date: req.query.date,
    }));
};