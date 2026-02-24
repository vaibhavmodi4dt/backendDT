'use strict';

const nconf = require('nconf');
const winston = require('winston');

/**
 * Middleware to disable client UI while keeping admin and API functional
 * Add this to your webserver.js
 */

const DisableClientUI = module.exports;

DisableClientUI.middleware = function (req, res, next) {
	const relativePath = nconf.get('relative_path') || '';
	const reqPath = req.path;

	// Log blocked requests (optional, can be removed in production)
	const logBlockedRequests = nconf.get('logBlockedClientRequests') === true;

	// Allow admin routes
	if (reqPath.startsWith(`${relativePath}/admin`) || reqPath.startsWith(`${relativePath}/login`) || reqPath.startsWith(`${relativePath}/logout`)) {
		return next();
	}

	// Allow only versioned API routes (v1, v2, v3) and admin API
	if (reqPath.match(new RegExp(`^${relativePath}/api/v[1-3]/`)) || 
		reqPath.match(new RegExp(`^${relativePath}/api/admin/`))) {
		return next();
	}

	// Allow /api/config (needed for CSRF token)
	if (reqPath === `${relativePath}/api/config` || reqPath.startsWith(`${relativePath}/api/config?`)) {
		return next();
	}

	// Allow ping endpoints
	if (reqPath === `${relativePath}/ping` || reqPath === `${relativePath}/sping`) {
		return next();
	}

	// Allow static assets (CSS, JS, images, fonts, etc.)
	if (reqPath.match(/\.(css|js|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|map)$/)) {
		return next();
	}

	// Allow favicon and touch icons
	if (reqPath.includes('favicon') || reqPath.includes('apple-touch-icon')) {
		return next();
	}

	// Allow uploads directory
	if (reqPath.startsWith(`${relativePath}/assets/uploads`) || 
		reqPath.startsWith(`${relativePath}/uploads`)) {
		return next();
	}

	// Allow plugins static assets
	if (reqPath.startsWith(`${relativePath}/plugins/`)) {
		return next();
	}

	// Allow socket.io
	if (reqPath.startsWith(`${relativePath}/socket.io`)) {
		return next();
	}

	// Allow manifest.json and service workers
	if (reqPath.includes('manifest.json') || reqPath.includes('service-worker')) {
		return next();
	}

	// Allow robots.txt and sitemap
	if (reqPath === `${relativePath}/robots.txt` || 
		reqPath === `${relativePath}/sitemap.xml` || 
		reqPath.startsWith(`${relativePath}/sitemap/`)) {
		return next();
	}

	// Allow RSS feeds (optional, you might want to keep these)
	if (reqPath.endsWith('.rss') || reqPath.includes('/feeds/')) {
		return next();
	}

	// Block everything else (client UI routes)
	if (logBlockedRequests) {
		winston.verbose(`[client-ui] Blocked client UI request: ${req.method} ${reqPath}`);
	}

	// Return JSON response for API-like requests
	if (req.xhr || req.headers.accept?.includes('application/json')) {
		return res.status(404).json({
			status: {
				code: 'not-found',
				message: 'Client UI is disabled. This instance operates in API-only mode.',
			},
		});
	}

	// For browser requests, try to render template, fallback to simple HTML
	const templateData = {
		title: 'API Service',
		language: 'en',
		userLang: 'ltr',
		heading: 'API Service',
		description: 'This service operates in API-only mode with no public client interface.',
		statusBadge: 'Client UI Disabled',
		message: 'The requested page is not available. This instance provides backend API services only.',
		endpointsHeading: 'Available Endpoints',
		endpoints: [
			{ label: 'Administrative Interface', path: '/admin' },
			{ label: 'API v1 Routes', path: '/api/v1/*' },
			{ label: 'API v2 Routes', path: '/api/v2/*' },
			{ label: 'API v3 Routes', path: '/api/v3/*' },
			{ label: 'Health Check', path: '/ping' },
		],
		footerMessage: 'For API documentation and access credentials, please contact your system administrator.',
	};

	res.status(404);
	
	// Try to render using NodeBB's template engine
	if (req.app && typeof req.app.renderAsync === 'function') {
		req.app.renderAsync('404', templateData)
			.then(html => res.send(html))
			.catch(() => {
				// Simple fallback HTML
				res.send('<h1>404</h1><p>Client UI disabled. API available at /api/v3/*</p>');
			});
	} else {
		// Simple fallback HTML if renderAsync not available
		res.send('<h1>404</h1><p>Client UI disabled. API available at /api/v3/*</p>');
	}
};

DisableClientUI.init = function () {
	const clientUIDisabled = nconf.get('disableClientUI') === true;
	if (clientUIDisabled) {
		winston.info('🔒 Client UI is DISABLED - API-only mode active');
		winston.info('   ✓ Admin panel accessible at /admin');
		winston.info('   ✓ API endpoints accessible at /api/v1/*, /api/v2/*, /api/v3/*');
		winston.info('   ✗ Client UI routes blocked');
		winston.info('   ✗ Direct /api/* routes blocked (use versioned endpoints)');
	}
};