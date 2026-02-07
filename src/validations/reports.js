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
// DAILY REPORT SCHEMAS
// ==========================================

// SUBMIT PLAN
DailyReport.submitPlan = z.object({
    plan: z.array(
        z.union([
            z.string().min(1).max(500),
            planItemSchema,
        ])
    ).min(1, 'At least one plan item is required'),
});

// SUBMIT REPORT
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

// GET BY DATE
DailyReport.getByDate = z.object({
    date: dateSchema,
});

// GET INCOMPLETE PLANS
DailyReport.getIncompletePlans = z.object({
    // No parameters needed - uses caller.uid and current week
});

// GET COUNT
DailyReport.getCount = z.object({
    startDate: dateSchema,
    endDate: dateSchema,
}).refine((data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return start <= end;
}, 'Start date must be before or equal to end date');

// SUBMIT FRAMEWORKS
DailyReport.submitFrameworks = z.object({
    date: dateSchema.optional(),
    frameworks: z.array(
        z.union([
            z.string().min(1).max(200),
            frameworkItemSchema,
        ])
    ).min(1, 'At least one framework is required'),
});

// UPDATE REFLECTION
DailyReport.updateReflection = z.object({
    date: dateSchema.optional(),
    dailyReflection: z.record(z.string(), z.string().min(1, 'Reflection text is required'))
        .refine((obj) => Object.keys(obj).length === 1, 'Only one reflection field can be updated at a time'),
});

// POST CHAT MESSAGE
DailyReport.postChatMessage = z.object({
    message: z.string()
        .min(1, 'Message is required')
        .max(5000, 'Message too long (max 5000 characters)'),
});

// GET CHAT MESSAGES
DailyReport.getChatMessages = z.object({
    // No parameters needed - uses caller.uid and today's date
});

// INITIATE SESSION
DailyReport.initiateSession = z.object({
    // No parameters needed - uses caller.uid and today's date
});

// GET SESSION STATUS
DailyReport.getSessionStatus = z.object({
    date: dateSchema,
});

// SUBMIT LOGOUT
DailyReport.submitLogout = z.object({
    // No parameters needed - uses caller.uid and today's date
});

// ==========================================
// WEEKLY REPORT SCHEMAS
// ==========================================

// SUBMIT WEEKLY PLAN
DailyReport.submitWeeklyPlan = z.object({
    weekStart: dateSchema.optional(), // Auto-calculates to current Monday if not provided
    transcript: z.string()
        .min(10, 'Transcript must be at least 10 characters')
        .max(10000, 'Transcript too long (max 10000 characters)'),
    weeklyGoals: z.string()
        .min(10, 'Weekly goals must be at least 10 characters')
        .max(5000, 'Weekly goals too long (max 5000 characters)'),
});

// GET WEEKLY PLAN
DailyReport.getWeeklyPlan = z.object({
    weekStart: dateSchema.optional(), // Defaults to current week Monday
});

// UPDATE WEEKLY PLAN
DailyReport.updateWeeklyPlan = z.object({
    weekStart: dateSchema.optional(), // Defaults to current week Monday
    updates: z.record(z.string(), z.any())
        .refine((obj) => Object.keys(obj).length > 0, 'At least one field must be updated'),
});

// GET WEEKLY REPORT (7-day aggregation)
DailyReport.getWeeklyReport = z.object({
    date: dateSchema.optional(), // Any date in the week, defaults to today
});


DailyReport.generateWeeklyReportEvaluation = z.object({
    date: dateSchema.optional(), // Any date in the week, defaults to today
});

// GET WEEKLY REPORT EVALUATION
DailyReport.getWeeklyReportEvaluation = z.object({
    weekStart: dateSchema.optional(), // Monday of the week, defaults to current week
});

// UPDATE WEEKLY REPORT EVALUATION
DailyReport.updateWeeklyReportEvaluation = z.object({
    weekStart: dateSchema.optional(), // Monday of the week, defaults to current week
    editedReport: z.object({
        planVsActual: z.object({
            planned: z.array(z.string()).optional(),
            actual: z.object({
                completed: z.array(z.string()).optional(),
                inProgress: z.array(z.string()).optional(),
            }).optional(),
            deviations: z.object({
                notStarted: z.array(z.string()).optional(),
                blocked: z.array(z.string()).optional(),
            }).optional(),
            progressionTracking: z.array(z.object({
                task: z.string(),
                progression: z.string(),
            })).optional(),
            takeaways: z.string().optional(),
        }).optional(),
        bottlenecksAndInsights: z.object({
            blockers: z.object({
                executional: z.array(z.string()).optional(),
                emotional: z.array(z.string()).optional(),
            }).optional(),
            responseAndResolution: z.array(z.string()).optional(),
            selfLearning: z.array(z.string()).optional(),
            takeaways: z.string().optional(),
        }).optional(),
        ipToolsTemplates: z.array(z.object({
            name: z.string(),
            description: z.string(),
            reusability: z.string(),
            source: z.string().optional(),
        })).optional(),
        externalExploration: z.array(z.string()).optional(),
    }).refine((obj) => Object.keys(obj).length > 0, 'At least one field must be provided in editedReport'),
});

// SUBMIT WEEKLY REPORT EVALUATION
DailyReport.submitWeeklyReportEvaluation = z.object({
    weekStart: dateSchema.optional(), // Monday of the week, defaults to current week
});

// GET WEEKLY INSIGHTS
DailyReport.getWeeklyInsights = z.object({
    weekStart: dateSchema.optional(), // Monday of the week, defaults to current week
});
