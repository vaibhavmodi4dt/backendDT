'use strict';

const { z } = require('zod');
const Common = require('./common');

const Auth = module.exports;

// Registration schema - with all possible fields
Auth.register = z.object({
	// Required fields
	username: Common.username,
	email: Common.email,
	password: Common.password,
	
	// Optional fields
	picture: z.string().url('Invalid picture URL').optional(),
	fullname: z.string()
		.min(1, 'Full name cannot be empty')
		.max(100, 'Full name too long')
		.optional(),
	birthday: z.string()
		.regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Birthday must be in MM/DD/YYYY format')
		.optional(),
	gdpr_consent: z.boolean().optional(),
	acceptTos: z.boolean().optional(),
	token: z.string().optional(), // Invite token
	timestamp: z.number().int().positive().optional(), // Custom join timestamp
});

// Login schema
Auth.login = z.object({
	username: z.string()
		.min(1, 'Username or email is required')
		.trim(),
	password: z.string()
		.min(1, 'Password is required'),
});

// Email verification schema
Auth.verifyEmail = z.object({
	code: Common.verificationCode,
});

// Resend verification schema
Auth.resendVerification = z.object({
	email: Common.email,
});

// Forgot password schema
Auth.forgotPassword = z.object({
	email: Common.email,
});

// Validate reset code schema
Auth.validateResetCode = z.object({
	code: Common.verificationCode,
});

// Reset password schema
Auth.resetPassword = z.object({
	code: Common.verificationCode,
	newPassword: Common.password,
});

// Check username availability schema
Auth.checkUsername = z.object({
	username: Common.username,
});

// Check email availability schema
Auth.checkEmail = z.object({
	email: Common.email,
});