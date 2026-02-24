'use strict';

const assert = require('assert');
const request = require('../src/request');
const User = require('../src/user');
const groups = require('../src/groups');
const Organizations = require('../src/organizations');
const SupervisorScheduler = require('../src/supervisor/scheduler');
const storage = require('../src/supervisor/storage');

describe('Supervisor API Endpoints', () => {
    let testUid1;
    let testUid2;
    let managerUid;
    let unauthorizedUid;
    let testOrgId;
    let testDeptId;
    let testWeekStart; // Will be calculated dynamically
    let jar;
    let managerJar;
    let unauthorizedJar;
    let csrfToken;

    /**
     * Helper function to get the Monday of current week
     * This ensures tests work regardless of when they're run
     */
    function getCurrentWeekMonday() {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        const monday = new Date(now); // Create new Date object to avoid mutation
        monday.setDate(diff);
        const year = monday.getFullYear();
        const month = String(monday.getMonth() + 1).padStart(2, '0');
        const date = String(monday.getDate()).padStart(2, '0');
        return `${year}-${month}-${date}`;
    }

    before(async function () {
        this.timeout(60000);

        // Calculate test week start dynamically
        testWeekStart = getCurrentWeekMonday();

        // Create test users
        testUid1 = await User.create({
            username: 'apiteammember1',
            email: 'apimember1@example.com',
            password: '123456',
        });

        testUid2 = await User.create({
            username: 'apiteammember2',
            email: 'apimember2@example.com',
            password: '123456',
        });

        managerUid = await User.create({
            username: 'apimanager',
            email: 'apimanager@example.com',
            password: '123456',
        });

        unauthorizedUid = await User.create({
            username: 'unauthorized',
            email: 'unauthorized@example.com',
            password: '123456',
        });

        // Confirm emails
        await User.setUserField(testUid1, 'email', 'apimember1@example.com');
        await User.email.confirmByUid(testUid1);
        await User.setUserField(testUid2, 'email', 'apimember2@example.com');
        await User.email.confirmByUid(testUid2);
        await User.setUserField(managerUid, 'email', 'apimanager@example.com');
        await User.email.confirmByUid(managerUid);
        await User.setUserField(unauthorizedUid, 'email', 'unauthorized@example.com');
        await User.email.confirmByUid(unauthorizedUid);

        // Make manager an administrator for organization creation
        await groups.join('administrators', managerUid);

        // Create organization and department
        const organization = await Organizations.create({
            name: 'API Test Organization',
            sector: 'Technology',
            about: 'Test organization for API testing',
            createdBy: managerUid,
        });
        testOrgId = organization.orgId;

        // Add manager to organization
        await Organizations.join(testOrgId, managerUid, {
            type: 'manager',
        });

        // Create department
        const department = await Organizations.createDepartment(testOrgId, {
            name: 'API Test Department',
            description: 'Test department for API testing',
            createdBy: managerUid,
        });
        testDeptId = department.deptId;

        // Make manager a department manager
        await Organizations.join(testOrgId, managerUid, {
            departmentId: testDeptId,
            type: 'manager',
        });

        // Add team members to department
        await Organizations.join(testOrgId, testUid1, {
            departmentId: testDeptId,
            type: 'member',
        });

        await Organizations.join(testOrgId, testUid2, {
            departmentId: testDeptId,
            type: 'member',
        });

        // Pre-calculate dashboard data
        await SupervisorScheduler.processDepartment(testDeptId, testWeekStart);

        // Login as manager and get CSRF token
        jar = request.jar();
        managerJar = request.jar();
        unauthorizedJar = request.jar();

        const loginRes = await request.post('/api/v3/utilities/login', {
            jar: managerJar,
            simple: false,
            resolveWithFullResponse: true,
            json: true,
            body: {
                username: 'apimanager',
                password: '123456',
            },
        });

        csrfToken = loginRes.body.csrf_token;

        // Login unauthorized user
        await request.post('/api/v3/utilities/login', {
            jar: unauthorizedJar,
            simple: false,
            resolveWithFullResponse: true,
            json: true,
            body: {
                username: 'unauthorized',
                password: '123456',
            },
        });
    });

    describe('GET /api/v3/supervisor/dashboard/:deptId', () => {
        it('should return 401 when not logged in', async () => {
            try {
                await request.get(`/api/v3/supervisor/dashboard/${testDeptId}`, {
                    jar: jar,
                    qs: { weekStart: testWeekStart },
                    json: true,
                });
                assert.fail('Should have thrown error');
            } catch (err) {
                assert.strictEqual(err.statusCode, 401);
            }
        });

        it('should return 403 when user is not a department manager', async () => {
            try {
                await request.get(`/api/v3/supervisor/dashboard/${testDeptId}`, {
                    jar: unauthorizedJar,
                    qs: { weekStart: testWeekStart },
                    json: true,
                });
                assert.fail('Should have thrown error');
            } catch (err) {
                assert.strictEqual(err.statusCode, 403);
            }
        });

        it('should return 400 when weekStart is missing', async () => {
            try {
                await request.get(`/api/v3/supervisor/dashboard/${testDeptId}`, {
                    jar: managerJar,
                    json: true,
                });
                assert.fail('Should have thrown error');
            } catch (err) {
                assert.strictEqual(err.statusCode, 400);
            }
        });

        it('should return 400 when weekStart is in invalid format', async () => {
            try {
                await request.get(`/api/v3/supervisor/dashboard/${testDeptId}`, {
                    jar: managerJar,
                    qs: { weekStart: 'invalid-date' },
                    json: true,
                });
                assert.fail('Should have thrown error');
            } catch (err) {
                assert.strictEqual(err.statusCode, 400);
            }
        });

        it('should return 400 when dashboard does not exist for specified week', async () => {
            try {
                await request.get(`/api/v3/supervisor/dashboard/${testDeptId}`, {
                    jar: managerJar,
                    qs: { weekStart: '2099-12-31' },
                    json: true,
                });
                assert.fail('Should have thrown error');
            } catch (err) {
                assert.strictEqual(err.statusCode, 400);
            }
        });

        it('should successfully return dashboard for authorized manager', async function () {
            this.timeout(20000);

            const response = await request.get(`/api/v3/supervisor/dashboard/${testDeptId}`, {
                jar: managerJar,
                qs: { weekStart: testWeekStart },
                json: true,
            });

            // Validate response structure
            assert(response);
            assert(response.department);
            assert.strictEqual(response.department.id, testDeptId);
            assert.strictEqual(response.department.name, 'API Test Department');
            assert.strictEqual(response.weekStart, testWeekStart);
            assert(Array.isArray(response.members));
            assert.strictEqual(response.members.length, 2);
            assert(response.teamSummary);

            // Validate member structure
            const member = response.members[0];
            assert(member.uid);
            assert(member.name);
            assert(member.username);
            assert(typeof member.healthScore === 'number');
            assert(typeof member.attendance === 'number');
            assert(typeof member.ubs === 'number');
            assert(typeof member.happiness === 'number');
            assert(member.lnd);
            assert(member.ubsBreakdown);
            assert(member.ubsDetails);
            assert(member.happinessDetails);

            // Validate team summary structure
            assert(response.teamSummary.highlights);
            assert(response.teamSummary.escalations);
            assert(response.teamSummary.suggestions);
            assert(response.teamSummary.summary);
        });

        it('should return dashboard with correct score ranges', async () => {
            const response = await request.get(`/api/v3/supervisor/dashboard/${testDeptId}`, {
                jar: managerJar,
                qs: { weekStart: testWeekStart },
                json: true,
            });

            response.members.forEach((member) => {
                // UBS should be 0-100
                assert(member.ubs >= 0 && member.ubs <= 100);
                
                // Happiness should be 0-100
                assert(member.happiness >= 0 && member.happiness <= 100);
                
                // Attendance should be 0-6 (6 days)
                assert(member.attendance >= 0 && member.attendance <= 6);
                
                // Health score should be 0-100
                assert(member.healthScore >= 0 && member.healthScore <= 100);
            });
        });
    });

    describe('GET /api/v3/supervisor/reports', () => {
        it('should return 401 when not logged in', async () => {
            try {
                await request.get('/api/v3/supervisor/reports', {
                    jar: jar,
                    qs: {
                        deptId: testDeptId,
                        weekStart: testWeekStart,
                        type: 'daily',
                    },
                    json: true,
                });
                assert.fail('Should have thrown error');
            } catch (err) {
                assert.strictEqual(err.statusCode, 401);
            }
        });

        it('should return 400 when required parameters are missing', async () => {
            try {
                await request.get('/api/v3/supervisor/reports', {
                    jar: managerJar,
                    qs: {
                        weekStart: testWeekStart,
                        type: 'daily',
                    },
                    json: true,
                });
                assert.fail('Should have thrown error');
            } catch (err) {
                assert.strictEqual(err.statusCode, 400);
            }
        });

        it('should return 400 when type is invalid', async () => {
            try {
                await request.get('/api/v3/supervisor/reports', {
                    jar: managerJar,
                    qs: {
                        deptId: testDeptId,
                        weekStart: testWeekStart,
                        type: 'invalid',
                    },
                    json: true,
                });
                assert.fail('Should have thrown error');
            } catch (err) {
                assert.strictEqual(err.statusCode, 400);
            }
        });

        it('should return daily reports for a specific member', async function () {
            this.timeout(20000);

            const response = await request.get('/api/v3/supervisor/reports', {
                jar: managerJar,
                qs: {
                    deptId: testDeptId,
                    weekStart: testWeekStart,
                    type: 'daily',
                    uid: testUid1,
                },
                json: true,
            });

            assert(response);
            assert.strictEqual(response.uid, testUid1);
            assert.strictEqual(response.weekStart, testWeekStart);
            assert.strictEqual(response.type, 'daily');
            assert(response.user);
            assert(response.user.username);
            assert(response.user.fullname);
            assert(Array.isArray(response.dailyReports));
            assert.strictEqual(response.dailyReports.length, 6); // Monday-Saturday

            // Validate daily report structure
            const dailyReport = response.dailyReports[0];
            assert(dailyReport.date);
            assert(Array.isArray(dailyReport.plan));
            assert(Array.isArray(dailyReport.frameworks));
            assert(typeof dailyReport.hasPlan === 'boolean');
            assert(typeof dailyReport.hasReport === 'boolean');
        });

        it('should return weekly report for a specific member', async function () {
            this.timeout(20000);

            const response = await request.get('/api/v3/supervisor/reports', {
                jar: managerJar,
                qs: {
                    deptId: testDeptId,
                    weekStart: testWeekStart,
                    type: 'weekly',
                    uid: testUid1,
                },
                json: true,
            });

            assert(response);
            assert.strictEqual(response.uid, testUid1);
            assert.strictEqual(response.weekStart, testWeekStart);
            assert.strictEqual(response.type, 'weekly');
            assert(response.user);
            assert(response.weeklyReport);
            assert(typeof response.weeklyReport.submitted === 'boolean');
        });

        it('should return daily reports for all department members', async function () {
            this.timeout(25000);

            const response = await request.get('/api/v3/supervisor/reports', {
                jar: managerJar,
                qs: {
                    deptId: testDeptId,
                    weekStart: testWeekStart,
                    type: 'daily',
                },
                json: true,
            });

            assert(response);
            assert.strictEqual(response.deptId, testDeptId);
            assert.strictEqual(response.weekStart, testWeekStart);
            assert.strictEqual(response.type, 'daily');
            assert(Array.isArray(response.members));
            assert(response.members.length >= 2);

            // Validate member structure
            const member = response.members[0];
            assert(member.uid);
            assert(member.user);
            assert(Array.isArray(member.dailyReports));
            assert.strictEqual(member.dailyReports.length, 6);
        });

        it('should return weekly reports for all department members', async function () {
            this.timeout(25000);

            const response = await request.get('/api/v3/supervisor/reports', {
                jar: managerJar,
                qs: {
                    deptId: testDeptId,
                    weekStart: testWeekStart,
                    type: 'weekly',
                },
                json: true,
            });

            assert(response);
            assert.strictEqual(response.deptId, testDeptId);
            assert.strictEqual(response.weekStart, testWeekStart);
            assert.strictEqual(response.type, 'weekly');
            assert(Array.isArray(response.members));

            // Validate member structure
            const member = response.members[0];
            assert(member.uid);
            assert(member.user);
            assert(member.weeklyReport);
        });

        it('should deny access to non-manager users', async () => {
            try {
                await request.get('/api/v3/supervisor/reports', {
                    jar: unauthorizedJar,
                    qs: {
                        deptId: testDeptId,
                        weekStart: testWeekStart,
                        type: 'daily',
                    },
                    json: true,
                });
                assert.fail('Should have thrown error');
            } catch (err) {
                assert.strictEqual(err.statusCode, 400);
            }
        });
    });

    describe('Week Rules Validation', () => {
        it('should validate that week starts on Monday', async () => {
            await request.get(`/api/v3/supervisor/dashboard/${testDeptId}`, {
                jar: managerJar,
                qs: { weekStart: testWeekStart },
                json: true,
            });

            // Test week start date is a Monday
            const date = new Date(testWeekStart);
            const dayOfWeek = date.getDay();
            // In JavaScript, 0 = Sunday, 1 = Monday
            assert.strictEqual(dayOfWeek, 1, 'Week should start on Monday');
        });

        it('should cover Monday-Saturday (6 days)', async function () {
            this.timeout(20000);

            const response = await request.get('/api/v3/supervisor/reports', {
                jar: managerJar,
                qs: {
                    deptId: testDeptId,
                    weekStart: testWeekStart,
                    type: 'daily',
                    uid: testUid1,
                },
                json: true,
            });

            assert.strictEqual(response.dailyReports.length, 6, 'Should have 6 days (Monday-Saturday)');
        });
    });

    describe('User Metadata Validation', () => {
        it('should include username, fullname, and picture in responses', async function () {
            this.timeout(20000);

            const response = await request.get(`/api/v3/supervisor/dashboard/${testDeptId}`, {
                jar: managerJar,
                qs: { weekStart: testWeekStart },
                json: true,
            });

            response.members.forEach((member) => {
                assert(member.username, 'Should include username');
                assert(member.name, 'Should include full name');
                assert(member.picture !== undefined, 'Should include picture field');
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty team gracefully', async function () {
            this.timeout(25000);

            // Create a department with no members
            const emptyDept = await Organizations.createDepartment(testOrgId, {
                name: 'Empty Test Department',
                description: 'Department with no members',
                createdBy: managerUid,
            });

            // Make manager a department manager
            await Organizations.join(testOrgId, managerUid, {
                departmentId: emptyDept.deptId,
                type: 'manager',
            });

            // Calculate dashboard (should handle empty team)
            await SupervisorScheduler.processDepartment(emptyDept.deptId, testWeekStart);

            // Try to get dashboard
            const dashboard = await storage.getDepartmentDashboard(emptyDept.deptId, testWeekStart);
            
            // Empty department may not save a dashboard, which is acceptable
            if (dashboard === null) {
                assert(true, 'Empty department returns null dashboard');
            } else {
                assert.strictEqual(dashboard.members.length, 0, 'Empty department should have no members');
            }
        });

        it('should handle invalid department ID', async () => {
            try {
                await request.get('/api/v3/supervisor/dashboard/invalid_dept_999', {
                    jar: managerJar,
                    qs: { weekStart: testWeekStart },
                    json: true,
                });
                assert.fail('Should have thrown error');
            } catch (err) {
                // Should return error (either 400 or 403)
                assert(err.statusCode === 400 || err.statusCode === 403);
            }
        });

        it('should handle week with no calculated data', async () => {
            try {
                await request.get(`/api/v3/supervisor/dashboard/${testDeptId}`, {
                    jar: managerJar,
                    qs: { weekStart: '2020-01-06' }, // Past week with no data
                    json: true,
                });
                assert.fail('Should have thrown error');
            } catch (err) {
                assert.strictEqual(err.statusCode, 400);
            }
        });

        it('should filter dashboard by uid when provided', async () => {
            const response = await request.get(`/api/v3/supervisor/dashboard/${testDeptId}`, {
                jar: managerJar,
                qs: { 
                    weekStart: testWeekStart,
                    uid: testUid1 
                },
                json: true,
            });

            // Should return single member, not full dashboard
            assert(response);
            assert(response.department);
            assert.strictEqual(response.department.id, testDeptId);
            assert.strictEqual(response.weekStart, testWeekStart);
            assert(response.member);
            assert.strictEqual(response.member.uid, testUid1);
            // Should NOT have members array or teamSummary
            assert(!response.members);
            assert(!response.teamSummary);
        });

        it('should return 400 when uid does not exist in dashboard', async () => {
            try {
                await request.get(`/api/v3/supervisor/dashboard/${testDeptId}`, {
                    jar: managerJar,
                    qs: { 
                        weekStart: testWeekStart,
                        uid: unauthorizedUid // User not in department
                    },
                    json: true,
                });
                assert.fail('Should have thrown error');
            } catch (err) {
                assert.strictEqual(err.statusCode, 400);
            }
        });
    });

    describe('PUT /api/v3/supervisor/dashboard/:deptId/member/:uid/rubric', () => {
        it('should return 401 when not logged in', async () => {
            try {
                await request.put(`/api/v3/supervisor/dashboard/${testDeptId}/member/${testUid1}/rubric`, {
                    jar: jar,
                    qs: { weekStart: testWeekStart },
                    json: true,
                    body: {
                        score: 8.5,
                        feedback: 'Good work this week'
                    },
                });
                assert.fail('Should have thrown error');
            } catch (err) {
                assert.strictEqual(err.statusCode, 401);
            }
        });

        it('should return 403 when user is not a department manager', async () => {
            try {
                await request.put(`/api/v3/supervisor/dashboard/${testDeptId}/member/${testUid1}/rubric`, {
                    jar: unauthorizedJar,
                    qs: { weekStart: testWeekStart },
                    json: true,
                    body: {
                        score: 8.5,
                        feedback: 'Good work this week'
                    },
                });
                assert.fail('Should have thrown error');
            } catch (err) {
                assert.strictEqual(err.statusCode, 403);
            }
        });

        it('should return 400 when weekStart is missing', async () => {
            try {
                await request.put(`/api/v3/supervisor/dashboard/${testDeptId}/member/${testUid1}/rubric`, {
                    jar: managerJar,
                    json: true,
                    body: {
                        score: 8.5,
                        feedback: 'Good work this week'
                    },
                });
                assert.fail('Should have thrown error');
            } catch (err) {
                assert.strictEqual(err.statusCode, 400);
            }
        });

        it('should return 400 when score is missing', async () => {
            try {
                await request.put(`/api/v3/supervisor/dashboard/${testDeptId}/member/${testUid1}/rubric`, {
                    jar: managerJar,
                    qs: { weekStart: testWeekStart },
                    json: true,
                    body: {
                        feedback: 'Good work this week'
                    },
                });
                assert.fail('Should have thrown error');
            } catch (err) {
                assert.strictEqual(err.statusCode, 400);
            }
        });

        it('should return 400 when score is out of range', async () => {
            try {
                await request.put(`/api/v3/supervisor/dashboard/${testDeptId}/member/${testUid1}/rubric`, {
                    jar: managerJar,
                    qs: { weekStart: testWeekStart },
                    json: true,
                    body: {
                        score: 15, // Invalid: > 10
                        feedback: 'Good work this week'
                    },
                });
                assert.fail('Should have thrown error');
            } catch (err) {
                assert.strictEqual(err.statusCode, 400);
            }
        });

        it('should successfully update member rubric', async () => {
            const response = await request.put(`/api/v3/supervisor/dashboard/${testDeptId}/member/${testUid1}/rubric`, {
                jar: managerJar,
                qs: { weekStart: testWeekStart },
                json: true,
                body: {
                    score: 8.5,
                    feedback: 'Great progress this week on the new features!'
                },
            });

            // Validate response
            assert(response);
            assert.strictEqual(response.success, true);
            assert(response.data);
            assert.strictEqual(response.data.deptId, testDeptId);
            assert.strictEqual(response.data.uid, testUid1);
            assert.strictEqual(response.data.weekStart, testWeekStart);
            assert(response.data.rubric);
            assert.strictEqual(response.data.rubric.score, 8.5);
            assert.strictEqual(response.data.rubric.feedback, 'Great progress this week on the new features!');
            assert.strictEqual(response.data.rubric.updatedBy, managerUid);
            assert(response.data.rubric.updatedAt);
        });

        it('should allow updating rubric multiple times', async () => {
            // First update
            await request.put(`/api/v3/supervisor/dashboard/${testDeptId}/member/${testUid2}/rubric`, {
                jar: managerJar,
                qs: { weekStart: testWeekStart },
                json: true,
                body: {
                    score: 7,
                    feedback: 'Initial feedback'
                },
            });

            // Second update (should overwrite)
            const response = await request.put(`/api/v3/supervisor/dashboard/${testDeptId}/member/${testUid2}/rubric`, {
                jar: managerJar,
                qs: { weekStart: testWeekStart },
                json: true,
                body: {
                    score: 9,
                    feedback: 'Updated feedback - much better!'
                },
            });

            assert.strictEqual(response.data.rubric.score, 9);
            assert.strictEqual(response.data.rubric.feedback, 'Updated feedback - much better!');
        });

        it('should persist rubric in dashboard', async () => {
            // Update rubric
            await request.put(`/api/v3/supervisor/dashboard/${testDeptId}/member/${testUid1}/rubric`, {
                jar: managerJar,
                qs: { weekStart: testWeekStart },
                json: true,
                body: {
                    score: 9.5,
                    feedback: 'Excellent work!'
                },
            });

            // Fetch dashboard and verify rubric is saved
            const dashboard = await request.get(`/api/v3/supervisor/dashboard/${testDeptId}`, {
                jar: managerJar,
                qs: { weekStart: testWeekStart },
                json: true,
            });

            const member = dashboard.members.find(m => m.uid === testUid1);
            assert(member);
            assert(member.rubric);
            assert.strictEqual(member.rubric.score, 9.5);
            assert.strictEqual(member.rubric.feedback, 'Excellent work!');
        });

        it('should return 400 when member does not exist in dashboard', async () => {
            try {
                await request.put(`/api/v3/supervisor/dashboard/${testDeptId}/member/${unauthorizedUid}/rubric`, {
                    jar: managerJar,
                    qs: { weekStart: testWeekStart },
                    json: true,
                    body: {
                        score: 8.5,
                        feedback: 'Good work'
                    },
                });
                assert.fail('Should have thrown error');
            } catch (err) {
                assert.strictEqual(err.statusCode, 400);
            }
        });
    });
});
