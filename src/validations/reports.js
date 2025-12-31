'use strict';

const { z } = require('zod');

const DailyReport = module.exports;

// ==========================================
// COMMON SCHEMAS
// ==========================================

// Plan item status enum
const planStatusEnum = z.enum(['notStarted', 'inProcess', 'Completed']);

// Plan item type enum
const planTypeEnum = z.enum(['planned', 'unplanned', 'backlog']);

// Framework status enum
const frameworkStatusEnum = z.enum(['not_started', 'in_progress', 'completed']);

// Plan item schema
const planItemSchema = z.object({
    text: z.string().min(1, 'Plan item text is required').max(500, 'Plan item text too long (max 500 characters)'),
    status: planStatusEnum.optional(),
    type: planTypeEnum.optional(),
    source: z.string().optional(),
    completed: z.boolean().optional(),
    unplanned: z.boolean().optional(),
}).transform((data) => {
    // Allow either string or object format
    if (typeof data === 'string') {
        return { text: data, status: 'notStarted', type: 'planned' };
    }
    return data;
});

// Framework item schema
const frameworkItemSchema = z.object({
    text: z.string().min(1, 'Framework text is required').max(200, 'Framework text too long (max 200 characters)'),
    key: z.string().optional(), // Legacy support
    description: z.string().max(1000, 'Description too long (max 1000 characters)').optional().default(''),
    status: frameworkStatusEnum.optional().default('completed'),
}).transform((data) => {
    // Support legacy 'key' field or string format
    if (typeof data === 'string') {
        return { text: data, description: '', status: 'completed' };
    }
    if (data.key && !data.text) {
        data.text = data.key;
    }
    return data;
});

// Plan update schema (for partial status updates)
const planUpdateSchema = z.object({
    index: z.number().int().nonnegative('Index must be non-negative'),
    status: z.string().min(1, 'Status is required'),
});

// Date validation (YYYY-MM-DD format)
const dateSchema = z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((date) => {
        const parsed = new Date(date);
        return !isNaN(parsed.getTime());
    }, 'Invalid date');

// ==========================================
// SUBMIT PLAN
// ==========================================
DailyReport.submitPlan = z.object({
    plan: z.array(
        z.union([
            z.string().min(1).max(500),
            planItemSchema,
        ])
    ).min(1, 'At least one plan item is required'),
});

// ==========================================
// SUBMIT REPORT
// ==========================================
DailyReport.submitReport = z.object({
    report: z.string()
        .min(10, 'Report must be at least 10 characters')
        .max(10000, 'Report too long (max 10000 characters)'),
    date: dateSchema.optional(),
    plan: z.array(
        z.union([
            z.string().min(1).max(500),
            planItemSchema,
        ])
    ).optional(),
    dailyPlan: z.array(planItemSchema).optional(), // Alternative field name
    tasks: z.array(planItemSchema).optional(), // Alternative field name
    planUpdates: z.array(planUpdateSchema).optional(),
    selectedPlanIndexes: z.array(z.number().int().nonnegative()).optional(),
});

// ==========================================
// GET BY DATE
// ==========================================
DailyReport.getByDate = z.object({
    date: dateSchema,
});

// ==========================================
// GET INCOMPLETE PLANS
// ==========================================
DailyReport.getIncompletePlans = z.object({
    // No parameters needed - uses caller.uid and current week
});

// ==========================================
// GET COUNT
// ==========================================
DailyReport.getCount = z.object({
    startDate: dateSchema,
    endDate: dateSchema,
}).refine((data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return start <= end;
}, 'Start date must be before or equal to end date');

// ==========================================
// SUBMIT FRAMEWORKS
// ==========================================
DailyReport.submitFrameworks = z.object({
    date: dateSchema.optional(),
    frameworks: z.array(
        z.union([
            z.string().min(1).max(200),
            frameworkItemSchema,
        ])
    ).min(1, 'At least one framework is required'),
});

// ==========================================
// UPDATE REFLECTION
// ==========================================
DailyReport.updateReflection = z.object({
    date: dateSchema.optional(),
    dailyReflection: z.record(z.string(), z.string().min(1, 'Reflection text is required'))
        .refine((obj) => Object.keys(obj).length === 1, 'Only one reflection field can be updated at a time'),
});

// ==========================================
// POST CHAT MESSAGE
// ==========================================
DailyReport.postChatMessage = z.object({
    message: z.string()
        .min(1, 'Message is required')
        .max(5000, 'Message too long (max 5000 characters)'),
});

// ==========================================
// GET CHAT MESSAGES
// ==========================================
DailyReport.getChatMessages = z.object({
    // No parameters needed - uses caller.uid and today's date
});

// ==========================================
// INITIATE SESSION
// ==========================================
DailyReport.initiateSession = z.object({
    // No parameters needed - uses caller.uid and today's date
});

// ==========================================
// GET SESSION STATUS
// ==========================================
DailyReport.getSessionStatus = z.object({
    date: dateSchema,
});

// ==========================================
// SUBMIT LOGOUT
// ==========================================
DailyReport.submitLogout = z.object({
    // No parameters needed - uses caller.uid and today's date
});
