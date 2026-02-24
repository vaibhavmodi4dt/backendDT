'use strict';

const api = require('../../api');
const helpers = require('../helpers');
const googleController = require('../google-auth');
const authenticationController = require('../authentication');
const user = require('../../user');

const Auth = module.exports;

// ==========================================
// REGISTRATION
// ==========================================

Auth.register = async (req, res) => {
	helpers.formatApiResponse(200, res, await api.auth.register(req, req.safe));
};

Auth.checkUsernameAvailability = async (req, res) => {
	helpers.formatApiResponse(200, res, await api.auth.checkUsernameAvailability(req, req.safe));
};

Auth.checkEmailAvailability = async (req, res) => {
	helpers.formatApiResponse(200, res, await api.auth.checkEmailAvailability(req, req.safe));
};

// ==========================================
// EMAIL VERIFICATION
// ==========================================

Auth.verifyEmail = async (req, res) => {
	helpers.formatApiResponse(200, res, await api.auth.verifyEmail(req, req.safe));
};

Auth.resendVerification = async (req, res) => {
	helpers.formatApiResponse(200, res, await api.auth.resendVerification(req, req.safe));
};

// ==========================================
// PASSWORD RESET
// ==========================================

Auth.forgotPassword = async (req, res) => {
	helpers.formatApiResponse(200, res, await api.auth.forgotPassword(req, req.safe));
};

Auth.validateResetCode = async (req, res) => {
	helpers.formatApiResponse(200, res, await api.auth.validateResetCode(req, req.safe));
};

Auth.resetPasswordWithCode = async (req, res) => {
	helpers.formatApiResponse(200, res, await api.auth.resetPassword(req, req.safe));
};

// ==========================================
// LOGIN / LOGOUT
// ==========================================

Auth.login = async (req, res) => {
	// Set up response handlers for NodeBB's authentication flow
	res.locals.redirectAfterLogin = async (req, res) => {
		const userData = (await user.getUsers([req.uid], req.uid)).pop();
		helpers.formatApiResponse(200, res, userData);
	};

	res.locals.noScriptErrors = (req, res, err, statusCode) => {
		helpers.formatApiResponse(statusCode, res, new Error(err));
	};

	// Use NodeBB's authentication controller
	authenticationController.login(req, res);
};

Auth.logout = async (req, res) => {
	req.logout((err) => {
		if (err) {
			return helpers.formatApiResponse(500, res, new Error(err.message));
		}

		req.session.destroy((sessionErr) => {
			if (sessionErr) {
				return helpers.formatApiResponse(500, res, new Error(sessionErr.message));
			}

			helpers.formatApiResponse(200, res, {
				success: true,
				message: 'Logged out successfully',
			});
		});
	});
};

Auth.refreshToken = async (req, res) => {
	helpers.formatApiResponse(501, res, {
		success: false,
		message: 'NodeBB uses session-based authentication. Token refresh not applicable.',
		hint: 'Sessions are managed automatically by Express',
	});
};

// ==========================================
// PUBLIC CONFIG
// ==========================================

Auth.getPublicConfig = async (req, res) => {
	helpers.formatApiResponse(200, res, await api.auth.getPublicConfig(req));
};

Auth.getPasswordRequirements = async (req, res) => {
	helpers.formatApiResponse(200, res, await api.auth.getPasswordRequirements(req));
};

// ==========================================
// SESSION INFO
// ==========================================

Auth.getCurrentUser = async (req, res) => {
	helpers.formatApiResponse(200, res, {
		success: true,
		user: await api.auth.getCurrentUser(req),
	});
};

// ==========================================
// GOOGLE OAUTH
// ==========================================

Auth.googleLogin = function (req, res, next) {
	return googleController.login(req, res, next);
};

Auth.googleCallback = function (req, res, next) {
	return googleController.callback(req, res, next);
};

Auth.googleVerify = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.auth.checkGoogleLinkStatus(req));
};

Auth.googleUnlink = async function (req, res) {
	helpers.formatApiResponse(200, res, await api.auth.unlinkGoogle(req));
};