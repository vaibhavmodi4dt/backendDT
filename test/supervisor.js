'use strict';

const assert = require('assert');
const db = require('./mocks/databasemock');
const Supervisor = require('../src/supervisor');
const Organizations = require('../src/organizations');
const User = require('../src/user');
const groups = require('../src/groups');
const helpers = require('../src/supervisor/helpers');
const storage = require('../src/supervisor/storage');

describe('Supervisor Module', () => {
    let testUid1;
    let testUid2;
    let testUid3;
    let supervisorUid; // Organization-level supervisor
    let testOrgId;
    let testDeptId;
    let testDeptId2;

    // ⭐ Just one simple date variable
    const testWeekStart = '2026-01-13'; // Monday (updated to current week)

    before(async () => {
        // Create users
        testUid1 = await User.create({
            username: 'teamMember1',
            email: 'member1@example.com',
            password: '123456',
        });

        testUid2 = await User.create({
            username: 'teamMember2',
            email: 'member2@example.com',
            password: '123456',
        });

        testUid3 = await User.create({
            username: 'teamMember3',
            email: 'member3@example.com',
            password: '123456',
        });

        supervisorUid = await User.create({
            username: 'orgSupervisor',
            email: 'supervisor@example.com',
            password: '123456',
        });

        // Confirm emails
        await User.setUserField(testUid1, 'email', 'member1@example.com');
        await User.email.confirmByUid(testUid1);
        await User.setUserField(testUid2, 'email', 'member2@example.com');
        await User.email.confirmByUid(testUid2);
        await User.setUserField(testUid3, 'email', 'member3@example.com');
        await User.email.confirmByUid(testUid3);
        await User.setUserField(supervisorUid, 'email', 'supervisor@example.com');
        await User.email.confirmByUid(supervisorUid);

        // Make supervisor an administrator
        await groups.join('administrators', supervisorUid);

        // =============================================
        // HIERARCHY: Organization -> Supervisor -> Department -> Members
        // =============================================

        // 1️⃣ Create Organization
        const organization = await Organizations.create({
            name: 'Tech Solutions Inc.',
            sector: 'Technology',
            about: 'A leading technology company',
            createdBy: supervisorUid,
        });
        testOrgId = organization.orgId;

        // 2️⃣ Add Supervisor at Organization Level (manager type with access to all departments)
        await Organizations.join(testOrgId, supervisorUid, {
            type: 'manager', // Organization-level manager/supervisor
        });

        // 3️⃣ Create Departments under Organization
        const department1 = await Organizations.createDepartment(testOrgId, {
            name: 'Engineering Department',
            description: 'Software development team',
            createdBy: supervisorUid,
        });
        testDeptId = department1.deptId;

        const department2 = await Organizations.createDepartment(testOrgId, {
            name: 'QA Department',
            description: 'Quality assurance team',
            createdBy: supervisorUid,
        });
        testDeptId2 = department2.deptId;

        // Make supervisor a manager of both departments
        await Organizations.join(testOrgId, supervisorUid, {
            departmentId: testDeptId,
            type: 'manager',
        });

        await Organizations.join(testOrgId, supervisorUid, {
            departmentId: testDeptId2,
            type: 'manager',
        });

        // 4️⃣ Add Members to Departments
        // Engineering Department members
        await Organizations.join(testOrgId, testUid1, {
            departmentId: testDeptId,
            type: 'member',
        });

        await Organizations.join(testOrgId, testUid2, {
            departmentId: testDeptId,
            type: 'member',
        });

        // QA Department member
        await Organizations.join(testOrgId, testUid3, {
            departmentId: testDeptId2,
            type: 'member',
        });
    });

    describe('Helpers - Date Utilities', () => {
        it('should get week start (Monday) from any date', () => {
            const weekStart = helpers.getWeekStart('2026-01-14');
            assert.strictEqual(weekStart, '2026-01-13');
        });

        it('should get all 6 week dates (Mon-Sat)', () => {
            const dates = helpers.getWeekDates('2026-01-13');
            assert(Array.isArray(dates));
            assert.strictEqual(dates.length, 6);
            assert.strictEqual(dates[0], '2026-01-13');
            assert.strictEqual(dates[5], '2026-01-18');
        });

        it('should get all weeks between two dates', () => {
            const weeks = helpers.getWeeksBetween('2026-01-13', '2026-01-27');
            assert(Array.isArray(weeks));
            assert(weeks.length >= 2);
        });

        it('should get previous week start', () => {
            const prevWeek = helpers.getPreviousWeekStart('2026-01-20');
            assert.strictEqual(prevWeek, '2026-01-13');
        });

        it('should get year and week number', () => {
            const { year, week } = helpers.getYearAndWeek('2026-01-13');
            assert.strictEqual(year, 2026);
            assert(week > 0 && week <= 53);
        });
    });

    describe('Helpers - Score Calculations', () => {
        it('should calculate plan score (12.5 points max)', () => {
            assert.strictEqual(helpers.calculatePlanScore(6), 12.5);
            assert.strictEqual(helpers.calculatePlanScore(3), 6.25);
        });

        it('should calculate report score (12.5 points max)', () => {
            assert.strictEqual(helpers.calculateReportScore(6), 12.5);
            assert.strictEqual(helpers.round(helpers.calculateReportScore(4)), 8.33);
        });

        it('should scale raw UBS score to 100', () => {
            assert.strictEqual(helpers.scaleUbsScore(41), 100);
            assert.strictEqual(helpers.scaleUbsScore(20.5), 50);
        });

        it('should calculate attendance percentage', () => {
            assert.strictEqual(helpers.calculateAttendancePercentage(6), 100);
            assert.strictEqual(helpers.calculateAttendancePercentage(3), 50);
        });

        it('should round numbers to 2 decimal places', () => {
            assert.strictEqual(helpers.round(85.678), 85.68);
            assert.strictEqual(helpers.round(90.1234), 90.12);
            assert.strictEqual(helpers.round(100), 100);
        });
    });

    describe('Helpers - Validation', () => {
        it('should check if report has plan', () => {
            assert.strictEqual(helpers.hasPlan({ plan: ['task1', 'task2'] }), true);
            assert.strictEqual(helpers.hasPlan({ plan: [] }), false);
            assert.strictEqual(helpers.hasPlan({}), false);
            assert.strictEqual(helpers.hasPlan(null), false);
        });

        it('should check if report has report', () => {
            assert.strictEqual(helpers.hasReport({ report: 'Daily report text' }), true);
            assert.strictEqual(helpers.hasReport({ report: '' }), false);
            assert.strictEqual(helpers.hasReport({}), false);
            assert.strictEqual(helpers.hasReport(null), false);
        });

        it('should check if user attended (both plan AND report)', () => {
            assert.strictEqual(helpers.hasAttended({ plan: ['task'], report: 'text' }), true);
            assert.strictEqual(helpers.hasAttended({ plan: ['task'] }), false);
            assert.strictEqual(helpers.hasAttended({ report: 'text' }), false);
        });
    });

    describe('Organizational Hierarchy', () => {
        it('should verify organization exists', async () => {
            const org = await Organizations.get(testOrgId);
            assert(org);
            assert.strictEqual(org.orgId, testOrgId);
            assert.strictEqual(org.name, 'Tech Solutions Inc.');
        });

        it('should verify supervisor is organization manager', async () => {
            const isOrgManager = await Organizations.isManager(testOrgId, supervisorUid);
            assert.strictEqual(isOrgManager, true);
        });

        it('should verify supervisor manages both departments', async () => {
            const isDept1Manager = await Organizations.isDepartmentManager(testDeptId, supervisorUid);
            const isDept2Manager = await Organizations.isDepartmentManager(testDeptId2, supervisorUid);

            assert.strictEqual(isDept1Manager, true);
            assert.strictEqual(isDept2Manager, true);
        });

        it('should verify members are in correct departments', async () => {
            const dept1Members = await Organizations.getDepartmentMembers(testDeptId, {
                page: 1,
                itemsPerPage: 10,
            });

            const dept2Members = await Organizations.getDepartmentMembers(testDeptId2, {
                page: 1,
                itemsPerPage: 10,
            });

            // Engineering department should have 2 members (excluding manager)
            const dept1RegularMembers = dept1Members.members.filter(m => m.uid !== supervisorUid);
            assert.strictEqual(dept1RegularMembers.length, 2);

            // QA department should have 1 member (excluding manager)
            const dept2RegularMembers = dept2Members.members.filter(m => m.uid !== supervisorUid);
            assert.strictEqual(dept2RegularMembers.length, 1);
        });

        it('should verify members are not managers', async () => {
            const isMember1Manager = await Organizations.isDepartmentManager(testDeptId, testUid1);
            const isMember2Manager = await Organizations.isDepartmentManager(testDeptId, testUid2);

            assert.strictEqual(isMember1Manager, false);
            assert.strictEqual(isMember2Manager, false);
        });
    });

    describe('Score Calculations', () => {
        it('should calculate health score', () => {
            const healthScore = Supervisor.calculateHealthScore(85, 88, 100);
            assert.strictEqual(healthScore, 91);
        });

        it('should calculate UBS for a user', async function () {
            this.timeout(30000);

            try {
                const ubsResult = await Supervisor.calculateUBS(testUid1, testWeekStart);
                assert(ubsResult);
                assert(typeof ubsResult.ubs === 'number');
                assert(ubsResult.ubs >= 0 && ubsResult.ubs <= 100);
                assert(ubsResult.breakdown);
                assert(ubsResult.details);
            } catch (error) {
                if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
                    this.skip();
                }
                throw error;
            }
        });

        it('should calculate happiness score for a user', async function () {
            this.timeout(15000);

            const result = await Supervisor.calculateHappinessScore(testUid1, testWeekStart);

            assert(result);
            assert(typeof result.happiness === 'number');
            assert(result.happiness >= 0 && result.happiness <= 100);
            assert(typeof result.hasScorecard === 'boolean');
        });

        it('should calculate attendance for a user', async () => {
            const weekDates = helpers.getWeekDates(testWeekStart);
            const result = await Supervisor.calculateAttendance(testUid1, weekDates);

            assert(result);
            assert(typeof result.attendance === 'number');
            assert(typeof result.lnd === 'number');
            assert(result.attendance >= 0 && result.attendance <= 6);
        });
    });

    describe('Member Data', () => {
        it('should get complete member week data', async function () {
            this.timeout(20000);

            const memberData = await Supervisor.getMemberWeekData(testUid1, testWeekStart);

            assert(memberData);
            assert.strictEqual(memberData.uid, testUid1);
            assert(memberData.name);
            assert(memberData.username);
            assert(typeof memberData.healthScore === 'number');
            assert(typeof memberData.ubs === 'number');
            assert(typeof memberData.happiness === 'number');
            assert(typeof memberData.attendance === 'number');
            assert(memberData.lnd.includes('%'));
            assert(memberData.ubsBreakdown);
            assert(memberData.ubsDetails);
            assert(memberData.happinessDetails);
        });

        it('should get member weekly report if exists', async () => {
            const weeklyReport = await Supervisor.getMemberWeeklyReport(testUid1, testWeekStart);
            // May be null if no report exists
            if (weeklyReport) {
                assert.strictEqual(weeklyReport.weekStart, testWeekStart);
            }
        });
    });

    describe('Team Summary (AI)', () => {
        it('should generate team summary', async function () {
            this.timeout(25000);

            const member1 = await Supervisor.getMemberWeekData(testUid1, testWeekStart);
            const member2 = await Supervisor.getMemberWeekData(testUid2, testWeekStart);

            const teamSummary = await Supervisor.generateTeamSummary([member1, member2], testWeekStart);

            assert(teamSummary);
            assert(teamSummary.highlights);
            assert(teamSummary.escalations);
            assert(teamSummary.suggestions);
            assert(teamSummary.summary);
        });
    });

    describe('Dashboard Calculation - Engineering Department', () => {
        it('should calculate dashboard for engineering department', async function () {
            this.timeout(35000);

            const dashboard = await Supervisor.calculateDashboard(testDeptId, testWeekStart);

            assert(dashboard);
            assert(dashboard.department);
            assert.strictEqual(dashboard.department.id, testDeptId);
            assert.strictEqual(dashboard.department.name, 'Engineering Department');
            assert.strictEqual(dashboard.weekStart, testWeekStart);
            assert(Array.isArray(dashboard.members));
            // Should only include regular members, not the manager/supervisor
            assert.strictEqual(dashboard.members.length, 2);
            assert(dashboard.teamSummary);

            // Verify it's only regular members
            const memberUids = dashboard.members.map(m => m.uid);
            assert(memberUids.includes(testUid1));
            assert(memberUids.includes(testUid2));
            assert(!memberUids.includes(supervisorUid));
        });

        it('should calculate dashboard for QA department', async function () {
            this.timeout(35000);

            const dashboard = await Supervisor.calculateDashboard(testDeptId2, testWeekStart);

            assert(dashboard);
            assert(dashboard.department);
            assert.strictEqual(dashboard.department.id, testDeptId2);
            assert.strictEqual(dashboard.department.name, 'QA Department');
            assert(Array.isArray(dashboard.members));
            assert.strictEqual(dashboard.members.length, 1);

            const memberUids = dashboard.members.map(m => m.uid);
            assert(memberUids.includes(testUid3));
            assert(!memberUids.includes(supervisorUid));
        });

        it('should throw error for non-existent department', async () => {
            try {
                await Supervisor.calculateDashboard('invalid_dept_999', testWeekStart);
                assert.fail('Should have thrown error');
            } catch (error) {
                assert(error.message.includes('department-not-found'));
            }
        });

        it('should handle department with no members', async () => {
            const emptyDept = await Organizations.createDepartment(testOrgId, {
                name: 'Empty Department',
                description: 'No members yet',
                createdBy: supervisorUid,
            });

            const dashboard = await Supervisor.calculateDashboard(emptyDept.deptId, testWeekStart);

            assert(dashboard);
            assert.strictEqual(dashboard.members.length, 0);
            assert.strictEqual(dashboard.teamSummary, null);
        });
    });

    describe('Storage Module', () => {
        let calculatedDashboard;

        it('should save department dashboard', async function () {
            this.timeout(35000);

            calculatedDashboard = await Supervisor.calculateDashboard(testDeptId, testWeekStart);
            await storage.saveDepartmentDashboard(testDeptId, testWeekStart, calculatedDashboard);

            const retrieved = await storage.getDepartmentDashboard(testDeptId, testWeekStart);
            assert(retrieved);
        });

        it('should retrieve saved dashboard with correct structure', async () => {
            const dashboard = await storage.getDepartmentDashboard(testDeptId, testWeekStart);

            assert(dashboard);
            assert.strictEqual(dashboard.deptId, testDeptId);
            assert.strictEqual(dashboard.weekStart, testWeekStart);
            assert(dashboard.department);
            assert(Array.isArray(dashboard.members));
            assert(dashboard.teamSummary);
            assert(dashboard.calculatedAt);
        });

        it('should save team summary separately', async () => {
            await storage.saveTeamSummary(testDeptId, testWeekStart, calculatedDashboard.teamSummary);
            assert(true);
        });

        it('should save individual member week scores', async () => {
            for (const member of calculatedDashboard.members) {
                await storage.saveMemberWeekScores(member.uid, testWeekStart, member);
            }
            assert(true);
        });

        it('should return null for non-existent dashboard', async () => {
            const dashboard = await storage.getDepartmentDashboard(testDeptId, '2099-12-31');
            assert.strictEqual(dashboard, null);
        });
    });

    describe('Scheduler', () => {
        const SupervisorScheduler = require('../src/supervisor/scheduler');

        it('should process engineering department and save data', async function () {
            this.timeout(40000);

            await SupervisorScheduler.processDepartment(testDeptId, testWeekStart);

            const dashboard = await storage.getDepartmentDashboard(testDeptId, testWeekStart);
            assert(dashboard);
            assert(dashboard.members.length === 2);
        });

        it('should process QA department and save data', async function () {
            this.timeout(40000);

            await SupervisorScheduler.processDepartment(testDeptId2, testWeekStart);

            const dashboard = await storage.getDepartmentDashboard(testDeptId2, testWeekStart);
            assert(dashboard);
            assert(dashboard.members.length === 1);
        });

        it('should skip already processed department', async function () {
            this.timeout(15000);

            await SupervisorScheduler.processDepartment(testDeptId, testWeekStart);

            const dashboard = await storage.getDepartmentDashboard(testDeptId, testWeekStart);
            assert(dashboard);
        });

        it('should handle department with no members', async function () {
            this.timeout(15000);

            const emptyDept = await Organizations.createDepartment(testOrgId, {
                name: 'Empty Scheduler Test',
                description: 'Testing empty department',
                createdBy: supervisorUid,
            });

            await SupervisorScheduler.processDepartment(emptyDept.deptId, testWeekStart);

            const dashboard = await storage.getDepartmentDashboard(emptyDept.deptId, testWeekStart);
            assert.strictEqual(dashboard, null);
        });
    });

    describe('API Integration - Supervisor Access', () => {
        const supervisorApi = require('../src/api/supervisor');

        it('should allow supervisor to get engineering department dashboard', async function () {
            this.timeout(40000);

            const SupervisorScheduler = require('../src/supervisor/scheduler');
            await SupervisorScheduler.processDepartment(testDeptId, testWeekStart);

            const dashboard = await supervisorApi.getDashboard(
                { uid: supervisorUid },
                { deptId: testDeptId, weekStart: testWeekStart }
            );

            assert(dashboard);
            assert(dashboard.department);
            assert.strictEqual(dashboard.department.name, 'Engineering Department');
            assert(Array.isArray(dashboard.members));
            assert.strictEqual(dashboard.members.length, 2);
            assert(dashboard.teamSummary);
        });

        it('should allow supervisor to get QA department dashboard', async function () {
            this.timeout(40000);

            const SupervisorScheduler = require('../src/supervisor/scheduler');
            await SupervisorScheduler.processDepartment(testDeptId2, testWeekStart);

            const dashboard = await supervisorApi.getDashboard(
                { uid: supervisorUid },
                { deptId: testDeptId2, weekStart: testWeekStart }
            );

            assert(dashboard);
            assert.strictEqual(dashboard.department.name, 'QA Department');
            assert.strictEqual(dashboard.members.length, 1);
        });

        it('should deny regular member access to dashboard', async () => {
            try {
                await supervisorApi.getDashboard(
                    { uid: testUid1 },
                    { deptId: testDeptId, weekStart: testWeekStart }
                );
                assert.fail('Should have thrown error');
            } catch (error) {
                assert(error.message.includes('no-permission'));
            }
        });

        it('should require authentication', async () => {
            try {
                await supervisorApi.getDashboard(
                    { uid: null },
                    { deptId: testDeptId, weekStart: testWeekStart }
                );
                assert.fail('Should have thrown error');
            } catch (error) {
                assert(error.message.includes('not-logged-in'));
            }
        });

        it('should require valid department ID', async () => {
            try {
                await supervisorApi.getDashboard(
                    { uid: supervisorUid },
                    { deptId: null, weekStart: testWeekStart }
                );
                assert.fail('Should have thrown error');
            } catch (error) {
                assert(error.message.includes('invalid-department-id'));
            }
        });

        it('should require week start parameter', async () => {
            try {
                await supervisorApi.getDashboard(
                    { uid: supervisorUid },
                    { deptId: testDeptId, weekStart: null }
                );
                assert.fail('Should have thrown error');
            } catch (error) {
                assert(error.message.includes('week-start-required'));
            }
        });

        it('should throw error for non-existent dashboard', async () => {
            try {
                await supervisorApi.getDashboard(
                    { uid: supervisorUid },
                    { deptId: testDeptId, weekStart: '2099-12-31' }
                );
                assert.fail('Should have thrown error');
            } catch (error) {
                assert(error.message.includes('dashboard-not-found'));
            }
        });
    });

    describe('Reports API Integration', () => {
        const supervisorApi = require('../src/api/supervisor');

        it('should get daily reports for a specific member', async function () {
            this.timeout(20000);

            const reports = await supervisorApi.getReports(
                { uid: supervisorUid },
                {
                    deptId: testDeptId,
                    weekStart: testWeekStart,
                    type: 'daily',
                    uid: testUid1,
                }
            );

            assert(reports);
            assert.strictEqual(reports.uid, testUid1);
            assert.strictEqual(reports.type, 'daily');
            assert(reports.user);
            assert(Array.isArray(reports.dailyReports));
            assert.strictEqual(reports.dailyReports.length, 6);
        });

        it('should get weekly report for a specific member', async function () {
            this.timeout(20000);

            const reports = await supervisorApi.getReports(
                { uid: supervisorUid },
                {
                    deptId: testDeptId,
                    weekStart: testWeekStart,
                    type: 'weekly',
                    uid: testUid1,
                }
            );

            assert(reports);
            assert.strictEqual(reports.uid, testUid1);
            assert.strictEqual(reports.type, 'weekly');
            assert(reports.weeklyReport);
        });

        it('should get daily reports for all department members', async function () {
            this.timeout(25000);

            const reports = await supervisorApi.getReports(
                { uid: supervisorUid },
                {
                    deptId: testDeptId,
                    weekStart: testWeekStart,
                    type: 'daily',
                }
            );

            assert(reports);
            assert.strictEqual(reports.deptId, testDeptId);
            assert.strictEqual(reports.type, 'daily');
            assert(Array.isArray(reports.members));
            // Should include all members (regular + manager)
            assert(reports.members.length >= 2);
        });

        it('should get weekly reports for all department members', async function () {
            this.timeout(25000);

            const reports = await supervisorApi.getReports(
                { uid: supervisorUid },
                {
                    deptId: testDeptId,
                    weekStart: testWeekStart,
                    type: 'weekly',
                }
            );

            assert(reports);
            assert.strictEqual(reports.type, 'weekly');
            assert(Array.isArray(reports.members));
        });
    });

    describe('Multi-Department Supervisor Workflow', () => {
        it('should calculate and retrieve data for multiple departments', async function () {
            this.timeout(60000);

            const SupervisorScheduler = require('../src/supervisor/scheduler');
            const supervisorApi = require('../src/api/supervisor');

            // Calculate both departments
            await SupervisorScheduler.processDepartment(testDeptId, testWeekStart);
            await SupervisorScheduler.processDepartment(testDeptId2, testWeekStart);

            // Supervisor should be able to access both
            const engineeringDashboard = await supervisorApi.getDashboard(
                { uid: supervisorUid },
                { deptId: testDeptId, weekStart: testWeekStart }
            );

            const qaDashboard = await supervisorApi.getDashboard(
                { uid: supervisorUid },
                { deptId: testDeptId2, weekStart: testWeekStart }
            );

            assert(engineeringDashboard);
            assert(qaDashboard);
            assert.strictEqual(engineeringDashboard.members.length, 2);
            assert.strictEqual(qaDashboard.members.length, 1);
        });
    });
});
