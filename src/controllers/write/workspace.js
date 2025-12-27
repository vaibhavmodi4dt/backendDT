'use strict';

const api = require('../../api');
const helpers = require('../helpers');

const Workspaces = module.exports;

// ==========================================
// CREATE
// ==========================================

Workspaces.create = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.workspace.create(req, req.body)
	);
};

// ==========================================
// GET BY ID
// ==========================================

Workspaces.get = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.workspace.get(req, { id: req.params.id })
	);
};

// ==========================================
// LIST (Created by me)
// ==========================================

Workspaces.list = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.workspace.list(req, {
			page: req.query.page,
			limit: req.query.limit,
		})
	);
};

// ==========================================
// LIST JOINED
// ==========================================

Workspaces.listJoined = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.workspace.listJoined(req, {
			page: req.query.page,
			limit: req.query.limit,
		})
	);
};

// ==========================================
// UPDATE
// ==========================================

Workspaces.update = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.workspace.update(req, {
			id: req.params.id,
			...req.body,
		})
	);
};

// ==========================================
// STOP
// ==========================================

Workspaces.stop = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.workspace.stop(req, { id: req.params.id })
	);
};

// ==========================================
// DELETE
// ==========================================

Workspaces.delete = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.workspace.delete(req, { id: req.params.id })
	);
};

// ==========================================
// JOIN (via invite token)
// ==========================================

Workspaces.join = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.workspace.join(req, { token: req.params.token })
	);
};

// ==========================================
// LEAVE
// ==========================================

Workspaces.leave = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.workspace.leave(req, { id: req.params.id })
	);
};

// ==========================================
// LINK ASSET
// ==========================================

Workspaces.linkAsset = async (req, res) => {
	helpers.formatApiResponse(
		200,
		res,
		await api.workspace.linkAsset(req, {
			id: req.params.id,
			...req.body,
		})
	);
};