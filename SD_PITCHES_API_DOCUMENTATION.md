# SD Module - Pitches API Documentation

This document provides route documentation for SD (Self Development) module pitches and questionnaires, including request payloads and responses for API migration.

---

## Table of Contents
1. [Individual Pitch Routes](#1-individual-pitch-routes)
2. [Team Pitch Routes](#2-team-pitch-routes)
3. [Questionnaire Routes](#3-questionnaire-routes)
4. [Teams Routes](#4-teams-routes)

---

## 1. Individual Pitch Routes

### 1.1 Add SD Pitch

**Endpoint:** `POST /api/write/globals/sd-pitch`

**Request Payload:**
```json
{
  "pitch": "This week I learned about effective communication strategies and how to apply them in team settings..."
}
```

**Required Fields:**
- `pitch` (string)

**Response:**
```json
{
  "content": "This week I learned about effective communication strategies and how to apply them in team settings...",
  "createdAt": "2026-02-05T10:30:00.000Z",
  "updatedAt": "2026-02-05T10:30:00.000Z",
  "uid": 123
}
```

**Database Key:** `sd:pitch:{year}-WEEK-{week}:{uid}`

**Example:** `sd:pitch:2026-WEEK-6:123`

---

### 1.2 Get SD Pitches (All)

**Endpoint:** `GET /api/write/globals/sd-pitch`

**Query Parameters:**
```
?week=6           // Optional: ISO week number (default: current week)
?year=2026        // Optional: Year (default: current year)
```

**Response:**
```json
[
  {
    "content": "My pitch content for this week...",
    "createdAt": "2026-02-05T10:30:00.000Z",
    "updatedAt": "2026-02-05T10:30:00.000Z",
    "uid": 123,
    "user": {
      "username": "john_doe",
      "fullname": "John Doe",
      "picture": "/uploads/profile/123-profile.jpg"
    }
  },
  {
    "content": "Another user's pitch...",
    "createdAt": "2026-02-05T09:15:00.000Z",
    "updatedAt": "2026-02-05T09:15:00.000Z",
    "uid": 456,
    "user": {
      "username": "jane_smith",
      "fullname": "Jane Smith",
      "picture": "/uploads/profile/456-profile.jpg"
    }
  }
]
```

**Notes:**
- Returns pitches in reverse chronological order (newest first)
- Includes user details for each pitch

---

### 1.3 Get SD Pitch (Single User)

**Endpoint:** `GET /api/write/globals/sd-pitch`

**Query Parameters:**
```
?uid=123          // User ID
?week=6           // Optional: ISO week number (default: current week)
?year=2026        // Optional: Year (default: current year)
```

**Response:**
```json
{
  "content": "My pitch content...",
  "createdAt": "2026-02-05T10:30:00.000Z",
  "updatedAt": "2026-02-05T10:30:00.000Z",
  "uid": 123,
  "user": {
    "username": "john_doe",
    "fullname": "John Doe",
    "picture": "/uploads/profile/123-profile.jpg"
  }
}
```

---

### 1.4 Search SD Participants

**Endpoint:** `GET /api/write/globals/sd-pitch`

**Query Parameters:**
```
?search=true      // Enable search mode
?week=6           // Optional: ISO week number (default: current week)
?year=2026        // Optional: Year (default: current year)
```

**Response:**
```json
[
  {
    "name": "john_doe",
    "uid": 123
  },
  {
    "name": "jane_smith",
    "uid": 456
  },
  {
    "name": "bob_johnson",
    "uid": 789
  }
]
```

**Notes:**
- Returns list of all users who submitted pitches for the specified week
- Useful for autocomplete/search functionality

---

## 2. Team Pitch Routes

### 2.1 Add SD Team Pitch

**Endpoint:** `POST /api/write/globals/sd-team-pitch`

**Request Payload:**
```json
{
  "pitch": "Our team's collaborative pitch about project management and teamwork...",
  "teamName": "Team Alpha",
  "team": "team1"
}
```

**Required Fields:**
- `pitch` (string)
- `teamName` (string)
- `team` (string) - either "team1" or "team2"

**Response:**
```json
{
  "content": "Our team's collaborative pitch about project management and teamwork...",
  "teamName": "Team Alpha",
  "team": "team1",
  "createdAt": "2026-02-05T10:30:00.000Z",
  "updatedAt": "2026-02-05T10:30:00.000Z",
  "uid": 123
}
```

**Database Key:** `sd:team:pitch:{year}-WEEK-{week}:{uid}`

**Example:** `sd:team:pitch:2026-WEEK-6:123`

---

### 2.2 Get SD Team Pitches

**Endpoint:** `GET /api/write/globals/sd-team-pitch`

**Query Parameters:**
```
?week=6           // Optional: ISO week number (default: current week)
?year=2026        // Optional: Year (default: current year)
```

**Response:**
```json
[
  {
    "content": "Our team's pitch about leadership...",
    "teamName": "Team Alpha",
    "team": "team1",
    "createdAt": "2026-02-05T10:30:00.000Z",
    "updatedAt": "2026-02-05T10:30:00.000Z",
    "uid": 123
  },
  {
    "content": "Another team's pitch about collaboration...",
    "teamName": "Team Beta",
    "team": "team2",
    "createdAt": "2026-02-05T09:30:00.000Z",
    "updatedAt": "2026-02-05T09:30:00.000Z",
    "uid": 456
  }
]
```

**Notes:**
- Returns maximum of 3 most recent team pitches
- Pitches returned in reverse chronological order

---

## 3. Questionnaire Routes

### 3.1 Add SD Questionnaire

**Endpoint:** `POST /api/write/globals/sd-question`

**Request Payload:**
```json
{
  "question": [
    "What did you learn this week?",
    "How will you apply this learning in your work?",
    "What challenges did you face?",
    "What support do you need?"
  ],
  "title": "Weekly Reflection - Week 6"
}
```

**Required Fields:**
- `question` (array of strings)
- `title` (string)

**Response:**
```json
{
  "content": [
    "What did you learn this week?",
    "How will you apply this learning in your work?",
    "What challenges did you face?",
    "What support do you need?"
  ],
  "title": "Weekly Reflection - Week 6",
  "createdAt": "2026-02-05T10:30:00.000Z",
  "updatedAt": "2026-02-05T10:30:00.000Z",
  "uid": 123
}
```

**Database Key:** `sd:question:{year}-WEEK-{week}`

**Example:** `sd:question:2026-WEEK-6`

**Notes:**
- Uses ISO week year (`moment().isoWeekYear()`) for accurate date handling
- Questions are stored as an array

---

### 3.2 Get SD Questionnaire

**Endpoint:** `GET /api/write/globals/sd-question`

**Query Parameters:**
```
?week=6           // Optional: ISO week number (default: current week)
?year=2026        // Optional: Year (default: current year)
```

**Response:**
```json
{
  "content": [
    "What did you learn this week?",
    "How will you apply this learning in your work?",
    "What challenges did you face?",
    "What support do you need?"
  ],
  "title": "Weekly Reflection - Week 6",
  "createdAt": "2026-02-05T10:30:00.000Z",
  "updatedAt": "2026-02-05T10:30:00.000Z",
  "uid": 123
}
```

**Notes:**
- Returns questionnaire for the specified week
- Returns empty object `{}` if no questionnaire exists for that week

---

## 4. Teams Routes

### 4.1 Add Teams

**Endpoint:** `POST /api/write/globals/sd-teams`

**Request Payload:**
```json
{
  "team1": {
    "coach": 100,
    "members": [101, 102, 103]
  },
  "team2": {
    "coach": 200,
    "members": [201, 202, 203]
  }
}
```

**Required Fields:**
- `team1` (object)
  - `coach` (number) - User ID of team 1 coach
  - `members` (array of numbers) - User IDs of team 1 members
- `team2` (object)
  - `coach` (number) - User ID of team 2 coach
  - `members` (array of numbers) - User IDs of team 2 members

**Response:**
```json
{
  "teams": [
    {
      "coach": 100,
      "members": [101, 102, 103]
    },
    {
      "coach": 200,
      "members": [201, 202, 203]
    }
  ],
  "createdAt": "2026-02-05T10:30:00.000Z",
  "updatedAt": "2026-02-05T10:30:00.000Z",
  "uid": 123,
  "sdTeams": {
    "teams": [
      {
        "coach": 100,
        "members": [101, 102, 103]
      },
      {
        "coach": 200,
        "members": [201, 202, 203]
      }
    ],
    "createdAt": "2026-02-05T10:30:00.000Z",
    "updatedAt": "2026-02-05T10:30:00.000Z",
    "uid": 123
  }
}
```

**Database Key:** `sd:teams:{year}-WEEK-{week}`

**Example:** `sd:teams:2026-WEEK-6`

---

### 4.2 Get Teams

**Endpoint:** `GET /api/write/globals/sd-teams`

**Query Parameters:**
```
?week=6           // Optional: ISO week number (default: current week)
?year=2026        // Optional: Year (default: current year)
```

**Response:**
```json
[
  [
    {
      "uid": 100,
      "username": "coach1",
      "fullname": "Coach One",
      "picture": "/uploads/profile/100-profile.jpg"
    },
    {
      "uid": 101,
      "username": "member1",
      "fullname": "Member One",
      "picture": "/uploads/profile/101-profile.jpg"
    },
    {
      "uid": 102,
      "username": "member2",
      "fullname": "Member Two",
      "picture": "/uploads/profile/102-profile.jpg"
    },
    {
      "uid": 103,
      "username": "member3",
      "fullname": "Member Three",
      "picture": "/uploads/profile/103-profile.jpg"
    }
  ],
  [
    {
      "uid": 200,
      "username": "coach2",
      "fullname": "Coach Two",
      "picture": "/uploads/profile/200-profile.jpg"
    },
    {
      "uid": 201,
      "username": "member4",
      "fullname": "Member Four",
      "picture": "/uploads/profile/201-profile.jpg"
    },
    {
      "uid": 202,
      "username": "member5",
      "fullname": "Member Five",
      "picture": "/uploads/profile/202-profile.jpg"
    },
    {
      "uid": 203,
      "username": "member6",
      "fullname": "Member Six",
      "picture": "/uploads/profile/203-profile.jpg"
    }
  ]
]
```

**Notes:**
- Returns array of two teams
- Each team is an array of 4 users (1 coach + 3 members)
- Includes full user details for each team member
- Returns empty object `{}` if no teams exist for that week

---

## Route Summary Table

| Endpoint | Method | Purpose | Required Fields |
|----------|--------|---------|-----------------|
| `/api/write/globals/sd-pitch` | POST | Submit individual pitch | `pitch` |
| `/api/write/globals/sd-pitch` | GET | Get all pitches | - |
| `/api/write/globals/sd-pitch?uid={uid}` | GET | Get single user pitch | - |
| `/api/write/globals/sd-pitch?search=true` | GET | Search participants | - |
| `/api/write/globals/sd-team-pitch` | POST | Submit team pitch | `pitch`, `teamName`, `team` |
| `/api/write/globals/sd-team-pitch` | GET | Get team pitches | - |
| `/api/write/globals/sd-question` | POST | Add questionnaire | `question`, `title` |
| `/api/write/globals/sd-question` | GET | Get questionnaire | - |
| `/api/write/globals/sd-teams` | POST | Create teams | `team1`, `team2` |
| `/api/write/globals/sd-teams` | GET | Get teams with details | - |

---

## Common Query Parameters

All GET endpoints support these optional query parameters:

- `week` - ISO week number (1-53). Default: current week
- `year` - Year. Default: current year

**Example:**
```
GET /api/write/globals/sd-pitch?week=6&year=2026
GET /api/write/globals/sd-question?week=5&year=2026
```

---

## Database Keys Reference

| Resource | Key Pattern | Example |
|----------|-------------|---------|
| Individual Pitch | `sd:pitch:{year}-WEEK-{week}:{uid}` | `sd:pitch:2026-WEEK-6:123` |
| Team Pitch | `sd:team:pitch:{year}-WEEK-{week}:{uid}` | `sd:team:pitch:2026-WEEK-6:123` |
| Questionnaire | `sd:question:{year}-WEEK-{week}` | `sd:question:2026-WEEK-6` |
| Teams | `sd:teams:{year}-WEEK-{week}` | `sd:teams:2026-WEEK-6` |

---

## Source Files

- **API Logic:** [src/api/globals/sdPotal.api.js](src/api/globals/sdPotal.api.js)
- **Controllers:** [src/controllers/write/globals/pitches.js](src/controllers/write/globals/pitches.js)
- **Routes:** [src/routes/write/globals.js](src/routes/write/globals.js)

---

**Documentation Generated:** 2026-02-05
