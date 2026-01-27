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
 * Custom middleware: Check if user is department manager (deptId from query)
 */
const isDepartmentManagerFromQuery = async (req, res, next) => {
    const deptId = req.query.deptId;
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
     * GET /api/v3/supervisor/dashboard/:deptId
     * Get pre-calculated supervisor dashboard for a department
     * Requires: Administrator or department manager privileges
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
     * Requires: Administrator or department manager privileges
     */
    setupApiRoute(
        router,
        'get',
        '/reports',
        [
            ...middlewares,
            validate.query(schemas.supervisor.getReportsQuery),
            isDepartmentManagerFromQuery,
        ],
        controllers.write.supervisor.getReports
    );

    /**
     * PUT /api/v3/supervisor/dashboard/:deptId/member/:uid/rubric
     * Update rubric score and feedback for a team member
     * Requires: Administrator or department manager privileges
     */
    setupApiRoute(
        router,
        'put',
        '/dashboard/:deptId/member/:uid/rubric',
        [
            ...middlewares,
            organizationMiddleware.departmentExists,
            organizationMiddleware.isDepartmentManager,
            validate.params(schemas.supervisor.updateMemberRubricParams),
            validate.query(schemas.supervisor.updateMemberRubricQuery),
            validate.body(schemas.supervisor.updateMemberRubricBody),
        ],
        controllers.write.supervisor.updateMemberRubric
    );

    return router;
};