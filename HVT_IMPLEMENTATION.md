# HVT (High-Velocity Testing) Implementation Guide

## Overview

The HVT feature has been successfully integrated into the NodeBB backend following the exact overlay architecture pattern. This implementation provides a complete workflow for managing problems, ideas, experiments, results, and learnings across organizational modules.

## Architecture

### Database Layer
- **Collection**: Single MongoDB collection `hvt` with entity-specific key prefixes
- **Keys**: `hvt:module:{id}`, `hvt:problem:{id}`, `hvt:idea:{id}`, `hvt:experiment:{id}`, etc.
- **Indexes**: Organization-scoped indexes for efficient querying
- **Auto-increment**: Per-entity global counters (nextHVTModuleId, nextHVTExperimentId, etc.)

### State Machines

#### Experiment Lifecycle (8 states)
```
seeded → probing → active → blocked → logging → ready_for_hash → completed
                        ↓
                      halted
```

#### Problem Status (4 states)
- `identified` → `under_analysis` → `ideation` → `closed`

#### Idea Status (5 states)
- `draft` → `submitted` → `approved`/`rejected` → `in_progress`

#### Escalation Status (3 states)
- `open` → `in_progress` → `resolved`

## File Structure

```
src/
├── database/
│   └── mongo/
│       ├── collections.js          # Added HVT: "hvt"
│       ├── hvt.js                  # 818 lines - All CRUD operations
│       └── mongo.js                # Registered require('./mongo/hvt')
│
├── hvt/
│   ├── helpers.js                  # 396 lines - State machines, validators, utilities
│   ├── modules.js                  # 149 lines - Module management + DEFAULT_MODULES
│   ├── problems.js                 # 160 lines - Problem lifecycle
│   ├── ideas.js                    # 204 lines - Idea management + ICE scoring
│   ├── experiments.js              # 287 lines - Experiment workflow + AI verification
│   ├── results.js                  # 60 lines - Result logging
│   ├── learnings.js                # 180 lines - Learning capture + AI similarity
│   ├── escalations.js              # 160 lines - Escalation management
│   ├── tickets.js                  # 60 lines - Ticket integration
│   ├── updates.js                  # 50 lines - Experiment updates
│   ├── roles.js                    # 95 lines - Role management + hierarchy
│   ├── metrics.js                  # 120 lines - Analytics + velocity tracking
│   └── index.js                    # 45 lines - Module aggregator
│
├── validations/
│   ├── hvt.js                      # 230 lines - Zod schemas for all entities
│   └── index.js                    # Registered hvt
│
├── api/
│   ├── hvt.js                      # 360 lines - API methods (caller, data) pattern
│   └── index.js                    # Registered hvt
│
├── controllers/write/
│   ├── hvt.js                      # 600 lines - HTTP request handlers
│   └── index.js                    # Registered Write.hvt
│
├── middleware/
│   └── hvt.js                      # 220 lines - Permission + existence validators
│
├── routes/write/
│   ├── hvt.js                      # 480 lines - 50+ endpoint definitions
│   └── index.js                    # Registered /api/v3/hvt
│
└── seed-hvt-modules.js             # 115 lines - CLI seed script
```

## Default Modules

8 pre-configured modules are seeded for each organization:

1. **Sales** (🎯) - `#3B82F6` - Customer acquisition experiments
2. **Marketing** (📢) - `#EF4444` - Campaign and brand experiments
3. **Product** (🎨) - `#8B5CF6` - Feature and UX experiments
4. **Engineering** (⚙️) - `#10B981` - Technical debt and architecture
5. **Customer Success** (💬) - `#F59E0B` - Retention and satisfaction
6. **Operations** (📊) - `#06B6D4` - Process efficiency
7. **Finance** (💰) - `#EC4899` - Pricing and cost optimization
8. **People** (👥) - `#6366F1` - Culture and talent development

## API Endpoints

### Modules
- `POST /api/v3/hvt/modules` - Create module (admin)
- `GET /api/v3/hvt/modules` - List all modules
- `GET /api/v3/hvt/modules/:moduleId` - Get module
- `PUT /api/v3/hvt/modules/:moduleId` - Update module (admin)
- `DELETE /api/v3/hvt/modules/:moduleId` - Delete module (admin)
- `POST /api/v3/hvt/modules/seed` - Seed defaults (admin)

### Problems
- `POST /api/v3/hvt/problems` - Create problem (contributor)
- `GET /api/v3/hvt/problems` - List org problems
- `GET /api/v3/hvt/problems/:problemId` - Get problem
- `GET /api/v3/hvt/modules/:moduleId/problems` - Get module problems
- `PUT /api/v3/hvt/problems/:problemId` - Update problem
- `PATCH /api/v3/hvt/problems/:problemId/status` - Update status
- `DELETE /api/v3/hvt/problems/:problemId` - Delete problem
- `GET /api/v3/hvt/problems/:problemId/with-counts` - Get with idea/experiment counts

### Ideas
- `POST /api/v3/hvt/problems/:problemId/ideas` - Create idea (contributor)
- `GET /api/v3/hvt/ideas/:ideaId` - Get idea
- `GET /api/v3/hvt/problems/:problemId/ideas` - List problem ideas
- `PUT /api/v3/hvt/ideas/:ideaId` - Update idea
- `POST /api/v3/hvt/ideas/:ideaId/score` - ICE scoring
- `POST /api/v3/hvt/ideas/:ideaId/approve` - Approve idea
- `POST /api/v3/hvt/ideas/:ideaId/reject` - Reject idea
- `PATCH /api/v3/hvt/ideas/:ideaId/status` - Update status

### Experiments
- `POST /api/v3/hvt/ideas/:ideaId/experiments` - Create experiment (contributor)
- `GET /api/v3/hvt/experiments/:experimentId` - Get experiment
- `GET /api/v3/hvt/experiments` - List org experiments
- `GET /api/v3/hvt/experiments/status/:status` - Filter by status
- `PUT /api/v3/hvt/experiments/:experimentId` - Update experiment
- `PATCH /api/v3/hvt/experiments/:experimentId/status` - Update status (state machine enforced)
- `POST /api/v3/hvt/experiments/:experimentId/halt` - Halt experiment
- `POST /api/v3/hvt/experiments/:experimentId/verify` - AI verification
- `GET /api/v3/hvt/experiments/:experimentId/with-relations` - Get with related entities

### Results
- `POST /api/v3/hvt/experiments/:experimentId/results` - Log result (contributor)
- `GET /api/v3/hvt/experiments/:experimentId/results` - Get results

### Learnings
- `POST /api/v3/hvt/experiments/:experimentId/learnings` - Create learning (contributor)
- `GET /api/v3/hvt/learnings/:learningId` - Get learning
- `GET /api/v3/hvt/learnings` - List org learnings
- `GET /api/v3/hvt/modules/:moduleId/learnings` - Get module learnings
- `GET /api/v3/hvt/learnings/:learningId/similar` - AI similarity search
- `PUT /api/v3/hvt/learnings/:learningId` - Update learning
- `POST /api/v3/hvt/learnings/:learningId/archive` - Archive learning
- `POST /api/v3/hvt/learnings/:learningId/unarchive` - Unarchive learning
- `DELETE /api/v3/hvt/learnings/:learningId` - Delete learning

### Escalations
- `POST /api/v3/hvt/experiments/:experimentId/escalations` - Create escalation (contributor)
- `GET /api/v3/hvt/escalations/:escalationId` - Get escalation
- `GET /api/v3/hvt/experiments/:experimentId/escalations` - Get experiment escalations
- `PUT /api/v3/hvt/escalations/:escalationId` - Update escalation
- `PATCH /api/v3/hvt/escalations/:escalationId/status` - Update status
- `POST /api/v3/hvt/escalations/:escalationId/resolve` - Resolve escalation
- `DELETE /api/v3/hvt/escalations/:escalationId` - Delete escalation

### Tickets
- `POST /api/v3/hvt/ideas/:ideaId/tickets` - Create ticket (contributor)
- `GET /api/v3/hvt/ideas/:ideaId/tickets` - Get idea tickets

### Updates
- `POST /api/v3/hvt/experiments/:experimentId/updates` - Post update (contributor)
- `GET /api/v3/hvt/experiments/:experimentId/updates` - Get updates

### Roles
- `POST /api/v3/hvt/roles` - Set role (admin)
- `GET /api/v3/hvt/roles/:uid` - Get user role
- `GET /api/v3/hvt/roles` - List org roles
- `DELETE /api/v3/hvt/roles/:uid` - Remove role (admin)

### Metrics
- `GET /api/v3/hvt/metrics` - Get org metrics
- `GET /api/v3/hvt/metrics/module/:moduleId` - Get module metrics
- `GET /api/v3/hvt/metrics/velocity` - Get velocity metrics

## Roles & Permissions

### Role Hierarchy
1. **Admin** - Full access (manage modules, roles)
2. **Contributor** - Create/update entities (problems, ideas, experiments)
3. **Viewer** - Read-only access

### Permission Middleware
- `hasHVTRole(role)` - Generic role checker
- `canManageModules` - Requires admin
- `canManageProblems` - Requires contributor+
- `canManageIdeas` - Requires contributor+
- `canManageExperiments` - Requires contributor+
- `canManageRoles` - Requires admin

### Entity Existence Validators
- `moduleExists`
- `problemExists`
- `ideaExists`
- `experimentExists`
- `learningExists`
- `escalationExists`

## Key Features

### State Machine Enforcement
Experiments follow strict state transitions:
```javascript
const transitions = {
  seeded: ['probing', 'halted'],
  probing: ['active', 'halted'],
  active: ['blocked', 'logging', 'halted'],
  blocked: ['active', 'halted'],
  logging: ['ready_for_hash', 'halted'],
  ready_for_hash: ['completed', 'halted'],
  completed: [],
  halted: []
};
```

### ICE Scoring
Ideas are scored on Impact, Confidence, Ease (1-10 scale):
```javascript
iceScore = (impact + confidence + ease) / 3
```

### Organization Scoping
All entities are scoped to organizations:
- Middleware: `middleware.organization.attachOrganization`
- Request: `req.organisation.orgId`
- Storage: All entities store `orgId` field
- Indexes: MongoDB indexes by `orgId`

### AI Integration
Two AI service endpoints:
1. **Experiment Verification**: `POST /hvt/verify-experiment`
   - Validates hypothesis and success criteria
   - Returns AI feedback

2. **Similar Learnings**: `POST /hvt/similar-learnings`
   - Finds related learnings by content/tags
   - Returns similarity matches

### Plugin Hooks
Pre/post hooks for all create/update operations:
```javascript
filter:hvt.{entity}.create
action:hvt.{entity}.created
filter:hvt.{entity}.update
action:hvt.{entity}.updated
```

## Database Operations

### 31 MongoDB Methods
- **Modules**: create, get, getAll, getByOrg, update, delete, exists
- **Problems**: create, get, getByOrg, getByModule, update, delete, exists, incrementIdeaCount
- **Ideas**: create, get, getByProblem, update, delete, exists
- **Experiments**: create, get, getByOrg, getByModule, getByStatus, update, delete, exists, incrementOrgCounter
- **Results**: create, getByExperiment
- **Learnings**: create, get, getByOrg, getByModule, update, delete, exists, count
- **Escalations**: create, get, getByExperiment, update, delete, exists
- **Tickets**: create, getByIdea
- **Updates**: create, getByExperiment
- **Roles**: set, get, getByOrg, delete

## Seeding

### Automatic Seeding
```bash
# Seed all organizations
node src/seed-hvt-modules.js

# Seed specific organization
node src/seed-hvt-modules.js <orgId>
```

### Programmatic Seeding
```javascript
const HVT = require('./src/hvt');

// Seed for organization
await HVT.modules.seedDefaults(orgId, adminUid);
```

## Testing Checklist

### Unit Tests
- [ ] State machine transitions (all 8 states)
- [ ] ICE score calculation (edge cases: 0, 10, decimals)
- [ ] Role hierarchy checks (admin > contributor > viewer)
- [ ] Sanitization (remove _key from responses)
- [ ] Pagination logic

### Integration Tests
- [ ] Create problem → idea → experiment → result → learning workflow
- [ ] Experiment state transitions (enforce valid only)
- [ ] AI service integration (verify + similar)
- [ ] Organization scoping (no cross-org leaks)
- [ ] Permission enforcement (403 for insufficient role)

### API Tests
- [ ] All 50+ endpoints return correct status codes
- [ ] Validation errors (400 for invalid data)
- [ ] Not found errors (404 for missing entities)
- [ ] Auth required (401 without login)
- [ ] Org context required (400 without X-Organization-Id)

### Frontend Integration Tests
- [ ] TypeScript types match backend responses
- [ ] ApiResult<T> wrapper format
- [ ] Error handling (toast notifications)
- [ ] Real-time updates (if using WebSockets)

## Error Codes

All errors use i18n format: `[[error:xxx]]`

- `[[error:organization-context-required]]`
- `[[error:module-id-required]]`
- `[[error:module-not-found]]`
- `[[error:problem-id-required]]`
- `[[error:problem-not-found]]`
- `[[error:invalid-problem-transition-{from}-to-{to}]]`
- `[[error:idea-id-required]]`
- `[[error:idea-not-found]]`
- `[[error:idea-not-approved]]`
- `[[error:invalid-ice-score]]`
- `[[error:experiment-id-required]]`
- `[[error:experiment-not-found]]`
- `[[error:experiment-not-blocked]]`
- `[[error:invalid-experiment-transition-{from}-to-{to}]]`
- `[[error:learning-id-required]]`
- `[[error:learning-not-found]]`
- `[[error:escalation-id-required]]`
- `[[error:escalation-not-found]]`
- `[[error:invalid-severity]]`
- `[[error:invalid-hvt-role]]`
- `[[error:hvt-minimum-role-{role}-required]]`
- `[[error:ai-service-unavailable]]`

## Response Format

All endpoints return:
```typescript
{
  status: {
    code: number,
    message: string
  },
  response: T | { error: string }
}
```

## Implementation Statistics

- **Total Files Created**: 19
- **Total Files Modified**: 7
- **Total Lines of Code**: ~4,500
- **API Endpoints**: 50+
- **Database Methods**: 31
- **Validation Schemas**: 20+
- **Middleware Functions**: 12
- **State Machines**: 4
- **Default Modules**: 8

## Next Steps

1. Add i18n translations for all error codes
2. Write comprehensive test suite
3. Add WebSocket support for real-time updates
4. Implement CSV import/export
5. Add reporting/dashboard endpoints
6. Create admin UI for module management
7. Add audit log for all HVT operations
8. Implement soft deletes with archive functionality

## Notes

- All entities use auto-increment IDs (not MongoDB ObjectIds)
- Experiments are numbered per-organization (org1-exp-1, org1-exp-2, etc.)
- State transitions are strictly enforced at the domain layer
- All responses sanitize MongoDB internal fields (_key, _id)
- Organization context is REQUIRED for all operations (except get operations)
- Plugin hooks are fired for all mutations (create, update, delete)
