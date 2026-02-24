'use strict';

const router = require('express').Router();
const middleware = require('../../middleware');
const controllers = require('../../controllers');
const { setupApiRoute } = require('../helpers');
const validate = require('../../middleware/validate');
const schemas = require('../../validations/sd');

module.exports = () => {
	// TOPIC ROUTES (Admin/Manager only - checked in API layer)
	setupApiRoute(router, 'post', '/topics',
		[middleware.ensureLoggedIn, validate.body(schemas.createTopicBody)],
		controllers.write.sd.createTopic
	);

	setupApiRoute(router, 'get', '/topics/active',
		[middleware.ensureLoggedIn],
		controllers.write.sd.getActiveTopic
	);

	setupApiRoute(router, 'get', '/topics/:id',
		[middleware.ensureLoggedIn, validate.params(schemas.getTopicParams)],
		controllers.write.sd.getTopicById
	);

	setupApiRoute(router, 'get', '/topics/week/:weekStart',
		[middleware.ensureLoggedIn, validate.params(schemas.listTopicsParams)],
		controllers.write.sd.listTopics
	);

	setupApiRoute(router, 'put', '/topics/:id',
		[middleware.ensureLoggedIn, validate.params(schemas.getTopicParams), validate.body(schemas.updateTopicBody)],
		controllers.write.sd.updateTopic
	);

	setupApiRoute(router, 'delete', '/topics/:id',
		[middleware.ensureLoggedIn, validate.params(schemas.getTopicParams)],
		controllers.write.sd.deleteTopic
	);

	// PITCH ROUTES (All authenticated users)
	setupApiRoute(router, 'post', '/pitches',
		[middleware.ensureLoggedIn, validate.body(schemas.createPitchBody)],
		controllers.write.sd.createPitch
	);

	setupApiRoute(router, 'get', '/pitches/:id',
		[middleware.ensureLoggedIn, validate.params(schemas.getPitchParams)],
		controllers.write.sd.getPitchById
	);

	setupApiRoute(router, 'get', '/topics/:topicId/pitches/week/:weekStart',
		[middleware.ensureLoggedIn, validate.params(schemas.getTopicPitchesParams)],
		controllers.write.sd.listPitchesByTopic
	);

	setupApiRoute(router, 'get', '/pitches/my/:topicId',
		[middleware.ensureLoggedIn, validate.params(schemas.getMyPitchParams)],
		controllers.write.sd.getMyPitch
	);

	setupApiRoute(router, 'put', '/pitches/:id',
		[middleware.ensureLoggedIn, validate.params(schemas.getPitchParams), validate.body(schemas.updatePitchBody)],
		controllers.write.sd.updatePitch
	);

	setupApiRoute(router, 'delete', '/pitches/:id',
		[middleware.ensureLoggedIn, validate.params(schemas.getPitchParams)],
		controllers.write.sd.deletePitch
	);

	return router;
};
