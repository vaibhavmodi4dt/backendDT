'use strict';

const api = require('../../api');
const helpers = require('../helpers');

const Pitch = module.exports;

// ==========================================
// CREATE
// ==========================================

Pitch.create = async (req, res) => {
    helpers.formatApiResponse(
        200,
        res,
        await api.pitch.create(req, req.body)
    );
};

// ==========================================
// GET BY ID
// ==========================================

Pitch.get = async (req, res) => {
    helpers.formatApiResponse(
        200,
        res,
        await api.pitch.get(req, { id: req.params.id })
    );
};

// ==========================================
// LIST (User's Pitches)
// ==========================================

Pitch.list = async (req, res) => {
    helpers.formatApiResponse(
        200,
        res,
        await api.pitch.list(req, {
            page: req.query.page,
            limit: req.query.limit,
        })
    );
};

// ==========================================
// LIST ALL (Global)
// ==========================================

Pitch.listAll = async (req, res) => {
    helpers.formatApiResponse(
        200,
        res,
        await api.pitch.listAll(req, {
            page: req.query.page,
            limit: req.query.limit,
        })
    );
};

// ==========================================
// UPDATE
// ==========================================

Pitch.update = async (req, res) => {
    helpers.formatApiResponse(
        200,
        res,
        await api.pitch.update(req, {
            id: req.params.id,
            ...req.body,
        })
    );
};

// ==========================================
// DELETE
// ==========================================

Pitch.delete = async (req, res) => {
    helpers.formatApiResponse(
        200,
        res,
        await api.pitch.delete(req, { id: req.params.id })
    );
};

// ==========================================
// DUPLICATE
// ==========================================

Pitch.duplicate = async (req, res) => {
    helpers.formatApiResponse(
        200,
        res,
        await api.pitch.duplicate(req, { id: req.params.id })
    );
};