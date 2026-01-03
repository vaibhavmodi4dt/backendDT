'use strict';

const router = require('express').Router();
const middleware = require('../../middleware');
const controllers = require('../../controllers');
const routeHelpers = require('../helpers');

// Import Zod validation middleware
const validate = require('../../middleware/validate');
const schemas = require('../../validations');

const { setupApiRoute } = routeHelpers;

module.exports = function () {
    const middlewares = [middleware.ensureLoggedIn];

    // ==========================================
    // MONTHLY REPORTS (EXISTING)
    // ==========================================

    setupApiRoute(router, "post", "/", middlewares, controllers.write.reports.save);
    setupApiRoute(router, "get", "/", middlewares, controllers.write.reports.get);

    // ==========================================
    // DAILY REPORTS (EXISTING)
    // ==========================================

    setupApiRoute(
        router,
        'post',
        '/daily/plan',
        [...middlewares, validate.body(schemas.reports.submitPlan)],
        controllers.write.reports.submitPlan
    );

    setupApiRoute(
        router,
        'post',
        '/daily/report',
        [...middlewares, validate.body(schemas.reports.submitReport)],
        controllers.write.reports.submitReport
    );

    // Get Daily Report
    setupApiRoute(
        router,
        'get',
        '/daily/:date',
        [...middlewares, validate.params(schemas.reports.getByDate)],
        controllers.write.reports.getDailyReport
    );

    // Queries & Analytics
    setupApiRoute(
        router,
        'get',
        '/incomplete-plans',
        middlewares,
        controllers.write.reports.getIncompletePlans
    );

    setupApiRoute(
        router,
        'get',
        '/daily/count',
        [...middlewares, validate.query(schemas.reports.getCount)],
        controllers.write.reports.getCount
    );

    // Frameworks & Reflection
    setupApiRoute(
        router,
        'post',
        '/daily/frameworks',
        [...middlewares, validate.body(schemas.reports.submitFrameworks)],
        controllers.write.reports.submitFrameworks
    );

    setupApiRoute(
        router,
        'post',
        '/daily/reflection',
        [...middlewares, validate.body(schemas.reports.updateReflection)],
        controllers.write.reports.updateReflection
    );

    // Chat/Reflection
    setupApiRoute(
        router,
        'post',
        '/daily/chat',
        middlewares,
        controllers.write.reports.postChatMessage
    );

    setupApiRoute(
        router,
        'get',
        '/daily/chat/messages',
        middlewares,
        controllers.write.reports.getChatMessages
    );

    // Session Management (Login/Logout)
    setupApiRoute(
        router,
        'post',
        '/daily/session/login',
        middlewares,
        controllers.write.reports.initiateSession
    );

    setupApiRoute(
        router,
        'get',
        '/daily/session/status',
        [...middlewares, validate.query(schemas.reports.getSessionStatus)],
        controllers.write.reports.getSessionStatus
    );

    setupApiRoute(
        router,
        'post',
        '/daily/session/logout',
        middlewares,
        controllers.write.reports.submitLogout
    );

    // ==========================================
    // WEEKLY REPORTS (NEW)
    // ==========================================

    // Submit weekly plan
    setupApiRoute(
        router,
        'post',
        '/weekly/plan',
        [...middlewares, validate.body(schemas.reports.submitWeeklyPlan)],
        controllers.write.reports.submitWeeklyPlan
    );

    // Get weekly plan
    setupApiRoute(
        router,
        'get',
        '/weekly/plan',
        [...middlewares, validate.query(schemas.reports.getWeeklyPlan)],
        controllers.write.reports.getWeeklyPlan
    );

    // Update weekly plan
    setupApiRoute(
        router,
        'put',
        '/weekly/plan',
        [...middlewares, validate.body(schemas.reports.updateWeeklyPlan)],
        controllers.write.reports.updateWeeklyPlan
    );

    // Get weekly report (7-day aggregation)
    setupApiRoute(
        router,
        'get',
        '/weekly/report',
        [...middlewares, validate.query(schemas.reports.getWeeklyReport)],
        controllers.write.reports.getWeeklyReport
    );

    return router;
};