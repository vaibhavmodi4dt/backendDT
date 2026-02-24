'use strict';

const helpers = module.exports;
const utils = require('../../utils');

helpers.noop = function () {};

helpers.toMap = function (data) {
	const map = {};
	for (let i = 0; i < data.length; i += 1) {
		map[data[i]._key] = data[i];
		delete data[i]._key;
	}
	return map;
};

helpers.fieldToString = function (field) {
	if (field === null || field === undefined) {
		return field;
	}

	if (typeof field !== 'string') {
		field = field.toString();
	}
	// if there is a '.' in the field name it inserts subdocument in mongo, replace '.'s with \uff0E
	// replace $ with \uff04 so we can use $ in document fields
	return field.replace(/\./g, '\uff0E')
		.replace(/\$/g, '\uFF04');
};

helpers.serializeData = function (data) {
	const serialized = {};
	for (const [field, value] of Object.entries(data)) {
		if (field !== '') {
			serialized[helpers.fieldToString(field)] = value;
		}
	}
	return serialized;
};

helpers.deserializeData = function (data) {
	const deserialized = {};
	for (const [field, value] of Object.entries(data)) {
		deserialized[field.replace(/\uff0E/g, '.')] = value;
	}
	return deserialized;
};

helpers.valueToString = function (value) {
	return String(value);
};

helpers.buildMatchQuery = function (match) {
	// Check if there are wildcards in the middle of the pattern
	const trimmedMatch = match.replace(/^\*/, '').replace(/\*$/, '');
	const hasMiddleWildcard = trimmedMatch.includes('*');

	if (hasMiddleWildcard) {
		// New logic: Handle wildcards anywhere in the pattern
		const parts = match.split('*');
		const escapedParts = parts.map(part => utils.escapeRegexChars(part));
		let _match = escapedParts.join('.*');

		if (!match.startsWith('*')) {
			_match = `^${_match}`;
		}
		if (!match.endsWith('*')) {
			_match += '$';
		}
		return _match;
	} else {
		// Original logic: Only wildcards at start/end
		let _match = match;
		if (match.startsWith('*')) {
			_match = _match.substring(1);
		}
		if (match.endsWith('*')) {
			_match = _match.substring(0, _match.length - 1);
		}
		_match = utils.escapeRegexChars(_match);
		if (!match.startsWith('*')) {
			_match = `^${_match}`;
		}
		if (!match.endsWith('*')) {
			_match += '$';
		}
		return _match;
	}
};
