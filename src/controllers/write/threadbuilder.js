'use strict';

const api = require('../../api');
const helpers = require('../helpers');

const ThreadBuilder = module.exports;

// ==========================================
// CREATE
// ==========================================

ThreadBuilder.create = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.threadbuilder.create(req, req.body)
	);
};

// ==========================================
// GET BY ID
// ==========================================

ThreadBuilder.get = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.threadbuilder.get(req, { id: req.params.id })
	);
};

// ==========================================
// LIST (User's ThreadBuilders)
// ==========================================

ThreadBuilder.list = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.threadbuilder.list(req, {
			page: req.query.page,
			limit: req.query.limit,
		})
	);
};

// ==========================================
// LIST ALL (Global)
// ==========================================

ThreadBuilder.listAll = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.threadbuilder.listAll(req, {
			page: req.query.page,
			limit: req.query.limit,
		})
	);
};

// ==========================================
// UPDATE
// ==========================================

ThreadBuilder.update = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.threadbuilder.update(req, {
			id: req.params.id,
			...req.body,
		})
	);
};

// ==========================================
// DELETE
// ==========================================

ThreadBuilder.delete = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.threadbuilder.delete(req, { id: req.params.id })
	);
};

// ==========================================
// DUPLICATE
// ==========================================

ThreadBuilder.duplicate = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.threadbuilder.duplicate(req, { id: req.params.id })
	);
};