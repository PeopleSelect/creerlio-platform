# Quick Test Guide: Portfolio Editor

## 🚀 Start Services

```bash
# Terminal 1: Backend (if not running)
cd /workspaces/creerlio-platform/backend
dotnet run --project Creerlio.Api/Creerlio.Api.csproj

# Terminal 2: Frontend (if not running)
cd /workspaces/creerlio-platform/frontend/frontend-app
npm run dev
```

**Backend**: http://localhost:5007  
**Frontend**: http://localhost:3001 (or 3000)

---

## 📋 Quick Test Checklist

### ✅ Profile Section
- [ ] Navigate to http://localhost:3001/talent/portfolio/edit
- [ ] Upload profile photo (drag & drop or click)
- [ ] Verify photo preview
- [ ] Click "Remove Photo"
- [ ] Upload resume (PDF/Word)
- [ ] Verify auto-population (mock data)
- [ ] Fill personal info fields
- [ ] Save profile

### ✅ Experience Section
- [ ] Click "Experience" tab
- [ ] Click "Add Experience"
- [ ] Fill form:
  - Job Title: "Senior Software Engineer"
  - Company: "Acme Corp"
  - Employment Type: Select "Full-time"
  - Start: "2020-01-01"
  - End: "2023-12-31" (or check "Currently working")
  - Description: "Led team of 5 developers..."
- [ ] Click "Save"
- [ ] Verify entry appears
- [ ] Click "Edit" - modify and save
- [ ] Click "Delete" - confirm removal

### ✅ Education Section
- [ ] Click "Education" tab
- [ ] Click "Add Education"
- [ ] Fill form:
  - Institution: Select "University of Sydney"
  - Degree: Select "Bachelor of Computer Science"
  - Field: "Software Engineering"
  - Start: "2015-01-01"
  - End: "2018-12-31"
  - GPA: "3.8"
- [ ] Save and verify
- [ ] Test Edit/Delete

### ✅ Skills Section
- [ ] Click "Skills" tab
- [ ] Click "Add Skill"
- [ ] Fill form:
  - Skill: "Python"
  - Category: Select "Programming Languages"
  - Proficiency: Drag slider to 4 (Advanced)
  - Years: "5"
- [ ] Verify skill tag appears
- [ ] Add multiple skills
- [ ] Test Edit/Delete

### ✅ Certifications Section
- [ ] Click "Certifications" tab
- [ ] Click "Add Certification"
- [ ] Fill form:
  - Name: "AWS Solutions Architect"
  - Issuer: "Amazon Web Services"
  - Issue Date: "2022-01-15"
  - Expiry Date: "2025-01-15" (or check "No expiry")
  - Credential ID: "AWS-123456"
  - Verification URL: "https://aws.amazon.com/verify/123456"
- [ ] Save and verify
- [ ] Test Edit/Delete

### ✅ Awards Section
- [ ] Click "Awards" tab
- [ ] Click "Add Award"
- [ ] Fill form:
  - Title: "Employee of the Year"
  - Issuer: "Acme Corp"
  - Date: "2023-12-01"
  - Description: "Recognized for outstanding performance"
- [ ] Save and verify
- [ ] Test Edit/Delete

### ✅ Dropdown Tests
- [ ] Verify **Employment Types** dropdown shows:
  - Full-time, Part-time, Contract, Casual, Freelance, Internship, Apprenticeship, Seasonal
- [ ] Verify **Universities** dropdown shows:
  - University of Sydney, Melbourne, ANU, UQ, Monash, UNSW, UWA, Adelaide... (37 total)
- [ ] Verify **Degree Types** dropdown shows:
  - High School Certificate, Certificates I-IV, Diploma, Bachelor degrees, Master's, PhD... (33 total)
- [ ] Verify **Skill Categories** dropdown shows:
  - Technical Skills, Programming Languages, Software & Tools... (9 total)
- [ ] Verify **Cities** dropdown shows:
  - Sydney, Melbourne, Brisbane, Perth... (85+ total)

### ✅ Data Persistence
- [ ] Fill out ALL sections completely
- [ ] Click browser refresh (F5)
- [ ] Verify all data reloads correctly
- [ ] Check profile photo persists
- [ ] Check all entries remain

### ✅ API Endpoints (Test with curl)

```bash
# Get profile
curl -X GET http://localhost:5007/api/talent/profile/test-user-123

# Create profile
curl -X POST http://localhost:5007/api/talent/profile \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com"
  }'

# Upload photo
curl -X POST http://localhost:5007/api/talent/profile/test-user-123/photo \
  -F "photo=@/path/to/photo.jpg"

# Add experience
curl -X POST http://localhost:5007/api/talent/profile/test-user-123/experience \
  -H "Content-Type: application/json" \
  -d '{
    "company": "Acme Corp",
    "title": "Senior Developer",
    "startDate": "2020-01-01",
    "isCurrentRole": true
  }'
```

### ✅ Database Verification

```bash
# Connect to SQLite
cd /workspaces/creerlio-platform/backend
sqlite3 creerlio.db

# Check profile data
SELECT * FROM TalentProfiles;
SELECT * FROM PersonalInformation;
SELECT * FROM WorkExperiences;
SELECT * FROM Educations;
SELECT * FROM Skills;
SELECT * FROM Certifications;
SELECT * FROM Awards;

# Check uploaded photos
ls -lah uploads/profiles/
```

---

## 🐛 What to Look For

### ✅ Positive Tests
- Forms submit successfully
- Data appears in lists immediately
- Edit modals pre-populate with existing data
- Delete removes items from list
- Dropdowns load with all options
- Photos upload and display
- Success messages show after save

### 🔍 Bug Hunting
- Console errors (F12 Developer Tools)
- Failed API calls (Network tab)
- Missing dropdown options
- Data not persisting after refresh
- Photo upload failures
- Form validation not working
- Delete operations not removing data
- Edit operations not updating data
- Loading states not showing
- Error messages not displaying

---

## 📊 Expected Results

### After Full Test Suite
- ✅ Profile created in database
- ✅ Photo saved in `/backend/uploads/profiles/`
- ✅ Multiple work experiences saved
- ✅ Multiple education entries saved
- ✅ Multiple skills with proficiency levels
- ✅ Certifications with verification URLs
- ✅ Awards with descriptions
- ✅ All data persists after refresh
- ✅ No console errors
- ✅ All API calls return 200 OK

---

## 🚨 If Issues Found

### Frontend Errors
1. Check browser console (F12)
2. Check Network tab for failed API calls
3. Verify API base URL is correct (localhost:5007)
4. Check component state in React DevTools

### Backend Errors
1. Check backend terminal output
2. Look for SQLite errors
3. Verify uploads directory exists
4. Check file permissions
5. Review API endpoint logs

### Database Issues
1. Check if database file exists: `backend/creerlio.db`
2. Verify migrations ran: `dotnet ef database update`
3. Check table schemas match entities
4. Verify foreign keys are correct

---

## 📝 Test Log Template

```
## Test Session: [Date/Time]
**Tester**: [Your Name]
**Environment**: [Dev/Staging]

### Tests Passed ✅
- Profile photo upload
- Experience CRUD
- Education CRUD
- ...

### Issues Found 🐛
1. **Issue**: Photo preview not showing
   **Severity**: Medium
   **Steps to Reproduce**: 
   1. Upload photo
   2. Check preview area
   **Expected**: Photo displays
   **Actual**: Blank space

2. **Issue**: Education dropdown missing "Other" option
   **Severity**: Low
   ...

### Notes
- All dropdowns loading correctly
- Data persistence working well
- UI responsive and fast
```

---

## ✅ Sign-Off Criteria

Portfolio Editor is **Production Ready** when:
- [ ] All CRUD operations work
- [ ] All dropdowns populate correctly
- [ ] Data persists after browser refresh
- [ ] Photo upload/delete works
- [ ] No console errors
- [ ] No failed API calls
- [ ] Form validation works
- [ ] Error messages are user-friendly
- [ ] Success messages show
- [ ] Loading states display
- [ ] Delete confirmations work
- [ ] Responsive on mobile/tablet
- [ ] Cross-browser tested (Chrome, Firefox, Safari)

---

**Happy Testing! 🎉**
