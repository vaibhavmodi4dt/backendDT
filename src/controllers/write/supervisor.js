'use strict';

const supervisorApi = require('../../api/supervisor');

const supervisorController = module.exports;

supervisorController.getDashboard = async (req, res) => {
    try {
        const data = await supervisorApi.getDashboard(req, {
            deptId: req.params.deptId,
            weekStart: req.params.weekStart,
            uid: req.params.uid, // optional path parameter for specific member
        });
        res.json(data);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

supervisorController.getReports = async (req, res) => {
    try {
        const data = await supervisorApi.getReports(req, {
            deptId: req.params.deptId,
            weekStart: req.params.weekStart,
            type: req.params.type,
            uid: req.params.uid, // optional path param
        });
        res.json(data);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

supervisorController.updateMemberRubric = async (req, res) => {
    try {
        const data = await supervisorApi.updateMemberRubric(req, {
            deptId: req.params.deptId,
            uid: req.params.uid,
            weekStart: req.params.weekStart,
            rubricData: req.body,
        });
        res.json(data);
    } catch (err) {
        const statusCode = err.message.includes('not-found') ? 404 :
            err.message.includes('no-permission') ? 403 : 400;
        res.status(statusCode).json({ error: err.message });
    }
};