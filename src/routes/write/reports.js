'use strict';

const router = require('express').Router();
const middleware = require('../../middleware');
const controllers = require('../../controllers');
const routeHelpers = require('../helpers');

const { setupApiRoute } = routeHelpers;

module.exports = function () {
    const middlewares = [middleware.ensureLoggedIn];


    setupApiRoute(router, "post", "/", middlewares, controllers.write.reports.save)
    setupApiRoute(router, "get", "/", middlewares, controllers.write.reports.get)
    return router;
};