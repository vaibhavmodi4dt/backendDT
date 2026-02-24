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
	// ==========================================
	// WORKSPACE MANAGEMENT
	// ==========================================

	// Create workspace
	setupApiRoute(
		router,
		'post',
		'/',
		[
			middleware.ensureLoggedIn,
			validate.body(schemas.workspace.create),
		],
		controllers.write.workspace.create
	);

	// Get workspace created by me (paginated)
	setupApiRoute(
		router,
		'get',
		'/',
		[
			middleware.ensureLoggedIn,
			validate.query(schemas.workspace.list),
		],
		controllers.write.workspace.list
	);

	// Get workspace I joined (paginated)
	setupApiRoute(
		router,
		'get',
		'/joined',
		[
			middleware.ensureLoggedIn,
			validate.query(schemas.workspace.list),
		],
		controllers.write.workspace.listJoined
	);

	// Get workspace by ID (full detail)
	setupApiRoute(
		router,
		'get',
		'/:id',
		[
			middleware.ensureLoggedIn,
			validate.params(schemas.workspace.getById),
		],
		controllers.write.workspace.get
	);

	// Update workspace
	setupApiRoute(
		router,
		'put',
		'/:id',
		[
			middleware.ensureLoggedIn,
			validate.params(schemas.workspace.getById),
			validate.body(schemas.workspace.update),
		],
		controllers.write.workspace.update
	);

	// Stop workspace
	setupApiRoute(
		router,
		'post',
		'/:id/stop',
		[
			middleware.ensureLoggedIn,
			validate.params(schemas.workspace.stopById),
		],
		controllers.write.workspace.stop
	);

	// Delete workspace
	setupApiRoute(
		router,
		'delete',
		'/:id',
		[
			middleware.ensureLoggedIn,
			validate.params(schemas.workspace.deleteById),
		],
		controllers.write.workspace.delete
	);

	// ==========================================
	// PARTICIPATION
	// ==========================================

	// Join workspace via invite token
	setupApiRoute(
		router,
		'post',
		'/join/:token',
		[
			middleware.ensureLoggedIn,
			validate.params(schemas.workspace.joinByToken),
		],
		controllers.write.workspace.join
	);

	// Leave workspace
	setupApiRoute(
		router,
		'post',
		'/:id/leave',
		[
			middleware.ensureLoggedIn,
			validate.params(schemas.workspace.getById),
		],
		controllers.write.workspace.leave
	);

	// ==========================================
	// ASSET LINKING
	// ==========================================

	// Link asset to workspace
	setupApiRoute(
		router,
		'post',
		'/:id/assets',
		[
			middleware.ensureLoggedIn,
			validate.params(schemas.workspace.getById),
			validate.body(schemas.workspace.linkAsset),
		],
		controllers.write.workspace.linkAsset
	);

	return router;
};