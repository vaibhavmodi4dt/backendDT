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
	// LIST & FETCH
	// ==========================================

	// Get user's threadbuilders (with pagination)
	setupApiRoute(
		router,
		'get',
		'/',
		[
			middleware.ensureLoggedIn,
			validate.query(schemas.threadbuilder.list),
		],
		controllers.write.threadbuilder.list
	);

	// Get all threadbuilders - global (with pagination)
	setupApiRoute(
		router,
		'get',
		'/public',
		[
			middleware.ensureLoggedIn,
			validate.query(schemas.threadbuilder.list),
		],
		controllers.write.threadbuilder.listAll
	);

	// Get single threadbuilder by ID
	setupApiRoute(
		router,
		'get',
		'/:id',
		[
			middleware.ensureLoggedIn,
			validate.params(schemas.threadbuilder.getById),
		],
		controllers.write.threadbuilder.get
	);

	// ==========================================
	// CREATE & UPDATE
	// ==========================================

	// Create new threadbuilder
	setupApiRoute(
		router,
		'post',
		'/',
		[
			middleware.ensureLoggedIn,
			validate.body(schemas.threadbuilder.create),
		],
		controllers.write.threadbuilder.create
	);

	// Update existing threadbuilder
	setupApiRoute(
		router,
		'put',
		'/:id',
		[
			middleware.ensureLoggedIn,
			validate.params(schemas.threadbuilder.getById),
			validate.body(schemas.threadbuilder.update),
		],
		controllers.write.threadbuilder.update
	);

	// ==========================================
	// DELETE
	// ==========================================

	// Delete threadbuilder
	setupApiRoute(
		router,
		'delete',
		'/:id',
		[
			middleware.ensureLoggedIn,
			validate.params(schemas.threadbuilder.deleteById),
		],
		controllers.write.threadbuilder.delete
	);

	// ==========================================
	// DUPLICATE
	// ==========================================

	// Duplicate threadbuilder
	setupApiRoute(
		router,
		'post',
		'/:id/duplicate',
		[
			middleware.ensureLoggedIn,
			validate.params(schemas.threadbuilder.duplicateById),
		],
		controllers.write.threadbuilder.duplicate
	);

	return router;
};