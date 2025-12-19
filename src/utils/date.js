'use strict';

/**
 * Date Utilities for NodeBB
 * Wrapper around date-fns for consistent date handling
 * 
 * Install: npm install date-fns --save
 */

const {
	format,
	formatDistance,
	formatRelative,
	isValid,
	parseISO,
	addDays,
	addMonths,
	subDays,
	startOfDay,
	endOfDay,
	startOfMonth,
	endOfMonth,
	isSameDay,
	differenceInDays,
	differenceInHours,
} = require('date-fns');

const DateUtils = module.exports;

/**
 * Convert timestamp to ISO string
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} ISO date string
 */
DateUtils.toISO = function (timestamp) {
	if (!timestamp) return null;
	try {
		const date = new Date(timestamp);
		return isValid(date) ? date.toISOString() : null;
	} catch (err) {
		return null;
	}   
};

/**
 * Convert timestamp to formatted date string
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @param {string} formatStr - Format string (default: 'yyyy-MM-dd HH:mm:ss')
 * @returns {string} Formatted date string
 */
DateUtils.format = function (timestamp, formatStr = 'yyyy-MM-dd HH:mm:ss') {
	if (!timestamp) return null;
	try {
		const date = new Date(timestamp);
		return isValid(date) ? format(date, formatStr) : null;
	} catch (err) {
		return null;
	}
};

/**
 * Format timestamp as "X days ago", "2 hours ago", etc.
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Relative time string
 */
DateUtils.fromNow = function (timestamp) {
	if (!timestamp) return null;
	try {
		const date = new Date(timestamp);
		return isValid(date) ? formatDistance(date, new Date(), { addSuffix: true }) : null;
	} catch (err) {
		return null;
	}
};

/**
 * Format timestamp relative to now (e.g., "yesterday at 3:20 PM")
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Relative date string
 */
DateUtils.relative = function (timestamp) {
	if (!timestamp) return null;
	try {
		const date = new Date(timestamp);
		return isValid(date) ? formatRelative(date, new Date()) : null;
	} catch (err) {
		return null;
	}
};

/**
 * Get current timestamp
 * @returns {number} Current timestamp in milliseconds
 */
DateUtils.now = function () {
	return Date.now();
};

/**
 * Get current timestamp in seconds (Unix timestamp)
 * @returns {number} Current timestamp in seconds
 */
DateUtils.nowInSeconds = function () {
	return Math.floor(Date.now() / 1000);
};

/**
 * Convert seconds to milliseconds
 * @param {number} seconds - Unix timestamp in seconds
 * @returns {number} Timestamp in milliseconds
 */
DateUtils.secondsToMs = function (seconds) {
	return seconds * 1000;
};

/**
 * Convert milliseconds to seconds
 * @param {number} ms - Timestamp in milliseconds
 * @returns {number} Timestamp in seconds
 */
DateUtils.msToSeconds = function (ms) {
	return Math.floor(ms / 1000);
};

/**
 * Parse ISO string to timestamp
 * @param {string} isoString - ISO date string
 * @returns {number} Timestamp in milliseconds
 */
DateUtils.parseISO = function (isoString) {
	if (!isoString) return null;
	try {
		const date = parseISO(isoString);
		return isValid(date) ? date.getTime() : null;
	} catch (err) {
		return null;
	}
};

/**
 * Check if timestamp is in the past
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {boolean} True if in the past
 */
DateUtils.isPast = function (timestamp) {
	if (!timestamp) return false;
	return timestamp < Date.now();
};

/**
 * Check if timestamp is in the future
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {boolean} True if in the future
 */
DateUtils.isFuture = function (timestamp) {
	if (!timestamp) return false;
	return timestamp > Date.now();
};

/**
 * Add days to timestamp
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @param {number} days - Number of days to add
 * @returns {number} New timestamp
 */
DateUtils.addDays = function (timestamp, days) {
	if (!timestamp) return null;
	const date = addDays(new Date(timestamp), days);
	return date.getTime();
};

/**
 * Add months to timestamp
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @param {number} months - Number of months to add
 * @returns {number} New timestamp
 */
DateUtils.addMonths = function (timestamp, months) {
	if (!timestamp) return null;
	const date = addMonths(new Date(timestamp), months);
	return date.getTime();
};

/**
 * Subtract days from timestamp
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @param {number} days - Number of days to subtract
 * @returns {number} New timestamp
 */
DateUtils.subDays = function (timestamp, days) {
	if (!timestamp) return null;
	const date = subDays(new Date(timestamp), days);
	return date.getTime();
};

/**
 * Get start of day
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {number} Start of day timestamp
 */
DateUtils.startOfDay = function (timestamp) {
	if (!timestamp) return null;
	const date = startOfDay(new Date(timestamp));
	return date.getTime();
};

/**
 * Get end of day
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {number} End of day timestamp
 */
DateUtils.endOfDay = function (timestamp) {
	if (!timestamp) return null;
	const date = endOfDay(new Date(timestamp));
	return date.getTime();
};

/**
 * Get start of month
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {number} Start of month timestamp
 */
DateUtils.startOfMonth = function (timestamp) {
	if (!timestamp) return null;
	const date = startOfMonth(new Date(timestamp));
	return date.getTime();
};

/**
 * Get end of month
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {number} End of month timestamp
 */
DateUtils.endOfMonth = function (timestamp) {
	if (!timestamp) return null;
	const date = endOfMonth(new Date(timestamp));
	return date.getTime();
};

/**
 * Calculate difference in days between two timestamps
 * @param {number} timestamp1 - First timestamp
 * @param {number} timestamp2 - Second timestamp
 * @returns {number} Difference in days
 */
DateUtils.diffInDays = function (timestamp1, timestamp2) {
	if (!timestamp1 || !timestamp2) return null;
	return differenceInDays(new Date(timestamp1), new Date(timestamp2));
};

/**
 * Calculate difference in hours between two timestamps
 * @param {number} timestamp1 - First timestamp
 * @param {number} timestamp2 - Second timestamp
 * @returns {number} Difference in hours
 */
DateUtils.diffInHours = function (timestamp1, timestamp2) {
	if (!timestamp1 || !timestamp2) return null;
	return differenceInHours(new Date(timestamp1), new Date(timestamp2));
};

/**
 * Check if two timestamps are on the same day
 * @param {number} timestamp1 - First timestamp
 * @param {number} timestamp2 - Second timestamp
 * @returns {boolean} True if same day
 */
DateUtils.isSameDay = function (timestamp1, timestamp2) {
	if (!timestamp1 || !timestamp2) return false;
	return isSameDay(new Date(timestamp1), new Date(timestamp2));
};

/**
 * Validate if timestamp is valid
 * @param {number} timestamp - Timestamp to validate
 * @returns {boolean} True if valid
 */
DateUtils.isValid = function (timestamp) {
	if (!timestamp) return false;
	return isValid(new Date(timestamp));
};

/**
 * Common date formats
 */
DateUtils.formats = {
	ISO: 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'',
	DATE: 'yyyy-MM-dd',
	TIME: 'HH:mm:ss',
	DATETIME: 'yyyy-MM-dd HH:mm:ss',
	FULL: 'EEEE, MMMM do, yyyy',
	SHORT: 'MMM d, yyyy',
	MONTH_YEAR: 'MMMM yyyy',
};