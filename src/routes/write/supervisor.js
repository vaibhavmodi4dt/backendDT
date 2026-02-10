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

/**
 * Custom middleware: Check if user is department manager (deptId from params)
 */
const isDepartmentManagerFromParams = async (req, res, next) => {
    const deptId = req.params.deptId;
    const { uid } = req;

    // Admins can do anything
    const isAdmin = await user.isAdministrator(uid);
    if (isAdmin) {
        req.isAdmin = true;
        return next();
    }

    // Check if user is a manager of this specific department
    const isDeptManager = await Organizations.isDepartmentManager(deptId, uid);

    if (!isDeptManager) {
        return res.status(403).json({
            status: {
                code: 403,
                message: 'Forbidden',
            },
            response: {
                error: '[[error:no-privileges]]',
                message: 'Only department managers can perform this action',
            },
        });
    }

    req.isDeptManager = true;
    next();
};

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
            isDepartmentManagerFromParams,
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