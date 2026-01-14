# User Linking Script

This script manages the hierarchical linking of users to organizations, departments, and roles with intelligent flow control based on existing relationships.

## Overview

The `link-user` command provides a robust, idempotent way to link users to organizations, departments, and roles with intelligent flow control that:
- Supports both **individual** and **bulk CSV-based** linking
- Validates all entities before linking
- Checks for existing relationships to avoid duplicates
- Logs all actions with timestamps
- Provides clear status messages
- Supports dry-run mode for testing

## Usage

### Individual User Linking

```bash
./nodebb migrate link-user [options]
```

### Bulk User Linking from CSV

```bash
./nodebb migrate link-user -f link-users-sample.csv [options]
```

### Required Options

**For Individual Linking:**

At least one user identifier:
- `-u, --user-id <uid>` - User ID (numeric)
- `-n, --username <username>` - Username

And organization:
- `-o, --organization-id <orgId>` - Organization ID (required)

**For Bulk CSV Linking:**

- `-f, --file <path>` - Path to CSV file containing user linking data

### Optional Options

- `-d, --department-id <deptId>` - Department ID to link to (individual linking only)
- `-r, --role-id <roleId>` - Role ID to assign (individual linking only)
- `--skip-existing` - Skip users that already have the specified links (CSV linking only)
- `--dry-run` - Show what would be done without making changes

## CSV File Format

For bulk linking, the CSV file should have the following columns:

| Column | Required | Description |
|--------|----------|-------------|
| Username | Yes* | Username of the user |
| User ID | Yes* | User ID (if Username not provided) |
| Organization ID | Yes | ID of the organization |
| Department ID | No | ID of the department to link to |
| Role ID | No | ID of the role to assign |

*Either Username or User ID must be provided.

**Sample CSV (`link-users-sample.csv`):**

```csv
Username,User ID,Organization ID,Department ID,Role ID
john.doe,,1,5,15
jane.smith,,2,10,25
,,42,1,8,20
```

## Examples

### Individual Linking

#### Basic: Link user to organization only

```bash
./nodebb migrate link-user --username john.doe --organization-id 1
```

#### Link user to organization and department

```bash
./nodebb migrate link-user --user-id 42 --organization-id 1 --department-id 5
```

#### Complete: Link user to organization, department, and role

```bash
./nodebb migrate link-user \
  --username jane.smith \
  --organization-id 2 \
  --department-id 10 \
  --role-id 25
```

#### Dry run to test without changes

```bash
./nodebb migrate link-user \
  --username john.doe \
  --organization-id 1 \
  --department-id 5 \
  --role-id 15 \
  --dry-run
```

### Bulk CSV Linking

#### Import user links from CSV

```bash
./nodebb migrate link-user -f link-users-sample.csv
```

#### Dry run with CSV to see what would happen

```bash
./nodebb migrate link-user -f link-users-sample.csv --dry-run
```

#### Skip users that already have the links

```bash
./nodebb migrate link-user -f link-users-sample.csv --skip-existing
```

```bash
./nodebb migrate link-user \
  --username jane.smith \
  --organization-id 2 \
  --department-id 10 \
  --role-id 25
```

### Dry run to test without changes

```bash
./nodebb migrate link-user \
  --username john.doe \
  --organization-id 1 \
  --department-id 5 \
  --role-id 15 \
  --dry-run
```

## Execution Flow

The script follows this intelligent flow:

```
START
  ↓
Step 1: User Validation
  • Check if user exists (by ID or username)
  • If not found → ERROR: User not found
  • If found → Proceed
  ↓
Step 2: Organization Validation
  • Check if organization exists
  • If not found → ERROR: Organization not found
  • Check if user already member of organization
    - If YES → Use existing membership
    - If NO → Create membership
  ↓
Step 3: Department Linking (if department ID provided)
  • Validate department exists
  • Verify department belongs to organization
  • Check if user already linked to this department
    - If NO → Link to department
    - If YES → Skip (already linked)
  ↓
Step 4: Role Linking (if role ID provided)
  • Validate role exists
  • Verify role belongs to organization
  • If role is department-scoped, verify it matches department
  • Check if user already linked to this role
    - If NO → Link to role
    - If YES → Skip (already linked)
  ↓
Step 5: Completion
  • Display summary of actions
  • Show elapsed time
  ↓
SUCCESS
```

## Output Format

The script provides clear, color-coded status messages:

```
=== Step 1: User Validation ===
✓ User validated: john.doe (uid: 42)

=== Step 2: Organization Validation ===
✓ Organization validated: DeepThought (ID: 1)
✓ Organization membership: already exists (ID: 123)

=== Step 3: Department Linking ===
✓ Department validated: Engineering (ID: 5)
✓ Department link: created

=== Step 4: Role Linking ===
✓ Role validated: Senior Developer (ID: 15, scope: department)
✓ Role link: already exists

=== Summary ===
✓ User: john.doe (john.doe@example.com)
✓ Organization: DeepThought
✓ Department: Engineering
✓ Role: Senior Developer
✓ Process completed successfully in 0.45s
```

## Validation Checks

The script performs comprehensive validation:

1. **User Existence** - Verifies user exists in system
2. **Organization Validity** - Checks organization exists
3. **Department Validity** - Validates department exists
4. **Department-Organization Link** - Ensures department belongs to organization
5. **Role Validity** - Validates role exists
6. **Role-Organization Link** - Ensures role belongs to organization
7. **Role-Department Link** - For department-scoped roles, verifies role belongs to specified department
8. **Existing Relationships** - Checks for existing memberships, department links, and role assignments

## Key Features

### Idempotent Operation

Running the script multiple times with the same parameters will not create duplicate links:
- Existing memberships are detected and reused
- Existing department links are skipped
- Existing role assignments are skipped

### Transaction Safety

If any validation fails, no changes are made to the database:
- All validations occur before any modifications
- Clear error messages indicate what failed
- Process exits with error code 1 on failure

### Comprehensive Logging

All actions are logged to Winston logger with timestamps:
- User validation events
- Membership creation events
- Department linking events
- Role assignment events
- Error events with stack traces

### Dry Run Mode

Test the linking process without making any database changes:
```bash
./nodebb migrate link-user --username john.doe --organization-id 1 --dry-run
```

The dry run will:
- Perform all validations
- Show what would be created/linked
- Not modify the database
- Display "[DRY RUN]" prefix on actions that would be taken

## Error Scenarios

The script handles these error scenarios gracefully:

| Error | Description | Exit Code |
|-------|-------------|-----------|
| User not found | User ID or username doesn't exist | 1 |
| Organization not found | Organization ID doesn't exist | 1 |
| Department not found | Department ID doesn't exist | 1 |
| Department mismatch | Department doesn't belong to organization | 1 |
| Role not found | Role ID doesn't exist | 1 |
| Role mismatch | Role doesn't belong to organization | 1 |
| Role-department mismatch | Department-scoped role doesn't match department | 1 |
| Missing user identifier | Neither user ID nor username provided | 1 |
| Missing organization | Organization ID not provided | 1 |
| Database connection failure | Cannot connect to database | 1 |

## Best Practices

### 1. Always validate first with dry-run

```bash
# First, test with dry-run
./nodebb migrate link-user --username john.doe --organization-id 1 --dry-run

# If looks good, run for real
./nodebb migrate link-user --username john.doe --organization-id 1
```

### 2. Link in order: Organization → Department → Role

If linking to both department and role, provide both in the same command:
```bash
./nodebb migrate link-user \
  --username john.doe \
  --organization-id 1 \
  --department-id 5 \
  --role-id 15
```

### 3. Use username for readability

Using username is more readable than user IDs:
```bash
# Readable
./nodebb migrate link-user --username john.doe --organization-id 1

# Works but less readable
./nodebb migrate link-user --user-id 42 --organization-id 1
```

### 4. Verify entity IDs before running

Ensure you have the correct IDs:
```bash
# List organizations
./nodebb migrate validate -f organizations-sample.csv -t organizations

# List departments for an organization
# (Query database or use admin interface)
```

## Integration with Existing Migration System

This command integrates seamlessly with the existing migration system:

```bash
# Step 1: Import organizations
./nodebb migrate organizations -f organizations-sample.csv

# Step 2: Import departments
./nodebb migrate departments -f departments-sample.csv

# Step 3: Import roles
./nodebb migrate roles -f roles-sample.csv

# Step 4: Import users (creates base accounts)
./nodebb migrate users -f user.csv --skip-existing

# Step 5: Link specific users to departments/roles
./nodebb migrate link-user --username john.doe --organization-id 1 --department-id 5 --role-id 15
```

## Success Criteria

A successful run means:
- ✓ Script executes without errors
- ✓ No duplicate relationships created
- ✓ Existing relationships preserved
- ✓ All actions logged with timestamps
- ✓ Clear status messages displayed
- ✓ Idempotent (safe to run multiple times)
- ✓ Process completes with exit code 0

## Technical Details

### Database Operations

The script performs these database operations:

- **SELECT** - Check existing relationships
- **INSERT** - Create new memberships
- **UPDATE** - Modify existing memberships with department/role

### Relationship Model

The script works with this relationship model:

```
User
  └─ Membership (organization-level)
      ├─ Department (optional)
      └─ Role (optional, can be org or dept-scoped)
```

### Dependencies

Required modules:
- `winston` - Logging
- `chalk` - Colored console output
- `../database` - Database operations
- `../user` - User operations
- `../organizations` - Organization, department, role operations

## Troubleshooting

### "User not found"
- Verify user exists with correct ID or username
- Check for typos in username

### "Organization not found"
- Verify organization ID is correct
- Run organizations migration first if needed

### "Department does not belong to organization"
- Check department ID and organization ID match
- Use admin interface or database query to verify

### "Role does not belong to organization"
- Check role ID and organization ID match
- Verify role wasn't deleted or deactivated

### "Already member" error
- User is already a member - this is handled automatically
- If you see this, there may be an issue with membership checking logic

## Notes

- The script uses color-coded output (requires terminal with color support)
- Logging uses Winston logger (ensure Winston is configured)
- All IDs should be numeric values
- The script is designed for single-user operations (for bulk operations, use CSV import)
- Membership creation includes base member type ('member') by default
