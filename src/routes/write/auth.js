'use strict';

const router = require('express').Router();
const middleware = require('../../middleware');
const controllers = require('../../controllers');
const routeHelpers = require('../helpers');

// Import rate limiting
const ratelimitMiddleware = require('../../middleware/ratelimit');

//  Import Zod validation middleware
const validate = require('../../middleware/validate');
const schemas = require('../../validations');

const { setupApiRoute } = routeHelpers;

module.exports = function () {
	// ==========================================
	// REGISTRATION & ACCOUNT CREATION
	// ==========================================

	setupApiRoute(router, 'post', '/register',
		[
			validate.body(schemas.auth.register), //  Zod validation
			ratelimitMiddleware.register,
		],
		controllers.write.auth.register
	);

	setupApiRoute(router, 'get', '/check-username/:username',
		[
			validate.params(schemas.auth.checkUsername), //  Validate params
		],
		controllers.write.auth.checkUsernameAvailability
	);

	setupApiRoute(router, 'get', '/check-email/:email',
		[
			validate.params(schemas.auth.checkEmail), //  Validate params
		],
		controllers.write.auth.checkEmailAvailability
	);

	// ==========================================
	// EMAIL VERIFICATION
	// ==========================================

	setupApiRoute(router, 'post', '/verify-email',
		[
			validate.body(schemas.auth.verifyEmail), //  Zod validation
		],
		controllers.write.auth.verifyEmail
	);

	setupApiRoute(router, 'post', '/resend-verification',
		[
			validate.body(schemas.auth.resendVerification), //  Zod validation
			ratelimitMiddleware.resendVerification,
		],
		controllers.write.auth.resendVerification
	);

	// ==========================================
	// PASSWORD RESET FLOW
	// ==========================================

	setupApiRoute(router, 'post', '/forgot-password',
		[
			validate.body(schemas.auth.forgotPassword), //  Zod validation
			ratelimitMiddleware.forgotPassword,
		],
		controllers.write.auth.forgotPassword
	);

	setupApiRoute(router, 'post', '/validate-reset-code',
		[
			validate.body(schemas.auth.validateResetCode), //  Zod validation
		],
		controllers.write.auth.validateResetCode
	);

	setupApiRoute(router, 'post', '/reset-password',
		[
			validate.body(schemas.auth.resetPassword), //  Zod validation
		],
		controllers.write.auth.resetPasswordWithCode
	);

	// ==========================================
	// LOGIN / LOGOUT
	// ==========================================

	setupApiRoute(router, 'post', '/login',
		[
			validate.body(schemas.auth.login), //  Zod validation
			ratelimitMiddleware.login,
		],
		controllers.write.auth.login
	);

	setupApiRoute(router, 'post', '/logout',
		[middleware.ensureLoggedIn],
		controllers.write.auth.logout
	);

	// ==========================================
	// PUBLIC CONFIGURATION
	// ==========================================

	setupApiRoute(router, 'get', '/config',
		[],
		controllers.write.auth.getPublicConfig
	);

	setupApiRoute(router, 'get', '/password-requirements',
		[],
		controllers.write.auth.getPasswordRequirements
	);

	// ==========================================
	// SESSION / TOKEN INFO
	// ==========================================

	setupApiRoute(router, 'get', '/me',
		[middleware.ensureLoggedIn],
		controllers.write.auth.getCurrentUser
	);

	// ==========================================
	// GOOGLE OAUTH
	// ==========================================

	setupApiRoute(router, 'get', '/google',
		[],
		controllers.write.auth.googleLogin
	);

	setupApiRoute(router, 'get', '/google/callback',
		[],
		controllers.write.auth.googleCallback
	);

	setupApiRoute(router, 'get', '/google/verify',
		[middleware.ensureLoggedIn],
		controllers.write.auth.googleVerify
	);

	setupApiRoute(router, 'post', '/google/unlink',
		[middleware.ensureLoggedIn],
		controllers.write.auth.googleUnlink
	);

	return router;
};