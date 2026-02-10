# Backend Module Implementation Prompt Template

## Overview

This document provides a structured prompt template for creating new backend modules in the DeepThought backend system. Use this template alongside the **BACKEND_MODULE_CREATION_GUIDE.md** (Single Source of Truth document) to generate comprehensive implementation plans.

## Prerequisites

Before using this prompt, ensure you have:
1. **BACKEND_MODULE_CREATION_GUIDE.md** - The complete SSoT document
2. **Frontend Requirements** - Routes, requests, and responses (format specified below)
3. **Module Purpose** - Clear understanding of what the module should accomplish

---

## Frontend Requirements Format

Provide your frontend requirements in the following structured format:

```markdown
### Module Name: [Module Name]

#### Purpose
[Brief description of what this module does and why it's needed]

#### Routes & Endpoints

##### 1. [Endpoint Name]
- **Method:** POST/GET/PUT/DELETE
- **Path:** `/api/v3/[resource]/[action]`
- **Authentication:** Required/Optional/None
- **Authorization:** [Who can access: Any logged-in user / Admin only / Organization member / Resource owner]

**Request:**
```json
{
  "field1": "value (type: string, required)",
  "field2": 123 (type: number, optional),
  "field3": ["array", "of", "items"] (type: string[], required)
}
```

**Response (Success - 200):**
```json
{
  "status": {
    "code": "ok",
    "message": "OK"
  },
  "response": {
    "entityId": "1",
    "field1": "value",
    "field2": 123,
    "createdAt": 1234567890,
    "updatedAt": 1234567890
  }
}
```

**Response (Error - 400/403/404):**
```json
{
  "status": {
    "code": "bad-request",
    "message": "Bad Request"
  },
  "response": {
    "error": "[[error:invalid-data]]",
    "message": "Detailed error message"
  }
}
```

**Business Rules:**
- [List any specific validation rules]
- [List any authorization requirements]
- [List any side effects or related operations]

---

[Repeat for each endpoint]
```

---

## Master Prompt Template

Copy and customize the following prompt when creating a new backend module:

---

# Backend Module Implementation Request

I need to implement a new backend module for the DeepThought backend system. I'm providing you with:

1. **BACKEND_MODULE_CREATION_GUIDE.md** - The Single Source of Truth document containing all patterns, conventions, and examples
2. **Frontend Requirements** - Detailed routes, requests, and responses (provided below)

## Frontend Requirements

[PASTE YOUR FRONTEND REQUIREMENTS HERE USING THE FORMAT SPECIFIED ABOVE]

---

## Task: Create a Comprehensive 7-Step Implementation Plan

Using the **BACKEND_MODULE_CREATION_GUIDE.md** as your reference, create a detailed implementation plan following these 7 steps. For each step, provide:
- Overview of what needs to be done
- Files to be created or modified
- Key patterns to follow from the SSoT document
- Code structure outline (not full implementation yet)
- Dependencies on previous steps
- Potential challenges and considerations

### Step 0: Macro Plan (Understand Requirements)

**Objective:** Analyze the frontend requirements and create a high-level implementation strategy.

**Deliverables:**
1. **Module Overview**
   - Module name and purpose
   - Resources being managed (entities)
   - Key features and operations

2. **Entity Design**
   - List all entities (e.g., Event, Attendee, etc.)
   - Entity relationships
   - Primary identifiers (eventId, userId, orgId, etc.)

3. **Endpoint Mapping**
   - Map each frontend route to CRUD operation or semantic action
   - Identify RESTful vs. semantic endpoints
   - Group related endpoints

4. **Authorization Requirements**
   - Public vs. authenticated endpoints
   - Admin-only operations
   - Organization/Department scoped access
   - Resource ownership checks

5. **Integration Points**
   - Which existing modules will this interact with?
   - External services or APIs needed?
   - Shared data structures?

6. **Complexity Assessment**
   - Simple CRUD operations
   - Complex business logic
   - Multi-step workflows
   - Background jobs or scheduled tasks

**Output Format:**
```markdown
## Step 0: Macro Plan

### Module Overview
- **Name:** [module-name]
- **Purpose:** [description]
- **Entities:** [list]

### Endpoint Summary
| Endpoint | Type | Auth | Scope | Operation |
|----------|------|------|-------|-----------|
| POST /api/v3/... | CRUD | Yes | Org | Create |
| ... | ... | ... | ... | ... |

### Entity Relationships
[Diagram or description]

### Authorization Matrix
| Operation | Logged In | Admin | Org Member | Owner |
|-----------|-----------|-------|------------|-------|
| Create | ✓ | - | ✓ | - |
| ... | ... | ... | ... | ... |

### Integration Points
- [List of modules/services]

### Implementation Complexity: [Low/Medium/High]
```

---

### Step 1: Database Layer Plan (Data Structure)

**Objective:** Design the database schema, storage patterns, and data access operations.

**Deliverables:**
1. **Collection Name**
   - Collection constant to add to `src/database/mongo/collections.js`

2. **Entity Storage Structure**
   - Primary key pattern (e.g., `events:${eventId}`)
   - Data structure (all fields with types)
   - Timestamp fields (createdAt, updatedAt)
   - State field for soft deletes

3. **Index Design**
   - Global index (sorted set): `events:all` (score: createdAt)
   - Organization index: `events:org:${orgId}` (score: createdAt)
   - User-specific indexes as needed
   - Set indexes for membership (e.g., `event:${eventId}:attendees`)

4. **Database Operations**
   - Create operation (ID generation, timestamps, index maintenance)
   - Get operation (single and bulk)
   - Update operation (upsert pattern)
   - Delete operation (soft delete or hard delete)
   - List operation (pagination with sorted sets)
   - Custom queries (if needed)

5. **Helper Functions**
   - ID generation helpers
   - Date/time utilities
   - Data transformation helpers

**Reference Sections from SSoT:**
- Section 3: Database Layer Patterns
- Section 3.1 to 3.9: Specific operation patterns

**Output Format:**
```markdown
## Step 1: Database Layer Plan

### Collection Registration
**File:** `src/database/mongo/collections.js`
```javascript
MODULE_NAME: 'module_name'
```

### Module Structure
**File:** `src/[module-name]/index.js`
```javascript
const Module = module.exports;

// Namespace exposure
Module.entity = require('./entity');

// Helper functions
Module.helpers = require('./helpers');
```

### Entity Storage Pattern
**Primary Key:** `entity:${entityId}`
**Data Structure:**
```javascript
{
  entityId: number,
  field1: string,
  field2: number,
  orgId: number (if org-scoped),
  uid: number (creator),
  state: string ('active' | 'deleted'),
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Index Strategy
| Index Type | Key Pattern | Score | Purpose |
|------------|-------------|-------|---------|
| Sorted Set | `entities:all` | createdAt | Global pagination |
| Sorted Set | `entities:org:${orgId}` | createdAt | Org-scoped list |
| Set | `entity:${entityId}:members` | - | Membership tracking |

### Database Operations Outline

#### Create Entity
**Function:** `Module.entity.create(data)`
**Pattern:** Auto-increment ID + timestamps + index maintenance
**Indexes to update:** [list]

#### Get Entity
**Function:** `Module.entity.get(entityId)` and `Module.entity.getMultiple(entityIds)`
**Pattern:** getObject with bulk fetch support

#### Update Entity
**Function:** `Module.entity.update(entityId, data)`
**Pattern:** Upsert with existing data merge

#### Delete Entity
**Function:** `Module.entity.delete(entityId)`
**Pattern:** [Soft delete / Hard delete + index cleanup]

#### List Entities
**Function:** `Module.entity.list(orgId, { start, stop })`
**Pattern:** Sorted set range + bulk fetch

[Additional custom operations as needed]

### Helper Functions
**File:** `src/[module-name]/helpers.js`
- `generateEntityId()`: Auto-increment ID generation
- `validateEntityData(data)`: Data validation helper
- [Additional helpers]
```

---

### Step 2: Validation Schemas Plan (Contracts)

**Objective:** Define Zod validation schemas for all API inputs (body, params, query).

**Deliverables:**
1. **Create Schema**
   - All required fields
   - Type validation
   - Constraints (min/max length, enums, etc.)

2. **Update Schema**
   - Optional fields
   - At least one field required
   - Partial updates support

3. **Get/Delete Schema**
   - Parameter validation (entityId)
   - Type coercion (string to number)

4. **List Schema**
   - Query parameter validation
   - Pagination parameters (start, stop)
   - Filter parameters (orgId, status, etc.)
   - Default values

5. **Custom Action Schemas**
   - For semantic actions (e.g., attend, approve, etc.)

6. **Validation Registry Update**
   - How to register in `src/validations/index.js`

**Reference Sections from SSoT:**
- Section 6: Validation Layer (Zod Schemas)
- Section 6.1 to 6.10: Specific schema patterns

**Output Format:**
```markdown
## Step 2: Validation Schemas Plan

### Validation File Structure
**File:** `src/validations/[module-name].js`

### Schemas to Create

#### 1. Create Entity Schema
**Validates:** `req.body` for POST `/api/v3/[module]/`
```javascript
const createEntitySchema = z.object({
  field1: z.string().min(1).max(255),
  field2: z.number().int().positive(),
  field3: z.enum(['option1', 'option2']),
  // ... all required fields
});
```

#### 2. Update Entity Schema
**Validates:** `req.body` for PUT `/api/v3/[module]/:entityId`
```javascript
const updateEntitySchema = z.object({
  field1: z.string().min(1).max(255).optional(),
  field2: z.number().int().positive().optional(),
  // ... all optional fields
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field is required'
});
```

#### 3. Get Entity Schema
**Validates:** `req.params` for GET `/api/v3/[module]/:entityId`
```javascript
const getEntitySchema = z.object({
  entityId: z.string().transform(Number)
});
```

#### 4. List Entities Schema
**Validates:** `req.query` for GET `/api/v3/[module]/`
```javascript
const listEntitiesSchema = z.object({
  orgId: z.string().transform(Number).optional(),
  start: z.string().transform(Number).default('0'),
  stop: z.string().transform(Number).default('49'),
  status: z.enum(['active', 'deleted']).optional()
});
```

#### 5. Custom Action Schemas
[For each semantic action endpoint]
```javascript
const actionNameSchema = z.object({
  // params + body fields
});
```

### Cross-Field Validation
[If needed, e.g., startDate < endDate]
```javascript
.refine(data => data.startDate < data.endDate, {
  message: 'Start date must be before end date',
  path: ['startDate']
})
```

### Validation Registry Update
**File:** `src/validations/index.js`
```javascript
validations.moduleName = require('./module-name');
```

**Exported Schema Names:**
- `createEntity`
- `updateEntity`
- `getEntity`
- `listEntities`
- [Additional schemas]
```

---

### Step 3: API Layer Plan (Business Logic)

**Objective:** Design API functions that implement business logic, authorization, and orchestration.

**Deliverables:**
1. **API Module Structure**
   - Function signature: `async (caller, data)`
   - Namespace organization

2. **Authorization Patterns**
   - For each operation, specify:
     - Logged-in check
     - Admin bypass
     - Organization membership
     - Resource ownership
     - Pre-requisite validation

3. **Business Logic**
   - Data validation and sanitization
   - Complex workflows
   - Multi-step operations
   - Error handling with i18n keys

4. **API Functions**
   - CRUD operations
   - Semantic actions
   - Bulk operations
   - Complex queries

5. **API Registry Update**
   - How to register in `src/api/index.js`

**Reference Sections from SSoT:**
- Section 4: API Layer Patterns
- Section 4.1 to 4.9: Authorization patterns
- Section 4.10 to 4.12: Business logic patterns

**Output Format:**
```markdown
## Step 3: API Layer Plan

### API File Structure
**File:** `src/api/[module-name].js`

### API Module Namespace
```javascript
const API = module.exports;

API.create = async (caller, data) => { ... };
API.get = async (caller, data) => { ... };
API.update = async (caller, data) => { ... };
API.delete = async (caller, data) => { ... };
API.list = async (caller, data) => { ... };
// Semantic actions
API.customAction = async (caller, data) => { ... };
```

### API Functions Outline

#### 1. Create Entity
**Function:** `API.create(caller, data)`

**Authorization:**
- Check: User must be logged in
- Check: User must be member of organization (if org-scoped)
- Admin bypass: Yes

**Business Logic:**
1. Extract caller.uid for creator tracking
2. Validate organization membership (if applicable)
3. Sanitize input data
4. Call `Module.entity.create(data)`
5. Return created entity

**Error Cases:**
- Not logged in → `[[error:not-logged-in]]`
- Not org member → `[[error:not-authorized]]`
- Invalid data → `[[error:invalid-data]]`

#### 2. Get Entity
**Function:** `API.get(caller, data)`

**Authorization:**
- Check: User must be logged in
- Check: Entity must exist
- Check: User must have access (org member or owner)
- Admin bypass: Yes

**Business Logic:**
1. Call `Module.entity.get(data.entityId)`
2. Check if entity exists
3. Verify caller access (org membership or ownership)
4. Return entity

**Error Cases:**
- Not logged in → `[[error:not-logged-in]]`
- Entity not found → `[[error:not-found]]`
- No access → `[[error:no-privileges]]`

#### 3. Update Entity
**Function:** `API.update(caller, data)`

**Authorization:**
- Check: User must be logged in
- Check: Entity must exist
- Check: User must be owner OR org manager OR admin
- Admin bypass: Yes

**Business Logic:**
1. Fetch existing entity
2. Verify ownership/management
3. Merge updates with existing data
4. Update `updatedAt` timestamp
5. Call `Module.entity.update(entityId, mergedData)`
6. Return updated entity

**Error Cases:**
- Not logged in → `[[error:not-logged-in]]`
- Entity not found → `[[error:not-found]]`
- No privileges → `[[error:no-privileges]]`

#### 4. Delete Entity
**Function:** `API.delete(caller, data)`

**Authorization:**
- Check: User must be logged in
- Check: Entity must exist
- Check: User must be owner OR admin
- Admin bypass: Yes

**Business Logic:**
1. Fetch entity to verify ownership
2. [Soft delete: Update state to 'deleted'] OR [Hard delete: Remove from DB]
3. Update indexes
4. Return success

**Error Cases:**
- Not logged in → `[[error:not-logged-in]]`
- Entity not found → `[[error:not-found]]`
- No privileges → `[[error:no-privileges]]`

#### 5. List Entities
**Function:** `API.list(caller, data)`

**Authorization:**
- Check: User must be logged in
- Check: User must be org member (if org-scoped)
- Admin bypass: Yes (can list all)

**Business Logic:**
1. Validate pagination params (start, stop)
2. Apply filters (org, status, etc.)
3. Call `Module.entity.list(filters, { start, stop })`
4. Return paginated results

**Error Cases:**
- Not logged in → `[[error:not-logged-in]]`
- Not org member → `[[error:not-authorized]]`

#### 6. Custom Semantic Actions
[For each semantic action]

**Function:** `API.customAction(caller, data)`

**Authorization:**
- [Specify checks]

**Business Logic:**
- [Step-by-step logic]

**Error Cases:**
- [List error scenarios]

### API Registry Update
**File:** `src/api/index.js`
```javascript
api.moduleName = require('./module-name');
```

### Shared Utilities
- `utils.isOwner(caller, entity)`: Check ownership
- `utils.isOrgMember(caller, orgId)`: Check org membership
- `utils.isAdmin(caller)`: Check admin status
```

---

### Step 4: Controllers Plan (Translators)

**Objective:** Design controller functions that translate HTTP requests to API calls and format responses.

**Deliverables:**
1. **Controller File Structure**
   - Namespace organization matching API layer

2. **Controller Functions**
   - Extract data from `req.body`, `req.params`, `req.query`
   - Pass caller context: `{ uid: req.uid }`
   - Delegate to API layer
   - Format response with `helpers.formatApiResponse()`

3. **Parameter Handling**
   - Pass-through (req.body directly)
   - Merge params + body
   - Type coercion
   - Defaults

4. **Controller Registry Update**
   - How to register in `src/controllers/write/index.js`

**Reference Sections from SSoT:**
- Section 5: Controller Layer Patterns
- Section 5.1 to 5.5: Controller patterns

**Output Format:**
```markdown
## Step 4: Controllers Plan

### Controller File Structure
**File:** `src/controllers/write/[module-name].js`

### Controller Module Namespace
```javascript
const Controller = module.exports;

Controller.create = async (req, res) => { ... };
Controller.get = async (req, res) => { ... };
Controller.update = async (req, res) => { ... };
Controller.delete = async (req, res) => { ... };
Controller.list = async (req, res) => { ... };
// Semantic actions
Controller.customAction = async (req, res) => { ... };
```

### Controller Functions Outline

#### 1. Create Entity
**Function:** `Controller.create(req, res)`

**Request Mapping:**
- Source: `req.body`
- Extract: `{ field1, field2, field3, ... }`
- Caller: `{ uid: req.uid }`

**API Call:**
```javascript
const result = await api.moduleName.create(
  { uid: req.uid },
  req.body
);
```

**Response:**
```javascript
helpers.formatApiResponse(200, res, result);
```

#### 2. Get Entity
**Function:** `Controller.get(req, res)`

**Request Mapping:**
- Source: `req.params.entityId`
- Data: `{ entityId: req.params.entityId }`
- Caller: `{ uid: req.uid }`

**API Call:**
```javascript
const result = await api.moduleName.get(
  { uid: req.uid },
  { entityId: req.params.entityId }
);
```

**Response:**
```javascript
helpers.formatApiResponse(200, res, result);
```

#### 3. Update Entity
**Function:** `Controller.update(req, res)`

**Request Mapping:**
- Source: `req.params.entityId` + `req.body`
- Merge: `{ entityId, ...updates }`
- Caller: `{ uid: req.uid }`

**API Call:**
```javascript
const result = await api.moduleName.update(
  { uid: req.uid },
  { entityId: req.params.entityId, ...req.body }
);
```

**Response:**
```javascript
helpers.formatApiResponse(200, res, result);
```

#### 4. Delete Entity
**Function:** `Controller.delete(req, res)`

**Request Mapping:**
- Source: `req.params.entityId`
- Data: `{ entityId: req.params.entityId }`
- Caller: `{ uid: req.uid }`

**API Call:**
```javascript
await api.moduleName.delete(
  { uid: req.uid },
  { entityId: req.params.entityId }
);
```

**Response:**
```javascript
helpers.formatApiResponse(200, res);
```

#### 5. List Entities
**Function:** `Controller.list(req, res)`

**Request Mapping:**
- Source: `req.query`
- Extract: `{ orgId, start, stop, status, ... }`
- Caller: `{ uid: req.uid }`

**API Call:**
```javascript
const result = await api.moduleName.list(
  { uid: req.uid },
  req.query
);
```

**Response:**
```javascript
helpers.formatApiResponse(200, res, result);
```

#### 6. Custom Actions
[For each semantic action]

**Request Mapping:**
- [Specify sources]

**API Call:**
```javascript
const result = await api.moduleName.customAction(
  { uid: req.uid },
  { /* data */ }
);
```

**Response:**
```javascript
helpers.formatApiResponse(200, res, result);
```

### Controller Registry Update
**File:** `src/controllers/write/index.js`
```javascript
Write.moduleName = require('./module-name');
```

### Error Handling
- All errors are caught by the route layer (setupApiRoute wrapper)
- Controllers should not have try-catch blocks
- Use `helpers.formatApiResponse()` for all responses
```

---

### Step 5: Routes & Middleware Plan (Gatekeepers)

**Objective:** Define Express routes with proper middleware composition for authentication, validation, and authorization.

**Deliverables:**
1. **Route File Structure**
   - Export function returning Express router
   - Use `setupApiRoute` helper

2. **Route Definitions**
   - HTTP method (GET, POST, PUT, DELETE)
   - Path with parameters
   - Middleware stack

3. **Middleware Composition**
   - Authentication (ensureLoggedIn)
   - Rate limiting (if needed)
   - Validation (validate.body, validate.params, validate.query)
   - Custom authorization (isAdmin, isOrganizationManager, etc.)
   - Custom middleware (resource checks)

4. **setupApiRoute Behavior**
   - Automatic middleware: autoLocale, applyBlacklist, authenticateRequest, maintenanceMode, registrationComplete, pluginHooks, logApiUsage, upload.any()
   - These are applied automatically, don't add manually

5. **Route Registry Update**
   - How to register in `src/routes/write/index.js`

**Reference Sections from SSoT:**
- Section 7: Route Layer Patterns
- Section 7.1 to 7.6: Route patterns
- Section 8: Middleware Patterns

**Output Format:**
```markdown
## Step 5: Routes & Middleware Plan

### Route File Structure
**File:** `src/routes/write/[module-name].js`

### Route Module Template
```javascript
const router = require('express').Router();
const { setupApiRoute } = require('../helpers');
const middleware = require('../../middleware');
const controllers = require('../../controllers');
const validations = require('../../validations');
const helpers = require('../../middleware/helpers');

module.exports = function () {
  const { middlewares, validate } = middleware;

  // Routes defined here

  return router;
};
```

### Routes to Create

#### 1. Create Entity
**Route:** `POST /api/v3/[module-name]/`

**Middleware Stack:**
```javascript
setupApiRoute(router, 'post', '/', [
  middlewares.ensureLoggedIn,
  validate.body(validations.moduleName.createEntity),
  // Custom middleware if needed (e.g., check org membership)
], controllers.write.moduleName.create);
```

**Automatic Middleware Applied by setupApiRoute:**
- autoLocale, applyBlacklist, authenticateRequest, maintenanceMode, registrationComplete, pluginHooks, logApiUsage, upload.any()

**Notes:**
- Validates request body
- Requires authentication
- [Additional authorization in controller/API layer]

#### 2. Get Entity
**Route:** `GET /api/v3/[module-name]/:entityId`

**Middleware Stack:**
```javascript
setupApiRoute(router, 'get', '/:entityId', [
  middlewares.ensureLoggedIn,
  validate.params(validations.moduleName.getEntity),
], controllers.write.moduleName.get);
```

**Notes:**
- Validates entityId parameter
- Requires authentication
- Authorization in API layer

#### 3. Update Entity
**Route:** `PUT /api/v3/[module-name]/:entityId`

**Middleware Stack:**
```javascript
setupApiRoute(router, 'put', '/:entityId', [
  middlewares.ensureLoggedIn,
  validate.params(validations.moduleName.getEntity),
  validate.body(validations.moduleName.updateEntity),
], controllers.write.moduleName.update);
```

**Notes:**
- Validates both params and body
- Requires authentication
- Ownership check in API layer

#### 4. Delete Entity
**Route:** `DELETE /api/v3/[module-name]/:entityId`

**Middleware Stack:**
```javascript
setupApiRoute(router, 'delete', '/:entityId', [
  middlewares.ensureLoggedIn,
  validate.params(validations.moduleName.getEntity),
  // Optionally: middlewares.isAdmin (if only admins can delete)
], controllers.write.moduleName.delete);
```

**Notes:**
- Validates entityId parameter
- Requires authentication
- [Admin-only or owner check in API layer]

#### 5. List Entities
**Route:** `GET /api/v3/[module-name]/`

**Middleware Stack:**
```javascript
setupApiRoute(router, 'get', '/', [
  middlewares.ensureLoggedIn,
  validate.query(validations.moduleName.listEntities),
], controllers.write.moduleName.list);
```

**Notes:**
- Validates query parameters
- Requires authentication
- Pagination support

#### 6. Custom Semantic Actions
[For each semantic action]

**Route:** `POST /api/v3/[module-name]/:entityId/[action]`

**Middleware Stack:**
```javascript
setupApiRoute(router, 'post', '/:entityId/[action]', [
  middlewares.ensureLoggedIn,
  validate.params(validations.moduleName.getEntity),
  validate.body(validations.moduleName.actionName),
  // Custom middleware if needed
], controllers.write.moduleName.actionName);
```

**Notes:**
- [Specific requirements]

### Custom Middleware (if needed)

#### Check Organization Membership
```javascript
const checkOrgMembership = helpers.try(async (req, res, next) => {
  const { orgId } = req.body;
  const isMember = await organizations.isMember(req.uid, orgId);

  if (!isMember && !await user.isAdministrator(req.uid)) {
    return helpers.formatApiResponse(403, res, null, {
      error: '[[error:not-authorized]]',
      message: 'You are not a member of this organization'
    });
  }

  next();
});
```

#### Check Resource Ownership
```javascript
const checkResourceOwnership = helpers.try(async (req, res, next) => {
  const { entityId } = req.params;
  const entity = await Module.entity.get(entityId);

  if (!entity) {
    return helpers.formatApiResponse(404, res, null, {
      error: '[[error:not-found]]',
      message: 'Entity not found'
    });
  }

  if (entity.uid !== req.uid && !await user.isAdministrator(req.uid)) {
    return helpers.formatApiResponse(403, res, null, {
      error: '[[error:no-privileges]]',
      message: 'You do not have permission to access this resource'
    });
  }

  req.entity = entity; // Attach to request for controller use
  next();
});
```

### Route Registry Update
**File:** `src/routes/write/index.js`
```javascript
module.exports = function (app, middleware) {
  // ... existing routes

  app.use('/api/v3/module-name', require('./module-name')());
};
```

### Route Summary Table
| Method | Path | Auth | Validation | Authorization |
|--------|------|------|------------|---------------|
| POST | /api/v3/module/ | Yes | Body | Logged in + Org member |
| GET | /api/v3/module/:id | Yes | Params | Logged in + Access check |
| PUT | /api/v3/module/:id | Yes | Params + Body | Logged in + Owner |
| DELETE | /api/v3/module/:id | Yes | Params | Logged in + Owner/Admin |
| GET | /api/v3/module/ | Yes | Query | Logged in + Org member |
| [Action] | /api/v3/module/:id/action | Yes | Params + Body | [Specific] |
```

---

### Step 6: Testing Plan

**Objective:** Define comprehensive testing strategy covering all endpoints and edge cases.

**Deliverables:**
1. **Test Scenarios**
   - Success cases
   - Validation failures
   - Authorization failures
   - Not found scenarios
   - Edge cases

2. **Manual Test Commands**
   - cURL commands for each endpoint
   - Expected responses

3. **Test Data Setup**
   - Required test users
   - Test organizations
   - Sample entities

4. **Test Execution Order**
   - Dependencies between tests

**Reference Sections from SSoT:**
- Section 11: Testing Patterns

**Output Format:**
```markdown
## Step 6: Testing Plan

### Test Environment Setup

**Prerequisites:**
1. Server running on `http://localhost:4567`
2. Test user created (uid: 1)
3. Test organization created (orgId: 1)
4. Authentication token obtained

**Get Authentication Token:**
```bash
# Login and capture token
TOKEN=$(curl -X POST http://localhost:4567/api/v3/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password"}' \
  | jq -r '.response.token')
```

### Test Scenarios

#### 1. Create Entity - Success Case
**Scenario:** Authenticated user creates a valid entity

**Request:**
```bash
curl -X POST http://localhost:4567/api/v3/module-name/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "field1": "Test Value",
    "field2": 123,
    "orgId": 1
  }'
```

**Expected Response (200):**
```json
{
  "status": { "code": "ok", "message": "OK" },
  "response": {
    "entityId": "1",
    "field1": "Test Value",
    "field2": 123,
    "orgId": 1,
    "uid": 1,
    "state": "active",
    "createdAt": 1234567890,
    "updatedAt": 1234567890
  }
}
```

**Verify:**
- Entity created in database
- Indexes updated (entities:all, entities:org:1)
- Timestamps populated

---

#### 2. Create Entity - Validation Failure
**Scenario:** Missing required field

**Request:**
```bash
curl -X POST http://localhost:4567/api/v3/module-name/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "field1": "Test Value"
    # Missing field2
  }'
```

**Expected Response (400):**
```json
{
  "status": { "code": "bad-request", "message": "Bad Request" },
  "response": {
    "error": "[[error:invalid-data]]",
    "message": "field2 is required"
  }
}
```

---

#### 3. Create Entity - Authorization Failure
**Scenario:** User not member of organization

**Request:**
```bash
curl -X POST http://localhost:4567/api/v3/module-name/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "field1": "Test Value",
    "field2": 123,
    "orgId": 999
  }'
```

**Expected Response (403):**
```json
{
  "status": { "code": "forbidden", "message": "Forbidden" },
  "response": {
    "error": "[[error:not-authorized]]",
    "message": "You are not a member of this organization"
  }
}
```

---

#### 4. Get Entity - Success Case
**Scenario:** Retrieve existing entity

**Request:**
```bash
curl -X GET http://localhost:4567/api/v3/module-name/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200):**
```json
{
  "status": { "code": "ok", "message": "OK" },
  "response": {
    "entityId": "1",
    "field1": "Test Value",
    "field2": 123,
    "orgId": 1,
    "uid": 1,
    "state": "active",
    "createdAt": 1234567890,
    "updatedAt": 1234567890
  }
}
```

---

#### 5. Get Entity - Not Found
**Scenario:** Entity doesn't exist

**Request:**
```bash
curl -X GET http://localhost:4567/api/v3/module-name/999 \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (404):**
```json
{
  "status": { "code": "not-found", "message": "Not Found" },
  "response": {
    "error": "[[error:not-found]]",
    "message": "Entity not found"
  }
}
```

---

#### 6. Update Entity - Success Case
**Scenario:** Owner updates entity

**Request:**
```bash
curl -X PUT http://localhost:4567/api/v3/module-name/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "field1": "Updated Value"
  }'
```

**Expected Response (200):**
```json
{
  "status": { "code": "ok", "message": "OK" },
  "response": {
    "entityId": "1",
    "field1": "Updated Value",
    "field2": 123,
    "orgId": 1,
    "uid": 1,
    "state": "active",
    "createdAt": 1234567890,
    "updatedAt": 1234567999
  }
}
```

**Verify:**
- Only specified fields updated
- updatedAt timestamp changed
- Other fields unchanged

---

#### 7. Update Entity - Authorization Failure
**Scenario:** Non-owner tries to update

**Setup:** Login as different user (uid: 2)

**Request:**
```bash
curl -X PUT http://localhost:4567/api/v3/module-name/1 \
  -H "Authorization: Bearer $TOKEN_USER2" \
  -H "Content-Type: application/json" \
  -d '{
    "field1": "Unauthorized Update"
  }'
```

**Expected Response (403):**
```json
{
  "status": { "code": "forbidden", "message": "Forbidden" },
  "response": {
    "error": "[[error:no-privileges]]",
    "message": "You do not have permission to update this entity"
  }
}
```

---

#### 8. Delete Entity - Success Case
**Scenario:** Owner deletes entity

**Request:**
```bash
curl -X DELETE http://localhost:4567/api/v3/module-name/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200):**
```json
{
  "status": { "code": "ok", "message": "OK" },
  "response": {}
}
```

**Verify:**
- [If soft delete] Entity state = 'deleted'
- [If hard delete] Entity removed from database
- Indexes updated

---

#### 9. List Entities - Success Case
**Scenario:** List all entities in organization

**Request:**
```bash
curl -X GET "http://localhost:4567/api/v3/module-name/?orgId=1&start=0&stop=49" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200):**
```json
{
  "status": { "code": "ok", "message": "OK" },
  "response": {
    "entities": [
      {
        "entityId": "1",
        "field1": "Test Value",
        "field2": 123,
        "orgId": 1,
        "uid": 1,
        "state": "active",
        "createdAt": 1234567890,
        "updatedAt": 1234567890
      }
    ],
    "total": 1,
    "start": 0,
    "stop": 49
  }
}
```

---

#### 10. List Entities - Pagination
**Scenario:** Test pagination with multiple entities

**Setup:** Create 10 entities

**Request:**
```bash
curl -X GET "http://localhost:4567/api/v3/module-name/?orgId=1&start=0&stop=4" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200):**
- Returns first 5 entities
- Verify ordering (by createdAt desc)

---

#### 11. Custom Semantic Action - Success Case
[For each semantic action]

**Scenario:** [Description]

**Request:**
```bash
curl -X POST http://localhost:4567/api/v3/module-name/1/action \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "param": "value"
  }'
```

**Expected Response (200):**
```json
{
  "status": { "code": "ok", "message": "OK" },
  "response": {
    // Action result
  }
}
```

**Verify:**
- [Expected side effects]

---

#### 12. Authentication Required
**Scenario:** Access endpoint without token

**Request:**
```bash
curl -X GET http://localhost:4567/api/v3/module-name/1
```

**Expected Response (401):**
```json
{
  "status": { "code": "unauthorized", "message": "Unauthorized" },
  "response": {
    "error": "[[error:not-logged-in]]",
    "message": "You must be logged in to access this resource"
  }
}
```

---

### Edge Cases

#### 13. Concurrent Updates
**Scenario:** Two users update same entity simultaneously
- Test for race conditions
- Verify last write wins (or implement optimistic locking)

#### 14. Large List Queries
**Scenario:** List with 1000+ entities
- Verify pagination works correctly
- Check performance

#### 15. Invalid Data Types
**Scenario:** Send string where number expected
- Verify Zod transformation or rejection

#### 16. Special Characters in Strings
**Scenario:** Unicode, emojis, SQL-like characters
- Verify proper handling and storage

#### 17. Boundary Values
**Scenario:** Min/max lengths, zero, negative numbers
- Verify validation enforcement

### Test Execution Order

1. **Setup Phase**
   - Create test users
   - Create test organizations
   - Obtain auth tokens

2. **Create Operations**
   - Test successful creation
   - Test validation failures
   - Test authorization failures

3. **Read Operations**
   - Test get by ID
   - Test list with filters
   - Test not found scenarios

4. **Update Operations**
   - Test successful updates
   - Test partial updates
   - Test authorization failures

5. **Delete Operations**
   - Test successful deletion
   - Test authorization failures
   - Test deleting non-existent entity

6. **Semantic Actions**
   - Test each custom action
   - Test edge cases for actions

7. **Cleanup Phase**
   - Delete test data
   - Remove test organizations
   - Remove test users

### Automated Testing (Optional)

**Framework:** Jest / Mocha

**Test Structure:**
```javascript
describe('Module Name API', () => {
  describe('POST /api/v3/module-name/', () => {
    it('should create entity with valid data', async () => {
      // Test implementation
    });

    it('should fail with missing required field', async () => {
      // Test implementation
    });
  });

  // Additional test suites
});
```

### Test Coverage Goals

- **Success Paths:** 100% (all endpoints)
- **Validation Failures:** 100% (all required/optional fields)
- **Authorization Failures:** 100% (all protected endpoints)
- **Edge Cases:** 80% (common scenarios)
- **Error Handling:** 100% (all error types)
```

---

## Implementation Workflow

After receiving the 7-step plan:

1. **Review & Approve:** Review the plan for completeness and accuracy. Request changes if needed.

2. **Implementation:** Once approved, proceed with implementation following the plan order:
   - Step 1: Database layer → Step 2: Validations → Step 3: API → Step 4: Controllers → Step 5: Routes → Step 6: Testing

3. **Test After Each Layer:** Test each layer as you implement it (if possible) to catch issues early.

4. **Final Integration Test:** Run the complete test suite (Step 6) after all layers are implemented.

---

## Tips for Best Results

1. **Be Specific in Requirements:** The more detailed your frontend requirements, the better the plan will be.

2. **Include Business Rules:** Don't just provide API shapes—explain the business logic and constraints.

3. **Specify Authorization Clearly:** Clearly state who can perform each operation.

4. **Provide Context:** If this module integrates with existing modules, mention those relationships.

5. **Iterative Refinement:** You can refine the plan in steps—start with Step 0 (Macro Plan), review it, then proceed to detailed steps.

---

## Example Usage

See the next section for a complete example of how to use this prompt template.

---

## Complete Example: Events Module Request

```markdown
# Backend Module Implementation Request

I need to implement a new backend module for the DeepThought backend system. I'm providing you with:

1. **BACKEND_MODULE_CREATION_GUIDE.md** - The Single Source of Truth document containing all patterns, conventions, and examples
2. **Frontend Requirements** - Detailed routes, requests, and responses (provided below)

## Frontend Requirements

### Module Name: Events

#### Purpose
Allow organizations to create and manage events. Organization members can view events, and event creators can manage attendees. Events are organization-scoped.

#### Routes & Endpoints

##### 1. Create Event
- **Method:** POST
- **Path:** `/api/v3/events/`
- **Authentication:** Required
- **Authorization:** Any logged-in user who is a member of the organization

**Request:**
```json
{
  "title": "Team Building Workshop (type: string, required, max: 255)",
  "description": "A fun workshop for team building (type: string, optional)",
  "startTime": 1234567890000 (type: number, required, timestamp in ms),
  "endTime": 1234567999000 (type: number, required, timestamp in ms),
  "location": "Conference Room A (type: string, required)",
  "orgId": 1 (type: number, required)
}
```

**Response (Success - 200):**
```json
{
  "status": {
    "code": "ok",
    "message": "OK"
  },
  "response": {
    "eventId": "1",
    "title": "Team Building Workshop",
    "description": "A fun workshop for team building",
    "startTime": 1234567890000,
    "endTime": 1234567999000,
    "location": "Conference Room A",
    "orgId": 1,
    "uid": 1,
    "state": "active",
    "attendeeCount": 0,
    "createdAt": 1234567890,
    "updatedAt": 1234567890
  }
}
```

**Response (Error - 400):**
```json
{
  "status": {
    "code": "bad-request",
    "message": "Bad Request"
  },
  "response": {
    "error": "[[error:invalid-data]]",
    "message": "startTime must be before endTime"
  }
}
```

**Business Rules:**
- startTime must be before endTime
- User must be a member of the organization
- Title is required and max 255 characters
- Admins can create events for any organization

##### 2. Get Event
- **Method:** GET
- **Path:** `/api/v3/events/:eventId`
- **Authentication:** Required
- **Authorization:** Organization member or admin

**Request:** No body

**Response (Success - 200):**
```json
{
  "status": {
    "code": "ok",
    "message": "OK"
  },
  "response": {
    "eventId": "1",
    "title": "Team Building Workshop",
    "description": "A fun workshop for team building",
    "startTime": 1234567890000,
    "endTime": 1234567999000,
    "location": "Conference Room A",
    "orgId": 1,
    "uid": 1,
    "state": "active",
    "attendeeCount": 5,
    "createdAt": 1234567890,
    "updatedAt": 1234567890
  }
}
```

**Response (Error - 404):**
```json
{
  "status": {
    "code": "not-found",
    "message": "Not Found"
  },
  "response": {
    "error": "[[error:event-not-found]]",
    "message": "Event not found"
  }
}
```

**Business Rules:**
- Event must exist
- User must be member of event's organization
- Admins can view any event

##### 3. Update Event
- **Method:** PUT
- **Path:** `/api/v3/events/:eventId`
- **Authentication:** Required
- **Authorization:** Event creator or organization manager or admin

**Request:**
```json
{
  "title": "Updated Workshop (type: string, optional)",
  "description": "Updated description (type: string, optional)",
  "startTime": 1234567890000 (type: number, optional),
  "endTime": 1234567999000 (type: number, optional),
  "location": "Conference Room B (type: string, optional)"
}
```

**Response (Success - 200):**
```json
{
  "status": {
    "code": "ok",
    "message": "OK"
  },
  "response": {
    "eventId": "1",
    "title": "Updated Workshop",
    "description": "Updated description",
    "startTime": 1234567890000,
    "endTime": 1234567999000,
    "location": "Conference Room B",
    "orgId": 1,
    "uid": 1,
    "state": "active",
    "attendeeCount": 5,
    "createdAt": 1234567890,
    "updatedAt": 1234568000
  }
}
```

**Business Rules:**
- At least one field must be provided
- If updating times, startTime must be before endTime
- Only creator, org manager, or admin can update
- Cannot change orgId

##### 4. Delete Event
- **Method:** DELETE
- **Path:** `/api/v3/events/:eventId`
- **Authentication:** Required
- **Authorization:** Event creator or admin

**Request:** No body

**Response (Success - 200):**
```json
{
  "status": {
    "code": "ok",
    "message": "OK"
  },
  "response": {}
}
```

**Business Rules:**
- Soft delete (set state to 'deleted')
- Only creator or admin can delete
- Organization managers cannot delete events they didn't create

##### 5. List Events
- **Method:** GET
- **Path:** `/api/v3/events/`
- **Authentication:** Required
- **Authorization:** Organization member or admin

**Request (Query Parameters):**
- `orgId` (number, required)
- `start` (number, optional, default: 0)
- `stop` (number, optional, default: 49)
- `status` (string, optional, enum: 'active' | 'deleted', default: 'active')

**Response (Success - 200):**
```json
{
  "status": {
    "code": "ok",
    "message": "OK"
  },
  "response": {
    "events": [
      {
        "eventId": "1",
        "title": "Team Building Workshop",
        "startTime": 1234567890000,
        "endTime": 1234567999000,
        "location": "Conference Room A",
        "orgId": 1,
        "uid": 1,
        "attendeeCount": 5,
        "createdAt": 1234567890
      }
    ],
    "total": 1
  }
}
```

**Business Rules:**
- User must be member of organization
- Results ordered by startTime (soonest first)
- Pagination with start/stop
- Filter by status (active/deleted)
- Admins can list events for any organization

##### 6. Attend Event (Semantic Action)
- **Method:** POST
- **Path:** `/api/v3/events/:eventId/attend`
- **Authentication:** Required
- **Authorization:** Organization member

**Request:** No body (user ID from auth token)

**Response (Success - 200):**
```json
{
  "status": {
    "code": "ok",
    "message": "OK"
  },
  "response": {
    "eventId": "1",
    "uid": 1,
    "attendedAt": 1234567890
  }
}
```

**Business Rules:**
- User must be member of organization
- User can attend multiple times (idempotent)
- Increments attendeeCount if first time attending
- Stores attendance timestamp

---

## Task: Create a Comprehensive 7-Step Implementation Plan

[The rest of the prompt template follows as defined above...]
```

---

## Notes

- This prompt template is designed to work with Claude (any version).
- The SSoT document (BACKEND_MODULE_CREATION_GUIDE.md) should be provided as context/attachment.
- Frontend requirements should follow the format specified in the "Frontend Requirements Format" section.
- The output is a PLAN, not implementation. Actual coding comes after plan approval.
- You can iterate on each step—approve Step 0, then move to Step 1, etc.

---

**Version:** 1.0
**Last Updated:** 2026-02-04
**Compatible with:** BACKEND_MODULE_CREATION_GUIDE.md v1.0
