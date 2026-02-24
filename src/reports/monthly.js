'use strict';

const db = require('../database');
const helpers = require('./helpers');

const utils = require('../utils');
const { collections } = require('../database/mongo/collections');

const reportsCollection = { collection: collections.REPORTS };


const MonthlyReports = module.exports;

/**
 * Get monthly report(s) for a user
 */
MonthlyReports.get = async function (uid, month) {
    const key = month
        ? helpers.getReportKey(uid, month)
        : `user:${uid}:reports:monthly`;

    if (!month) {
        const keys = await db.getSortedSetRevRange(key, 0, -1);
        return helpers.sanitizeReports(await db.getObjects(keys, [], reportsCollection));
    }

    return await db.getObject(key, [], reportsCollection);
};

/**
 * Create or update a monthly report
 */
MonthlyReports.save = async function (data) {

    //get current month in format YYYY-MM
    const { yearMonth, year, month } = helpers.getCurrentMonth();

    const key = helpers.getReportKey(data.uid, yearMonth);
    const now = utils.date.now();

    const existing = await db.getObject(key)
    const reportData = helpers.prepareReportData(data, existing, year, month, yearMonth);

    const isNew = !existing;
    await Promise.all([
        db.setObject(key, reportData, reportsCollection),
        db.sortedSetAdd(`user:${data.uid}:reports:monthly`, now, key),
        db.sortedSetAdd(`reports:monthly:month:${yearMonth}`, now, key),
        db.sortedSetAdd(`reports:monthly:status:${reportData.status}`, now, key),
        db.setAdd('reports:monthly:users', data.uid),
        reportData.status === 'submitted' &&
        db.setAdd(`reports:monthly:submitted:${yearMonth}:users`, data.uid),
    ].filter(Boolean));

    return {
        isNew,
        data: helpers.sanitizeReport(reportData),
    };
};
