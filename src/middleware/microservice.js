'use strict';

const nconf = require('nconf');
const winston = require('winston');

/**
 * Microservice Authentication Middleware
 * 
 * Enables NodeBB to work as a backend microservice by:
 * 1. Bypassing CSRF checks for service-to-service calls
 * 2. Supporting cookie proxying from microservice
 * 3. Allowing trusted service token from config
 */

const Microservice = module.exports;

Microservice.init = function () {
	const serviceToken = nconf.get('microserviceToken');
	const enableMicroserviceMode = nconf.get('enableMicroserviceMode') === true;
	
	if (enableMicroserviceMode) {
		winston.info('🔧 Microservice Mode ENABLED');
		
		if (serviceToken) {
			winston.info('   ✓ Service token configured');
			winston.info('   ✓ CSRF bypass enabled for service calls');
			winston.info('   ✓ Cookie proxying supported');
		} else {
			winston.error('   ✗ No microserviceToken in config.json!');
			winston.error('   Add to config.json: "microserviceToken": "your-secret-token"');
			throw new Error('Microservice mode enabled but no token configured');
		}
	}
};

/**
 * Check if request has valid service token
 */
function isValidServiceToken(req) {
	const configToken = nconf.get('microserviceToken');
	if (!configToken) {
		return false;
	}
	
	// Check for service token in headers
	const serviceToken = req.headers['x-service-token'] || req.headers['x-microservice-token'];
	
	return serviceToken === configToken;
}

/**
 * Middleware to bypass CSRF for microservice calls
 */
Microservice.bypassCSRF = function (req, res, next) {
	const enableMicroserviceMode = nconf.get('enableMicroserviceMode') === true;
	
	if (!enableMicroserviceMode) {
		return next();
	}
	
	if (isValidServiceToken(req)) {
		// Mark this request as coming from trusted service
		req.fromTrustedService = true;
		req.skipCSRF = true;
		
		winston.verbose('[microservice] Authenticated service-to-service call');
		
		// Extract user context if provided by microservice
		const userUid = req.headers['x-user-uid'] || req.headers['x-forwarded-uid'];
		if (userUid) {
			req.microserviceUserId = parseInt(userUid, 10);
			winston.verbose(`[microservice] User context: uid=${userUid}`);
		}
	}
	
	next();
};

/**
 * Middleware to handle cookie proxying from microservice
 */
Microservice.handleProxiedAuth = function (req, res, next) {
	const enableMicroserviceMode = nconf.get('enableMicroserviceMode') === true;
	
	if (!enableMicroserviceMode || !req.fromTrustedService) {
		return next();
	}
	
	// If microservice forwarded cookies, they're already in req.cookies
	// If microservice provides user context via header instead
	if (req.microserviceUserId && !req.uid) {
		req.uid = req.microserviceUserId;
		req.loggedIn = req.uid > 0;
		winston.verbose(`[microservice] Set user context from header: uid=${req.uid}`);
	}
	
	next();
};