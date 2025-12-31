'use strict';

const { z } = require('zod');

const Pitch = module.exports;

// ==========================================
// PITCH CONTENT SCHEMA
// ==========================================

const pitchContentSchema = z.object({
    text: z.string()
        .min(1, 'Pitch content cannot be empty')
        .max(10000, 'Pitch content too long (max 10,000 characters)'),
    
    format: z.enum(['plain', 'markdown', 'html'])
        .optional()
        .default('plain'),
});

// ==========================================
// PITCH METADATA SCHEMA
// ==========================================

const pitchMetaSchema = z.object({
    title: z.string()
        .min(1, 'Title is required')
        .max(200, 'Title too long (max 200 characters)'),
    
    description: z.string()
        .max(500, 'Description too long (max 500 characters)')
        .optional()
        .default(''),
    
    tags: z.array(z.string().max(50))
        .max(10, 'Maximum 10 tags allowed')
        .optional()
        .default([]),
});

// ==========================================
// PITCH STATS SCHEMA
// ==========================================

const pitchStatsSchema = z.object({
    characterCount: z.number().int().nonnegative(),
    wordCount: z.number().int().nonnegative(),
    readingTimeMinutes: z.number().nonnegative(),
});

// ==========================================
// CREATE PITCH SCHEMA
// ==========================================

Pitch.create = z.object({
    meta: pitchMetaSchema,
    content: pitchContentSchema,
    stats: pitchStatsSchema,
    workspaceId: z.string()
        .optional()
        .refine(val => !val || !isNaN(parseInt(val, 10)), 'Invalid workspace ID'),
});

// ==========================================
// UPDATE PITCH SCHEMA
// ==========================================

Pitch.update = z.object({
    meta: pitchMetaSchema.partial(),
    content: pitchContentSchema.partial(),
    stats: pitchStatsSchema.partial(),
});

// ==========================================
// GET/DELETE SCHEMAS
// ==========================================

Pitch.getById = z.object({
    id: z.string()
        .min(1, 'Pitch ID is required')
        .refine(val => !isNaN(parseInt(val, 10)), 'Invalid Pitch ID'),
});

Pitch.deleteById = z.object({
    id: z.string()
        .min(1, 'Pitch ID is required')
        .refine(val => !isNaN(parseInt(val, 10)), 'Invalid Pitch ID'),
});

Pitch.duplicateById = z.object({
    id: z.string()
        .min(1, 'Pitch ID is required')
        .refine(val => !isNaN(parseInt(val, 10)), 'Invalid Pitch ID'),
});

// ==========================================
// LIST/PAGINATION SCHEMA
// ==========================================

Pitch.list = z.object({
    page: z.string()
        .optional()
        .refine(val => !val || !isNaN(parseInt(val, 10)), 'Invalid page number')
        .transform(val => parseInt(val || '1', 10)),
    limit: z.string()
        .optional()
        .refine(val => !val || !isNaN(parseInt(val, 10)), 'Invalid limit')
        .transform(val => Math.min(parseInt(val || '20', 10), 100)),
});