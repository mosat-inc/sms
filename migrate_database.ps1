# SMS Database Migration Script
# Converts multi-school database to single-school

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SMS Database Migration to Single-School" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$dbUser = "root"
$dbPassword = "allahuma"
$dbName = "sms_database"
$backupDir = "C:\sms\database\backups"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$backupDir\sms_backup_$timestamp.sql"
$migrationFile = "C:\sms\database\rollback_multi_school.sql"

# Create backup directory if it doesn't exist
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
    Write-Host "✓ Created backup directory" -ForegroundColor Green
}

# Step 1: Backup existing database
Write-Host "`n[1/4] Backing up database..." -ForegroundColor Yellow
Write-Host "Backup file: $backupFile"

try {
    $mysqldumpPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
    & $mysqldumpPath -u $dbUser -p$dbPassword $dbName > $backupFile
    
    if ($LASTEXITCODE -eq 0) {
        $backupSize = (Get-Item $backupFile).Length / 1KB
        Write-Host "✓ Backup completed successfully ($([math]::Round($backupSize, 2)) KB)" -ForegroundColor Green
    } else {
        throw "Backup failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Host "✗ Backup failed: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Check current database state
Write-Host "`n[2/4] Checking current database state..." -ForegroundColor Yellow

try {
    $mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
    
    # Check for multi-school tables
    $tables = & $mysqlPath -u $dbUser -p$dbPassword $dbName -e "SHOW TABLES LIKE 'schools';" --batch --skip-column-names
    
    if ($tables -match "schools") {
        Write-Host "✓ Multi-school tables detected" -ForegroundColor Yellow
        
        # Count schools
        $schoolCount = & $mysqlPath -u $dbUser -p$dbPassword $dbName -e "SELECT COUNT(*) FROM schools;" --batch --skip-column-names
        Write-Host "  Current schools: $schoolCount" -ForegroundColor Gray
        
        # Check for school_id columns
        $tablesWithSchoolId = & $mysqlPath -u $dbUser -p$dbPassword $dbName -e "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$dbName' AND COLUMN_NAME = 'school_id';" --batch --skip-column-names
        Write-Host "  Tables with school_id: $($tablesWithSchoolId.Count)" -ForegroundColor Gray
    } else {
        Write-Host "⚠ No multi-school tables found - database may already be migrated" -ForegroundColor Yellow
        $response = Read-Host "Continue anyway? (y/n)"
        if ($response -ne 'y') {
            Write-Host "Migration cancelled" -ForegroundColor Yellow
            exit 0
        }
    }
} catch {
    Write-Host "⚠ Could not verify database state: $_" -ForegroundColor Yellow
}

# Step 3: Run migration
Write-Host "`n[3/4] Running migration..." -ForegroundColor Yellow
Write-Host "Migration file: $migrationFile"

try {
    & $mysqlPath -u $dbUser -p$dbPassword $dbName < $migrationFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Migration executed successfully" -ForegroundColor Green
    } else {
        throw "Migration failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Host "✗ Migration failed: $_" -ForegroundColor Red
    Write-Host "`nTo restore from backup, run:" -ForegroundColor Yellow
    Write-Host "mysql -u $dbUser -p$dbPassword $dbName < $backupFile" -ForegroundColor Cyan
    exit 1
}

# Step 4: Verify migration
Write-Host "`n[4/4] Verifying migration..." -ForegroundColor Yellow

try {
    # Check if multi-school tables were removed
    $schoolsTable = & $mysqlPath -u $dbUser -p$dbPassword $dbName -e "SHOW TABLES LIKE 'schools';" --batch --skip-column-names
    
    if ([string]::IsNullOrEmpty($schoolsTable)) {
        Write-Host "✓ Multi-school tables removed" -ForegroundColor Green
    } else {
        Write-Host "⚠ Schools table still exists" -ForegroundColor Yellow
    }
    
    # Check if school_id columns were removed from key tables
    $usersSchoolId = & $mysqlPath -u $dbUser -p$dbPassword $dbName -e "SHOW COLUMNS FROM users LIKE 'school_id';" --batch --skip-column-names
    $studentsSchoolId = & $mysqlPath -u $dbUser -p$dbPassword $dbName -e "SHOW COLUMNS FROM students LIKE 'school_id';" --batch --skip-column-names
    
    if ([string]::IsNullOrEmpty($usersSchoolId) -and [string]::IsNullOrEmpty($studentsSchoolId)) {
        Write-Host "✓ school_id columns removed from core tables" -ForegroundColor Green
    } else {
        Write-Host "⚠ Some school_id columns still exist" -ForegroundColor Yellow
    }
    
    # Check role enum
    $roleEnum = & $mysqlPath -u $dbUser -p$dbPassword $dbName -e "SHOW COLUMNS FROM users WHERE Field = 'role';" --batch --skip-column-names
    if ($roleEnum -notmatch "super_admin") {
        Write-Host "✓ super_admin role removed from users table" -ForegroundColor Green
    } else {
        Write-Host "⚠ super_admin role still exists in users table" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "⚠ Could not fully verify migration: $_" -ForegroundColor Yellow
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Migration Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ Database backed up to: $backupFile" -ForegroundColor Green
Write-Host "✓ Migration completed" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Test your application thoroughly"
Write-Host "2. Check server logs for any database errors"
Write-Host "3. Verify student registration creates STU#### format numbers"
Write-Host ""
Write-Host "To restore from backup if needed:" -ForegroundColor Yellow
Write-Host "mysql -u $dbUser -p$dbPassword $dbName < $backupFile" -ForegroundColor Cyan
Write-Host ""
