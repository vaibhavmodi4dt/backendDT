'use strict';

const Reports = module.exports;

// Sub-modules
Reports.monthly = require('./monthly');
Reports.daily = require('./daily');
Reports.helpers = require('./helpers');
Reports.weekly = require("./weekly")

// ==========================================
// MONTHLY REPORTS
// ==========================================

Reports.save = Reports.monthly.save;
Reports.get = Reports.monthly.get;

// ==========================================
// DAILY REPORTS
// ==========================================

// Core operations
Reports.submitPlan = Reports.daily.submitPlan;
Reports.submitReport = Reports.daily.submitReport;
Reports.getDailyReport = Reports.daily.getDailyReport;
Reports.getDailyReportRaw = Reports.daily.getDailyReportRaw;

// Plan management
Reports.getIncompletePlans = Reports.daily.getIncompletePlans;

// Frameworks
Reports.submitFrameworks = Reports.daily.submitFrameworks;

// Reflection
Reports.updateReflection = Reports.daily.updateReflection;

// Chat/AI
Reports.postChatMessage = Reports.daily.postChatMessage;
Reports.getChatMessages = Reports.daily.getChatMessages;

// Session management
Reports.initiateSession = Reports.daily.initiateSession;
Reports.getSessionStatus = Reports.daily.getSessionStatus;
Reports.submitLogout = Reports.daily.submitLogout;

// Analytics
Reports.getCount = Reports.daily.getCount;

// Core operations
Reports.submitWeeklyPlan = Reports.weekly.submitPlan;
Reports.getWeekly = Reports.weekly.getWeekly;
Reports.getWeeklyRaw = Reports.weekly.getWeeklyRaw;
Reports.updateWeekly = Reports.weekly.updateWeekly;

// Weekly report (7-day aggregation)
Reports.getWeeklyReport = Reports.weekly.getReport;

// ==========================================
// HELPERS
// ==========================================

Reports.validateReportsData = Reports.helpers.validateReportData;
