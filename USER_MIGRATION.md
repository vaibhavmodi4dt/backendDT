# User CSV Migration

This document describes the user migration script that reads `user.csv` and creates/updates users with organization and department memberships.

## Overview

The migration script (`src/upgrades/4.7.0/migrate-users-from-csv.js`) processes the `user.csv` file and performs the following operations:

1. **User Creation/Update**:
   - Checks if users exist by username or email
   - Creates new users if they don't exist
   - For existing users, removes old memberships from the target organization before re-adding

2. **Organization Membership**:
   - Joins users to organizations based on Organization ID
   - Associates users with departments based on Department ID
   - Assigns roles based on Role ID
   - Sets membership type (member/manager) and status

3. **Data Integrity**:
   - Validates organization, department, and role existence before creating memberships
   - Handles duplicate memberships by removing and recreating them
   - Comprehensive error handling with detailed logging

## CSV File Format

The `user.csv` file should have the following columns:

- **Student Unicorn**: Full name of the user
- **SU Email**: Email address (required)
- **Username**: Username for login (required)
- **Userslug**: URL-friendly username
- **UID**: User ID from the CSV (for reference only)
- **Organization ID**: ID of the organization to join (required for membership)
- **Department ID**: ID of the department within the organization
- **Role ID**: ID of the role to assign
- **Member Type**: Type of membership (member/manager)
- **Status**: Status of the membership (active/inactive)

## Running the Migration

The migration script will run automatically during the upgrade process:

```bash
./nodebb upgrade
```

Or you can run it manually through the upgrade system.

## Validation

Before running the migration, you can validate the CSV file:

```bash
node validate-csv.js
```

This will check for:
- Missing usernames or emails
- Missing organization IDs
- Field count consistency
- Data format issues

## Features

### Duplicate Handling

If a user already exists (by username or email), the script will:
1. Keep the existing user account
2. Remove any existing memberships in the target organization
3. Create new memberships based on CSV data

This ensures that the CSV data is the source of truth for organization memberships.

### Error Handling

- Individual row failures don't stop the entire migration
- Detailed error logging for debugging
- Graceful handling of missing organizations, departments, or roles
- Continues processing even if membership creation fails

### CSV Parsing

The script properly handles:
- Quoted fields with commas (e.g., "Is Org Leader? (CEO,CTO)")
- Empty fields
- Whitespace trimming
- Special characters

## Logs

The migration script logs its progress with timestamps:

```
[2026/01/14] Starting user CSV migration
[2026/01/14] User swapnanilmwq exists (uid: 123)
[2026/01/14] Removed uid 123 from organization 1
[2026/01/14] Added uid 123 to organization 1
[2026/01/14] Migration complete: 66 successful, 0 errors
```

## Rollback

If needed, you can revert the migration by:
1. Removing user memberships through the admin interface
2. Or restoring from a database backup taken before the migration

## Notes

- The migration is idempotent - running it multiple times will update memberships to match the CSV
- User accounts are never deleted, only memberships are updated
- Organizations, departments, and roles must exist before the migration
- The CSV file must be in the root directory of the application
