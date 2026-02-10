# DeepThought Backend - API Creation Guide (Minimal)

**Version:** 1.0-minimal
**Purpose:** Self-contained, token-efficient guide for creating REST APIs
**Scope:** Everything needed to create basic CRUD APIs - no external references

---

## Essential Architecture Context

### Request Flow
```
HTTP Request
  ↓ Route Layer (Express) - Define endpoints, apply middleware
  ↓ Controller Layer - Extract request data, call API
  ↓ API Layer - Business logic, authorization checks
  ↓ Database Layer - CRUD operations, data persistence
  ↓ Response (JSON)
```

### Layer Responsibilities
| Layer | Does | Doesn't Do |
|-------|------|-----------|
| **Routes** | Define endpoints, apply middleware | Business logic, DB access |
| **Controllers** | Extract req data, format responses | Authorization, validation |
| **API** | Business logic, auth checks | Direct DB operations |
| **Database** | CRUD operations, queries | Authorization, HTTP concerns |

### Technology Stack
- **Framework:** Express.js with setupApiRoute helper
- **Database:** MongoDB (abstracted via db module)
- **Validation:** Zod schemas
- **Auth:** Passport.js (middleware: ensureLoggedIn, etc.)

### File Organization
```
src/
├── validations/           # Zod schemas
├── api/                   # Business logic & auth
├── controllers/write/     # Request handlers
├── routes/write/          # Route definitions
├── <module>/             # Database layer (if new entity)
└── database/mongo/collections.js  # Collection registry
```

---

## Decision Tree: What Do I Need?

### ✅ Always Required (For Any API)
- [ ] Validation schema → `src/validations/<module>.js`
- [ ] API layer → `src/api/<module>.js`
- [ ] Controller → `src/controllers/write/<module>.js`
- [ ] Routes → `src/routes/write/<module>.js`
- [ ] Register validation → `src/validations/index.js`
- [ ] Register controller → `src/controllers/write/index.js`
- [ ] Register routes → `src/routes/write/index.js`

### ✅ Sometimes Required
- [ ] Database layer → `src/<module>/index.js` (if creating new entity)
- [ ] Collection registration → `src/database/mongo/collections.js` (if new collection)
- [ ] Custom middleware → `src/middleware/<module>.js` (if complex authorization)

### ✗ Rarely Needed
- Socket.io events (real-time features)
- Custom helpers (complex business logic)
- Plugin hooks (extending system)

---

## File Creation Checklist

| Step | File to Create | Purpose | Register In |
|------|---------------|---------|-------------|
| 1 | `src/validations/<module>.js` | Input validation with Zod | `src/validations/index.js` |
| 2 | `src/api/<module>.js` | Business logic + authorization | *(auto-loaded)* |
| 3 | `src/controllers/write/<module>.js` | Request handlers | `src/controllers/write/index.js` |
| 4 | `src/routes/write/<module>.js` | Route definitions | `src/routes/write/index.js` |
| 5 | `src/<module>/index.js` *(optional)* | Database operations for new entity | *(auto-loaded)* |
| 6 | `src/database/mongo/collections.js` *(if #5)* | Add collection constant | *(file edit)* |

**Order of Implementation:** Follow steps 1→6 in sequence

---

## Template 1: Validation Schemas

**File:** `src/validations/<module>.js`

```javascript
'use strict';

const { z } = require('zod');

const Module = module.exports;

// Common enums (reusable)
const statusEnum = z.enum(['pending', 'active', 'completed']);

// CREATE schema
Module.create = z.object({
    title: z.string()
        .min(1, 'Title is required')
        .max(200, 'Title too long'),
    description: z.string()
        .max(5000, 'Description too long')
        .optional()
        .default(''),
    status: statusEnum.optional().default('pending'),
    dueDate: z.number()
        .int('Must be Unix timestamp')
        .positive('Must be positive')
        .optional(),
});

// UPDATE schema (all fields optional)
Module.update = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    status: statusEnum.optional(),
});

// GET BY ID schema (URL params validation)
Module.getById = z.object({
    itemId: z.string()
        .min(1, 'ID is required')
        .refine(val => !isNaN(parseInt(val, 10)), 'Invalid ID'),
});

// LIST schema (query params with pagination)
Module.list = z.object({
    page: z.string()
        .optional()
        .transform(val => parseInt(val || '1', 10)),
    limit: z.string()
        .optional()
        .transform(val => Math.min(parseInt(val || '20', 10), 100)), // Max 100
    status: statusEnum.optional(),
});
```

**Register in** `src/validations/index.js`:
```javascript
module.exports = {
    // ... existing
    modulename: require('./modulename'),  // ADD THIS
};
```

---

## Template 2: API Layer

**File:** `src/api/<module>.js`

```javascript
'use strict';

const Module = require('../<module>');  // Database layer (if exists)
const user = require('../user');
const Organizations = require('../organizations');

const moduleApi = module.exports;

/**
 * Create new item
 * Authorization: Must be logged in
 */
moduleApi.create = async function (caller, data) {
    // 1. Check authentication
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    // 2. Call database layer
    return await Module.create(caller.uid, data);
};

/**
 * Get item by ID
 * Authorization: Must be owner or org member
 */
moduleApi.get = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const item = await Module.get(data.itemId);

    // Check ownership or membership
    const canView = item.uid === caller.uid ||
                    await Organizations.isMember(item.orgId, caller.uid);

    if (!canView) {
        throw new Error('[[error:no-privileges]]');
    }

    return item;
};

/**
 * Update item
 * Authorization: Must be owner, org manager, or admin
 */
moduleApi.update = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const item = await Module.get(data.itemId);

    // Admin bypass (admins can do anything)
    const isAdmin = await user.isAdministrator(caller.uid);
    if (isAdmin) {
        return await Module.update(data.itemId, data);
    }

    // Check ownership or org manager
    const isOwner = item.uid === caller.uid;
    const isOrgManager = await Organizations.isManager(item.orgId, caller.uid);

    if (!isOwner && !isOrgManager) {
        throw new Error('[[error:no-privileges]]');
    }

    return await Module.update(data.itemId, data);
};

/**
 * Delete item
 * Authorization: Must be owner or admin
 */
moduleApi.delete = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const item = await Module.get(data.itemId);

    const isOwner = item.uid === caller.uid;
    const isAdmin = await user.isAdministrator(caller.uid);

    if (!isOwner && !isAdmin) {
        throw new Error('[[error:no-privileges]]');
    }

    return await Module.delete(data.itemId);
};

/**
 * List user's items
 * Authorization: Must be logged in
 */
moduleApi.list = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    return await Module.list(caller.uid, data.page, data.limit);
};
```

---

## Template 3: Controller Layer

**File:** `src/controllers/write/<module>.js`

```javascript
'use strict';

const api = require('../../api');
const helpers = require('../helpers');

const Module = module.exports;

/**
 * POST /api/v3/<module>
 */
Module.create = async function (req, res) {
    helpers.formatApiResponse(
        200,
        res,
        await api.<module>.create(req, req.body)
    );
};

/**
 * GET /api/v3/<module>/:itemId
 */
Module.get = async function (req, res) {
    helpers.formatApiResponse(
        200,
        res,
        await api.<module>.get(req, {
            itemId: req.params.itemId,
        })
    );
};

/**
 * PUT /api/v3/<module>/:itemId
 */
Module.update = async function (req, res) {
    helpers.formatApiResponse(
        200,
        res,
        await api.<module>.update(req, {
            itemId: req.params.itemId,
            ...req.body,  // Merge URL param with body
        })
    );
};

/**
 * DELETE /api/v3/<module>/:itemId
 */
Module.delete = async function (req, res) {
    await api.<module>.delete(req, {
        itemId: req.params.itemId,
    });
    helpers.formatApiResponse(200, res);  // No response body
};

/**
 * GET /api/v3/<module>
 */
Module.list = async function (req, res) {
    helpers.formatApiResponse(
        200,
        res,
        await api.<module>.list(req, {
            page: req.query.page,
            limit: req.query.limit,
            status: req.query.status,
        })
    );
};
```

**Register in** `src/controllers/write/index.js`:
```javascript
Write.modulename = require('./modulename');  // ADD THIS
```

---

## Template 4: Route Layer

**File:** `src/routes/write/<module>.js`

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
    const middlewares = [middleware.ensureLoggedIn];  // Auth required for all

    // CREATE: POST /api/v3/<module>
    setupApiRoute(
        router,
        'post',
        '/',
        [
            ...middlewares,
            validate.body(schemas.<module>.create),  // Validate request body
        ],
        controllers.write.<module>.create
    );

    // LIST: GET /api/v3/<module>
    setupApiRoute(
        router,
        'get',
        '/',
        [
            ...middlewares,
            validate.query(schemas.<module>.list),  // Validate query params
        ],
        controllers.write.<module>.list
    );

    // GET: GET /api/v3/<module>/:itemId
    setupApiRoute(
        router,
        'get',
        '/:itemId',
        [
            ...middlewares,
            validate.params(schemas.<module>.getById),  // Validate URL params
        ],
        controllers.write.<module>.get
    );

    // UPDATE: PUT /api/v3/<module>/:itemId
    setupApiRoute(
        router,
        'put',
        '/:itemId',
        [
            ...middlewares,
            validate.params(schemas.<module>.getById),
            validate.body(schemas.<module>.update),
        ],
        controllers.write.<module>.update
    );

    // DELETE: DELETE /api/v3/<module>/:itemId
    setupApiRoute(
        router,
        'delete',
        '/:itemId',
        [
            ...middlewares,
            validate.params(schemas.<module>.getById),
        ],
        controllers.write.<module>.delete
    );

    return router;
};
```

**📝 setupApiRoute automatically applies:** authentication, blacklist, locale, maintenance mode, plugin hooks

**Register in** `src/routes/write/index.js`:
```javascript
router.use('/api/v3/<module>', require('./<module>')());  // ADD THIS
```

---

## Template 5: Database Layer (Optional - For New Entities)

**File:** `src/<module>/index.js`

```javascript
'use strict';

const db = require('../database');
const { collections } = require('../database/mongo/collections');
const utils = require('../utils');

// Specify collection (CRITICAL - data goes to wrong place without this)
const moduleCollection = { collection: collections.MODULE };

const Module = module.exports;

/**
 * Create new item
 */
Module.create = async function (uid, data) {
    // 1. Generate unique ID
    const itemId = await db.incrObjectField('global', 'nextItemId');
    const key = `items:${itemId}`;
    const timestamp = utils.date.now();

    // 2. Build data object
    const itemData = {
        itemId: String(itemId),
        uid: String(uid),
        title: data.title,
        description: data.description || '',
        status: data.status || 'pending',
        createdAt: utils.toISOString(timestamp),  // Human-readable ISO string
        updatedAt: utils.toISOString(timestamp),
    };

    // 3. Save to database
    await db.setObject(key, itemData, moduleCollection);

    // 4. Maintain indexes for queries (score = timestamp for ordering)
    await Promise.all([
        db.sortedSetAdd('items:all', timestamp, key),
        db.sortedSetAdd(`items:user:${uid}`, timestamp, key),
        db.sortedSetAdd(`items:status:${itemData.status}`, timestamp, key),
    ]);

    return itemData;
};

/**
 * Get item by ID
 */
Module.get = async function (itemId) {
    const key = `items:${itemId}`;
    const item = await db.getObject(key, [], moduleCollection);  // [] = all fields

    if (!item) {
        throw new Error('[[error:item-not-found]]');
    }

    return item;
};

/**
 * Update item
 */
Module.update = async function (itemId, updates) {
    const key = `items:${itemId}`;

    // 1. Get existing data
    const existing = await db.getObject(key, [], moduleCollection);
    if (!existing) {
        throw new Error('[[error:item-not-found]]');
    }

    // 2. Merge updates
    const updated = {
        ...existing,
        ...updates,
        updatedAt: utils.toISOString(utils.date.now()),
    };

    // 3. Save back
    await db.setObject(key, updated, moduleCollection);

    // 4. Update indexes if indexed field changed
    if (updates.status && updates.status !== existing.status) {
        const timestamp = utils.date.now();
        await Promise.all([
            db.sortedSetRemove(`items:status:${existing.status}`, key),
            db.sortedSetAdd(`items:status:${updates.status}`, timestamp, key),
        ]);
    }

    return updated;
};

/**
 * Delete item (soft delete)
 */
Module.delete = async function (itemId) {
    const key = `items:${itemId}`;
    const item = await db.getObject(key, [], moduleCollection);

    // Mark as deleted
    await db.setObjectField(key, 'state', 'deleted', moduleCollection);
    await db.setObjectField(key, 'deletedAt', utils.toISOString(utils.date.now()), moduleCollection);

    // Remove from active indexes
    await Promise.all([
        db.sortedSetRemove('items:all', key),
        db.sortedSetRemove(`items:user:${item.uid}`, key),
        db.sortedSetRemove(`items:status:${item.status}`, key),
    ]);
};

/**
 * List items with pagination
 */
Module.list = async function (uid, page = 1, limit = 20) {
    // Calculate range
    const start = (page - 1) * limit;
    const stop = start + limit - 1;

    // Get keys from sorted set (newest first = RevRange)
    const keys = await db.getSortedSetRevRange(
        `items:user:${uid}`,
        start,
        stop
    );

    // Bulk fetch objects
    const items = await db.getObjects(keys, moduleCollection);

    // Get total count
    const count = await db.sortedSetCard(`items:user:${uid}`);

    return {
        items: items.filter(Boolean),  // Remove nulls
        pagination: {
            page,
            limit,
            total: count,
            pages: Math.ceil(count / limit),
        },
    };
};
```

**Add collection to** `src/database/mongo/collections.js`:
```javascript
const collections = {
    // ... existing
    MODULE: "module",  // ADD THIS (lowercase collection name)
};
```

---

## Naming Conventions

| What | Pattern | Example | Why |
|------|---------|---------|-----|
| **Files** | Plural lowercase | `tasks.js` | RESTful resource naming |
| **Routes** | `/api/v3/<plural>` | `/api/v3/tasks` | RESTful convention |
| **IDs** | Shortened with Id suffix | `taskId`, `orgId`, `uid` | Consistency across codebase |
| **DB Keys** | Colon-separated | `tasks:123`, `tasks:user:456` | Namespace organization |
| **Index Sets** | `entity:dimension` | `tasks:status:pending` | Query by dimension |
| **Errors** | i18n keys | `[[error:task-not-found]]` | Internationalization support |

**ID Naming Standards:**
- `uid` = User ID
- `tid` = Topic ID
- `pid` = Post ID
- `cid` = Category ID
- `orgId` = Organization ID
- `deptId` = Department ID
- `taskId` = Task ID (custom - avoid conflicts with `tid`)

---

## Authorization Patterns

### Pattern 1: Logged In Only
```javascript
moduleApi.create = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }
    // Proceed with operation
    return await Module.create(caller.uid, data);
};
```
**Use when:** Any authenticated user can perform the action

### Pattern 2: Owner or Admin
```javascript
moduleApi.update = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    const item = await Module.get(data.itemId);

    // Admin bypass
    const isAdmin = await user.isAdministrator(caller.uid);
    if (isAdmin) {
        return await Module.update(data.itemId, data);
    }

    // Check ownership
    if (item.uid !== caller.uid) {
        throw new Error('[[error:no-privileges]]');
    }

    return await Module.update(data.itemId, data);
};
```
**Use when:** User can modify their own resources, admins can modify any

### Pattern 3: Organization Member
```javascript
moduleApi.list = async function (caller, data) {
    if (!caller.uid) {
        throw new Error('[[error:not-logged-in]]');
    }

    // Check organization membership
    const isMember = await Organizations.isMember(data.orgId, caller.uid);
    if (!isMember) {
        throw new Error('[[error:not-authorized]]');
    }

    return await Module.listByOrganization(data.orgId, data.page, data.limit);
};
```
**Use when:** Resource belongs to organization, user must be member

---

## Database Operations Reference

| Operation | Method | Example | When to Use |
|-----------|--------|---------|-------------|
| **Create** | `db.setObject(key, data, coll)` | `db.setObject('tasks:1', {title: 'Task'}, coll)` | New entity |
| **Get** | `db.getObject(key, [], coll)` | `db.getObject('tasks:1', [], coll)` | Fetch single |
| **Get Multiple** | `db.getObjects(keys, coll)` | `db.getObjects(['tasks:1', 'tasks:2'], coll)` | Bulk fetch |
| **Update Field** | `db.setObjectField(key, field, val, coll)` | `db.setObjectField('tasks:1', 'status', 'done', coll)` | Single field change |
| **Delete** | `db.delete(key)` | `db.delete('tasks:1')` | Hard delete (rare) |
| **Exists** | `db.exists(key)` | `db.exists('tasks:1')` | Check existence |
| **Index Add** | `db.sortedSetAdd(key, score, value)` | `db.sortedSetAdd('tasks:all', Date.now(), 'tasks:1')` | Add to index |
| **Index Remove** | `db.sortedSetRemove(key, value)` | `db.sortedSetRemove('tasks:all', 'tasks:1')` | Remove from index |
| **Query Index** | `db.getSortedSetRevRange(key, start, stop)` | `db.getSortedSetRevRange('tasks:all', 0, 19)` | Get newest 20 |
| **Count** | `db.sortedSetCard(key)` | `db.sortedSetCard('tasks:all')` | Total items |
| **Auto-increment** | `db.incrObjectField(key, field)` | `db.incrObjectField('global', 'nextTaskId')` | Generate IDs |

**Timestamps:**
- For sorting: `utils.date.now()` → Unix timestamp (number)
- For display: `utils.toISOString(timestamp)` → ISO string

---

## Common Pitfalls & Solutions

| ✗ Mistake | ✅ Solution | Why |
|-----------|------------|-----|
| **Forgetting collection** | Always pass `{ collection: collections.MODULE }` | Without it, data goes to default "objects" collection |
| **Not updating indexes** | Update sorted sets when indexed fields change | Queries return stale data |
| **Plain English errors** | Use `[[error:i18n-key]]` format | Enables internationalization |
| **Missing authorization** | Always check `caller.uid` and permissions | Security vulnerability |
| **Wrong timestamp format** | Use `utils.toISOString()` for strings, `utils.date.now()` for numbers | Sorting/display breaks |

---

## Response Formats

### Success Response
```javascript
{
    "status": {
        "code": "ok",
        "message": "OK"
    },
    "response": {
        "itemId": "123",
        "title": "Task Title"
    }
}
```

### Error Response
```javascript
{
    "status": {
        "code": "bad-request",
        "message": "Validation failed"
    },
    "response": {
        "error": "[[error:validation-failed]]",
        "message": "Title is required"
    }
}
```

**Common i18n Error Keys:**
- `[[error:not-logged-in]]` - 401
- `[[error:no-privileges]]` - 403
- `[[error:not-authorized]]` - 403
- `[[error:not-found]]` - 404
- `[[error:invalid-data]]` - 400

---

## Quick Implementation Steps

1. **Create validation schema** → `src/validations/<module>.js` (copy Template 1)
2. **Register validation** → Add to `src/validations/index.js`
3. **Create API layer** → `src/api/<module>.js` (copy Template 2)
4. **Create controller** → `src/controllers/write/<module>.js` (copy Template 3)
5. **Register controller** → Add to `src/controllers/write/index.js`
6. **Create routes** → `src/routes/write/<module>.js` (copy Template 4)
7. **Register routes** → Add to `src/routes/write/index.js`
8. **If new entity:** Create database layer → `src/<module>/index.js` (copy Template 5)
9. **If new collection:** Add to `src/database/mongo/collections.js`
10. **Test:** Start server, test endpoints with Postman/cURL

**That's it!** You now have a working CRUD API.
