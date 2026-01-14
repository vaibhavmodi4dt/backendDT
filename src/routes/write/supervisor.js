'use strict';

const router = require('express').Router();
const middleware = require('../../middleware');
const organizationMiddleware = require('../../middleware/organizations');
const controllers = require('../../controllers');
const routeHelpers = require('../helpers');
const validate = require('../../middleware/validate');
const schemas = require('../../validations');

const { setupApiRoute } = routeHelpers;

module.exports = function () {
    const middlewares = [middleware.ensureLoggedIn];

    /**
     * GET /api/v3/supervisor/dashboard/:deptId
     * Get pre-calculated supervisor dashboard for a department
     * Requires: Department manager or organization manager privileges
     */
    setupApiRoute(
        router,
        'get',
        '/dashboard/:deptId',
        [
            ...middlewares,
            organizationMiddleware.departmentExists,
            organizationMiddleware.isDepartmentManager,
            validate.params(schemas.supervisor.getDashboardParams),
            validate.query(schemas.supervisor.getDashboardQuery),
        ],
        controllers.write.supervisor.getDashboard
    );

    /**
     * GET /api/v3/supervisor/reports
     * Get daily or weekly reports for department or individual member
     * Requires: Department manager or organization manager privileges
     */
    setupApiRoute(
        router,
        'get',
        '/reports',
        [
            ...middlewares,
            validate.query(schemas.supervisor.getReportsQuery),
        ],
        controllers.write.supervisor.getReports
    );

    return router;
};
