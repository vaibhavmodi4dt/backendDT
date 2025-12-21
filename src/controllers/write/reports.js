'use strict';

const api = require('../../api');
const helpers = require('../helpers');

const Reports = module.exports;

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
