'use strict';

const MonthlyReports = module.exports;

// Sub-modules
MonthlyReports.reports = require("./monthly");
MonthlyReports.helpers = require("./helpers");

MonthlyReports.save = MonthlyReports.reports.save;
MonthlyReports.get = MonthlyReports.reports.get;


//helpers
MonthlyReports.validateReportsData = MonthlyReports.helpers.validateReportData;




