# Data Migration Guide

This document describes the data migration functionality that reads CSV files and creates/updates users, organizations, departments, and roles.

## Migration Methods

There are two ways to migrate data:

### 1. CLI Command (Recommended)

Use the `migrate` CLI command for on-demand data migrations:

```bash
# Validate CSV before importing
./nodebb migrate validate -f <file>.csv -t <type>

# Import data
./nodebb migrate <type> -f <file>.csv

# Options: --skip-existing, --dry-run
./nodebb migrate <type> -f <file>.csv --dry-run
```

**Supported types:** `users`, `organizations`, `departments`, `roles`

### 2. Automatic Upgrade Script

User migration also runs automatically during the upgrade process:

```bash
./nodebb upgrade
```

The upgrade script (`src/upgrades/4.7.0/migrate-users-from-csv.js`) processes the `user.csv` file during schema upgrades.

## CLI Command Usage

### Organizations

Import organizations from CSV:

```bash
# Validate organizations CSV
./nodebb migrate validate -f organizations-sample.csv -t organizations

# Import organizations
./nodebb migrate organizations -f organizations-sample.csv

# Skip existing organizations
./nodebb migrate organizations -f organizations-sample.csv --skip-existing

# Dry run
./nodebb migrate organizations -f organizations-sample.csv --dry-run
```

**CSV Format (organizations-sample.csv):**
- **Name** (required): Organization name
- **Sector**: Industry sector
- **Website**: Organization website URL
- **About**: Description of the organization
- **Employee Range**: Size of the organization (e.g., "50-200")

### Departments

Import departments from CSV:

```bash
# Validate departments CSV
./nodebb migrate validate -f departments-sample.csv -t departments

# Import departments
./nodebb migrate departments -f departments-sample.csv
```

**CSV Format (departments-sample.csv):**
- **Name** (required): Department name
- **Description**: Department description
- **Organization ID** (required): ID of the parent organization
- **Parent Department ID**: ID of parent department (for nested departments)
- **Level**: Hierarchy level (0 for root departments)

**Note:** Organizations must be created before importing departments.

### Roles

Import roles from CSV:

```bash
# Validate roles CSV
./nodebb migrate validate -f roles-sample.csv -t roles

# Import roles
./nodebb migrate roles -f roles-sample.csv
```

**CSV Format (roles-sample.csv):**
- **Name** (required): Role name
- **Description**: Role description
- **Organization ID** (required): ID of the parent organization
- **Department ID**: ID of department (for department-scoped roles)
- **Scope**: "organization" or "department" (defaults to "organization")

**Note:** Organizations must be created before importing roles. If assigning to a department, that department must exist.

### Users

Import users from CSV:

## Features

The migration functionality performs the following operations:

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

```bash
# Validate users CSV
./nodebb migrate validate -f user.csv -t users

# Import users
./nodebb migrate users -f user.csv

# Skip existing users
./nodebb migrate users -f user.csv --skip-existing

# Dry run
./nodebb migrate users -f user.csv --dry-run
```

**CSV Format (user.csv):**

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

## CLI Command Usage

### Validate CSV

Before importing, validate your CSV file:

```bash
./nodebb migrate validate -f user.csv -t users
```

This command checks for:
- Missing required fields (username, email)
- Field count consistency across rows  
- Data format issues
- Displays validation statistics and sample data

### Import Users

Import users from a CSV file:

```bash
./nodebb migrate users -f user.csv
```

**Options:**
- `-f, --file <path>`: Path to CSV file (required)
- `--skip-existing`: Skip existing users instead of updating their memberships
- `--dry-run`: Validate CSV without making any database changes

**Examples:**

```bash
# Standard import (updates memberships for existing users)
./nodebb migrate users -f user.csv

# Skip existing users, only create new ones
./nodebb migrate users -f user.csv --skip-existing

# Test import without making changes
./nodebb migrate users -f user.csv --dry-run

# Import from a different file location
./nodebb migrate users -f /path/to/custom-users.csv
```

## CLI Features

The new CLI command provides:

- **Flexible file paths**: Import from any CSV file location
- **Dry-run mode**: Test migrations without database changes  
- **Skip existing option**: Choose whether to update or skip existing users
- **Detailed validation**: Pre-import validation with clear error messages
- **Progress logging**: See exactly what's happening during migration
- **Error reporting**: Clear error messages for troubleshooting
- **Reusable for future migrations**: Standard pattern for other data types

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
