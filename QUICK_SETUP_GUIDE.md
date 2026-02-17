# Multi-School Transformation - Quick Setup Guide

## 🚀 Complete in 30 Minutes!

### Step 1: Backup Database (2 min)
```bash
# Export current database
mysqldump -u your_user -p sms_database > backup_before_multi_school.sql
```

### Step 2: Run Database Migration (5 min)
```bash
# Login to MySQL
mysql -u your_user -p sms_database

# Run migration
source C:/sms/server/migrations/001_multi_school_transformation.sql;

# Verify tables created
SHOW TABLES LIKE 'school%';
SELECT * FROM schools;
```

### Step 3: Update Backend Files (5 min)

#### A. Replace students.js
```bash
# Backup original
cp C:/sms/server/routes/students.js C:/sms/server/routes/students.js.backup

# Replace with updated version
cp C:/sms/server/routes/students_multischool.js C:/sms/server/routes/students.js
```

#### B. Update server.js
Add this line after other route imports:
```javascript
const schoolRoutes = require('./routes/schools');
app.use('/api/v1/schools', schoolRoutes);
```

#### C. Fix Auth Import in schools.js (Line 12)
Change:
```javascript
const { generateToken } = require('../utils/auth').default || require('../utils/auth');
```
To:
```javascript
const Auth = require('../utils/auth');
// Then use: Auth.generateToken(adminUser)
```

### Step 4: Test Backend APIs (5 min)

#### Test School Registration:
```bash
curl -X POST http://localhost:5000/api/v1/schools/register \
  -H "Content-Type: application/json" \
  -d '{
    "schoolName": "Test Secondary School",
    "schoolType": "GOVERNMENT",
    "location": "Dar es Salaam",
    "region": "Dar es Salaam",
    "district": "Ilala",
    "contactEmail": "test@school.com",
    "contactPhone": "+255712345678",
    "adminFirstName": "Admin",
    "adminLastName": "User",
    "adminEmail": "admin@test.com",
    "adminPassword": "Admin@123",
    "subscriptionTier": "BASIC"
  }'
```

Expected Response:
```json
{
  "success": true,
  "message": "School registered successfully!",
  "data": {
    "school": {
      "id": 2,
      "code": "S2795",
      "name": "Test Secondary School"
    },
    "token": "eyJ..."
  }
}
```

### Step 5: Frontend Landing Page (10 min)

See `client/src/components/LandingPage.js` (created separately)

### Step 6: Update App.js Routing (3 min)

Add public routes:
```javascript
// Add imports
import LandingPage from './components/LandingPage';
import SchoolRegistration from './components/SchoolRegistration';

// Add routes
<Route path="/" element={<LandingPage />} />
<Route path="/register-school" element={<SchoolRegistration />} />
```

## ✅ Verification Checklist

### Database
- [ ] `schools` table exists
- [ ] `school_subscriptions` table exists
- [ ] `school_settings` table exists
- [ ] All existing tables have `school_id` column
- [ ] Default school (S0001) created
- [ ] Existing data has school_id assigned

### Backend
- [ ] Server starts without errors
- [ ] School registration endpoint works
- [ ] JWT includes schoolId and schoolCode
- [ ] Student routes filter by school_id
- [ ] Cannot access other school's data

### Frontend
- [ ] Landing page loads at `/`
- [ ] School registration form works
- [ ] Login redirects to dashboard
- [ ] Dashboard shows school name

## 🐛 Troubleshooting

### Database Errors
**Error:** "Table 'schools' doesn't exist"
**Fix:** Run migration script again

**Error:** "school_id cannot be null"
**Fix:** Check default school created and data migrated

### Backend Errors
**Error:** "Cannot find module './middleware/authMiddleware'"
**Fix:** Ensure all new middleware files are in place

**Error:** "generateToken is not a function"
**Fix:** Update schools.js import (Step 3C)

### Frontend Errors
**Error:** "Cannot GET /"
**Fix:** Add Landing Page route in App.js

**Error:** "School context required"
**Fix:** Run database migration to assign school_id to users

## 📋 Files Modified/Created

### New Files
- `server/migrations/001_multi_school_transformation.sql`
- `server/middleware/schoolScope.js`
- `server/middleware/subscriptionCheck.js`
- `server/middleware/authMiddleware.js`
- `server/routes/schools.js`
- `server/utils/studentNumberGenerator.js`
- `client/src/components/LandingPage.js`
- `client/src/components/SchoolRegistration.js`

### Modified Files
- `server/server.js` (add school routes)
- `server/utils/auth.js` (JWT with school context)
- `server/routes/students.js` (school scoping)
- `client/src/App.js` (public routes)
- `client/src/contexts/AuthContext.js` (school context)

## 🎯 What's Working Now

After setup:
1. ✅ Multiple schools can register
2. ✅ Each school has unique code (S####)
3. ✅ Student numbers follow format S####/####
4. ✅ Data isolated between schools
5. ✅ Subscription tiers enforced
6. ✅ Student limits checked
7. ✅ School-specific authentication

## 🚧 Still To Do (Optional)

- Update remaining routes (teachers, classes, attendance)
- Build complete landing page UI
- Add school selector for multi-school users
- Implement auto-promotion system
- Add ID card generator
- Integrate mobile money payments
- Build AI tools (premium)

## 💡 Tips

1. **Start with one school** - Test everything with default school first
2. **Check logs** - Monitor console for errors
3. **Test incrementally** - Don't update all routes at once
4. **Keep backups** - Database changes are permanent
5. **Use Postman** - Test APIs before frontend integration

## 📞 Need Help?

Check these files:
- `MULTI_SCHOOL_PROGRESS.md` - Detailed progress
- `plan_5712e132` - Original implementation plan
- Console logs for specific errors

---

**Time to Complete:** ~30 minutes
**Difficulty:** Medium
**Impact:** Transform single-school to multi-school SaaS! 🎉
