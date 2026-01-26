'use strict';

const supervisorApi = require('../../api/supervisor');

const supervisorController = module.exports;

supervisorController.getDashboard = async (req, res) => {
    try {
        const data = await supervisorApi.getDashboard(req, {
            deptId: req.params.deptId,
            weekStart: req.query.weekStart,
            uid: req.query.uid,
        });
        res.json(data);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

supervisorController.getReports = async (req, res) => {
    try {
        const data = await supervisorApi.getReports(req, req.query);
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
            weekStart: req.query.weekStart,
            rubricData: req.body,
        });
        res.json(data);
    } catch (err) {
        const statusCode = err.message.includes('not-found') ? 404 :
                          err.message.includes('no-permission') ? 403 : 400;
        res.status(statusCode).json({ error: err.message });
    }
};