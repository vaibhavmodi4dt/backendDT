# DeepThought Backend - Module Creation Guide

**Version:** 1.0
**Last Updated:** February 2026
**Purpose:** Complete reference for creating new backend modules without codebase access

---

## Table of Contents

1. [Introduction & Quick Start](#1-introduction--quick-start)
   - [1.1 Purpose of This Document](#11-purpose-of-this-document)
   - [1.2 Module Creation Checklist](#12-module-creation-checklist)
   - [1.3 Architecture Overview](#13-architecture-overview)

2. [Naming Conventions & Standards](#2-naming-conventions--standards)
   - [2.1 File Naming](#21-file-naming)
   - [2.2 Variable Naming](#22-variable-naming)
   - [2.3 Route Naming Patterns](#23-route-naming-patterns)
   - [2.4 Database Key Patterns](#24-database-key-patterns)

3. [Database Layer Patterns](#3-database-layer-patterns)
   - [3.1 Module Structure Template](#31-module-structure-template)
   - [3.2 MongoDB Operations Patterns](#32-mongodb-operations-patterns)
   - [3.3 Collection Registration](#33-collection-registration)

4. [API Layer Patterns](#4-api-layer-patterns)
   - [4.1 API Layer Template](#41-api-layer-template)
   - [4.2 Common Authorization Patterns](#42-common-authorization-patterns)

5. [Controller Layer Patterns](#5-controller-layer-patterns)
   - [5.1 Controller Template](#51-controller-template)
   - [5.2 Controller Patterns](#52-controller-patterns)
   - [5.3 Controller Index Registration](#53-controller-index-registration)

6. [Validation Layer (Zod Schemas)](#6-validation-layer-zod-schemas)
   - [6.1 Validation Schema Template](#61-validation-schema-template)
   - [6.2 Validation Patterns](#62-validation-patterns)
   - [6.3 Validation Index Registration](#63-validation-index-registration)

7. [Route Layer Patterns](#7-route-layer-patterns)
   - [7.1 Route Template](#71-route-template)
   - [7.2 setupApiRoute Pattern](#72-setupapiroute-pattern)
   - [7.3 Common Middleware Combinations](#73-common-middleware-combinations)
   - [7.4 Route Registration](#74-route-registration)

8. [Middleware Patterns](#8-middleware-patterns)
   - [8.1 Custom Authentication Middleware](#81-custom-authentication-middleware)
   - [8.2 Organization Context Middleware Usage](#82-organization-context-middleware-usage)

9. [Response Formatting](#9-response-formatting)
   - [9.1 Success Response Format](#91-success-response-format)
   - [9.2 Error Response Format](#92-error-response-format)
   - [9.3 HTTP Status Codes](#93-http-status-codes)
   - [9.4 i18n Error Keys](#94-i18n-error-keys)

10. [Complete Working Example: Events Module](#10-complete-working-example-events-module)
    - [10.1 Step-by-Step Implementation](#101-step-by-step-implementation)

11. [Testing Patterns](#11-testing-patterns)
    - [11.1 Manual Testing with cURL](#111-manual-testing-with-curl)
    - [11.2 Common Testing Scenarios](#112-common-testing-scenarios)

12. [Common Pitfalls & Troubleshooting](#12-common-pitfalls--troubleshooting)

13. [Quick Reference Tables](#13-quick-reference-tables)
    - [13.1 Database Operations Cheat Sheet](#131-database-operations-cheat-sheet)
    - [13.2 Middleware Reference](#132-middleware-reference)
    - [13.3 Validation Schema Patterns](#133-validation-schema-patterns)

---

## 1. Introduction & Quick Start

### 1.1 Purpose of This Document

This document serves as a **comprehensive, standalone reference** for creating new backend modules in the DeepThought backend system. It contains:

- **Complete code patterns** from the existing codebase
- **Step-by-step workflows** for module creation
- **Working examples** with full implementations
- **Common pitfalls** and how to avoid them

**Key Feature:** This document is designed to be used **without access to the actual codebase**. All necessary patterns, conventions, and examples are included here.

### 1.2 Module Creation Checklist

Follow these steps to create a new module:

```
□ Step 1: Define module namespace and entity naming
□ Step 2: Create MongoDB collection entry
□ Step 3: Create validation schemas (Zod)
□ Step 4: Implement database layer (src/<module>/)
□ Step 5: Implement API layer (src/api/<module>.js)
□ Step 6: Implement controller layer (src/controllers/write/<module>.js)
□ Step 7: Implement route layer (src/routes/write/<module>.js)
□ Step 8: Register routes in write API index
□ Step 9: Create middleware (if needed)
□ Step 10: Test the module
```

### 1.3 Architecture Overview

**Request Flow:**
```
Client Request
    ↓
Route Layer (Express Router)
    ↓ [Middleware: auth, validation, rate limiting]
Controller Layer
    ↓ [Extract req.body, req.params, req.query]
API Layer
    ↓ [Business logic, authorization checks]
Database Layer / Module Logic
    ↓ [CRUD operations, data persistence]
Response
    ↓
Client
```

**Layer Responsibilities:**

| Layer | Responsibility | Never Do |
|-------|---------------|----------|
| **Routes** | Define endpoints, apply middleware, delegate to controllers | Business logic, database access |
| **Controllers** | Extract request data, call API layer, format responses | Authorization, validation, database access |
| **API Layer** | Business logic, authorization checks, data validation | Direct database operations (except via modules) |
| **Database/Module Layer** | CRUD operations, data persistence, complex queries | Authorization, HTTP concerns |

---

## 2. Naming Conventions & Standards

### 2.1 File Naming

**Pattern: Plural Lowercase for Resources**

```javascript
// ✓ CORRECT
src/routes/write/tasks.js
src/controllers/write/tasks.js
src/api/tasks.js

// ✗ WRONG
src/routes/write/task.js         // Singular
src/routes/write/Tasks.js        // Capitalized
```

**Pattern: Singular Lowercase for Modules**

```javascript
// ✓ CORRECT
src/tasks/index.js
src/tasks/helpers.js

// ✗ WRONG
src/task/index.js                // Inconsistent
```

### 2.2 Variable Naming

**Entity IDs - Use Shortened Forms with 'Id' Suffix**

```javascript
// Standard ID naming conventions
const tid = req.params.tid;           // Topic ID
const pid = req.params.pid;           // Post ID
const uid = req.uid;                  // User ID
const cid = req.params.cid;           // Category ID
const orgId = req.params.orgId;       // Organization ID
const deptId = req.params.deptId;     // Department ID
const roomId = req.params.roomId;     // Chat Room ID
const mid = req.params.mid;           // Message ID
const wsId = req.params.wsId;         // Workspace ID

// For new module "tasks":
const taskId = req.params.taskId;     // ✓ CORRECT
const tid = req.params.tid;           // ✗ AVOID if conflicts with "topic ID"
```

### 2.3 Route Naming Patterns

**RESTful Resources with Plural Nouns**

```javascript
// CRUD operations
POST   /api/v3/tasks              // Create
GET    /api/v3/tasks              // List (with pagination)
GET    /api/v3/tasks/:taskId      // Get by ID
PUT    /api/v3/tasks/:taskId      // Update
DELETE /api/v3/tasks/:taskId      // Delete

// Semantic actions (not CRUD verbs in URL)
POST   /api/v3/tasks/:taskId/complete    // ✓ Semantic action
POST   /api/v3/tasks/:taskId/assign      // ✓ Semantic action
POST   /api/v3/tasks/:taskId/archive     // ✓ Semantic action

// ✗ WRONG - Verb in URL
POST   /api/v3/tasks/:taskId/doComplete  // Redundant verb

// Sub-resources
GET    /api/v3/tasks/:taskId/comments
POST   /api/v3/tasks/:taskId/comments
DELETE /api/v3/tasks/:taskId/comments/:commentId
```

### 2.4 Database Key Patterns

**Composite Keys with Colons**

```javascript
// Collection keys (MongoDB _key field)
`tasks:${taskId}`                          // Single entity
`tasks:user:${uid}:${date}`               // User-scoped with date
`tasks:org:${orgId}:${taskId}`            // Organization-scoped

// Index sets (for queries)
`tasks:all`                                // Global sorted set
`tasks:user:${uid}`                       // User's tasks (sorted set)
`tasks:org:${orgId}`                      // Org tasks (sorted set)
`tasks:status:${status}`                  // Tasks by status (sorted set)
`tasks:date:${date}`                      // Tasks by date (sorted set)

// Relationship sets
`task:${taskId}:assignees`                // Set of user IDs
`task:${taskId}:tags`                     // Set of tag names
`task:${taskId}:watchers`                 // Set of watching users
```

**Pattern Rules:**
1. Use colons `:` as separators
2. Start with entity type in plural (`tasks:`, `reports:`, `events:`)
3. Use consistent ordering: `entity:scope:id:date`
4. Index sets use `entity:dimension` pattern

---

## 3. Database Layer Patterns

### 3.1 Module Structure Template

**File:** `src/<module>/index.js`

```javascript
'use strict';

const db = require('../database');
const { collections } = require('../database/mongo/collections');
const utils = require('../utils');

// Define collection specification
const tasksCollection = { collection: collections.TASKS };

// Main module export
const Tasks = module.exports;

// Sub-modules (optional, for complex modules)
Tasks.helpers = require('./helpers');
Tasks.notifications = require('./notifications');

// ==========================================
// CREATE OPERATIONS
// ==========================================

/**
 * Create a new task
 * @param {number} uid - User ID
 * @param {Object} data - Task data
 * @returns {Promise<Object>} Created task
 */
Tasks.create = async function (uid, data) {
    // Implementation here
};

// ==========================================
// READ OPERATIONS
// ==========================================

/**
 * Get task by ID
 * @param {string|number} taskId - Task ID
 * @returns {Promise<Object>} Task object
 */
Tasks.get = async function (taskId) {
    // Implementation here
};

/**
 * List tasks with pagination
 * @param {number} uid - User ID
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} Tasks with pagination info
 */
Tasks.list = async function (uid, page = 1, limit = 20) {
    // Implementation here
};

// ==========================================
// UPDATE OPERATIONS
// ==========================================

/**
 * Update task
 * @param {string|number} taskId - Task ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated task
 */
Tasks.update = async function (taskId, updates) {
    // Implementation here
};

// ==========================================
// DELETE OPERATIONS
// ==========================================

/**
 * Delete task (soft delete)
 * @param {string|number} taskId - Task ID
 * @returns {Promise<void>}
 */
Tasks.delete = async function (taskId) {
    // Implementation here
};
```

### 3.2 MongoDB Operations Patterns

#### Pattern 1: Create Entity

```javascript
Tasks.create = async function (uid, data) {
    // 1. Generate unique ID using auto-increment
    const taskId = await db.incrObjectField('global', 'nextTaskId');

    // 2. Build key
    const key = `tasks:${taskId}`;

    // 3. Prepare data with timestamps
    const timestamp = utils.date.now();
    const taskData = {
        taskId: String(taskId),
        uid: String(uid),
        title: data.title,
        description: data.description || '',
        status: 'pending',
        priority: data.priority || 'medium',
        dueDate: data.dueDate || null,
        createdAt: utils.toISOString(timestamp),
        updatedAt: utils.toISOString(timestamp),
    };

    // 4. Persist to collection
    await db.setObject(key, taskData, tasksCollection);

    // 5. Maintain indexes for querying
    await Promise.all([
        db.sortedSetAdd('tasks:all', timestamp, key),
        db.sortedSetAdd(`tasks:user:${uid}`, timestamp, key),
        db.sortedSetAdd(`tasks:status:${taskData.status}`, timestamp, key),
    ]);

    return taskData;
};
```

**Key Points:**
- Use `db.incrObjectField('global', 'nextEntityId')` for auto-increment IDs
- Store ISO strings for human-readable dates: `utils.toISOString(timestamp)`
- Store Unix timestamps for sorting: `utils.date.now()`
- Always specify collection: `tasksCollection`
- Maintain indexes in sorted sets for efficient queries

#### Pattern 2: Get Single Entity

```javascript
Tasks.get = async function (taskId) {
    const key = `tasks:${taskId}`;

    // Fetch from database
    const taskData = await db.getObject(key, [], tasksCollection);

    // Handle not found
    if (!taskData) {
        throw new Error('[[error:task-not-found]]');
    }

    // Sanitize before returning
    return Tasks.helpers.sanitizeTask(taskData);
};
```

**Key Points:**
- Use `db.getObject(key, fields, collection)` - empty array `[]` fetches all fields
- Always check for null/undefined before returning
- Throw i18n error keys for consistency
- Sanitize data before returning (remove sensitive fields)

#### Pattern 3: Get Multiple Entities (Bulk Fetch)

```javascript
Tasks.getMultiple = async function (taskIds) {
    if (!taskIds || !taskIds.length) {
        return [];
    }

    // Build keys
    const keys = taskIds.map(id => `tasks:${id}`);

    // Bulk fetch
    const tasks = await db.getObjects(keys, tasksCollection);

    // Filter out nulls and sanitize
    return tasks
        .filter(Boolean)
        .map(Tasks.helpers.sanitizeTask);
};
```

**Key Points:**
- Use `db.getObjects(keys, collection)` for bulk operations
- Always filter out null/undefined entries
- Map over results to sanitize

#### Pattern 4: Update Entity (Upsert Pattern)

```javascript
Tasks.update = async function (taskId, updates) {
    const key = `tasks:${taskId}`;

    // 1. Fetch existing data
    const existing = await db.getObject(key, [], tasksCollection);

    if (!existing) {
        throw new Error('[[error:task-not-found]]');
    }

    // 2. Merge updates with existing data
    const updated = {
        ...existing,
        ...updates,
        updatedAt: utils.toISOString(utils.date.now()),
        updatedCount: (existing.updatedCount || 0) + 1,
    };

    // 3. Persist back to database
    await db.setObject(key, updated, tasksCollection);

    // 4. Update indexes if indexed fields changed
    if (updates.status && updates.status !== existing.status) {
        const timestamp = utils.date.now();
        await Promise.all([
            db.sortedSetRemove(`tasks:status:${existing.status}`, key),
            db.sortedSetAdd(`tasks:status:${updates.status}`, timestamp, key),
        ]);
    }

    return updated;
};
```

**Key Points:**
- Always fetch existing data first
- Merge with spread operator to preserve unchanged fields
- Update timestamp and increment update counter
- Update indexes when indexed fields change
- Use `db.sortedSetRemove()` and `db.sortedSetAdd()` to update indexes

#### Pattern 5: Delete Entity (Soft Delete)

```javascript
Tasks.delete = async function (taskId) {
    const key = `tasks:${taskId}`;

    // Soft delete: mark as deleted instead of removing
    await db.setObjectField(key, 'state', 'deleted', tasksCollection);
    await db.setObjectField(key, 'deletedAt', utils.toISOString(utils.date.now()), tasksCollection);

    // Remove from active indexes
    await Promise.all([
        db.sortedSetRemove('tasks:all', key),
        db.sortedSetRemove(`tasks:user:${task.uid}`, key),
        db.sortedSetRemove(`tasks:status:${task.status}`, key),
    ]);

    // Keep in deleted index for audit trail
    await db.sortedSetAdd('tasks:deleted', utils.date.now(), key);
};
```

**Key Points:**
- Prefer soft deletes over hard deletes
- Set `state: 'deleted'` and add `deletedAt` timestamp
- Remove from active indexes
- Optionally add to deleted index for audit trail
- For hard delete, use `await db.delete(key)`

#### Pattern 6: List with Pagination

```javascript
Tasks.list = async function (uid, page = 1, limit = 20) {
    // Calculate range
    const start = (page - 1) * limit;
    const stop = start + limit - 1;

    // Get keys from sorted set (newest first)
    const keys = await db.getSortedSetRevRange(
        `tasks:user:${uid}`,
        start,
        stop
    );

    // Bulk fetch objects
    const tasks = await db.getObjects(keys, tasksCollection);

    // Get total count for pagination
    const count = await db.sortedSetCard(`tasks:user:${uid}`);

    return {
        tasks: tasks.filter(Boolean).map(Tasks.helpers.sanitizeTask),
        pagination: {
            page,
            limit,
            total: count,
            pages: Math.ceil(count / limit),
        },
    };
};
```

**Key Points:**
- Use `db.getSortedSetRevRange()` for newest-first ordering
- Use `db.getSortedSetRange()` for oldest-first ordering
- Use `db.sortedSetCard()` to get total count
- Calculate pagination metadata for frontend

#### Pattern 7: Complex Queries (MongoDB Aggregation)

```javascript
Tasks.getTasksWithAssignees = async function (orgId, filters = {}) {
    const pipeline = [
        // Match stage
        {
            $match: {
                orgId: String(orgId),
                state: { $ne: 'deleted' },
                ...(filters.status && { status: filters.status }),
                ...(filters.priority && { priority: filters.priority }),
            },
        },
        // Lookup stage (join with users)
        {
            $lookup: {
                from: 'objects',
                localField: 'uid',
                foreignField: 'uid',
                as: 'creator',
            },
        },
        // Unwind stage
        {
            $unwind: {
                path: '$creator',
                preserveNullAndEmptyArrays: true,
            },
        },
        // Sort stage
        {
            $sort: { createdAt: -1 },
        },
        // Limit stage
        {
            $limit: filters.limit || 50,
        },
        // Project stage (select fields)
        {
            $project: {
                taskId: 1,
                title: 1,
                status: 1,
                priority: 1,
                'creator.username': 1,
                'creator.uid': 1,
                createdAt: 1,
            },
        },
    ];

    return await db.aggregate(tasksCollection, pipeline);
};
```

**Key Points:**
- Use aggregation for complex queries with joins
- Use `$match` early to reduce dataset
- Use `$lookup` for joins across collections
- Use `$project` to limit returned fields
- Limit results to prevent performance issues

#### Pattern 8: Update Single Field

```javascript
Tasks.updateStatus = async function (taskId, status) {
    const key = `tasks:${taskId}`;

    // Get current status for index update
    const currentStatus = await db.getObjectField(key, 'status');

    // Update single field
    await db.setObjectField(key, 'status', status, tasksCollection);
    await db.setObjectField(key, 'updatedAt', utils.toISOString(utils.date.now()), tasksCollection);

    // Update indexes
    if (currentStatus !== status) {
        const timestamp = utils.date.now();
        await Promise.all([
            db.sortedSetRemove(`tasks:status:${currentStatus}`, key),
            db.sortedSetAdd(`tasks:status:${status}`, timestamp, key),
        ]);
    }
};
```

**Key Points:**
- Use `db.setObjectField()` for single field updates
- Use `db.getObjectField()` to read single field
- Still update indexes when needed
- More efficient than fetching and setting entire object

#### Pattern 9: Check Entity Exists

```javascript
Tasks.exists = async function (taskId) {
    const key = `tasks:${taskId}`;
    return await db.exists(key);
};
```

**Key Points:**
- Use `db.exists(key)` for existence checks
- Returns boolean
- More efficient than fetching entire object

### 3.3 Collection Registration

**File:** `src/database/mongo/collections.js`

```javascript
'use strict';

const collections = {
    OBJECTS: "objects",
    ORGANIZATIONS: "organizations",
    THREADBUILDERS: "threadbuilders",
    REPORTS: "reports",
    WORKSPACES: "workspaces",
    RECOGNITION_GAMES: 'recognition_games',
    RECOGNITION_PLAYERS: 'recognition_players',
    SUPERVISOR: "supervisor",
    TASKS: "tasks",  // ADD YOUR NEW COLLECTION HERE
};

module.exports = { collections };
```

**Steps to Add New Collection:**
1. Open `src/database/mongo/collections.js`
2. Add new constant in SCREAMING_SNAKE_CASE
3. Value should be lowercase collection name in MongoDB
4. Use this constant in your module: `{ collection: collections.TASKS }`

**Why Use Collection Specification?**
- Without it, data goes to default "objects" collection
- Collection specification routes data to dedicated MongoDB collection
- Improves query performance and data organization
- Allows collection-specific indexes

---

## 4. API Layer Patterns

### 4.1 API Layer Template

**File:** `src/api/tasks.js`

```javascript
'use strict';

const Tasks = require('../tasks');
const user = require('../user');
const Organizations = require('../organizations');

const tasksApi = module.exports;

/**
 * Create a new task
 * Authorization: Must be logged in
 * @param {Object} caller - Caller object with uid
 * @param {Object} data - Task data
 * @returns {Promise<Object>} Created task
 */
tasksApi.create = async function (caller, data) {
    // 1. Authorization check
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    // 2. Additional business logic validation
    if (data.dueDate && data.dueDate < Date.now()) {
        throw new Error('[[error:due-date-in-past]]');
    }

    // 3. Call database layer
    return await Tasks.create(caller.uid, data);
};

/**
 * Get task by ID
 * Authorization: Must own the task or be org member
 * @param {Object} caller - Caller object with uid
 * @param {Object} data - Contains taskId
 * @returns {Promise<Object>} Task object
 */
tasksApi.get = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const task = await Tasks.get(data.taskId);

    // Check ownership or membership
    const canView = task.uid === caller.uid ||
                    await Organizations.isMember(task.orgId, caller.uid);

    if (!canView) {
        throw new Error('[[error:no-privileges]]');
    }

    return task;
};

/**
 * Update task
 * Authorization: Must own the task or be org manager
 * @param {Object} caller - Caller object with uid
 * @param {Object} data - Contains taskId and updates
 * @returns {Promise<Object>} Updated task
 */
tasksApi.update = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const task = await Tasks.get(data.taskId);

    // Admin bypass
    const isAdmin = await user.isAdministrator(caller.uid);
    if (isAdmin) {
        return await Tasks.update(data.taskId, data);
    }

    // Check ownership or manager role
    const isOwner = task.uid === caller.uid;
    const isOrgManager = await Organizations.isManager(task.orgId, caller.uid);

    if (!isOwner && !isOrgManager) {
        throw new Error('[[error:no-privileges]]');
    }

    return await Tasks.update(data.taskId, data);
};

/**
 * Delete task
 * Authorization: Must own the task or be admin
 * @param {Object} caller - Caller object with uid
 * @param {Object} data - Contains taskId
 * @returns {Promise<void>}
 */
tasksApi.delete = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const task = await Tasks.get(data.taskId);

    // Check ownership or admin
    const isOwner = task.uid === caller.uid;
    const isAdmin = await user.isAdministrator(caller.uid);

    if (!isOwner && !isAdmin) {
        throw new Error('[[error:no-privileges]]');
    }

    return await Tasks.delete(data.taskId);
};

/**
 * List user's tasks
 * Authorization: Must be logged in
 * @param {Object} caller - Caller object with uid
 * @param {Object} data - Contains page, limit
 * @returns {Promise<Object>} Tasks with pagination
 */
tasksApi.list = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    return await Tasks.list(
        caller.uid,
        data.page || 1,
        data.limit || 20
    );
};
```

**API Layer Function Signature:**
- First parameter: `caller` object containing `caller.uid`
- Second parameter: `data` object containing request data
- Returns: Promise resolving to data or throws Error

**Registration:**

Add to `src/api/index.js`:
```javascript
module.exports = {
    // ... existing
    tasks: require('./tasks'),  // ADD NEW API HERE
};
```

### 4.2 Common Authorization Patterns

#### Pattern 1: Logged In User Check

```javascript
tasksApi.create = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    // Proceed with operation
    return await Tasks.create(caller.uid, data);
};
```

**Use Case:** Any operation requiring authentication

#### Pattern 2: Admin Privilege Escalation

```javascript
tasksApi.update = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    // Admin bypass - admins can do anything
    const isAdmin = await user.isAdministrator(caller.uid);
    if (isAdmin) {
        return await Tasks.update(data.taskId, data);
    }

    // Regular authorization checks follow...
    const task = await Tasks.get(data.taskId);
    if (task.uid !== caller.uid) {
        throw new Error('[[error:no-privileges]]');
    }

    return await Tasks.update(data.taskId, data);
};
```

**Use Case:** Operations where admins should bypass normal restrictions
**Pattern:** Check admin first, return early if true, continue with normal checks

#### Pattern 3: Ownership Verification

```javascript
tasksApi.delete = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    // Get resource
    const task = await Tasks.get(data.taskId);

    // Check ownership
    if (task.uid !== caller.uid) {
        throw new Error('[[error:no-privileges]]');
    }

    return await Tasks.delete(data.taskId);
};
```

**Use Case:** User can only modify their own resources

#### Pattern 4: Organization Membership Check

```javascript
tasksApi.get = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const task = await Tasks.get(data.taskId);

    // Check organization membership
    const isMember = await Organizations.isMember(task.orgId, caller.uid);
    if (!isMember) {
        throw new Error('[[error:not-authorized]]');
    }

    return task;
};
```

**Use Case:** Resource belongs to organization, user must be member

#### Pattern 5: Organization Manager Check

```javascript
tasksApi.archive = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const task = await Tasks.get(data.taskId);

    // Admin bypass
    const isAdmin = await user.isAdministrator(caller.uid);
    if (isAdmin) {
        return await Tasks.archive(data.taskId);
    }

    // Check manager role
    const isManager = await Organizations.isManager(task.orgId, caller.uid);
    if (!isManager) {
        throw new Error('[[error:no-privileges]]');
    }

    return await Tasks.archive(data.taskId);
};
```

**Use Case:** Operation requires organization management privileges

#### Pattern 6: Department Manager Check

```javascript
tasksApi.listDepartmentTasks = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    // Admin bypass
    const isAdmin = await user.isAdministrator(caller.uid);
    if (isAdmin) {
        return await Tasks.listByDepartment(data.deptId);
    }

    // Check department manager
    const isDeptManager = await Organizations.isDepartmentManager(
        data.deptId,
        caller.uid
    );

    if (!isDeptManager) {
        throw new Error('[[error:no-privileges]]');
    }

    return await Tasks.listByDepartment(data.deptId);
};
```

**Use Case:** Operation requires department management privileges

#### Pattern 7: Pre-requisite Resource Check

```javascript
tasksApi.submitTaskReport = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    // Check if task exists
    const task = await Tasks.get(data.taskId);

    // Check if plan was submitted first
    if (!task.plan || task.plan.length === 0) {
        throw new Error('[[error:plan-required-first]]');
    }

    // Check if already submitted
    if (task.report) {
        throw new Error('[[error:report-already-submitted]]');
    }

    return await Tasks.submitReport(data.taskId, data.report);
};
```

**Use Case:** Business logic requires prerequisite conditions
**Example:** Must submit plan before report (from reports module)

#### Pattern 8: Multiple Permission Levels

```javascript
tasksApi.update = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const task = await Tasks.get(data.taskId);

    // Level 1: Admin (can do anything)
    const isAdmin = await user.isAdministrator(caller.uid);
    if (isAdmin) {
        return await Tasks.update(data.taskId, data);
    }

    // Level 2: Organization Manager (can modify org tasks)
    const isOrgManager = await Organizations.isManager(task.orgId, caller.uid);
    if (isOrgManager) {
        return await Tasks.update(data.taskId, data);
    }

    // Level 3: Task Owner (can modify own tasks)
    const isOwner = task.uid === caller.uid;
    if (isOwner) {
        // Owners can only update certain fields
        const allowedUpdates = ['title', 'description', 'status'];
        const updates = {};
        for (const key of allowedUpdates) {
            if (data.hasOwnProperty(key)) {
                updates[key] = data[key];
            }
        }
        return await Tasks.update(data.taskId, updates);
    }

    throw new Error('[[error:no-privileges]]');
};
```

**Use Case:** Different permission levels with different capabilities

#### Pattern 9: Combined Ownership OR Membership

```javascript
tasksApi.get = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const task = await Tasks.get(data.taskId);

    // Can view if owner OR organization member
    const isOwner = task.uid === caller.uid;
    const isMember = await Organizations.isMember(task.orgId, caller.uid);

    if (!isOwner && !isMember) {
        throw new Error('[[error:no-privileges]]');
    }

    return task;
};
```

**Use Case:** User can access resource through multiple authorization paths

---

## 5. Controller Layer Patterns

### 5.1 Controller Template

**File:** `src/controllers/write/tasks.js`

```javascript
'use strict';

const api = require('../../api');
const helpers = require('../helpers');

const Tasks = module.exports;

/**
 * POST /api/v3/tasks
 * Create a new task
 */
Tasks.create = async function (req, res) {
    helpers.formatApiResponse(
        200,
        res,
        await api.tasks.create(req, req.body)
    );
};

/**
 * GET /api/v3/tasks/:taskId
 * Get task by ID
 */
Tasks.get = async function (req, res) {
    helpers.formatApiResponse(
        200,
        res,
        await api.tasks.get(req, {
            taskId: req.params.taskId,
        })
    );
};

/**
 * PUT /api/v3/tasks/:taskId
 * Update task
 */
Tasks.update = async function (req, res) {
    helpers.formatApiResponse(
        200,
        res,
        await api.tasks.update(req, {
            taskId: req.params.taskId,
            ...req.body,
        })
    );
};

/**
 * DELETE /api/v3/tasks/:taskId
 * Delete task
 */
Tasks.delete = async function (req, res) {
    await api.tasks.delete(req, {
        taskId: req.params.taskId,
    });
    helpers.formatApiResponse(200, res);
};

/**
 * GET /api/v3/tasks
 * List tasks with pagination
 */
Tasks.list = async function (req, res) {
    helpers.formatApiResponse(
        200,
        res,
        await api.tasks.list(req, {
            page: req.query.page,
            limit: req.query.limit,
            status: req.query.status,
        })
    );
};

/**
 * POST /api/v3/tasks/:taskId/complete
 * Mark task as complete
 */
Tasks.complete = async function (req, res) {
    helpers.formatApiResponse(
        200,
        res,
        await api.tasks.complete(req, {
            taskId: req.params.taskId,
        })
    );
};
```

### 5.2 Controller Patterns

#### Pattern 1: Pass-Through (req.body directly)

```javascript
Tasks.create = async function (req, res) {
    // Pass entire req.body to API layer
    helpers.formatApiResponse(
        200,
        res,
        await api.tasks.create(req, req.body)
    );
};
```

**Use Case:** Create operations where all data comes from request body

#### Pattern 2: Extract from req.params

```javascript
Tasks.get = async function (req, res) {
    // Extract from URL parameters
    helpers.formatApiResponse(
        200,
        res,
        await api.tasks.get(req, {
            taskId: req.params.taskId,
        })
    );
};
```

**Use Case:** Get by ID operations

#### Pattern 3: Merge params + body

```javascript
Tasks.update = async function (req, res) {
    // Merge URL params with request body
    helpers.formatApiResponse(
        200,
        res,
        await api.tasks.update(req, {
            taskId: req.params.taskId,  // From URL
            ...req.body,                // Merge body
        })
    );
};
```

**Use Case:** Update operations where ID comes from URL

#### Pattern 4: Extract from req.query

```javascript
Tasks.list = async function (req, res) {
    // Extract from query string
    helpers.formatApiResponse(
        200,
        res,
        await api.tasks.list(req, {
            page: req.query.page,
            limit: req.query.limit,
            status: req.query.status,
        })
    );
};
```

**Use Case:** List operations with filters and pagination

#### Pattern 5: Nested Controller Structure (Sub-resources)

```javascript
// File: src/controllers/write/tasks.js
const Tasks = module.exports;

// Main resource controllers
Tasks.create = async function (req, res) { /* ... */ };
Tasks.get = async function (req, res) { /* ... */ };

// Sub-resource: task comments
Tasks.comments = {};

Tasks.comments.list = async function (req, res) {
    helpers.formatApiResponse(
        200,
        res,
        await api.tasks.comments.list(req, {
            taskId: req.params.taskId,
        })
    );
};

Tasks.comments.create = async function (req, res) {
    helpers.formatApiResponse(
        200,
        res,
        await api.tasks.comments.create(req, {
            taskId: req.params.taskId,
            ...req.body,
        })
    );
};
```

**Use Case:** Resources with sub-resources (e.g., tasks/:taskId/comments)

### 5.3 Controller Index Registration

**File:** `src/controllers/write/index.js`

```javascript
'use strict';

const Write = module.exports;

Write.users = require('./users');
Write.groups = require('./groups');
Write.tasks = require('./tasks');  // ADD NEW CONTROLLER HERE
```

**Steps:**
1. Open `src/controllers/write/index.js`
2. Add line: `Write.moduleName = require('./moduleName');`
3. Use camelCase for module name in property

---

## 6. Validation Layer (Zod Schemas)

### 6.1 Validation Schema Template

**File:** `src/validations/tasks.js`

```javascript
'use strict';

const { z } = require('zod');

const Tasks = module.exports;

// ==========================================
// COMMON SCHEMAS
// ==========================================

const taskStatusEnum = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);
const taskPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);

// ==========================================
// CREATE TASK SCHEMA
// ==========================================

Tasks.create = z.object({
    title: z.string()
        .min(1, 'Task title is required')
        .max(200, 'Title too long (max 200 characters)'),
    description: z.string()
        .max(5000, 'Description too long (max 5000 characters)')
        .optional()
        .default(''),
    priority: taskPriorityEnum
        .optional()
        .default('medium'),
    dueDate: z.number()
        .int('Due date must be a Unix timestamp')
        .positive('Due date must be positive')
        .optional(),
    assigneeIds: z.array(
        z.string()
            .refine(val => !isNaN(parseInt(val, 10)), 'Invalid user ID')
    ).optional().default([]),
    tags: z.array(z.string()).optional().default([]),
}).refine(
    (data) => {
        // Custom validation: due date must be in future
        if (data.dueDate && data.dueDate < Date.now()) {
            return false;
        }
        return true;
    },
    {
        message: 'Due date must be in the future',
        path: ['dueDate'],
    }
);

// ==========================================
// UPDATE TASK SCHEMA
// ==========================================

Tasks.update = z.object({
    title: z.string()
        .min(1, 'Task title is required')
        .max(200, 'Title too long (max 200 characters)')
        .optional(),
    description: z.string()
        .max(5000, 'Description too long (max 5000 characters)')
        .optional(),
    status: taskStatusEnum.optional(),
    priority: taskPriorityEnum.optional(),
    dueDate: z.number()
        .int('Due date must be a Unix timestamp')
        .positive('Due date must be positive')
        .optional(),
});

// ==========================================
// GET BY ID SCHEMA (URL Parameters)
// ==========================================

Tasks.getById = z.object({
    taskId: z.string()
        .min(1, 'Task ID is required')
        .refine(val => !isNaN(parseInt(val, 10)), 'Invalid task ID'),
});

// ==========================================
// LIST SCHEMA (Query Parameters)
// ==========================================

Tasks.list = z.object({
    page: z.string()
        .optional()
        .refine(val => !val || !isNaN(parseInt(val, 10)), 'Invalid page number')
        .transform(val => parseInt(val || '1', 10)),
    limit: z.string()
        .optional()
        .refine(val => !val || !isNaN(parseInt(val, 10)), 'Invalid limit')
        .transform(val => Math.min(parseInt(val || '20', 10), 100)), // Max 100
    status: taskStatusEnum.optional(),
    priority: taskPriorityEnum.optional(),
});
```

### 6.2 Validation Patterns

#### Pattern 1: Required String with Constraints

```javascript
title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title too long (max 200 characters)')
```

**Use:** Required text fields with length limits

#### Pattern 2: Optional Field with Default

```javascript
priority: z.enum(['low', 'medium', 'high'])
    .optional()
    .default('medium')
```

**Use:** Fields that have sensible defaults

#### Pattern 3: Enum Validation

```javascript
const statusEnum = z.enum(['pending', 'active', 'completed', 'cancelled']);

// Usage
status: statusEnum
```

**Use:** Fixed set of allowed values

#### Pattern 4: Numeric ID Validation (String to Number)

```javascript
taskId: z.string()
    .min(1, 'Task ID is required')
    .refine(val => !isNaN(parseInt(val, 10)), 'Invalid task ID')
```

**Use:** URL parameters that are numeric IDs but come as strings

#### Pattern 5: Array Validation

```javascript
assigneeIds: z.array(
    z.string().refine(val => !isNaN(parseInt(val, 10)), 'Invalid user ID')
).optional().default([])
```

**Use:** Array of items with validation for each item

#### Pattern 6: Cross-Field Validation with .refine()

```javascript
.refine(
    (data) => {
        // Custom logic
        if (data.endDate < data.startDate) {
            return false;
        }
        return true;
    },
    {
        message: 'End date must be after start date',
        path: ['endDate'],  // Which field to mark as invalid
    }
)
```

**Use:** Validation rules that depend on multiple fields

#### Pattern 7: Transform Query String to Number

```javascript
page: z.string()
    .optional()
    .refine(val => !val || !isNaN(parseInt(val, 10)), 'Invalid page')
    .transform(val => parseInt(val || '1', 10))
```

**Use:** Query parameters that should be numbers

#### Pattern 8: Email Validation

```javascript
email: z.string()
    .email('Invalid email address')
    .max(255, 'Email too long')
```

**Use:** Email fields

#### Pattern 9: URL Validation

```javascript
website: z.string()
    .url('Invalid URL')
    .optional()
```

**Use:** URL fields

#### Pattern 10: Date Range Validation

```javascript
z.object({
    startDate: z.number().int().positive(),
    endDate: z.number().int().positive(),
}).refine(
    (data) => data.endDate >= data.startDate,
    {
        message: 'End date must be after or equal to start date',
        path: ['endDate'],
    }
)
```

**Use:** Date ranges

### 6.3 Validation Index Registration

**File:** `src/validations/index.js`

```javascript
'use strict';

module.exports = {
    auth: require('./auth'),
    users: require('./users'),
    groups: require('./groups'),
    organizations: require('./organizations'),
    reports: require('./reports'),
    tasks: require('./tasks'),  // ADD NEW VALIDATION HERE
};
```

**Steps:**
1. Open `src/validations/index.js`
2. Add line: `moduleName: require('./moduleName'),`
3. Use camelCase for module name

---





## 7. Route Layer Patterns

### 7.1 Route Template

**File:** `src/routes/write/tasks.js`

```javascript
'use strict';

const router = require('express').Router();
const middleware = require('../../middleware');
const controllers = require('../../controllers');
const routeHelpers = require('../helpers');
const validate = require('../../middleware/validate');
const schemas = require('../../validations');

const { setupApiRoute } = routeHelpers;

module.exports = function () {
    const middlewares = [middleware.ensureLoggedIn];

    // ==========================================
    // CRUD OPERATIONS
    // ==========================================

    // Create task
    setupApiRoute(
        router,
        'post',
        '/',
        [
            ...middlewares,
            validate.body(schemas.tasks.create),
        ],
        controllers.write.tasks.create
    );

    // List tasks
    setupApiRoute(
        router,
        'get',
        '/',
        [
            ...middlewares,
            validate.query(schemas.tasks.list),
        ],
        controllers.write.tasks.list
    );

    // Get task by ID
    setupApiRoute(
        router,
        'get',
        '/:taskId',
        [
            ...middlewares,
            validate.params(schemas.tasks.getById),
        ],
        controllers.write.tasks.get
    );

    // Update task
    setupApiRoute(
        router,
        'put',
        '/:taskId',
        [
            ...middlewares,
            validate.params(schemas.tasks.getById),
            validate.body(schemas.tasks.update),
        ],
        controllers.write.tasks.update
    );

    // Delete task
    setupApiRoute(
        router,
        'delete',
        '/:taskId',
        [
            ...middlewares,
            validate.params(schemas.tasks.getById),
        ],
        controllers.write.tasks.delete
    );

    // ==========================================
    // SEMANTIC ACTIONS
    // ==========================================

    // Complete task
    setupApiRoute(
        router,
        'post',
        '/:taskId/complete',
        [
            ...middlewares,
            validate.params(schemas.tasks.getById),
        ],
        controllers.write.tasks.complete
    );

    return router;
};
```

### 7.2 setupApiRoute Pattern

**Automatic Middleware Stack:**

Every route defined with `setupApiRoute` automatically receives these middlewares:

```javascript
middleware.autoLocale           // Locale detection
middleware.applyBlacklist       // IP/user blacklist check
middleware.authenticateRequest  // Session/JWT authentication
middleware.maintenanceMode      // Maintenance mode check
middleware.registrationComplete // Registration completion check
middleware.pluginHooks          // Plugin hook execution
middleware.logApiUsage          // API usage logging
upload.any()                    // Multipart form data handling
```

**Then your custom middlewares are applied:**

```javascript
setupApiRoute(
    router,
    'post',
    '/tasks',
    [
        middleware.ensureLoggedIn,              // Your middleware
        validate.body(schemas.tasks.create),    // Your middleware
    ],
    controllers.write.tasks.create
);
```

### 7.3 Common Middleware Combinations

#### Pattern 1: Public Endpoint (No Auth)

```javascript
setupApiRoute(
    router,
    'get',
    '/tasks/public',
    [],  // No middleware
    controllers.write.tasks.listPublic
);
```

#### Pattern 2: Authenticated User

```javascript
setupApiRoute(
    router,
    'post',
    '/tasks',
    [middleware.ensureLoggedIn],
    controllers.write.tasks.create
);
```

#### Pattern 3: Admin Only

```javascript
const organizationMiddleware = require('../../middleware/organizations');

setupApiRoute(
    router,
    'delete',
    '/tasks/:taskId/force',
    [
        middleware.ensureLoggedIn,
        organizationMiddleware.isAdmin,
    ],
    controllers.write.tasks.forceDelete
);
```

#### Pattern 4: Organization Manager

```javascript
setupApiRoute(
    router,
    'post',
    '/tasks/:taskId/archive',
    [
        middleware.ensureLoggedIn,
        organizationMiddleware.isOrganizationManager,
    ],
    controllers.write.tasks.archive
);
```

#### Pattern 5: Validation on Multiple Sources

```javascript
setupApiRoute(
    router,
    'put',
    '/:taskId',
    [
        middleware.ensureLoggedIn,
        validate.params(schemas.tasks.getById),  // Validate URL params
        validate.body(schemas.tasks.update),      // Validate body
    ],
    controllers.write.tasks.update
);
```

### 7.4 Route Registration

**File:** `src/routes/write/index.js`

```javascript
Write.reload = async (params) => {
    const { router } = params;

    // ... existing routes

    router.use('/api/v3/tasks', require('./tasks')());  // ADD NEW ROUTE HERE

    // ... rest of setup
};
```

**Pattern:**
- Use `/api/v3/moduleName` for the base path
- Call the exported function with `()`
- Use plural form for resource name

---

## 8. Middleware Patterns

### 8.1 Custom Authentication Middleware

**File:** `src/middleware/tasks.js`

```javascript
'use strict';

const user = require('../user');
const Tasks = require('../tasks');
const Organizations = require('../organizations');

const Middleware = module.exports;

/**
 * Check if user can manage task (owner or org manager)
 */
Middleware.canManageTask = async function (req, res, next) {
    const { taskId } = req.params;
    const { uid } = req;

    // Admins bypass
    const isAdmin = await user.isAdministrator(uid);
    if (isAdmin) {
        req.isAdmin = true;
        return next();
    }

    // Get task to check ownership
    const task = await Tasks.get(taskId);

    if (!task) {
        return res.status(404).json({
            status: {
                code: 404,
                message: 'Not Found',
            },
            response: {
                error: '[[error:task-not-found]]',
                message: 'Task not found',
            },
        });
    }

    // Check ownership
    const isOwner = task.uid === uid;

    // Check org manager role
    const isOrgManager = task.orgId &&
        await Organizations.isManager(task.orgId, uid);

    if (!isOwner && !isOrgManager) {
        return res.status(403).json({
            status: {
                code: 403,
                message: 'Forbidden',
            },
            response: {
                error: '[[error:no-privileges]]',
                message: 'You do not have permission to manage this task',
            },
        });
    }

    // Store task in request for downstream use
    req.task = task;
    req.isTaskOwner = isOwner;
    req.isTaskOrgManager = isOrgManager;

    next();
};

/**
 * Check if task exists
 */
Middleware.taskExists = async function (req, res, next) {
    const { taskId } = req.params;

    const exists = await Tasks.exists(taskId);

    if (!exists) {
        return res.status(404).json({
            status: {
                code: 404,
                message: 'Not Found',
            },
            response: {
                error: '[[error:task-not-found]]',
                message: 'Task not found',
            },
        });
    }

    next();
};
```

### 8.2 Organization Context Middleware Usage

**Headers Sent by Client:**
```
X-Organization-Id: 123
X-Department-Id: 456
X-User-Id: 789
```

**Automatic Context Extraction:**

The `organizationContext` middleware automatically extracts and caches organization/department data when these headers are present.

**Usage in API Layer:**

```javascript
tasksApi.list = async function (caller, data) {
    // Access organization context
    const orgId = caller.req.organisation?.orgId;
    const deptId = caller.req.department?.deptId;

    // Check permissions (already computed and cached)
    const isMember = caller.req.organisation?.permissions.isMember;
    const isManager = caller.req.organisation?.permissions.isManager;

    if (!isMember) {
        throw new Error('[[error:not-authorized]]');
    }

    // Use context in query
    return await Tasks.listByOrganization(orgId, data);
};
```

**Context Caching:**
- LRU cache with 5-minute TTL
- Max 1000 entries
- Cache key: `org:${orgId}:dept:${deptId}:user:${uid}`

---

## 9. Response Formatting

### 9.1 Success Response Format

All successful responses follow this structure:

```javascript
{
    "status": {
        "code": "ok",           // or "accepted", "no-content"
        "message": "OK"
    },
    "response": {
        // Your data here
        "taskId": "123",
        "title": "Complete project",
        "status": "pending"
    }
}
```

**Status Codes:**
- `200 OK` → `"ok"` (default)
- `202 Accepted` → `"accepted"` (async processing)
- `204 No Content` → `"no-content"` (no response body)

### 9.2 Error Response Format

All error responses follow this structure:

```javascript
{
    "status": {
        "code": "bad-request",  // Error code
        "message": "Validation failed"
    },
    "response": {
        "error": "[[error:validation-failed]]",  // i18n key
        "message": "Task title is required",     // Translated message
        "errors": [                              // Validation details (optional)
            {
                "field": "title",
                "message": "Task title is required"
            }
        ]
    }
}
```

### 9.3 HTTP Status Codes

**Success Codes:**
- `200 OK` - Successful operation (default)
- `201 Created` - Resource created (rarely used, prefer 200)
- `202 Accepted` - Accepted for processing
- `204 No Content` - Successful with no response body

**Client Error Codes:**
- `400 Bad Request` - Validation failures
- `401 Unauthorized` - Not logged in
- `403 Forbidden` - No privileges
- `404 Not Found` - Resource doesn't exist
- `429 Too Many Requests` - Rate limit exceeded

**Server Error Codes:**
- `500 Internal Server Error` - Unexpected errors
- `503 Service Unavailable` - Maintenance mode

### 9.4 i18n Error Keys

**Common Error Keys:**

```javascript
'[[error:not-logged-in]]'
'[[error:no-privileges]]'
'[[error:not-authorized]]'
'[[error:not-found]]'
'[[error:invalid-data]]'
'[[error:invalid-uid]]'
'[[error:invalid-date]]'
'[[error:invalid-date-range]]'
'[[error:organization-not-found]]'
'[[error:department-not-found]]'
```

**Custom Error Keys for Your Module:**

```javascript
'[[error:task-not-found]]'
'[[error:task-already-completed]]'
'[[error:task-cannot-be-deleted]]'
'[[error:due-date-in-past]]'
'[[error:assignee-not-found]]'
```

**Pattern:** `[[error:lowercase-with-hyphens]]`

---

## 10. Complete Working Example: Events Module

This section provides a complete implementation of an "events" module from scratch.

### 10.1 Step-by-Step Implementation

#### Step 1: Add Collection

**File:** `src/database/mongo/collections.js`

```javascript
const collections = {
    // ... existing
    EVENTS: "events",  // ADD THIS LINE
};
```

#### Step 2: Create Database Layer

**File:** `src/events/index.js`

```javascript
'use strict';

const db = require('../database');
const { collections } = require('../database/mongo/collections');
const utils = require('../utils');

const eventsCollection = { collection: collections.EVENTS };
const Events = module.exports;

Events.helpers = require('./helpers');

Events.create = async function (uid, data) {
    const eventId = await db.incrObjectField('global', 'nextEventId');
    const key = `events:${eventId}`;
    const timestamp = utils.date.now();

    const eventData = {
        eventId: String(eventId),
        uid: String(uid),
        orgId: String(data.orgId),
        title: data.title,
        description: data.description || '',
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location || '',
        attendees: [],
        status: 'upcoming',
        createdAt: utils.toISOString(timestamp),
        updatedAt: utils.toISOString(timestamp),
    };

    await db.setObject(key, eventData, eventsCollection);

    await Promise.all([
        db.sortedSetAdd('events:all', timestamp, key),
        db.sortedSetAdd(`events:user:${uid}`, timestamp, key),
        db.sortedSetAdd(`events:org:${data.orgId}`, timestamp, key),
        db.sortedSetAdd('events:status:upcoming', data.startTime, key),
    ]);

    return eventData;
};

Events.get = async function (eventId) {
    const key = `events:${eventId}`;
    const event = await db.getObject(key, [], eventsCollection);

    if (!event) {
        throw new Error('[[error:event-not-found]]');
    }

    return Events.helpers.sanitizeEvent(event);
};

Events.update = async function (eventId, updates) {
    const key = `events:${eventId}`;
    const existing = await db.getObject(key, [], eventsCollection);

    if (!existing) {
        throw new Error('[[error:event-not-found]]');
    }

    const updated = {
        ...existing,
        ...updates,
        updatedAt: utils.toISOString(utils.date.now()),
    };

    await db.setObject(key, updated, eventsCollection);

    return updated;
};

Events.addAttendee = async function (eventId, uid) {
    const key = `events:${eventId}`;
    const event = await db.getObject(key, [], eventsCollection);

    if (!event) {
        throw new Error('[[error:event-not-found]]');
    }

    if (event.attendees.includes(String(uid))) {
        throw new Error('[[error:already-attending]]');
    }

    event.attendees.push(String(uid));
    await db.setObjectField(key, 'attendees', event.attendees, eventsCollection);
    await db.sortedSetAdd(`event:${eventId}:attendees`, Date.now(), String(uid));

    return { success: true };
};

Events.listByOrganization = async function (orgId, page = 1, limit = 20) {
    const start = (page - 1) * limit;
    const stop = start + limit - 1;

    const keys = await db.getSortedSetRevRange(
        `events:org:${orgId}`,
        start,
        stop
    );

    const events = await db.getObjects(keys, eventsCollection);
    const count = await db.sortedSetCard(`events:org:${orgId}`);

    return {
        events: events.filter(Boolean).map(Events.helpers.sanitizeEvent),
        pagination: {
            page,
            limit,
            total: count,
            pages: Math.ceil(count / limit),
        },
    };
};
```

#### Step 3: Create Helpers

**File:** `src/events/helpers.js`

```javascript
'use strict';

const Helpers = module.exports;

Helpers.sanitizeEvent = function (event) {
    if (!event) {
        return null;
    }

    return {
        eventId: event.eventId,
        title: event.title,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        attendeeCount: event.attendees?.length || 0,
        status: event.status,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
    };
};
```

#### Step 4: Create Validation Schemas

**File:** `src/validations/events.js`

```javascript
'use strict';

const { z } = require('zod');

const Events = module.exports;

const eventStatusEnum = z.enum(['upcoming', 'ongoing', 'completed', 'cancelled']);

Events.create = z.object({
    title: z.string()
        .min(1, 'Event title is required')
        .max(200, 'Title too long'),
    description: z.string()
        .max(5000, 'Description too long')
        .optional()
        .default(''),
    orgId: z.string()
        .min(1, 'Organization ID is required')
        .refine(val => !isNaN(parseInt(val, 10)), 'Invalid organization ID'),
    startTime: z.number()
        .int('Start time must be a Unix timestamp')
        .positive('Start time must be positive'),
    endTime: z.number()
        .int('End time must be a Unix timestamp')
        .positive('End time must be positive'),
    location: z.string()
        .max(500, 'Location too long')
        .optional()
        .default(''),
}).refine(
    (data) => data.endTime > data.startTime,
    {
        message: 'End time must be after start time',
        path: ['endTime'],
    }
);

Events.update = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    startTime: z.number().int().positive().optional(),
    endTime: z.number().int().positive().optional(),
    location: z.string().max(500).optional(),
    status: eventStatusEnum.optional(),
});

Events.getById = z.object({
    eventId: z.string()
        .min(1, 'Event ID is required')
        .refine(val => !isNaN(parseInt(val, 10)), 'Invalid event ID'),
});

Events.list = z.object({
    orgId: z.string()
        .min(1, 'Organization ID is required')
        .refine(val => !isNaN(parseInt(val, 10)), 'Invalid organization ID'),
    page: z.string()
        .optional()
        .transform(val => parseInt(val || '1', 10)),
    limit: z.string()
        .optional()
        .transform(val => Math.min(parseInt(val || '20', 10), 100)),
});
```

#### Step 5: Register Validation

**File:** `src/validations/index.js`

```javascript
module.exports = {
    // ... existing
    events: require('./events'),  // ADD THIS LINE
};
```

#### Step 6: Create API Layer

**File:** `src/api/events.js`

```javascript
'use strict';

const Events = require('../events');
const Organizations = require('../organizations');
const user = require('../user');

const eventsApi = module.exports;

eventsApi.create = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const isMember = await Organizations.isMember(data.orgId, caller.uid);
    if (!isMember) {
        throw new Error('[[error:not-authorized]]');
    }

    return await Events.create(caller.uid, data);
};

eventsApi.get = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const event = await Events.get(data.eventId);

    const isMember = await Organizations.isMember(event.orgId, caller.uid);
    if (!isMember) {
        throw new Error('[[error:no-privileges]]');
    }

    return event;
};

eventsApi.update = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const event = await Events.get(data.eventId);

    const isOwner = event.uid === caller.uid;
    const isAdmin = await user.isAdministrator(caller.uid);
    const isOrgManager = await Organizations.isManager(event.orgId, caller.uid);

    if (!isOwner && !isAdmin && !isOrgManager) {
        throw new Error('[[error:no-privileges]]');
    }

    return await Events.update(data.eventId, data);
};

eventsApi.list = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const isMember = await Organizations.isMember(data.orgId, caller.uid);
    if (!isMember) {
        throw new Error('[[error:not-authorized]]');
    }

    return await Events.listByOrganization(
        data.orgId,
        data.page,
        data.limit
    );
};

eventsApi.attend = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const event = await Events.get(data.eventId);

    const isMember = await Organizations.isMember(event.orgId, caller.uid);
    if (!isMember) {
        throw new Error('[[error:not-authorized]]');
    }

    return await Events.addAttendee(data.eventId, caller.uid);
};
```

#### Step 7: Create Controller

**File:** `src/controllers/write/events.js`

```javascript
'use strict';

const api = require('../../api');
const helpers = require('../helpers');

const Events = module.exports;

Events.create = async function (req, res) {
    helpers.formatApiResponse(
        200,
        res,
        await api.events.create(req, req.body)
    );
};

Events.get = async function (req, res) {
    helpers.formatApiResponse(
        200,
        res,
        await api.events.get(req, {
            eventId: req.params.eventId,
        })
    );
};

Events.update = async function (req, res) {
    helpers.formatApiResponse(
        200,
        res,
        await api.events.update(req, {
            eventId: req.params.eventId,
            ...req.body,
        })
    );
};

Events.list = async function (req, res) {
    helpers.formatApiResponse(
        200,
        res,
        await api.events.list(req, {
            orgId: req.query.orgId,
            page: req.query.page,
            limit: req.query.limit,
        })
    );
};

Events.attend = async function (req, res) {
    helpers.formatApiResponse(
        200,
        res,
        await api.events.attend(req, {
            eventId: req.params.eventId,
        })
    );
};
```

#### Step 8: Register Controller

**File:** `src/controllers/write/index.js`

```javascript
Write.events = require('./events');  // ADD THIS LINE
```

#### Step 9: Create Routes

**File:** `src/routes/write/events.js`

```javascript
'use strict';

const router = require('express').Router();
const middleware = require('../../middleware');
const controllers = require('../../controllers');
const routeHelpers = require('../helpers');
const validate = require('../../middleware/validate');
const schemas = require('../../validations');

const { setupApiRoute } = routeHelpers;

module.exports = function () {
    const middlewares = [middleware.ensureLoggedIn];

    setupApiRoute(
        router,
        'post',
        '/',
        [
            ...middlewares,
            validate.body(schemas.events.create),
        ],
        controllers.write.events.create
    );

    setupApiRoute(
        router,
        'get',
        '/',
        [
            ...middlewares,
            validate.query(schemas.events.list),
        ],
        controllers.write.events.list
    );

    setupApiRoute(
        router,
        'get',
        '/:eventId',
        [
            ...middlewares,
            validate.params(schemas.events.getById),
        ],
        controllers.write.events.get
    );

    setupApiRoute(
        router,
        'put',
        '/:eventId',
        [
            ...middlewares,
            validate.params(schemas.events.getById),
            validate.body(schemas.events.update),
        ],
        controllers.write.events.update
    );

    setupApiRoute(
        router,
        'post',
        '/:eventId/attend',
        [
            ...middlewares,
            validate.params(schemas.events.getById),
        ],
        controllers.write.events.attend
    );

    return router;
};
```

#### Step 10: Register Routes

**File:** `src/routes/write/index.js`

```javascript
router.use('/api/v3/events', require('./events')());  // ADD THIS LINE
```

---

## 11. Testing Patterns

### 11.1 Manual Testing with cURL

**Create Event:**

```bash
curl -X POST http://localhost:4567/api/v3/events \
  -H "Content-Type: application/json" \
  -H "Cookie: express.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "title": "Team Meeting",
    "description": "Weekly sync",
    "orgId": "1",
    "startTime": 1738800000000,
    "endTime": 1738803600000,
    "location": "Conference Room A"
  }'
```

**Get Event:**

```bash
curl -X GET http://localhost:4567/api/v3/events/1 \
  -H "Cookie: express.sid=YOUR_SESSION_COOKIE"
```

**Update Event:**

```bash
curl -X PUT http://localhost:4567/api/v3/events/1 \
  -H "Content-Type: application/json" \
  -H "Cookie: express.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "title": "Updated Meeting Title",
    "status": "completed"
  }'
```

**List Events:**

```bash
curl -X GET "http://localhost:4567/api/v3/events?orgId=1&page=1&limit=20" \
  -H "Cookie: express.sid=YOUR_SESSION_COOKIE"
```

### 11.2 Common Testing Scenarios

**Test: Authentication Required (401)**

```bash
curl -X POST http://localhost:4567/api/v3/events \
  -H "Content-Type: application/json" \
  -d '{"title": "Test"}'
# Expected: 401 Unauthorized
```

**Test: Validation Failure (400)**

```bash
curl -X POST http://localhost:4567/api/v3/events \
  -H "Content-Type: application/json" \
  -H "Cookie: express.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "title": "",
    "orgId": "invalid"
  }'
# Expected: 400 Bad Request with validation errors
```

**Test: Authorization Failure (403)**

```bash
curl -X GET http://localhost:4567/api/v3/events/1 \
  -H "Cookie: express.sid=DIFFERENT_USER_COOKIE"
# Expected: 403 Forbidden if not org member
```

**Test: Not Found (404)**

```bash
curl -X GET http://localhost:4567/api/v3/events/999999 \
  -H "Cookie: express.sid=YOUR_SESSION_COOKIE"
# Expected: 404 Not Found
```

---

## 12. Common Pitfalls & Troubleshooting

### Pitfall 1: Forgetting Collection Specification

```javascript
// ✗ WRONG - Uses default "objects" collection
await db.setObject(key, data);

// ✓ CORRECT - Specifies collection
const collection = { collection: collections.EVENTS };
await db.setObject(key, data, collection);
```

**Problem:** Data goes to wrong collection, hard to query later

### Pitfall 2: Not Updating Indexes

```javascript
// ✗ WRONG - Updates data but not indexes
await db.setObject(key, { ...existing, status: 'completed' }, collection);

// ✓ CORRECT - Updates both data and indexes
await db.setObject(key, { ...existing, status: 'completed' }, collection);
await Promise.all([
    db.sortedSetRemove(`events:status:${existing.status}`, key),
    db.sortedSetAdd('events:status:completed', Date.now(), key),
]);
```

**Problem:** Queries by status will return stale data

### Pitfall 3: Inconsistent Error Messages

```javascript
// ✗ WRONG - Plain English error
throw new Error('Event not found');

// ✓ CORRECT - i18n error key
throw new Error('[[error:event-not-found]]');
```

**Problem:** Errors won't be translated, inconsistent format

### Pitfall 4: Missing Authorization Checks

```javascript
// ✗ WRONG - No authorization check
eventsApi.delete = async function (caller, data) {
    return await Events.delete(data.eventId);
};

// ✓ CORRECT - Proper authorization
eventsApi.delete = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const event = await Events.get(data.eventId);
    const isOwner = event.uid === caller.uid;
    const isAdmin = await user.isAdministrator(caller.uid);

    if (!isOwner && !isAdmin) {
        throw new Error('[[error:no-privileges]]');
    }

    return await Events.delete(data.eventId);
};
```

**Problem:** Anyone can delete any event

### Pitfall 5: Incorrect Timestamp Usage

```javascript
// ✗ WRONG - Using Date.now() for ISO strings
createdAt: Date.now()  // Returns number, not ISO string

// ✓ CORRECT - Use utils.toISOString
createdAt: utils.toISOString(utils.date.now())

// ✗ WRONG - Using Date.now() for Unix timestamps
timestamp: new Date().toISOString()  // Returns string, not number

// ✓ CORRECT - Use utils.date.now()
timestamp: utils.date.now()
```

**Problem:** Incorrect data types, sorting breaks

---

## 13. Quick Reference Tables

### 13.1 Database Operations Cheat Sheet

| Operation | Method | Example |
|-----------|--------|---------|
| Create single object | `db.setObject(key, data, collection)` | `await db.setObject('tasks:1', {title: 'Task'}, coll)` |
| Get single object | `db.getObject(key, fields, collection)` | `await db.getObject('tasks:1', [], coll)` |
| Get multiple objects | `db.getObjects(keys, collection)` | `await db.getObjects(['tasks:1', 'tasks:2'], coll)` |
| Update single field | `db.setObjectField(key, field, value, coll)` | `await db.setObjectField('tasks:1', 'status', 'done', coll)` |
| Get single field | `db.getObjectField(key, field)` | `await db.getObjectField('tasks:1', 'status')` |
| Delete object | `db.delete(key)` | `await db.delete('tasks:1')` |
| Check exists | `db.exists(key)` | `await db.exists('tasks:1')` |
| Sorted set add | `db.sortedSetAdd(key, score, value)` | `await db.sortedSetAdd('tasks:all', Date.now(), 'tasks:1')` |
| Sorted set range | `db.getSortedSetRange(key, start, stop)` | `await db.getSortedSetRange('tasks:all', 0, 19)` |
| Sorted set rev range | `db.getSortedSetRevRange(key, start, stop)` | `await db.getSortedSetRevRange('tasks:all', 0, 19)` |
| Sorted set remove | `db.sortedSetRemove(key, value)` | `await db.sortedSetRemove('tasks:all', 'tasks:1')` |
| Sorted set card | `db.sortedSetCard(key)` | `await db.sortedSetCard('tasks:all')` |
| Set add | `db.setAdd(key, value)` | `await db.setAdd('task:1:tags', 'urgent')` |
| Set members | `db.getSetMembers(key)` | `await db.getSetMembers('task:1:tags')` |
| Set remove | `db.setRemove(key, value)` | `await db.setRemove('task:1:tags', 'urgent')` |
| Increment | `db.incrObjectField(key, field)` | `await db.incrObjectField('global', 'nextTaskId')` |

### 13.2 Middleware Reference

| Middleware | Purpose | Usage |
|------------|---------|-------|
| `middleware.ensureLoggedIn` | Require authentication | Most authenticated routes |
| `middleware.rateLimit` | Rate limiting | API endpoints prone to abuse |
| `organizationMiddleware.isAdmin` | NodeBB admin only | Admin operations |
| `organizationMiddleware.isOrganizationManager` | Org manager only | Org management |
| `organizationMiddleware.isDepartmentManager` | Dept manager only | Dept operations |
| `organizationMiddleware.isOrganizationMember` | Org member only | View org data |
| `organizationMiddleware.organizationExists` | Check org exists | Before org operations |
| `organizationMiddleware.departmentExists` | Check dept exists | Before dept operations |
| `validate.body(schema)` | Validate request body | POST/PUT requests |
| `validate.query(schema)` | Validate query params | GET requests with params |
| `validate.params(schema)` | Validate URL params | Routes with :id |

### 13.3 Validation Schema Patterns

| Pattern | Zod Schema | Use Case |
|---------|------------|----------|
| Required string | `z.string().min(1, 'Required').max(200, 'Too long')` | Text fields |
| Optional with default | `z.string().optional().default('')` | Optional fields |
| Enum | `z.enum(['pending', 'active', 'completed'])` | Fixed values |
| Number ID from string | `z.string().refine(val => !isNaN(parseInt(val)), 'Invalid')` | URL params |
| Array of strings | `z.array(z.string()).optional().default([])` | Lists |
| Unix timestamp | `z.number().int().positive()` | Dates/times |
| Email | `z.string().email('Invalid email').max(255)` | Email fields |
| URL | `z.string().url('Invalid URL').optional()` | URL fields |
| Query to number | `z.string().optional().transform(val => parseInt(val \|\| '1'))` | Pagination |
| Cross-field validation | `.refine((data) => data.end > data.start, {...})` | Date ranges |

---

## Conclusion

You now have a comprehensive reference for creating new backend modules in the DeepThought backend system. Follow the patterns documented here to ensure consistency across the codebase.

**Key Takeaways:**

1. **Always specify collection** when using database operations
2. **Maintain indexes** when updating indexed fields
3. **Use i18n error keys** for consistency
4. **Check authorization** in API layer
5. **Follow naming conventions** throughout
6. **Validate at route layer** with Zod schemas
7. **Format responses** with helpers.formatApiResponse()
8. **Test thoroughly** with different scenarios

For questions or issues, refer back to the relevant section in this guide.
