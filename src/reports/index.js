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

// ==========================================
// ==========================================
// WEEKLY REPORTS (EXISTING)
// ==========================================

// Core operations
Reports.submitWeeklyPlan = Reports.weekly.submitPlan;
Reports.getWeekly = Reports.weekly.getWeekly;
Reports.getWeeklyRaw = Reports.weekly.getWeeklyRaw;
Reports.updateWeekly = Reports.weekly.updateWeekly;
Reports.startJobs = Reports.weekly.startScheduler;

// Weekly report (6-day aggregation - raw data)
Reports.getWeeklyReport = Reports.weekly.getReport;

// ==========================================
// WEEKLY REPORT EVALUATION (NEW)
// ==========================================

// Call AI evaluation
Reports.callAiEvaluation = Reports.weekly.callAiEvaluation;

// Get existing evaluation
Reports.getReportEvaluation = Reports.weekly.getReportEvaluation;

// Get raw evaluation (for updates)
Reports.getReportEvaluationRaw = Reports.weekly.getReportEvaluation; // Uses same method

// Update evaluation (user edits)
Reports.updateReportEvaluation = Reports.weekly.updateReportEvaluation;

// Submit final report
Reports.submitReportEvaluation = Reports.weekly.submitReportEvaluation;

// Fetch daily reports for week
Reports.fetchDailyReports = Reports.weekly.fetchDailyReports;

// Generate for single user
Reports.generateForUser = Reports.weekly.generateForUser;

// Transform AI response to insights format
Reports.transformAiResponseToInsights = Reports.weekly.transformAiResponseToInsights;

// ==========================================
// USER WEEKLY REPORTS (SEPARATE FROM EVALUATION)
// ==========================================

Reports.saveUserWeeklyReport = Reports.weekly.saveUserWeeklyReport;
Reports.getUserWeeklyReport = Reports.weekly.getUserWeeklyReport;
Reports.updateUserWeeklyReport = Reports.weekly.updateUserWeeklyReport;
Reports.submitUserWeeklyReport = Reports.weekly.submitUserWeeklyReport;

// ==========================================
// HELPERS
// ==========================================

Reports.validateReportsData = Reports.helpers.validateReportData;