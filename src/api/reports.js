'use strict';

const MonthlyReports = require('../reports');

const reportsApi = module.exports;

// ==================== GET ====================

reportsApi.get = async function (caller, data) {
    return await MonthlyReports.get(caller.uid, data.month);
};

// ==================== SAVE ====================

reportsApi.save = async function (caller, data) {

    //validating status -  Is not other than draft, submitted
    MonthlyReports.validateReportsData(data);

    return await MonthlyReports.save({
        uid: caller.uid,
        status: data.status,
        steps: data.steps,
    });
};
