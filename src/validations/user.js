'use strict';

const { z } = require('zod');
const Common = require('./common');

const User = module.exports;

// Update user schema
User.update = z.object({
	username: Common.username.optional(),
	email: Common.email.optional(),
	fullname: z.string().max(100, 'Full name too long').optional(),
	website: Common.url.optional(),
	location: z.string().max(100, 'Location too long').optional(),
	birthday: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Birthday must be in MM/DD/YYYY format').optional(),
	signature: z.string().max(500, 'Signature too long').optional(),
	aboutme: z.string().max(1000, 'About me too long').optional(),
});

// Change password schema
User.changePassword = z.object({
	currentPassword: z.string().min(1, 'Current password is required'),
	newPassword: Common.password,
	confirmPassword: Common.password,
}).refine((data) => data.newPassword === data.confirmPassword, {
	message: "Passwords don't match",
	path: ['confirmPassword'],
});

// Update settings schema
User.updateSettings = z.object({
	settings: z.record(z.any()),
});