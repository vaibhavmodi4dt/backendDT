'use strict';

// This file adds organization routes to the users router
// Add this to your existing src/routes/write/users.js

const router = require('express').Router();
const middleware = require('../../middleware');
const controllers = require('../../controllers');
const routeHelpers = require('../helpers');

const { setupApiRoute } = routeHelpers;

module.exports = function () {
	const middlewares = [middleware.ensureLoggedIn];

	// ==================== USER'S ORGANIZATIONS (YOUR KEY QUERY) ====================

	setupApiRoute(router, 'get', '/:uid/organizations', [
		...middlewares,
		middleware.assert.user,
	], controllers.write.organizations.getUserOrganizations);

	setupApiRoute(router, 'get', '/:uid/organizations/:orgId', [
		...middlewares,
		middleware.assert.user,
	], controllers.write.organizations.getUserOrganization);

	return router;
};