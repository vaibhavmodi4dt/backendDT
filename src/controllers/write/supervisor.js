'use strict';

const supervisorApi = require('../../api/supervisor');

const supervisorController = module.exports;

supervisorController.getDashboard = async (req, res) => {
    try {
        const data = await supervisorApi.getDashboard(req, {
            deptId: req.params.deptId,
            weekStart: req.query.weekStart,
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


