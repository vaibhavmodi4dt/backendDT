'use strict';

const api = require('../../api');
const helpers = require('../helpers');

const SD = module.exports;

// Topics
SD.createTopic = async (req, res) => {
	helpers.formatApiResponse(200, res, await api.sd.createTopic(req, req.body));
};

SD.getActiveTopic = async (req, res) => {
	helpers.formatApiResponse(200, res, await api.sd.getActiveTopic(req));
};

SD.getTopicById = async (req, res) => {
	helpers.formatApiResponse(200, res, await api.sd.getTopicById(req, req.params.id));
};

SD.listTopics = async (req, res) => {
	helpers.formatApiResponse(200, res, await api.sd.listTopics(req, req.params.weekStart));
};

SD.updateTopic = async (req, res) => {
	helpers.formatApiResponse(200, res, await api.sd.updateTopic(req, req.params.id, req.body));
};

SD.deleteTopic = async (req, res) => {
	helpers.formatApiResponse(200, res, await api.sd.deleteTopic(req, req.params.id));
};

// Pitches
SD.createPitch = async (req, res) => {
	helpers.formatApiResponse(200, res, await api.sd.createPitch(req, req.body));
};

SD.getPitchById = async (req, res) => {
	helpers.formatApiResponse(200, res, await api.sd.getPitchById(req, req.params.id));
};

SD.listPitchesByTopic = async (req, res) => {
	helpers.formatApiResponse(200, res, await api.sd.listPitchesByTopic(req, req.params.topicId, req.params.weekStart));
};

SD.getMyPitch = async (req, res) => {
	helpers.formatApiResponse(200, res, await api.sd.getMyPitch(req, req.params.topicId));
};

SD.updatePitch = async (req, res) => {
	helpers.formatApiResponse(200, res, await api.sd.updatePitch(req, req.params.id, req.body));
};

SD.deletePitch = async (req, res) => {
	helpers.formatApiResponse(200, res, await api.sd.deletePitch(req, req.params.id));
};
