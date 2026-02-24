'use strict';

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const nconf = require('nconf');
const user = require('../user');
const db = require('../database');
const authenticationController = require('./authentication');
const helpers = require('./helpers');

const GoogleAuthController = module.exports;

// Initialize Google OAuth Strategy
GoogleAuthController.init = async function () {
    console.log('🔵 [Google OAuth] Starting initialization...');
    
    const googleConfig = nconf.get('google');
    
    console.log('🔵 [Google OAuth] Config check:', {
        hasConfig: !!googleConfig,
        hasClientID: !!googleConfig?.clientID,
        hasClientSecret: !!googleConfig?.clientSecret,
        hasCallbackURL: !!googleConfig?.callbackURL,
        callbackURL: googleConfig?.callbackURL
    });
    
    if (!googleConfig || !googleConfig.clientID || !googleConfig.clientSecret) {
        console.warn('⚠️ [Google OAuth] Google OAuth credentials not configured');
        return;
    }

    console.log('🔵 [Google OAuth] Registering Passport Google Strategy...');
    
    // ✅ Callback URL points to FRONTEND
    const frontendCallbackUrl = nconf.get('app_url');;
    console.log('🔵 [Google OAuth] Callback URL (via frontend):', frontendCallbackUrl);

    passport.use(new GoogleStrategy({
        clientID: googleConfig.clientID,
        clientSecret: googleConfig.clientSecret,
        callbackURL: googleConfig.callbackURL || frontendCallbackUrl,
        passReqToCallback: true,
    }, async (req, accessToken, refreshToken, profile, done) => {
        console.log('🟢 [Google OAuth] Strategy callback invoked');
        console.log('🟢 [Google OAuth] Profile ID:', profile.id);
        console.log('🟢 [Google OAuth] Profile emails:', profile.emails);
        
        try {
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
            
            if (!email) {
                console.error('❌ [Google OAuth] No email provided by Google');
                return done(new Error('No email provided by Google'));
            }

            // Check if user exists by Google ID
            let uid = await db.getObjectField('googleid:uid', profile.id);

            if (!uid) {
                // Check if user exists by email
                uid = await user.getUidByEmail(email);
            }

            if (uid) {
                console.log('✅ [Google OAuth] Existing user found, UID:', uid);
                
                // Link Google ID if not already linked
                await db.setObjectField('googleid:uid', profile.id, uid);
                await db.setObjectField(`user:${uid}`, 'googleid', profile.id);
                
                return done(null, { uid });
            }

            // Create new user
            console.log('🔵 [Google OAuth] Creating new user...');
            const username = await generateUniqueUsername(profile);
            
            uid = await user.create({
                username: username,
                email: email,
                fullname: profile.displayName,
                picture: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
            });

            console.log('✅ [Google OAuth] New user created, UID:', uid);

            // Link Google ID
            await db.setObjectField('googleid:uid', profile.id, uid);
            await db.setObjectField(`user:${uid}`, 'googleid', profile.id);

            // Set user as email confirmed
            await user.setUserField(uid, 'email:confirmed', 1);

            return done(null, { uid });
        } catch (err) {
            console.error('❌ [Google OAuth] Error in strategy callback:', err);
            return done(err);
        }
    }));
    
    console.log('✅ [Google OAuth] Strategy registered successfully');
};

// Generate unique username from Google profile
async function generateUniqueUsername(profile) {
    let username = profile.displayName || profile.emails[0].value.split('@')[0];
    username = username.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
    
    if (username.length < 3) {
        username = `user${username}`;
    }
    if (username.length > 20) {
        username = username.substring(0, 20);
    }

    let exists = await user.existsBySlug(username);
    let counter = 1;
    let testUsername = username;
    
    while (exists) {
        testUsername = `${username}${counter}`;
        if (testUsername.length > 20) {
            testUsername = `${username.substring(0, 17)}${counter}`;
        }
        exists = await user.existsBySlug(testUsername);
        counter++;
    }

    return testUsername;
}

// API Endpoint: Initiate Google OAuth
GoogleAuthController.login = function (req, res, next) {
    console.log('🔵 [Google OAuth] Login endpoint called');
    
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        accessType: 'offline',
        prompt: 'select_account',
    })(req, res, next);
};

// ✅ API Endpoint: Exchange code for user
// Called via API (fetch) from the callback page
// Query params come from frontend API call, not from browser redirect
GoogleAuthController.callback = function (req, res, next) {
    console.log('🟢 [Google OAuth] Callback endpoint called');
    console.log('🟢 [Google OAuth] Request method:', req.method);
    console.log('🟢 [Google OAuth] Query params:', req.query);
    console.log('🟢 [Google OAuth] Has code:', !!req.query.code);
    console.log('🟢 [Google OAuth] Has error:', !!req.query.error);
    
    if (req.query.error) {
        console.error('❌ [Google OAuth] Error from Google:', req.query.error);
        
        return helpers.formatApiResponse(400, res, {
            error: 'Google OAuth Error',
            message: req.query.error_description || req.query.error,
        });
    }
    
    if (!req.query.code) {
        console.error('❌ [Google OAuth] No code provided');
        
        return helpers.formatApiResponse(400, res, {
            error: 'Missing authorization code',
            message: 'No authorization code received from Google',
        });
    }
    
    // ✅ Set up the response handler (same as utilities.login)
    res.locals.redirectAfterLogin = async (req, res) => {
        console.log('✅ [Google OAuth] Login successful, returning user data');
        
        // Get full user data (same as utilities.login)
        const userData = (await user.getUsers([req.uid], req.uid)).pop();
        
        // Return user data as JSON
        // Session cookie is already set by authenticationController.doLogin
        helpers.formatApiResponse(200, res, userData);
    };
    
    res.locals.noScriptErrors = (req, res, err, statusCode) => {
        console.error('❌ [Google OAuth] Error in login flow:', err);
        helpers.formatApiResponse(statusCode, res, new Error(err));
    };
    
    console.log('🟢 [Google OAuth] Starting Passport authentication...');
    
    // ✅ Reconstruct the callback URL with query parameters
    // This is needed because we're being called via API, not browser redirect
    // Passport needs the full callback URL to exchange the code
    const callbackUrl = `http://localhost:4000/auth/verify?code=${req.query.code}`;
    if (req.query.scope) {
        // Passport will use req.query automatically, we just need to ensure it's there
    }
    
    // Authenticate with Google strategy
    passport.authenticate('google', async (err, userData, info) => {
        console.log('🟢 [Google OAuth] Passport authenticate callback invoked');
        
        if (err) {
            console.error('❌ [Google OAuth] Authentication error:', err);
            return res.locals.noScriptErrors(req, res, err.message, 500);
        }

        if (!userData || !userData.uid) {
            console.error('❌ [Google OAuth] No user data returned');
            return res.locals.noScriptErrors(req, res, 'Unable to authenticate with Google', 401);
        }

        try {
            console.log('🔵 [Google OAuth] User authenticated, UID:', userData.uid);
            console.log('🔵 [Google OAuth] Logging in user via authenticationController.doLogin()...');
            
            // ✅ Use the same login flow as standard authentication
            // This sets req.uid and creates the session
            // Session cookie will be set WITHOUT HttpOnly flag (same as standard login)
            await authenticationController.doLogin(req, userData.uid);
            
            console.log('✅ [Google OAuth] User logged in successfully');
            console.log('🔵 [Google OAuth] Calling redirectAfterLogin to return user data...');
            
            // ✅ Call the response handler (returns JSON with user data)
            res.locals.redirectAfterLogin(req, res);
            
        } catch (loginErr) {
            console.error('❌ [Google OAuth] Login error:', loginErr);
            res.locals.noScriptErrors(req, res, loginErr.message, 500);
        }
    })(req, res, next);
};

// API Endpoint: Verify session
GoogleAuthController.verify = async function (req, res) {
    console.log('🔵 [Google OAuth] Verify endpoint called');
    
    if (!req.user || !req.user.uid) {
        console.log('⚠️ [Google OAuth] No user in session');
        return helpers.formatApiResponse(401, res, {
            error: 'Not authenticated',
        });
    }

    try {
        const userData = await user.getUserData(req.user.uid);
        
        helpers.formatApiResponse(200, res, {
            status: 'ok',
            user: {
                uid: userData.uid,
                username: userData.username,
                email: userData.email,
                picture: userData.picture,
                fullname: userData.fullname,
            },
        });
    } catch (err) {
        console.error('❌ [Google OAuth] Error getting user data:', err);
        helpers.formatApiResponse(500, res, {
            error: 'Failed to get user data',
            message: err.message,
        });
    }
};

// API Endpoint: Unlink Google account
GoogleAuthController.unlink = async function (req, res) {
    console.log('🔵 [Google OAuth] Unlink endpoint called');
    
    if (!req.user || !req.user.uid) {
        return helpers.formatApiResponse(401, res, {
            error: 'Not authenticated',
        });
    }

    try {
        const googleId = await db.getObjectField(`user:${req.user.uid}`, 'googleid');
        
        if (googleId) {
            await db.deleteObjectField('googleid:uid', googleId);
            await db.deleteObjectField(`user:${req.user.uid}`, 'googleid');
        }

        helpers.formatApiResponse(200, res, {
            status: 'ok',
            message: 'Google account unlinked',
        });
    } catch (err) {
        console.error('❌ [Google OAuth] Error unlinking account:', err);
        helpers.formatApiResponse(500, res, {
            error: 'Failed to unlink Google account',
            message: err.message,
        });
    }
};