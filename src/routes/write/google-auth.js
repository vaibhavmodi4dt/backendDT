'use strict';

const router = require('express').Router();
const middleware = require('../../middleware');
const controllers = require('../../controllers');
const googleAuthController = controllers['google-auth'];

module.exports = function () {
    const middlewares = [middleware.applyCSRF];

    // Initiate Google OAuth login
    router.get('/google', middlewares, googleAuthController.login);

    // Google OAuth callback
    router.get('/google/callback', middlewares, googleAuthController.callback);

    // Verify current session (protected route)
    router.get('/google/verify', middleware.ensureLoggedIn, googleAuthController.verify);

    // Unlink Google account (protected route)
    router.post('/google/unlink', middleware.ensureLoggedIn, googleAuthController.unlink);

    return router;
};