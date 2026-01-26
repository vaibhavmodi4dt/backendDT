# Organization Context Middleware

## Overview

The Organization Context Middleware automatically extracts organization, department, and user information from HTTP headers and enriches the request object with organization-related data, permissions, and cached membership details.

This middleware is applied **globally** to all API requests and provides automatic permission checking and caching to optimize performance.

## Features

- **Automatic Header Extraction**: Reads `X-Organization-Id`, `X-Department-Id`, and `X-User-Id` headers
- **Request Enrichment**: Attaches `req.organisation`, `req.department`, and `req.user` to every request
- **Permission Caching**: 5-minute TTL LRU cache (max 1000 entries) to avoid repeated database lookups
- **Membership Data**: Fetches and caches user membership information in organizations
- **Permission Checks**: Built-in middleware for verifying user permissions
- **Graceful Degradation**: Skips processing if no organization header is present

## Request Headers

The middleware expects the following optional headers:

```
X-Organization-Id: {organizationId}     # Organization identifier
X-Department-Id: {departmentId}         # Department identifier (optional)
X-User-Id: {userId}                     # User identifier (optional, defaults to req.uid)
```

Headers are case-insensitive and can be sent in lowercase or uppercase.

## Request Object Properties

After the middleware processes a request, the following properties are available:

### `req.organisation`

Contains organization data with permissions and membership information.

```javascript
{
  orgId: string,
  name: string,
  sector: string,
  website: string,
  about: string,
  employeeRange: string,
  emails: array,
  phoneNumbers: array,
  locations: array,
  socialLinks: array,
  leaders: array,
  images: object,
  state: string,
  timestamp: number,
  lastmodified: number,
  lastmodifiedBy: string,
  permissions: {
    isMember: boolean,
    isManager: boolean,
    isLeader: boolean
  },
  membership: {
    membershipId: string,
    uid: string,
    organizationId: string,
    departmentId: string | null,
    type: 'member' | 'manager' | 'leader',
    roleId: string | null,
    status: 'active' | 'removed',
    joinedAt: number,
    removedAt: number | null
  }
}
```

### `req.department`

Contains department data with permissions information (optional).

```javascript
{
  deptId: string,
  organizationId: string,
  name: string,
  description: string,
  parentDepartmentId: string | null,
  level: number,
  state: string,
  timestamp: number,
  lastmodified: number,
  lastmodifiedBy: string,
  permissions: {
    isMember: boolean,
    isManager: boolean
  }
}
```

### `req.user`

Contains user ID from the header.

```javascript
{
  id: string
}
```

## Usage Examples

### Basic Usage (No Permission Check)

```javascript
const express = require('express');
const middleware = require('./middleware');

const router = express.Router();

// Middleware automatically extracts headers and enriches request
router.get('/api/organization/info', (req, res) => {
  if (req.organisation) {
    res.json({
      name: req.organisation.name,
      permissions: req.organisation.permissions
    });
  } else {
    res.status(400).json({ error: 'No organization context' });
  }
});
```

### Verify Organization Context

```javascript
router.get(
  '/api/organization/members',
  middleware.requireOrganizationContext,
  (req, res) => {
    // req.organisation is guaranteed to exist here
    res.json({
      organisation: req.organisation
    });
  }
);
```

### Verify Organization Membership

```javascript
router.get(
  '/api/organization/dashboard',
  middleware.requireOrganizationMembership,
  (req, res) => {
    // User is guaranteed to be a member
    res.json({
      dashboard: 'member data'
    });
  }
);
```

### Verify Organization Manager

```javascript
router.post(
  '/api/organization/settings',
  middleware.requireOrganizationManager,
  (req, res) => {
    // User is guaranteed to be an organization manager
    res.json({
      status: 'settings updated'
    });
  }
);
```

### Verify Department Manager

```javascript
router.post(
  '/api/department/members',
  middleware.requireDepartmentManager,
  (req, res) => {
    // User is guaranteed to be a department manager
    res.json({
      status: 'member added'
    });
  }
);
```

### Check Membership Details

```javascript
router.get(
  '/api/organization/my-membership',
  middleware.requireOrganizationMembership,
  (req, res) => {
    const membership = req.organisation.membership;
    res.json({
      type: membership.type,
      joinedAt: membership.joinedAt,
      roleId: membership.roleId
    });
  }
);
```

## Available Middleware Functions

### `organizationContext`

**Applied Globally** - Automatically extracts headers and enriches request.

```javascript
app.use(middleware.organizationContext);
```

### `requireOrganizationContext`

Verifies that the organization header was provided and organization data was loaded.

**Response on failure**: 400 Bad Request

```javascript
router.get('/api/endpoint', middleware.requireOrganizationContext, handler);
```

### `requireOrganizationMembership`

Verifies that the user is a member of the organization.

**Response on failure**: 403 Forbidden (if not a member) or 400 Bad Request (if no organization context)

```javascript
router.get('/api/endpoint', middleware.requireOrganizationMembership, handler);
```

### `requireOrganizationManager`

Verifies that the user is a manager of the organization.

**Response on failure**: 403 Forbidden (if not a manager) or 400 Bad Request (if no organization context)

```javascript
router.post('/api/endpoint', middleware.requireOrganizationManager, handler);
```

### `requireDepartmentMembership`

Verifies that the user is a member of the department.

**Response on failure**: 403 Forbidden (if not a member) or 400 Bad Request (if no department context)

```javascript
router.get('/api/endpoint', middleware.requireDepartmentMembership, handler);
```

### `requireDepartmentManager`

Verifies that the user is a manager of the department.

**Response on failure**: 403 Forbidden (if not a manager) or 400 Bad Request (if no department context)

```javascript
router.post('/api/endpoint', middleware.requireDepartmentManager, handler);
```

## Cache Management

### Manual Cache Invalidation

When organization or department data changes, clear the cache:

```javascript
const middleware = require('./middleware');

// Clear all cache for an organization
middleware.clearContextCache(orgId);

// Clear cache for a specific department in an organization
middleware.clearContextCache(orgId, deptId);
```

**When to call**:
- After updating organization information
- After updating department information
- After changing membership details
- After changing user permissions

### Cache Statistics

Get cache statistics for monitoring:

```javascript
const stats = middleware.getCacheStats();
console.log(stats);
// Output: { size: 42, keys: [...] }
```

## Error Handling

The middleware includes graceful error handling:

- **Missing Headers**: If no organization header is provided, the middleware skips processing
- **Database Errors**: Errors during data fetching are logged but don't fail the request
- **Invalid Data**: If organization/department IDs don't exist, the corresponding properties will be undefined

### Error Response Format

```javascript
{
  status: {
    code: 400 | 403,
    message: 'Bad Request' | 'Forbidden'
  },
  response: {
    error: '[[error:missing-organization-context]]',
    message: 'Human-readable error message'
  }
}
```

## Performance Considerations

### Caching Strategy

- **Cache TTL**: 5 minutes (300,000 ms)
- **Cache Size**: Maximum 1,000 entries
- **Cache Key**: `org:{orgId}:dept:{deptId}:user:{userId}`

### Optimization Tips

1. **Clear cache strategically**: Only clear cache when data actually changes
2. **Reuse organization context**: Within a request, `req.organisation` can be accessed multiple times without additional database calls
3. **Batch operations**: When possible, perform multiple operations within a single request to leverage cached data

### Cache Hit Rate

With proper implementation, expect cache hit rates of 80-95% for typical API usage patterns.

## Implementation Details

### File Location

```
src/middleware/organizationContext.js
```

### Integration Points

- **Middleware Index**: Registered in `src/middleware/index.js`
- **Web Server**: Applied globally in `src/webserver.js` after authentication

### Dependencies

- `cache/lru`: LRU cache implementation
- `organizations`: Organizations database module
- `middleware/helpers`: Helper functions and error handling

## Troubleshooting

### Headers Not Being Recognized

- **Ensure headers are present**: Check request headers in browser DevTools or API client
- **Case sensitivity**: Headers are handled case-insensitively, but verify the exact header names
- **Proxy issues**: If behind a proxy, ensure headers are passed through correctly

### Cache Not Invalidating

- **Call clearContextCache**: Ensure you're calling the cache invalidation function after updates
- **Correct parameters**: Verify the orgId and deptId are correct

### Permissions Not Updating

- **Cache TTL**: Wait up to 5 minutes for cache to expire, or manually clear cache
- **Database consistency**: Verify membership data is correctly stored in the database

## Best Practices

1. **Always use permission middleware**: Use `requireOrganizationManager` instead of checking permissions manually
2. **Clear cache on updates**: Call `clearContextCache()` immediately after data changes
3. **Log permission denials**: Monitor 403 responses for unauthorized access attempts
4. **Validate IDs**: Even with headers, validate that IDs match expected formats
5. **Use TypeScript types** (if applicable): Define types for enriched request object

## Example: Complete Route Handler

```javascript
const express = require('express');
const middleware = require('./middleware');
const Organizations = require('./organizations');

const router = express.Router();

// POST /api/organization/:orgId/members
// Create a new member in an organization
router.post(
  '/organization/:orgId/members',
  middleware.requireOrganizationManager,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const { uid, type, departmentId, roleId } = req.body;

      // Create membership
      const membership = await Organizations.createMembership(orgId, uid, {
        type,
        departmentId,
        roleId,
        createdBy: req.uid
      });

      // Invalidate cache for this organization
      middleware.clearContextCache(orgId, departmentId);

      res.json({
        status: { code: 201, message: 'Created' },
        response: { membership }
      });
    } catch (err) {
      res.status(500).json({
        status: { code: 500, message: 'Internal Server Error' },
        response: { error: err.message }
      });
    }
  }
);

module.exports = router;
```

## Testing

### Mock Headers in Tests

```javascript
const request = require('supertest');
const app = require('./app');

describe('Organization Context Middleware', () => {
  it('should enrich request with organization context', (done) => {
    request(app)
      .get('/api/endpoint')
      .set('X-Organization-Id', '1')
      .set('X-Department-Id', '2')
      .set('X-User-Id', '3')
      .expect(200)
      .end((err, res) => {
        expect(res.body.organisation).toBeDefined();
        expect(res.body.department).toBeDefined();
        done();
      });
  });

  it('should skip middleware without organization header', (done) => {
    request(app)
      .get('/api/endpoint')
      .expect(200)
      .end((err, res) => {
        expect(res.body.organisation).toBeUndefined();
        done();
      });
  });
});
```

## Version History

- **v1.0.0** (26 Jan 2026): Initial release
  - Organization context extraction
  - Department context extraction
  - Membership data fetching
  - Permission caching
  - Permission verification middleware
