'use strict';

const router = require('express').Router();
const middleware = require('../../middleware');
const controllers = require('../../controllers');
const routeHelpers = require('../helpers');

const validate = require('../../middleware/validate');
const schemas = require('../../validations');

const { setupApiRoute } = routeHelpers;

module.exports = function () {
    // ==========================================
    // LIST & FETCH
    // ==========================================

    // Get user's pitches (with pagination)
    setupApiRoute(
        router,
        'get',
        '/',
        [
            middleware.ensureLoggedIn,
            validate.query(schemas.pitch.list),
        ],
        controllers.write.pitch.list
    );

    // Get all pitches - global (with pagination)
    setupApiRoute(
        router,
        'get',
        '/public',
        [
            middleware.ensureLoggedIn,
            validate.query(schemas.pitch.list),
        ],
        controllers.write.pitch.listAll
    );

    // Get single pitch by ID
    setupApiRoute(
        router,
        'get',
        '/:id',
        [
            middleware.ensureLoggedIn,
            validate.params(schemas.pitch.getById),
        ],
        controllers.write.pitch.get
    );

    // ==========================================
    // CREATE & UPDATE
    // ==========================================

    // Create new pitch
    setupApiRoute(
        router,
        'post',
        '/',
        [
            middleware.ensureLoggedIn,
            validate.body(schemas.pitch.create),
        ],
        controllers.write.pitch.create
    );

    // Update existing pitch
    setupApiRoute(
        router,
        'put',
        '/:id',
        [
            middleware.ensureLoggedIn,
            validate.params(schemas.pitch.getById),
            validate.body(schemas.pitch.update),
        ],
        controllers.write.pitch.update
    );

    // ==========================================
    // DELETE
    // ==========================================

    // Delete pitch
    setupApiRoute(
        router,
        'delete',
        '/:id',
        [
            middleware.ensureLoggedIn,
            validate.params(schemas.pitch.deleteById),
        ],
        controllers.write.pitch.delete
    );

    // ==========================================
    // DUPLICATE
    // ==========================================

    // Duplicate pitch
    setupApiRoute(
        router,
        'post',
        '/:id/duplicate',
        [
            middleware.ensureLoggedIn,
            validate.params(schemas.pitch.duplicateById),
        ],
        controllers.write.pitch.duplicate
    );

    return router;
};