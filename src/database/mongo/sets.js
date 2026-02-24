'use strict';

module.exports = function (module) {
	const _ = require('lodash');
	const helpers = require('./helpers');
	const { secureRandom } = require('../../utils');

	// Helper to get collection name with default fallback
	function getCollectionName(options) {
		return (options && options.collection) || 'objects';
	}

	module.setAdd = async function (key, value, options = {}) {
		if (!Array.isArray(value)) {
			value = [value];
		}
		if (!value.length) {
			return;
		}
		value = value.map(v => helpers.valueToString(v));

		const collectionName = getCollectionName(options);

		try {
			await module.client.collection(collectionName).updateOne({
				_key: key,
			}, {
				$addToSet: {
					members: {
						$each: value,
					},
				},
			}, {
				upsert: true,
			});
		} catch (err) {
			if (err && err.message.includes('E11000 duplicate key error')) {
				console.log(new Error('e11000').stack, key, value);
				return await module.setAdd(key, value, options);
			}
			throw err;
		}
	};

	module.setsAdd = async function (keys, value, options = {}) {
		if (!Array.isArray(keys) || !keys.length) {
			return;
		}

		if (!Array.isArray(value)) {
			value = [value];
		}

		value = value.map(v => helpers.valueToString(v));

		const collectionName = getCollectionName(options);

		const bulk = module.client.collection(collectionName).initializeUnorderedBulkOp();

		for (let i = 0; i < keys.length; i += 1) {
			bulk.find({ _key: keys[i] }).upsert().updateOne({
				$addToSet: {
					members: {
						$each: value,
					},
				},
			});
		}
		try {
			await bulk.execute();
		} catch (err) {
			if (err && err.message.includes('E11000 duplicate key error')) {
				console.log(new Error('e11000').stack, keys, value);
				return await module.setsAdd(keys, value, options);
			}
			throw err;
		}
	};

	module.setRemove = async function (key, value, options = {}) {
		if (!Array.isArray(value)) {
			value = [value];
		}

		value = value.map(v => helpers.valueToString(v));

		const collectionName = getCollectionName(options);

		await module.client.collection(collectionName).updateMany({
			_key: Array.isArray(key) ? { $in: key } : key,
		}, {
			$pullAll: { members: value },
		});
	};

	module.setsRemove = async function (keys, value, options = {}) {
		if (!Array.isArray(keys) || !keys.length) {
			return;
		}
		value = helpers.valueToString(value);

		const collectionName = getCollectionName(options);

		await module.client.collection(collectionName).updateMany({
			_key: { $in: keys },
		}, {
			$pull: { members: value },
		});
	};

	module.isSetMember = async function (key, value, options = {}) {
		if (!key) {
			return false;
		}
		value = helpers.valueToString(value);

		const collectionName = getCollectionName(options);

		const item = await module.client.collection(collectionName).findOne({
			_key: key, members: value,
		}, {
			projection: { _id: 0, members: 0 },
		});
		return item !== null && item !== undefined;
	};

	module.isSetMembers = async function (key, values, options = {}) {
		if (!key || !Array.isArray(values) || !values.length) {
			return [];
		}
		values = values.map(v => helpers.valueToString(v));

		const collectionName = getCollectionName(options);

		const result = await module.client.collection(collectionName).findOne({
			_key: key,
		}, {
			projection: { _id: 0, _key: 0 },
		});
		const membersSet = new Set(result && Array.isArray(result.members) ? result.members : []);
		return values.map(v => membersSet.has(v));
	};

	module.isMemberOfSets = async function (sets, value, options = {}) {
		if (!Array.isArray(sets) || !sets.length) {
			return [];
		}
		value = helpers.valueToString(value);

		const collectionName = getCollectionName(options);

		const result = await module.client.collection(collectionName).find({
			_key: { $in: sets }, members: value,
		}, {
			projection: { _id: 0, members: 0 },
		}).toArray();

		const map = {};
		result.forEach((item) => {
			map[item._key] = true;
		});

		return sets.map(set => !!map[set]);
	};

	module.getSetMembers = async function (key, options = {}) {
		if (!key) {
			return [];
		}

		const collectionName = getCollectionName(options);

		const data = await module.client.collection(collectionName).findOne({
			_key: key,
		}, {
			projection: { _id: 0, _key: 0 },
		});
		return data ? data.members : [];
	};

	module.getSetsMembers = async function (keys, options = {}) {
		if (!Array.isArray(keys) || !keys.length) {
			return [];
		}

		const collectionName = getCollectionName(options);

		const data = await module.client.collection(collectionName).find({
			_key: { $in: keys },
		}, {
			projection: { _id: 0 },
		}).toArray();

		const sets = {};
		data.forEach((set) => {
			sets[set._key] = set.members || [];
		});

		return keys.map(k => sets[k] || []);
	};

	module.setCount = async function (key, options = {}) {
		if (!key) {
			return 0;
		}

		const collectionName = getCollectionName(options);

		const data = await module.client.collection(collectionName).aggregate([
			{ $match: { _key: key } },
			{ $project: { _id: 0, count: { $size: '$members' } } },
		]).toArray();
		return Array.isArray(data) && data.length ? data[0].count : 0;
	};

	module.setsCount = async function (keys, options = {}) {
		const collectionName = getCollectionName(options);

		const data = await module.client.collection(collectionName).aggregate([
			{ $match: { _key: { $in: keys } } },
			{ $project: { _id: 0, _key: 1, count: { $size: '$members' } } },
		]).toArray();
		const map = _.keyBy(data, '_key');
		return keys.map(key => (map.hasOwnProperty(key) ? map[key].count : 0));
	};

	module.setRemoveRandom = async function (key, options = {}) {
		const collectionName = getCollectionName(options);

		const data = await module.client.collection(collectionName).findOne({ _key: key });
		if (!data) {
			return;
		}

		const randomIndex = secureRandom(0, data.members.length - 1);
		const value = data.members[randomIndex];
		await module.setRemove(data._key, value, options);
		return value;
	};
};