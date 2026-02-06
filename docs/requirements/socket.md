# BACKEND PROMPT: Ably Real-Time Notifications API for NodeBB

## Critical Instructions

**ANALYZE FIRST, CODE LATER**: Before writing any code, thoroughly analyze my NodeBB installation to understand:

### NodeBB Architecture Analysis Required
- Is this NodeBB running as a standard installation or customized fork?
- Which database is configured: MongoDB or Redis or PostgreSQL?
- What is the current NodeBB version?
- Review existing plugin structure if any plugins are installed
- Understand the routing patterns used for custom API endpoints
- Identify authentication and session management approach
- Check how existing API routes are protected and validated
- Review error handling and response formatting conventions
- Understand the database abstraction layer usage patterns
- Identify logging practices and tools in use
- Check existing middleware patterns
- Review how user permissions and roles are checked
- Understand how settings and configurations are stored
- Identify existing notification system integration points

### Implementation Approach Decision
**Ask me first**: Should this be implemented as:
- A separate NodeBB plugin (installable via npm)
- Direct integration into NodeBB core
- A custom library added to the existing codebase

**Do NOT assume** - Ask which approach fits our project structure better.

---

## Project Context

### Backend Platform
- NodeBB forum software built on Node.js
- User authentication is already handled by NodeBB
- Users have unique ID (uid) in NodeBB
- Session management is already configured

### Integration Goal
Create API endpoints for Ably real-time notifications that:
- Generate secure Ably authentication tokens for logged-in users
- Store and manage web push notification subscriptions
- Send notifications to users via Ably
- Optionally retrieve notification history
- Follow all existing NodeBB patterns and conventions

---

## Required API Endpoints

### 1. Ably Token Generation Endpoint

**Purpose**: Generate secure Ably auth tokens for authenticated NodeBB users

**Requirements**:
- Endpoint should follow NodeBB's existing API route naming conventions
- Require user authentication using NodeBB's standard middleware
- Accept NodeBB user ID (uid) in request
- Validate that requesting user matches the uid (prevent impersonation)
- Generate Ably token using Ably REST API or SDK
- Set appropriate token expiration time (recommend 1 hour)
- Grant channel permissions for user-specific channel: notifications:user:{uid}
- Optionally grant read access to global channel: notifications:global
- Return token with expiration timestamp
- Handle errors following NodeBB's error response patterns
- Log token generation events using NodeBB's logging system
- Consider rate limiting if NodeBB has rate limiting middleware

**Security Considerations**:
- Never expose Ably API key to frontend
- Validate all inputs
- Use NodeBB's existing validation utilities
- Ensure proper authentication checks

### 2. Web Push Subscription Storage Endpoint

**Purpose**: Store browser push notification subscriptions for users

**Requirements**:
- Endpoint for storing push subscription data
- Require authentication
- Accept user ID and push subscription object (endpoint, p256dh key, auth key)
- Validate subscription data structure
- Store in NodeBB's database using existing database patterns
- Handle duplicate subscriptions: update if exists, create if new
- Associate subscription with user ID
- Consider encrypting sensitive subscription keys
- Return success/failure response following existing patterns
- Handle database errors gracefully
- Clean up expired or invalid subscriptions

**Database Storage**:
- Follow NodeBB's data storage patterns (sorted sets, objects, collections)
- Create appropriate indexes for efficient queries
- Consider data expiration or cleanup policies
- Store: user ID, endpoint, keys, timestamp, active status

### 3. Web Push Unsubscribe Endpoint

**Purpose**: Remove user's push notification subscription

**Requirements**:
- Allow users to unsubscribe from push notifications
- Require authentication
- Accept user ID and optionally endpoint
- Remove subscription from database
- If no specific endpoint, remove all user's subscriptions
- Handle case where subscription doesn't exist gracefully
- Return success response

### 4. Send Notification Endpoint

**Purpose**: Send notifications to users (admin/system use)

**Requirements**:
- Admin or system-level endpoint for sending notifications
- Implement proper authorization (admin-only or specific permissions)
- Accept single user ID or array of user IDs
- Accept notification data: title, message, type, optional action URL, icon, metadata
- Generate unique notification ID
- Publish notification to Ably channel for real-time delivery
- Optionally send web push notification if user has subscriptions
- Handle web push failures gracefully (expired subscriptions)
- Optionally integrate with NodeBB's existing notification system
- Optionally store notification in database for history
- Return success/failure with notification ID
- Handle batch sending for multiple users efficiently
- Log all notification sending activities

**Web Push Integration**:
- Use web-push library or similar
- Configure VAPID keys securely
- Retrieve user's push subscriptions from database
- Send push notification with proper payload
- Handle 410 Gone status (expired subscription) and clean up
- Handle other errors without failing entire operation

### 5. Get Notification History (Optional)

**Purpose**: Retrieve user's notification history

**Requirements**:
- Endpoint for fetching user's past notifications
- Require authentication
- Support pagination with limit and offset
- Optionally filter by read/unread status
- Return notifications ordered by timestamp (newest first)
- Follow NodeBB's pagination response format
- Consider using NodeBB's existing notification system if appropriate

### 6. Mark Notification as Read (Optional)

**Purpose**: Update notification read status

**Requirements**:
- Allow user to mark notification as read
- Validate user owns the notification
- Update read status in database
- Optionally publish event to Ably for real-time sync
- Return success response

### 7. Delete Notification (Optional)

**Purpose**: Remove a notification

**Requirements**:
- Allow user to delete their notification
- Validate ownership
- Remove from database (soft or hard delete based on existing patterns)
- Optionally publish delete event to Ably
- Return success response

---

## Configuration and Settings

### Environment Variables or Settings Storage
- Store Ably API key securely (never in frontend)
- Store VAPID public and private keys
- Store VAPID email contact
- Follow NodeBB's configuration storage patterns (meta.config or environment)
- If plugin: create admin panel settings page using NodeBB's ACP templates

### Required Secrets
- Ably REST API key
- VAPID public key (for web push)
- VAPID private key (for web push)
- VAPID contact email

---

## Database Design

### Push Subscription Storage
Design database schema following NodeBB's patterns to store:
- User ID (uid)
- Subscription endpoint
- P256DH key (consider encryption)
- Auth key (consider encryption)
- Creation timestamp
- Last updated timestamp
- Active status
- Any additional metadata

### Notification Storage (if persistence needed)
Design schema to store:
- Notification ID
- User ID
- Title
- Message
- Type (info/success/warning/error)
- Timestamp
- Read status
- Action URL
- Icon URL
- Metadata
- Expiration or cleanup policy

---

## Integration with NodeBB

### Authentication and Authorization
- Use NodeBB's existing middleware for route protection
- Access authenticated user via request object following NodeBB patterns
- Implement admin checks using NodeBB's User module methods
- Validate user permissions for admin-only endpoints

### Database Operations
- Use NodeBB's database abstraction layer exclusively
- Follow NodeBB's patterns for data storage (sorted sets, objects, etc.)
- Use appropriate database methods for MongoDB or Redis
- Implement proper error handling for database operations
- Use transactions if available and necessary

### Error Handling
- Follow NodeBB's error response format
- Use appropriate HTTP status codes
- Return user-friendly error messages
- Log errors using NodeBB's winston logger
- Don't expose internal errors to clients

### Logging
- Use NodeBB's winston logger for all logging
- Log important events: token generation, notification sending, errors
- Include relevant context in log messages
- Follow existing log level conventions

### Cleanup and Maintenance
- Implement cleanup for expired subscriptions
- Handle user deletion (remove all user's subscriptions and notifications)
- Use NodeBB's hooks if implementing as plugin
- Consider periodic cleanup tasks for old notifications

---

## Dependencies

### NPM Packages Needed
- ably: For Ably REST API client
- web-push: For sending web push notifications

### Installation
- Add to package.json dependencies
- Follow NodeBB's dependency management practices

---

## Plugin Structure (if plugin approach)

### Plugin Requirements
- Create plugin.json with metadata
- Define hooks for NodeBB integration
- Register custom routes
- Implement admin panel settings
- Handle plugin activation/deactivation
- Implement cleanup on user deletion
- Follow NodeBB plugin development guidelines

### Important Hooks
- Route initialization hook
- User deletion hook
- Any other relevant NodeBB lifecycle hooks

---

## Security Best Practices

### Critical Security Requirements
- Never expose Ably secret key or VAPID private key to clients
- Validate all user inputs thoroughly
- Use NodeBB's sanitization utilities
- Implement proper authentication checks on all endpoints
- Validate user ownership of resources
- Use HTTPS in production
- Encrypt sensitive data in database if possible
- Implement rate limiting on notification sending
- Validate Ably tokens server-side
- Prevent injection attacks
- Handle CORS appropriately

---

## Performance Considerations

### Optimization Requirements
- Cache Ably client instances appropriately
- Batch notification sending for multiple users
- Use NodeBB's caching layer where beneficial
- Implement efficient database queries with proper indexes
- Consider pagination for large result sets
- Clean up old data periodically
- Handle high-volume notification sending efficiently
- Avoid blocking operations

---

## Testing Requirements

### Areas to Test
- Token generation for valid users
- Token generation rejection for invalid users
- Push subscription storage and retrieval
- Notification sending to single and multiple users
- Web push delivery and error handling
- Database operations
- Error handling and edge cases
- Cleanup operations
- Authentication and authorization
- Integration with NodeBB's systems

---

## Documentation Requirements

### Documentation Needed
- API endpoint documentation with request/response examples
- Setup and installation instructions
- Configuration guide for environment variables
- Integration guide for frontend
- Error codes and meanings
- Security considerations
- Performance tuning guide
- Troubleshooting common issues

---

## Questions to Answer Before Implementation

1. Should this be a plugin or core modification to NodeBB?
2. Which database is NodeBB currently using?
3. What NodeBB version is installed?
4. Should notifications integrate with NodeBB's existing notification system?
5. Are there existing plugins that might conflict?
6. What are the expected volume and concurrency requirements?
7. Should notification history be persistent or in-memory only?
8. What cleanup/retention policies for old notifications?
9. Are there existing rate limiting mechanisms to use?
10. Should this support NodeBB clustering if deployed across multiple servers?

---

## Expected Deliverables

### Complete Implementation
- All required API endpoints implemented
- Database schema created following NodeBB patterns
- Configuration and settings management
- Error handling and logging
- Security measures implemented
- Performance optimizations applied

### Code Quality
- Follow NodeBB's coding standards
- Add comprehensive comments
- Handle all edge cases
- Proper error messages
- Clean, maintainable code

### Documentation
- Setup guide
- API documentation
- Configuration instructions
- Integration examples
- Security notes

---

**START BY**: Analyzing my NodeBB installation, asking clarifying questions about the preferred implementation approach, then provide a solution that seamlessly integrates with the existing codebase following all established patterns.
