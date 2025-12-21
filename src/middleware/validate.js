'use strict';

const { ZodError } = require('zod');

const Validate = module.exports;

/**
 * Middleware factory to validate request data using Zod schemas
 * @param {ZodSchema} schema - Zod validation schema
 * @param {string} source - Where to get data from ('body', 'query', 'params')
 */
Validate.request = (schema, source = 'body') => {
	return async (req, res, next) => {
		try {
			// Get data from the specified source
			const data = req[source];

			// Validate using Zod schema
			const validated = await schema.parseAsync(data);

			// Replace request data with validated data
			req[source] = validated;

			// Store in req.safe for easy access
			req.safe = validated;

			next();
		} catch (error) {
			// ✅ Handle ZodError directly without re-throwing
			if (error instanceof ZodError) {
				// Access the errors array directly from ZodError
				const errors = error.issues.map(issue => ({
					field: issue.path.join('.'),
					message: issue.message,
				}));

				return res.status(400).json({
					success: false,
					error: 'Validation failed',
					errors: errors,
				});
			}

			// ✅ For non-Zod errors, check if error is a string or object
			console.error('❌ Validation error (non-Zod):', error);

			// Try to parse if it's a stringified error
			let errorMessage = 'Validation error';
			let errorDetails = null;

			if (typeof error === 'string') {
				try {
					const parsed = JSON.parse(error);
					if (Array.isArray(parsed)) {
						errorDetails = parsed;
					}
				} catch (e) {
					errorMessage = error;
				}
			} else if (error.message) {
				errorMessage = error.message;
			}

			return res.status(500).json({
				success: false,
				error: errorMessage,
				...(errorDetails && { details: errorDetails }),
			});
		}
	};
};

/**
 * Validate body
 */
Validate.body = (schema) => Validate.request(schema, 'body');

/**
 * Validate query parameters
 */
Validate.query = (schema) => Validate.request(schema, 'query');

/**
 * Validate URL parameters
 */
Validate.params = (schema) => Validate.request(schema, 'params');