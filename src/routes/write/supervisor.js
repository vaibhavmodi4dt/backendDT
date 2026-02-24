'use strict';

const router = require('express').Router();
const middleware = require('../../middleware');
const organizationMiddleware = require('../../middleware/organizations');
const controllers = require('../../controllers');
const routeHelpers = require('../helpers');
const validate = require('../../middleware/validate');
const schemas = require('../../validations');
const Organizations = require('../../organizations');
const user = require('../../user');

const { setupApiRoute } = routeHelpers;


module.exports = function () {
    const middlewares = [middleware.ensureLoggedIn];

    /**
     * GET /api/v3/supervisor/dashboard/:deptId/:weekStart
     * GET /api/v3/supervisor/dashboard/:deptId/:weekStart/:uid (optional uid for individual member)
     * Get pre-calculated supervisor dashboard for a department
     * Requires: Administrator or department manager privileges
     */
    setupApiRoute(
        router,
        'get',
        '/dashboard/:deptId/:weekStart/:uid?',
        [
            ...middlewares,
            organizationMiddleware.departmentExists,
            organizationMiddleware.isDepartmentManager,
            validate.params(schemas.supervisor.getDashboardParams),
        ],
        controllers.write.supervisor.getDashboard
    );

    /**
     * GET /api/v3/supervisor/reports/:deptId/:weekStart/:type
     * GET /api/v3/supervisor/reports/:deptId/:weekStart/:type/:uid (optional uid for individual member)
     * Get daily or weekly reports for department or individual member
     * Requires: Administrator or department manager privileges
     */
    setupApiRoute(
        router,
        'get',
        '/reports/:deptId/:weekStart/:type/:uid?',
        [
            ...middlewares,
            organizationMiddleware.departmentExists,
            validate.params(schemas.supervisor.getReportsParams),

        ],
        controllers.write.supervisor.getReports
    );

    /**
     * PUT /api/v3/supervisor/section/:deptId/member/:uid/rubric/:weekStart
     * Update rubric score and feedback for a team member
     * Requires: Administrator or department manager privileges
     */
    setupApiRoute(
        router,
        'put',
        '/section/:deptId/member/:uid/rubric/:weekStart',
        [
            ...middlewares,
            organizationMiddleware.departmentExists,
            organizationMiddleware.isDepartmentManager,
            validate.params(schemas.supervisor.updateMemberRubricParams),
            validate.body(schemas.supervisor.updateMemberRubricBody),
        ],
        controllers.write.supervisor.updateMemberRubric
    );

    return router;
};