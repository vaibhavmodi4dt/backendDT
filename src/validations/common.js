'use strict';

const { z } = require('zod');

const Common = module.exports;

// Email validation
Common.email = z.string()
	.email('Invalid email format')
	.min(5, 'Email must be at least 5 characters')
	.max(100, 'Email must not exceed 100 characters')
	.toLowerCase()
	.trim();

// Username validation (will be customized based on meta.config)
Common.username = z.string()
	.min(3, 'Username must be at least 3 characters')
	.max(20, 'Username must not exceed 20 characters')
	.regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')
	.trim();

// Password validation (will be customized based on meta.config)
Common.password = z.string()
	.min(6, 'Password must be at least 6 characters')
	.max(512, 'Password must not exceed 512 characters');

// Strong password validation
Common.strongPassword = z.string()
	.min(8, 'Password must be at least 8 characters')
	.regex(/[a-z]/, 'Password must contain at least one lowercase letter')
	.regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
	.regex(/[0-9]/, 'Password must contain at least one number')
	.regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

// Verification code
Common.verificationCode = z.string()
	.min(6, 'Verification code must be at least 6 characters')
	.max(100, 'Invalid verification code');

// UID
Common.uid = z.number()
	.int('User ID must be an integer')
	.positive('User ID must be positive');

// URL
Common.url = z.string()
	.url('Invalid URL format')
	.max(500, 'URL too long');

// Birthday (MM/DD/YYYY format)
Common.birthday = z.string()
	.regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Birthday must be in MM/DD/YYYY format')
	.refine((date) => {
		const [month, day, year] = date.split('/').map(Number);
		const birthDate = new Date(year, month - 1, day);
		const today = new Date();
		const age = today.getFullYear() - birthDate.getFullYear();
		return age >= 13 && age <= 120; // Must be between 13 and 120 years old
	}, 'Invalid birth date');

// Full name
Common.fullname = z.string()
	.min(1, 'Full name cannot be empty')
	.max(100, 'Full name too long')
	.trim();

// Picture URL
Common.pictureUrl = z.string()
	.url('Invalid picture URL')
	.max(500, 'Picture URL too long');