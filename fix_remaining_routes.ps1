# PowerShell script to remove school-related code from remaining route files
# Run this script to complete the multi-school to single-school conversion

Write-Host "Starting automatic conversion of remaining route files..." -ForegroundColor Green

# Files to process
$files = @(
    "C:\sms\server\routes\teachers.js",
    "C:\sms\server\routes\finance.js", 
    "C:\sms\server\routes\grades.js",
    "C:\sms\server\routes\communication.js"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "`nProcessing $file..." -ForegroundColor Yellow
        
        $content = Get-Content $file -Raw -Encoding UTF8
        
        # Remove schoolScope import
        $content = $content -replace "const \{ schoolScope \} = require\('\.\./middleware/schoolScope'\);", ""
        $content = $content -replace ", schoolScope", ""
        $content = $content -replace "schoolScope,", ""
        $content = $content -replace "schoolScope", ""
        
        # Remove checkSubscription import
        $content = $content -replace "const \{ checkSubscription, checkStudentLimit \} = require\('\.\./middleware/subscriptionCheck'\);", ""
        $content = $content -replace ", checkSubscription", ""
        $content = $content -replace ", checkStudentLimit", ""
        
        # Remove school_id filters from WHERE clauses
        $content = $content -replace "AND school_id = \?", ""
        $content = $content -replace "school_id = \? AND", ""
        $content = $content -replace "WHERE school_id = \?", "WHERE 1=1"
        $content = $content -replace ", school_id", ""
        $content = $content -replace "school_id,", ""
        
        # Remove req.schoolId references
        $content = $content -replace "req\.schoolId,?\s*", ""
        $content = $content -replace "const schoolId = req\.schoolId;", ""
        
        # Remove requireSuperAdmin
        $content = $content -replace "requireSuperAdmin", "requireAdmin"
        $content = $content -replace "requireSchoolAdmin", "requireAdmin"
        
        # Save the modified content
        Set-Content $file $content -NoNewline
        
        Write-Host "  ✓ Completed $file" -ForegroundColor Green
    }
}

Write-Host "`n✓ All route files processed successfully!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Review the changes in each file"
Write-Host "2. Run the database migration: mysql -u root -p sms_database < C:\sms\database\rollback_multi_school.sql"
Write-Host "3. Test your application"
