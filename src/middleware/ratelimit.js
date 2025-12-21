'use strict';

const winston = require('winston');
const db = require('../database');

const ratelimit = module.exports;

const allowedCalls = 100;
const timeframe = 10000;

ratelimit.isFlooding = function (socket) {
	socket.callsPerSecond = socket.callsPerSecond || 0;
	socket.elapsedTime = socket.elapsedTime || 0;
	socket.lastCallTime = socket.lastCallTime || Date.now();

	socket.callsPerSecond += 1;

	const now = Date.now();
	socket.elapsedTime += now - socket.lastCallTime;

	if (socket.callsPerSecond > allowedCalls && socket.elapsedTime < timeframe) {
		winston.warn(`Flooding detected! Calls : ${socket.callsPerSecond}, Duration : ${socket.elapsedTime}`);
		return true;
	}

	if (socket.elapsedTime >= timeframe) {
		socket.elapsedTime = 0;
		socket.callsPerSecond = 0;
	}

	socket.lastCallTime = now;
	return false;
};

// ==========================================
// HTTP RATE LIMITING (New)
// ==========================================

const HTTP_RATE_LIMITS = {
	// Auth endpoints
	register: { max: 3, window: 3600 }, // 3 per hour
	login: { max: 10, window: 900 }, // 10 per 15 min
	forgotPassword: { max: 5, window: 3600 }, // 5 per hour
	resendVerification: { max: 5, window: 3600 }, // 5 per hour
	
	// OTP
	sendOTP: { max: 5, window: 3600 }, // 5 per hour
	verifyOTP: { max: 10, window: 900 }, // 10 per 15 min
	
	// Default
	default: { max: 30, window: 900 }, // 30 per 15 min
};

/**
 * Create HTTP rate limiter middleware
 * @param {string} type - Type of endpoint (register, login, etc.)
 * @returns {Function} Express middleware
 */
ratelimit.http = function (type = 'default') {
	return async (req, res, next) => {
		try {
			const config = HTTP_RATE_LIMITS[type] || HTTP_RATE_LIMITS.default;
			const identifier = getIdentifier(req);
			const key = `ratelimit:http:${type}:${identifier}`;

			// Get current count from database
			const count = await db.increment(key);

			// Set expiry on first request
			if (count === 1) {
				await db.expire(key, config.window);
			}

			// Check if limit exceeded
			if (count > config.max) {
				const ttl = await db.ttl(key);
				
				winston.warn(`[Rate Limit] HTTP ${type} exceeded for ${identifier}: ${count}/${config.max}`);
				
				return res.status(429).json({
					success: false,
					error: 'Too many requests. Please try again later.',
					retryAfter: ttl,
					limit: config.max,
					window: config.window,
				});
			}

			// Add rate limit headers
			res.set({
				'X-RateLimit-Limit': config.max,
				'X-RateLimit-Remaining': Math.max(0, config.max - count),
				'X-RateLimit-Reset': Math.floor(Date.now() / 1000) + (await db.ttl(key)),
			});

			next();
		} catch (err) {
			// Don't block on rate limit errors
			winston.error('[Rate Limit] Error:', err);
			next();
		}
	};
};

/**
 * Get unique identifier for rate limiting
 */
function getIdentifier(req) {
	// Use user ID if authenticated
	if (req.uid && req.uid > 0) {
		return `uid:${req.uid}`;
	}

	// Get IP address (handle proxies)
	const forwarded = req.headers['x-forwarded-for'];
	const ip = forwarded 
		? forwarded.split(',')[0].trim()
		: req.headers['x-real-ip'] || 
		  req.connection?.remoteAddress || 
		  req.socket?.remoteAddress ||
		  req.ip;

	return `ip:${ip}`;
}

// ==========================================
// CONVENIENCE METHODS
// ==========================================

// HTTP rate limiters
ratelimit.register = ratelimit.http('register');
ratelimit.login = ratelimit.http('login');
ratelimit.forgotPassword = ratelimit.http('forgotPassword');
ratelimit.resendVerification = ratelimit.http('resendVerification');
ratelimit.sendOTP = ratelimit.http('sendOTP');
ratelimit.verifyOTP = ratelimit.http('verifyOTP');

// ==========================================
// ADMIN: Clear rate limits
// ==========================================

/**
 * Clear rate limits for a specific identifier
 * @param {string} identifier - User ID or IP
 * @param {string} type - Rate limit type (optional)
 */
ratelimit.clearLimits = async function (identifier, type = '*') {
	try {
		const pattern = `ratelimit:http:${type}:${identifier}`;
		const keys = await db.getSortedSetRange(pattern, 0, -1);
		
		if (keys && keys.length > 0) {
			await db.deleteAll(keys);
			winston.info(`[Rate Limit] Cleared limits for ${identifier} (${type})`);
		}
	} catch (err) {
		winston.error('[Rate Limit] Error clearing limits:', err);
	}
};

/**
 * Get current rate limit status
 * @param {string} identifier - User ID or IP
 * @param {string} type - Rate limit type
 */
ratelimit.getStatus = async function (identifier, type) {
	try {
		const key = `ratelimit:http:${type}:${identifier}`;
		const count = await db.get(key);
		const ttl = await db.ttl(key);
		const config = HTTP_RATE_LIMITS[type] || HTTP_RATE_LIMITS.default;

		return {
			current: parseInt(count, 10) || 0,
			limit: config.max,
			remaining: Math.max(0, config.max - (parseInt(count, 10) || 0)),
			resetIn: ttl,
			blocked: (parseInt(count, 10) || 0) > config.max,
		};
	} catch (err) {
		winston.error('[Rate Limit] Error getting status:', err);
		return null;
	}
};