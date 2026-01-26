'use strict';

const { z } = require('zod');

const supervisorSchemas = module.exports;

/**
 * Validation schema for getDashboard - params
 */
supervisorSchemas.getDashboardParams = z.object({
    deptId: z.string().min(1, 'Department ID is required'),
});

/**
 * Validation schema for getDashboard - query
 */
supervisorSchemas.getDashboardQuery = z.object({
    weekStart: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Week start must be in YYYY-MM-DD format'),
    uid: z.string().optional(),
});

/**
 * Validation schema for getReports - query
 */
supervisorSchemas.getReportsQuery = z.object({
    deptId: z.string().min(1, 'Department ID is required'),
    uid: z.string().optional(),
    type: z.enum(['daily', 'weekly'], {
        errorMap: () => ({ message: 'Type must be either "daily" or "weekly"' })
    }),
    weekStart: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Week start must be in YYYY-MM-DD format'),
});

/**
 * Validation schema for updateMemberRubric - params
 */
supervisorSchemas.updateMemberRubricParams = z.object({
    deptId: z.string().min(1, 'Department ID is required'),
    uid: z.string().min(1, 'User ID is required'),
});

/**
 * Validation schema for updateMemberRubric - query
 */
supervisorSchemas.updateMemberRubricQuery = z.object({
    weekStart: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Week start must be in YYYY-MM-DD format'),
});

/**
 * Validation schema for updateMemberRubric - body
 */
supervisorSchemas.updateMemberRubricBody = z.object({
    score: z.number()
        .min(0, 'Score must be at least 0')
        .max(10, 'Score must be at most 10'),
    feedback: z.string()
        .max(100, 'Feedback must be at most 100 characters')
        .optional(),
});