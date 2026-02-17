# Database Schema Changes - Multi-School to Single-School

## Overview
This document details all database changes required to convert from multi-school SaaS to single-school implementation.

## Current State (Multi-School)
Your database currently has:
- **Multi-school tables:** schools, school_subscriptions, school_settings, student_history, promotion_rules, shared_materials, id_card_templates
- **Tables with school_id:** users, students, classes, subjects, teacher_profiles, and 6 others
- **Role enum includes:** super_admin (for platform management)

## Changes to be Applied

### 1. Tables to be DROPPED
These tables will be completely removed:
- `schools` - School registry
- `school_subscriptions` - Subscription plans
- `school_settings` - School-specific settings
- `student_history` - Multi-school student history
- `promotion_rules` - School-specific promotion rules
- `shared_materials` - Cross-school material sharing
- `id_card_templates` - School-specific ID templates

### 2. Columns to be REMOVED

#### Core Tables
| Table | Column Removed | Impact |
|-------|----------------|--------|
| `users` | `school_id` | Users no longer tied to specific school |
| `students` | `school_id` | All students belong to single school |
| `students` | `registration_number` | Replaced by simpler `student_id` format |
| `classes` | `school_id` | All classes belong to single school |
| `subjects` | `school_id` | All subjects available system-wide |
| `teacher_profiles` | `school_id` | All teachers in single school |

#### Other Tables with school_id
- `id_card_templates.school_id`
- `promotion_rules.school_id`
- `school_settings.school_id`
- `school_subscriptions.school_id`
- `shared_materials.school_id`

### 3. Enum Changes

#### users.role
**Before:**
```sql
ENUM('admin', 'teacher', 'student', 'parent', 'super_admin')
```

**After:**
```sql
ENUM('admin', 'teacher', 'student', 'parent')
```

**Impact:** Removes super_admin role used for platform management across multiple schools

### 4. Index Changes
The following indexes will be dropped:
- `users.idx_users_school`
- `students.idx_students_school`
- `students.idx_students_reg_number`
- `classes.idx_classes_school`
- `subjects.idx_subjects_school`
- `teacher_profiles.idx_teacher_profiles_school`

## Data Retention

### What Gets Deleted
- All school registry data
- All subscription information
- School-specific settings
- Cross-school student history
- Promotion rules
- Shared materials between schools

### What is Preserved
- **All user accounts** (admin, teachers, students, parents)
- **All student records** (just without school_id)
- **All classes** (single school assumed)
- **All subjects**
- **All teacher profiles**
- **All attendance records**
- **All grades and assessments**
- **All financial records**
- **All communication/announcements**

## Student Number Format Change

### Before (Multi-School)
Format: `S####/####` (e.g., S2795/0001)
- First part: School code
- Second part: Sequential student number

### After (Single-School)
Format: `STU####` (e.g., STU0001)
- Simple sequential numbering
- No school code needed

## Migration Safety

### Backup Strategy
The migration script automatically:
1. Creates full database backup before migration
2. Stores in `C:\sms\database\backups\`
3. Names with timestamp: `sms_backup_YYYYMMDD_HHMMSS.sql`

### Rollback Process
If migration fails or you need to revert:
```bash
mysql -u root -p sms_database < C:\sms\database\backups\sms_backup_YYYYMMDD_HHMMSS.sql
```

### Verification Steps
After migration, the script verifies:
1. ✓ Multi-school tables removed
2. ✓ school_id columns removed from core tables
3. ✓ super_admin role removed from users enum
4. ✓ No orphaned references remain

## Running the Migration

### Option 1: Automated Script (Recommended)
```powershell
# Run the PowerShell migration script
powershell -ExecutionPolicy Bypass -File C:\sms\migrate_database.ps1
```

This script will:
- Backup your database
- Check current state
- Apply migration
- Verify changes
- Provide rollback instructions if needed

### Option 2: Manual Migration
```bash
# 1. Backup
mysqldump -u root -pallahuma sms_database > backup.sql

# 2. Apply migration
mysql -u root -pallahuma sms_database < C:\sms\database\rollback_multi_school.sql

# 3. Verify
mysql -u root -pallahuma sms_database -e "SHOW TABLES;"
```

## Post-Migration Checks

### Database Verification
```sql
-- Check schools table is gone
SHOW TABLES LIKE 'schools';
-- Should return empty

-- Check school_id column removed from users
SHOW COLUMNS FROM users LIKE 'school_id';
-- Should return empty

-- Check role enum
SHOW COLUMNS FROM users WHERE Field = 'role';
-- Should NOT contain super_admin

-- Check student records still exist
SELECT COUNT(*) FROM students;
-- Should return your student count
```

### Application Testing
1. [ ] Server starts without errors
2. [ ] Login works for all user types
3. [ ] Student registration creates STU#### format
4. [ ] Class listing works
5. [ ] Teacher assignments work
6. [ ] Attendance recording works
7. [ ] Grade entry works
8. [ ] No console errors about missing school_id

## Troubleshooting

### Error: "Unknown column 'school_id'"
**Cause:** Code still references school_id but column removed
**Fix:** Check the route file mentioned in error, remove school_id reference

### Error: "Table 'schools' doesn't exist"
**Cause:** Code still tries to JOIN schools table
**Fix:** Update the query to remove schools JOIN

### Error: Migration fails partway through
**Cause:** Table dependencies or data constraints
**Solution:** 
1. Restore from backup
2. Check error message
3. May need to adjust migration order

## Schema Comparison

### Before Migration
```
Tables: 42 (including 7 multi-school tables)
users.school_id: EXISTS
students.school_id: EXISTS
users.role: includes 'super_admin'
```

### After Migration
```
Tables: 35 (multi-school tables removed)
users.school_id: DROPPED
students.school_id: DROPPED
users.role: 'admin', 'teacher', 'student', 'parent' only
```

## Important Notes

⚠️ **This is a one-way migration** - Going back to multi-school would require:
- Restore from backup, or
- Recreate school structure manually

⚠️ **Data Loss** - School-specific configuration will be lost:
- Subscription tier information
- School branding/settings
- Cross-school relationships

✅ **Data Preserved** - Core educational data retained:
- All users, students, teachers
- All grades, attendance, assessments
- All financial records
- All communication history

## Support

If you encounter issues during migration:
1. Check `C:\sms\CONVERSION_SUMMARY.md` for code changes
2. Review server logs for specific errors
3. Verify database credentials in `.env` file
4. Ensure MySQL service is running
5. Check backup file was created successfully before troubleshooting

---
**Last Updated:** December 4, 2025
