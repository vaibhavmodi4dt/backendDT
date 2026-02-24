'use strict';

const user = require('../user');
const meta = require('../meta');
const plugins = require('../plugins');
const db = require('../database');
const { membership } = require('../organizations');

const Auth = module.exports;

// ==========================================
// REGISTRATION
// ==========================================

Auth.register = async (caller, data) => {
	// Extract all fields (Zod has already validated them)
	const {
		username,
		email,
		password,
		picture,
		fullname,
		birthday,
		gdpr_consent,
		acceptTos,
		token,
		timestamp,
	} = data;

	// Check if registration is allowed
	const registrationType = meta.config.registrationType || 'normal';
	if (registrationType === 'disabled') {
		throw new Error('Registration is disabled');
	}

	// Prepare user data object with all fields
	const userData = {
		username,
		email,
		password,
	};

	// Add optional fields if provided
	if (picture) userData.picture = picture;
	if (fullname) userData.fullname = fullname;
	if (birthday) userData.birthday = birthday;
	if (gdpr_consent !== undefined) userData.gdpr_consent = gdpr_consent;
	if (acceptTos !== undefined) userData.acceptTos = acceptTos;
	if (token) userData.token = token;
	if (timestamp) userData.timestamp = timestamp;

	// Use NodeBB's user.create method
	const uid = await user.create(userData);

	// Note: NodeBB's user.create already handles:
	// - Email verification sending (if meta.config.requireEmailConfirmation)
	// - Plugin hooks (filter:user.create and action:user.create)
	// - Welcome notification
	// So we don't need to duplicate that here

	//try to join: This is a default org ID, first is always Dt in Any Env, in future we will provide option in FE to do select it
	try {
		await membership.join(1, uid, { departmentId: 1, roleId: 1 });
	} catch (error) {

	}
	return {
		success: true,
		message: meta.config.requireEmailConfirmation
			? 'Registration successful. Please check your email to verify your account.'
			: 'Registration successful.',
		uid: uid,
	};
};

Auth.checkUsernameAvailability = async (caller, data) => {
	const { username } = data;

	// Check if username exists
	const exists = await user.existsBySlug(username);

	return {
		available: !exists,
		username: username,
	};
};

Auth.checkEmailAvailability = async (caller, data) => {
	const { email } = data;

	// Use NodeBB's email availability check
	const available = await user.email.available(email);

	return {
		available: available,
		email: email,
	};
};

// ==========================================
// EMAIL VERIFICATION
// ==========================================

Auth.verifyEmail = async (caller, data) => {
	const { code } = data;

	// Use NodeBB's email confirmation method
	await user.email.confirmByCode(code, caller.session?.id);

	return {
		success: true,
		message: 'Email verified successfully',
	};
};

Auth.resendVerification = async (caller, data) => {
	const { email } = data;

	// Find user by email
	const uid = await user.getUidByEmail(email);
	if (!uid) {
		// Don't reveal if email exists (security)
		return {
			success: true,
			message: 'If the email exists, a verification email has been sent.',
		};
	}

	// Check if already verified
	const userData = await user.getUserFields(uid, ['email:confirmed']);
	if (parseInt(userData['email:confirmed'], 10) === 1) {
		throw new Error('Email already verified');
	}

	// Resend verification email
	await user.email.sendValidationEmail(uid, {
		email,
		subject: '[[email:email.verify-your-email]]',
	});

	return {
		success: true,
		message: 'Verification email sent',
	};
};

// ==========================================
// PASSWORD RESET
// ==========================================

Auth.forgotPassword = async (caller, data) => {
	const { email } = data;

	// Use NodeBB's password reset service
	await user.reset.send(email);

	// Always return success (don't reveal if email exists)
	return {
		success: true,
		message: 'If the email exists, a password reset link has been sent.',
	};
};

Auth.validateResetCode = async (caller, data) => {
	const { code } = data;

	// Use NodeBB's reset code validation
	const valid = await user.reset.validate(code);

	return {
		valid: valid,
	};
};

Auth.resetPassword = async (caller, data) => {
	const { code, newPassword } = data;

	// Use NodeBB's password reset commit
	await user.reset.commit(code, newPassword);

	return {
		success: true,
		message: 'Password reset successful',
	};
};

// ==========================================
// PUBLIC CONFIG
// ==========================================

Auth.getPublicConfig = async (caller) => {
	return {
		siteName: meta.config.title || 'NodeBB',
		minimumUsernameLength: meta.config.minimumUsernameLength || 3,
		maximumUsernameLength: meta.config.maximumUsernameLength || 20,
		minimumPasswordLength: meta.config.minimumPasswordLength || 6,
		minimumPasswordStrength: meta.config.minimumPasswordStrength || 1,
		registrationType: meta.config.registrationType || 'normal',
		allowRegistration: meta.config.registrationType === 'normal',
		requireEmailVerification: !!meta.config.requireEmailConfirmation,
		allowLocalLogin: true,
		termsOfUse: !!meta.config.termsOfUse,
	};
};

Auth.getPasswordRequirements = async (caller) => {
	const minLength = meta.config.minimumPasswordLength || 6;
	const minStrength = meta.config.minimumPasswordStrength || 1;

	const requirements = [`At least ${minLength} characters`];

	if (minStrength >= 1) {
		requirements.push('At least one lowercase letter');
	}
	if (minStrength >= 2) {
		requirements.push('At least one uppercase letter');
	}
	if (minStrength >= 3) {
		requirements.push('At least one number');
	}
	if (minStrength >= 4) {
		requirements.push('At least one special character');
	}

	return {
		minimumLength: minLength,
		minimumStrength: minStrength,
		requirements: requirements,
	};
};

// ==========================================
// SESSION INFO
// ==========================================

Auth.getCurrentUser = async (caller) => {
	if (!caller.uid) {
		throw new Error('Not authenticated');
	}

	// Use NodeBB's getUserData method
	const userData = await user.getUserData(caller.uid);
	const organizations = await membership.getUserOrganizations(caller.uid);

	return {
		uid: userData.uid,
		username: userData.username,
		userslug: userData.userslug,
		email: userData.email,
		'email:confirmed': userData['email:confirmed'],
		picture: userData.picture,
		fullname: userData.fullname,
		birthday: userData.birthday,
		status: userData.status,
		reputation: userData.reputation,
		postcount: userData.postcount,
		topiccount: userData.topiccount,
		joindate: userData.joindate,
		lastonline: userData.lastonline,
		organizations
	};
};

// ==========================================
// GOOGLE OAUTH
// ==========================================

Auth.checkGoogleLinkStatus = async (caller) => {
	if (!caller.uid) {
		throw new Error('Not authenticated');
	}

	// Check if user has Google OAuth linked
	const googleId = await db.getObjectField(`user:${caller.uid}`, 'googleid');

	return {
		success: true,
		linked: !!googleId,
		provider: 'google',
	};
};

Auth.unlinkGoogle = async (caller) => {
	if (!caller.uid) {
		throw new Error('Not authenticated');
	}

	const googleId = await db.getObjectField(`user:${caller.uid}`, 'googleid');

	if (googleId) {
		await db.deleteObjectField('googleid:uid', googleId);
		await db.deleteObjectField(`user:${caller.uid}`, 'googleid');
	}

	return {
		success: true,
		message: 'Google account unlinked successfully',
	};
};