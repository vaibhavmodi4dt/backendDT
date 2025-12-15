'use strict';

module.exports = function (module) {
	const helpers = require('./helpers');
	const cache = require('../cache').create('mongo');

	module.objectCache = cache;

	// Helper to get collection name with default fallback
	function getCollectionName(options) {
		return (options && options.collection) || 'objects';
	}

	// Helper to generate cache key with collection prefix
	function getCacheKey(key, collection) {
		return collection === 'objects' ? key : `${collection}:${key}`;
	}

	module.setObject = async function (key, data, options = {}) {
		const isArray = Array.isArray(key);
		if (!key || !data || (isArray && !key.length)) {
			return;
		}

		const collectionName = getCollectionName(options);
		const writeData = helpers.serializeData(data);
		if (!Object.keys(writeData).length) {
			return;
		}
		try {
			if (isArray) {
				const bulk = module.client.collection(collectionName).initializeUnorderedBulkOp();
				key.forEach(key => bulk.find({ _key: key }).upsert().updateOne({ $set: writeData }));
				await bulk.execute();
			} else {
				await module.client.collection(collectionName).updateOne({ _key: key }, { $set: writeData }, { upsert: true });
			}
		} catch (err) {
			if (err && err.message.includes('E11000 duplicate key error')) {
				console.log(new Error('e11000').stack, key, data);
				return await module.setObject(key, data, options);
			}
			throw err;
		}

		// Cache with collection-aware keys
		if (isArray) {
			cache.del(key.map(k => getCacheKey(k, collectionName)));
		} else {
			cache.del(getCacheKey(key, collectionName));
		}
	};

	module.setObjectBulk = async function (...args) {
		let data = args[0];
		let options = args[2] || {};
		
		if (!Array.isArray(data) || !data.length) {
			return;
		}
		if (Array.isArray(args[1])) {
			console.warn('[deprecated] db.setObjectBulk(keys, data) usage is deprecated, please use db.setObjectBulk(data)');
			// convert old format to new format for backwards compatibility
			data = args[0].map((key, i) => [key, args[1][i]]);
			options = args[2] || {};
		}

		const collectionName = getCollectionName(options);

		try {
			let bulk;
			data.forEach((item) => {
				const writeData = helpers.serializeData(item[1]);
				if (Object.keys(writeData).length) {
					if (!bulk) {
						bulk = module.client.collection(collectionName).initializeUnorderedBulkOp();
					}
					bulk.find({ _key: item[0] }).upsert().updateOne({ $set: writeData });
				}
			});
			if (bulk) {
				await bulk.execute();
			}
		} catch (err) {
			if (err && err.message.includes('E11000 duplicate key error')) {
				console.log(new Error('e11000').stack, data);
				return await module.setObjectBulk(data, options);
			}
			throw err;
		}

		cache.del(data.map(item => getCacheKey(item[0], collectionName)));
	};

	module.setObjectField = async function (key, field, value, options = {}) {
		if (!field) {
			return;
		}
		const data = {};
		data[field] = value;
		await module.setObject(key, data, options);
	};

	module.getObject = async function (key, fields = [], options = {}) {
		if (!key) {
			return null;
		}

		const data = await module.getObjects([key], fields, options);
		return data && data.length ? data[0] : null;
	};

	module.getObjects = async function (keys, fields = [], options = {}) {
		return await module.getObjectsFields(keys, fields, options);
	};

	module.getObjectField = async function (key, field, options = {}) {
		if (!key || !field) {
			return null;
		}

		const collectionName = getCollectionName(options);
		const cacheKey = getCacheKey(key, collectionName);

		const cachedData = {};
		cache.getUnCachedKeys([cacheKey], cachedData);
		if (cachedData[cacheKey]) {
			return cachedData[cacheKey].hasOwnProperty(field) ? cachedData[cacheKey][field] : null;
		}
		field = helpers.fieldToString(field);
		const item = await module.client.collection(collectionName).findOne({
			_key: key,
		}, {
			projection: { _id: 0, [field]: 1 },
		});
		if (!item) {
			return null;
		}
		return item.hasOwnProperty(field) ? item[field] : null;
	};

	module.getObjectFields = async function (key, fields, options = {}) {
		if (!key) {
			return null;
		}
		const data = await module.getObjectsFields([key], fields, options);
		return data ? data[0] : null;
	};

	module.getObjectsFields = async function (keys, fields, options = {}) {
		if (!Array.isArray(keys) || !keys.length) {
			return [];
		}

		const collectionName = getCollectionName(options);
		const cacheKeys = keys.map(k => getCacheKey(k, collectionName));

		const cachedData = {};
		const unCachedKeys = cache.getUnCachedKeys(cacheKeys, cachedData);

		if (unCachedKeys.length >= 1) {
			// Extract original keys from cache keys
			const originalKeys = unCachedKeys.map(ck => 
				collectionName === 'objects' ? ck : ck.replace(`${collectionName}:`, '')
			);

			let data = await module.client.collection(collectionName).find(
				{ _key: originalKeys.length === 1 ? originalKeys[0] : { $in: originalKeys } },
				{ projection: { _id: 0 } }
			).toArray();
			data = data.map(helpers.deserializeData);

			const map = helpers.toMap(data);
			originalKeys.forEach((key, idx) => {
				const cacheKey = unCachedKeys[idx];
				cachedData[cacheKey] = map[key] || null;
				cache.set(cacheKey, cachedData[cacheKey]);
			});
		}

		if (!Array.isArray(fields) || !fields.length) {
			return cacheKeys.map(ck => (cachedData[ck] ? { ...cachedData[ck] } : null));
		}
		return cacheKeys.map((ck) => {
			const item = cachedData[ck] || {};
			const result = {};
			fields.forEach((field) => {
				result[field] = item[field] !== undefined ? item[field] : null;
			});
			return result;
		});
	};

	module.getObjectKeys = async function (key, options = {}) {
		const data = await module.getObject(key, [], options);
		return data ? Object.keys(data) : [];
	};

	module.getObjectValues = async function (key, options = {}) {
		const data = await module.getObject(key, [], options);
		return data ? Object.values(data) : [];
	};

	module.isObjectField = async function (key, field, options = {}) {
		const data = await module.isObjectFields(key, [field], options);
		return Array.isArray(data) && data.length ? data[0] : false;
	};

	module.isObjectFields = async function (key, fields, options = {}) {
		if (!key) {
			return;
		}

		const collectionName = getCollectionName(options);

		const data = {};
		fields = fields.map((field) => {
			field = helpers.fieldToString(field);
			if (field) {
				data[field] = 1;
			}
			return field;
		});

		const item = await module.client.collection(collectionName).findOne({ _key: key }, { projection: data });
		const results = fields.map(f => !!item && item[f] !== undefined && item[f] !== null);
		return results;
	};

	module.deleteObjectField = async function (key, field, options = {}) {
		await module.deleteObjectFields(key, Array.isArray(field) ? field : [field], options);
	};

	module.deleteObjectFields = async function (key, fields, options = {}) {
		if (!key || (Array.isArray(key) && !key.length) || !Array.isArray(fields) || !fields.length) {
			return;
		}

		const collectionName = getCollectionName(options);

		fields = fields.map(helpers.fieldToString).filter(Boolean);
		if (!fields.length) {
			return;
		}

		const data = {};
		fields.forEach((field) => {
			data[field] = '';
		});
		if (Array.isArray(key)) {
			await module.client.collection(collectionName).updateMany({ _key: { $in: key } }, { $unset: data });
			cache.del(key.map(k => getCacheKey(k, collectionName)));
		} else {
			await module.client.collection(collectionName).updateOne({ _key: key }, { $unset: data });
			cache.del(getCacheKey(key, collectionName));
		}
	};

	module.incrObjectField = async function (key, field, options = {}) {
		return await module.incrObjectFieldBy(key, field, 1, options);
	};

	module.decrObjectField = async function (key, field, options = {}) {
		return await module.incrObjectFieldBy(key, field, -1, options);
	};

	module.incrObjectFieldBy = async function (key, field, value, options = {}) {
		value = parseInt(value, 10);
		if (!key || isNaN(value)) {
			return null;
		}

		const collectionName = getCollectionName(options);

		const increment = {};
		field = helpers.fieldToString(field);
		increment[field] = value;

		if (Array.isArray(key)) {
			const bulk = module.client.collection(collectionName).initializeUnorderedBulkOp();
			key.forEach((key) => {
				bulk.find({ _key: key }).upsert().update({ $inc: increment });
			});
			await bulk.execute();
			cache.del(key.map(k => getCacheKey(k, collectionName)));
			const result = await module.getObjectsFields(key, [field], options);
			return result.map(data => data && data[field]);
		}
		try {
			const result = await module.client.collection(collectionName).findOneAndUpdate({
				_key: key,
			}, {
				$inc: increment,
			}, {
				returnDocument: 'after',
				includeResultMetadata: true,
				upsert: true,
			});
			cache.del(getCacheKey(key, collectionName));
			return result && result.value ? result.value[field] : null;
		} catch (err) {
			// if there is duplicate key error retry the upsert
			// https://github.com/NodeBB/NodeBB/issues/4467
			// https://jira.mongodb.org/browse/SERVER-14322
			// https://docs.mongodb.org/manual/reference/command/findAndModify/#upsert-and-unique-index
			if (err && err.message.includes('E11000 duplicate key error')) {
				console.log(new Error('e11000').stack, key, field, value);
				return await module.incrObjectFieldBy(key, field, value, options);
			}
			throw err;
		}
	};

	module.incrObjectFieldByBulk = async function (data, options = {}) {
		if (!Array.isArray(data) || !data.length) {
			return;
		}

		const collectionName = getCollectionName(options);

		const bulk = module.client.collection(collectionName).initializeUnorderedBulkOp();

		data.forEach((item) => {
			const increment = {};
			for (const [field, value] of Object.entries(item[1])) {
				increment[helpers.fieldToString(field)] = value;
			}
			bulk.find({ _key: item[0] }).upsert().update({ $inc: increment });
		});
		await bulk.execute();
		cache.del(data.map(item => getCacheKey(item[0], collectionName)));
	};
};