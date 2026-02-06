# Ably Real-Time Notifications API Documentation

## Overview

This API provides real-time notification capabilities for NodeBB using Ably for real-time messaging and Web Push for browser notifications. The API is integrated into NodeBB's core at `/api/v3/notifications`.

## Table of Contents

1. [Configuration](#configuration)
2. [API Endpoints](#api-endpoints)
3. [Authentication](#authentication)
4. [Error Handling](#error-handling)
5. [Usage Examples](#usage-examples)
6. [Security Considerations](#security-considerations)
7. [Frontend Integration](#frontend-integration)

## Configuration

### Required Environment Variables

The following configuration must be set in your NodeBB installation:

#### Ably Configuration
```javascript
// In config.json or via nconf
{
  "ably:apiKey": "your-ably-api-key"
}
```

Or as environment variable:
```bash
export ably__apiKey="your-ably-api-key"
```

#### VAPID Configuration (for Web Push)
```javascript
// In config.json or via nconf
{
  "vapid:publicKey": "your-vapid-public-key",
  "vapid:privateKey": "your-vapid-private-key",
  "vapid:email": "your-contact-email@example.com"
}
```

Or as environment variables:
```bash
export vapid__publicKey="your-vapid-public-key"
export vapid__privateKey="your-vapid-private-key"
export vapid__email="your-contact-email@example.com"
```

#### Generating VAPID Keys

You can generate VAPID keys using the `web-push` library:

```bash
npx web-push generate-vapid-keys
```

## API Endpoints

### 1. Generate Ably Token

Generate a secure Ably authentication token for a logged-in user.

**Endpoint:** `POST /api/v3/notifications/ably-token`

**Authentication:** Required (user must be logged in)

**Request Body:**
```json
{
  "uid": 123
}
```

**Response:**
```json
{
  "status": {
    "code": "ok",
    "message": "OK"
  },
  "response": {
    "token": "token-key-name",
    "tokenRequest": {
      "keyName": "key-name",
      "ttl": 3600000,
      "capability": {
        "notifications:user:123": ["subscribe", "history"],
        "notifications:global": ["subscribe", "history"]
      },
      "nonce": "...",
      "timestamp": 1234567890,
      "mac": "..."
    },
    "expires": 1234567890000
  }
}
```

**Channel Permissions:**
- `notifications:user:{uid}` - Subscribe and read history for user-specific notifications
- `notifications:global` - Subscribe and read history for global notifications

**Token Expiration:** 1 hour

**Errors:**
- `401` - User not logged in
- `403` - User does not have permission to generate token for this uid
- `400` - Invalid uid or user does not exist
- `500` - Failed to generate token (check Ably API key configuration)

### 2. Store Push Subscription

Store a browser push notification subscription for a user.

**Endpoint:** `POST /api/v3/notifications/push-subscription`

**Authentication:** Required (user must be logged in)

**Request Body:**
```json
{
  "uid": 123,
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "base64-encoded-key",
      "auth": "base64-encoded-auth"
    }
  }
}
```

**Response:**
```json
{
  "status": {
    "code": "ok",
    "message": "OK"
  },
  "response": {
    "success": true,
    "subscriptionId": "uuid-v4"
  }
}
```

**Validation:**
- User must be logged in
- Requesting user must match uid
- Subscription object must contain endpoint and keys
- Keys must contain p256dh and auth
- Endpoint must be a valid URL

**Errors:**
- `401` - User not logged in
- `403` - User does not have permission to store subscription for this uid
- `400` - Invalid subscription data, keys, or endpoint URL

### 3. Remove Push Subscription

Remove a browser push notification subscription.

**Endpoint:** `DELETE /api/v3/notifications/push-subscription`

**Authentication:** Required (user must be logged in)

**Request Body:**
```json
{
  "uid": 123,
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

To remove all subscriptions for a user, omit the `endpoint` field:
```json
{
  "uid": 123
}
```

**Response:**
```json
{
  "status": {
    "code": "ok",
    "message": "OK"
  },
  "response": {
    "success": true
  }
}
```

**Errors:**
- `401` - User not logged in
- `403` - User does not have permission to remove subscription for this uid

### 4. Send Notification

Send a notification to one or more users via Ably and Web Push.

**Endpoint:** `POST /api/v3/notifications/send`

**Authentication:** Required (admin only)

**Request Body:**
```json
{
  "uids": [123, 456, 789],
  "title": "Notification Title",
  "message": "Notification message content",
  "type": "info",
  "actionUrl": "https://example.com/action",
  "icon": "https://example.com/icon.png",
  "metadata": {
    "customField": "customValue"
  }
}
```

**Fields:**
- `uids` (required): Array of user IDs to send notification to
- `title` (required): Notification title
- `message` (required): Notification message
- `type` (optional): Notification type (info, success, warning, error). Default: "info"
- `actionUrl` (optional): URL to navigate to when notification is clicked
- `icon` (optional): Icon URL for the notification
- `metadata` (optional): Additional custom data

**Response:**
```json
{
  "status": {
    "code": "ok",
    "message": "OK"
  },
  "response": {
    "notificationId": "uuid-v4",
    "results": [
      { "uid": 123, "success": true },
      { "uid": 456, "success": true },
      { "uid": 789, "success": false, "error": "error message" }
    ]
  }
}
```

**Behavior:**
- Notification is published to each user's Ably channel: `notifications:user:{uid}`
- If user has web push subscriptions, push notifications are sent
- Expired subscriptions (HTTP 410) are automatically cleaned up
- Errors for individual users don't fail the entire operation

**Errors:**
- `401` - User not logged in
- `403` - User is not an administrator
- `400` - Invalid uids array, missing title/message, or invalid data

### 5. Get Notification History

Retrieve notification history for a user (optional feature).

**Endpoint:** `GET /api/v3/notifications/:uid/history`

**Authentication:** Required (user must be logged in)

**Query Parameters:**
- `limit` (optional): Number of notifications to return. Default: 30, Max: 100
- `offset` (optional): Offset for pagination. Default: 0

**Example:**
```
GET /api/v3/notifications/123/history?limit=20&offset=0
```

**Response:**
```json
{
  "status": {
    "code": "ok",
    "message": "OK"
  },
  "response": {
    "notifications": [],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total": 0
    },
    "note": "Consider integrating with NodeBB existing notification system"
  }
}
```

**Note:** This is a placeholder endpoint. For production use, consider integrating with NodeBB's existing notification system or implementing persistent storage for notifications.

**Errors:**
- `401` - User not logged in
- `403` - User does not have permission to view history for this uid

## Authentication

All endpoints require authentication using NodeBB's standard authentication mechanisms:

1. **Session-based authentication** (cookies)
2. **Bearer token authentication** (Authorization header)

Example with bearer token:
```bash
curl -X POST https://your-nodebb-url/api/v3/notifications/ably-token \
  -H "Authorization: Bearer your-api-token" \
  -H "Content-Type: application/json" \
  -d '{"uid": 123}'
```

## Error Handling

All errors follow NodeBB's standard error response format:

```json
{
  "status": {
    "code": "bad-request",
    "message": "Error message"
  },
  "response": {}
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (insufficient privileges)
- `404` - Not Found
- `500` - Internal Server Error

## Usage Examples

### Frontend: Subscribe to Notifications with Ably

```javascript
// 1. Generate Ably token
const response = await fetch('/api/v3/notifications/ably-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ uid: currentUser.uid }),
  credentials: 'include',
});

const { response: { tokenRequest } } = await response.json();

// 2. Connect to Ably
const ably = new Ably.Realtime({
  authCallback: (tokenParams, callback) => {
    callback(null, tokenRequest);
  },
});

// 3. Subscribe to user's notification channel
const channel = ably.channels.get(`notifications:user:${currentUser.uid}`);
channel.subscribe('notification', (message) => {
  const notification = message.data;
  console.log('Received notification:', notification);
  
  // Display notification in UI
  showNotification(notification.title, notification.message, notification.icon);
});
```

### Frontend: Register Web Push Subscription

```javascript
// 1. Request notification permission
const permission = await Notification.requestPermission();
if (permission !== 'granted') {
  console.log('Notification permission denied');
  return;
}

// 2. Register service worker
const registration = await navigator.serviceWorker.register('/service-worker.js');

// 3. Subscribe to push notifications
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
});

// 4. Send subscription to server
await fetch('/api/v3/notifications/push-subscription', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    uid: currentUser.uid,
    subscription: subscription.toJSON(),
  }),
  credentials: 'include',
});

// Helper function
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

### Backend: Send Notification to Users

```javascript
const api = require('./src/api');

// Send notification to specific users
await api.notifications.sendNotification(
  { uid: adminUid },
  {
    uids: [123, 456, 789],
    title: 'New Message',
    message: 'You have a new message from @username',
    type: 'info',
    actionUrl: '/chats/room-id',
    icon: '/path/to/icon.png',
    metadata: {
      roomId: 'room-id',
    },
  }
);
```

## Security Considerations

### Critical Security Requirements

1. **Never expose secrets to clients**
   - Ably API key is never sent to frontend
   - VAPID private key is never sent to frontend
   - Token generation is server-side only

2. **Authentication and Authorization**
   - All endpoints require authentication
   - Users can only access their own data
   - Admin-only endpoints are protected

3. **Input Validation**
   - All user inputs are validated and sanitized
   - URL validation for push subscription endpoints
   - Type checking on all parameters

4. **Rate Limiting**
   - Consider implementing rate limiting on token generation
   - Consider implementing rate limiting on notification sending

5. **HTTPS Required**
   - Web Push requires HTTPS in production
   - Use secure transport for all API calls

6. **Token Expiration**
   - Ably tokens expire after 1 hour
   - Frontend should handle token refresh

### Best Practices

1. **Cleanup**
   - Expired push subscriptions are automatically removed (HTTP 410)
   - Consider periodic cleanup of old subscriptions

2. **Error Handling**
   - Individual notification failures don't fail entire batch
   - Detailed logging for troubleshooting

3. **Performance**
   - Batch notification sending for multiple users
   - Asynchronous push notification sending

4. **Privacy**
   - Users can only generate tokens for themselves
   - Users can only manage their own subscriptions
   - Only admins can send notifications

## Frontend Integration

### Service Worker for Web Push

Create a `public/service-worker.js` file:

```javascript
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const title = data.title || 'Notification';
  const options = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: '/badge.png',
    data: data.data,
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.openWindow(url)
  );
});
```

### Notification Display Component

```javascript
class NotificationManager {
  constructor() {
    this.ably = null;
    this.channel = null;
  }
  
  async initialize(uid) {
    // Generate Ably token
    const tokenResponse = await fetch('/api/v3/notifications/ably-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
      credentials: 'include',
    });
    
    const { response: { tokenRequest } } = await tokenResponse.json();
    
    // Connect to Ably
    this.ably = new Ably.Realtime({
      authCallback: (tokenParams, callback) => {
        callback(null, tokenRequest);
      },
    });
    
    // Subscribe to notifications
    this.channel = this.ably.channels.get(`notifications:user:${uid}`);
    this.channel.subscribe('notification', this.handleNotification.bind(this));
  }
  
  handleNotification(message) {
    const notification = message.data;
    
    // Display in-app notification
    this.showInAppNotification(notification);
    
    // Update notification count
    this.updateNotificationCount();
  }
  
  showInAppNotification(notification) {
    // Implement your UI notification display logic
    console.log('New notification:', notification);
  }
  
  async setupPushNotifications() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.log('Push notifications not supported');
      return;
    }
    
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(window.vapidPublicKey),
    });
    
    await fetch('/api/v3/notifications/push-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: window.config.uid,
        subscription: subscription.toJSON(),
      }),
      credentials: 'include',
    });
  }
  
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
  
  disconnect() {
    if (this.channel) {
      this.channel.unsubscribe();
    }
    if (this.ably) {
      this.ably.close();
    }
  }
}

// Usage
const notificationManager = new NotificationManager();
notificationManager.initialize(currentUser.uid);
notificationManager.setupPushNotifications();
```

## Troubleshooting

### Common Issues

1. **"Ably API key not configured" error**
   - Ensure `ably:apiKey` is set in config.json or environment variables
   - Check nconf configuration

2. **Web Push not working**
   - Verify VAPID keys are configured correctly
   - Ensure site is using HTTPS (required for Web Push)
   - Check service worker registration

3. **"No privileges" error**
   - Verify user is authenticated
   - Check user's uid matches request uid
   - For send notification, verify user is admin

4. **Token generation fails**
   - Verify Ably API key is valid
   - Check network connectivity to Ably servers
   - Review server logs for detailed error messages

### Logging

All notification operations are logged using Winston:

```javascript
winston.verbose('[notifications] Generated Ably token for user 123');
winston.verbose('[notifications] Stored push subscription for user 123');
winston.info('[notifications] Sent notification xyz to 10 users');
winston.error('[notifications] Error: ...');
```

Check NodeBB logs for troubleshooting:
```bash
tail -f logs/output.log
```

## Performance Considerations

1. **Batch Operations**
   - Send notifications to multiple users in a single API call
   - Database operations are optimized with Promise.all

2. **Caching**
   - Ably client is cached and reused
   - Consider implementing token caching if needed

3. **Cleanup**
   - Expired subscriptions are automatically removed
   - Consider implementing periodic cleanup job for old data

4. **Scalability**
   - Ably handles real-time message distribution
   - Web Push notifications are sent asynchronously
   - Error handling prevents single failures from affecting batch operations

## Future Enhancements

1. **Notification History Persistence**
   - Store notifications in database for history
   - Implement read/unread status tracking
   - Add notification expiration and cleanup

2. **Integration with NodeBB Notifications**
   - Consider integrating with existing NodeBB notification system
   - Sync with forum notifications

3. **Advanced Features**
   - Notification preferences per user
   - Notification categories and filtering
   - Silent notifications
   - Notification grouping

4. **Analytics**
   - Track notification delivery rates
   - Monitor user engagement with notifications
   - A/B testing for notification content

## Support

For issues or questions:
1. Check server logs for error messages
2. Review this documentation
3. Check Ably documentation: https://ably.com/docs
4. Check Web Push documentation: https://developers.google.com/web/fundamentals/push-notifications
