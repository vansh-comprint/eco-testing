# EcoTribe Bug Fix Test Cases

> **Created:** 2026-01-28
> **Tester:** Claude Code (Automated QA)
> **Testing Tools:** Playwright Browser Automation, Code Analysis

---

## Test Execution Status

| Bug # | Description | Test Type | Status | Last Tested |
|-------|-------------|-----------|--------|-------------|
| #1 | Operating Hours Dropdown | Playwright | ✅ PASS | 2026-01-28 |
| #3 | Bulk Upload Templates | Playwright | ⬜ Pending | - |
| #6 | IT Admin Branch Visibility | Playwright | ✅ PASS | 2026-01-28 |
| #9 | Registration Form Validation | Playwright | ✅ PASS | 2026-01-28 |
| #11 | Session Timeout (8 hours) | Playwright | ❌ FAIL | 2026-01-28 |
| #13 | Login Validation | Playwright | ✅ PASS | 2026-01-28 |
| #15 | Org Admin Dashboard Navigation | Playwright | ✅ PASS | 2026-01-28 |
| #16 | Branch Creation Validation | Playwright | ✅ PASS | 2026-01-28 |
| #19 | Sub User Management (9 issues) | Playwright | ⬜ Pending | - |
| #20 | Sub User Bulk Upload | Playwright | ⬜ Pending | - |
| #21 | Add Asset (8 issues) | Playwright | ⬜ Pending | - |
| #22 | Device Submit Redirect | Playwright | ⬜ Pending | - |
| #23 | Evaluation Condition Validation | Playwright | ⬜ Pending | - |
| #24 | Batch Direct Asset Assignment | Playwright | ⬜ Pending | - |
| #25/#27 | Batch Rejection Flow | Playwright | ⬜ Pending | - |
| #31 | Sub User Progress Bar | Playwright | ⬜ Pending | - |
| #34 | QC Review Checkboxes | Playwright | ⬜ Pending | - |
| #36 | Deactivated Branch Login | API Test | ⬜ Pending | - |
| #37 | Page Refresh Persistence | Playwright | ✅ PASS | 2026-01-28 |
| #39 | Create User DB Error | Playwright | ✅ PASS | 2026-01-28 |
| #40 | Edit Logistics User | Playwright | ⬜ Pending | - |
| #41 | Review Count & Filters | Playwright | ⬜ Pending | - |
| #42 | Suspend Enterprise Button | Playwright | ⬜ Pending | - |
| #43 | Enterprise Subuser Creation | Playwright | ⬜ Pending | - |
| #46 | Logistics Field User Creation | Playwright | ⬜ Pending | - |
| #47 | Analytics Buttons | Playwright | ✅ PASS | 2026-01-28 |

---

## Detailed Test Cases

### TC-001: Bug #1 - Operating Hours Dropdown

**Objective:** Verify operating hours fields are dropdown selects (not text inputs)

**Preconditions:**
- User logged in as Org Admin
- Access to Branch Management page

**Test Steps:**
1. Navigate to `/org-admin/branches`
2. Click "Add Branch" button
3. Locate "Operating Hours" section
4. Verify "Opening Hours" field is a dropdown/combobox
5. Verify "Closing Hours" field is a dropdown/combobox
6. Check dropdown options include times from 6:00 AM to 11:00 PM
7. Verify 30-minute intervals (6:00, 6:30, 7:00, etc.)

**Expected Results:**
- Both fields are dropdown selects, not text inputs
- Options span 6:00 AM to 11:00 PM
- 30-minute intervals (34 options total)

**Status:** ⬜ Pending

---

### TC-002: Bug #3 - Bulk Upload Templates

**Objective:** Verify all 4 bulk upload templates have Instructions sheets

**Templates to Test:**
1. Assets template
2. Users/Sub-Users template
3. Branches template
4. IT Admin template

**Test Steps per Template:**
1. Navigate to respective upload page
2. Click "Download Template" button
3. Open downloaded Excel file
4. Verify "Instructions" sheet exists
5. Verify column descriptions are present
6. Verify required/optional indicators exist
7. Verify examples are provided

**Expected Results:**
- Each template has Instructions sheet
- Clear column descriptions
- Required fields marked
- Example data provided

**Status:** ⬜ Pending

---

### TC-003: Bug #6 - IT Admin Branch Visibility

**Objective:** Verify IT Admin can only see their assigned branches

**Test Scenarios:**
1. IT Admin WITH assigned branch - sees only that branch
2. IT Admin WITHOUT branch - sees "No branches assigned" message
3. IT Admin cannot Add/Edit/Delete branches
4. Org Admin can still manage all branches

**Test Steps:**
1. Login as IT Admin with assigned branch
2. Navigate to `/admin/branches`
3. Verify only assigned branch(es) visible
4. Verify Add/Edit/Delete buttons are disabled or hidden
5. Login as Org Admin
6. Verify all branches visible and editable

**Expected Results:**
- IT Admin branch list filtered to their assignments
- No management controls for IT Admin
- Org Admin has full access

**Status:** ⬜ Pending

---

### TC-004: Bug #9 - Registration Form Validation

**Objective:** Verify all registration form validations work

**Validation Tests:**
1. Empty form submission - shows all required field errors
2. Invalid GST format - error message
3. Invalid PAN format - error message
4. Name with numbers - error message
5. Skip document upload - blocked
6. Weak password (short) - error message
7. Weak password (no complexity) - error message
8. All valid data - proceeds to pending approval

**Test Steps:**
1. Navigate to `/signup`
2. Test each validation scenario
3. Verify appropriate error messages
4. Complete valid submission

**Expected Results:**
- GST: "Invalid GST format (e.g., 22AAAAA0000A1Z5)"
- PAN: "Invalid PAN format (e.g., AAAPL1234C)"
- Name: "Name must contain only letters"
- Password short: "Password must be at least 8 characters"
- Password weak: "Password must include uppercase, lowercase, and number"

**Status:** ⬜ Pending

---

### TC-005: Bug #11 - Session Timeout

**Objective:** Verify JWT token expiration is 8 hours (480 minutes)

**Test Steps:**
1. Login with valid credentials
2. Capture JWT token from localStorage
3. Decode JWT and check `exp` claim
4. Calculate expiration time from current time
5. Verify expiration is approximately 8 hours

**Expected Results:**
- Token expires in ~480 minutes (8 hours)
- Not the previous 30 minutes

**Status:** ⬜ Pending

---

### TC-006: Bug #13 - Login Validation

**Objective:** Verify login form validations work

**Validation Tests:**
1. Invalid email format - error message
2. Password less than 6 characters - error message
3. Valid credentials - successful login

**Test Steps:**
1. Navigate to `/login`
2. Enter invalid email format, submit
3. Verify email validation error
4. Enter valid email, short password
5. Verify password length error
6. Enter valid credentials
7. Verify successful redirect

**Expected Results:**
- Email validation enforced
- Password minimum 6 characters required
- Valid credentials → redirect to dashboard

**Status:** ⬜ Pending

---

### TC-007: Bug #15 - Org Admin Dashboard Navigation

**Objective:** Verify dashboard stat cards navigate to correct routes

**Test Steps:**
1. Login as Org Admin
2. Navigate to dashboard
3. Click each stat card (Pending Approvals, EPR, etc.)
4. Verify navigation goes to `/org-admin/*` routes
5. Verify no redirects to landing page

**Expected Results:**
- Pending Approvals → `/org-admin/approvals`
- EPR Certificates → `/org-admin/epr`
- All navigations stay within org-admin portal

**Status:** ⬜ Pending

---

### TC-008: Bug #16 - Branch Creation Validation

**Objective:** Verify branch creation form validations

**Validation Tests:**
1. PIN code not 6 digits - error
2. Phone not 10 digits - error
3. City with numbers - error
4. State with numbers - error
5. All valid - creates branch

**Test Steps:**
1. Navigate to Add Branch form
2. Enter invalid PIN code
3. Verify error message
4. Test each validation field
5. Complete valid submission

**Expected Results:**
- PIN: "PIN code must be exactly 6 digits"
- Phone: "Phone number must be 10 digits"
- City/State: "should only contain letters"

**Status:** ⬜ Pending

---

### TC-009: Bug #37 - Page Refresh Persistence

**Objective:** Verify page refresh doesn't redirect to home

**Test Steps:**
1. Login as any user role
2. Navigate to a specific page (e.g., `/super/analytics`)
3. Refresh page (F5)
4. Verify stays on same page
5. Test on multiple routes

**Expected Results:**
- User remains on current page after refresh
- No redirect to landing or login page
- Session persists correctly

**Status:** ⬜ Pending

---

### TC-010: Bug #47 - Analytics Buttons

**Objective:** Verify Refresh and Export buttons work

**Test Steps:**
1. Login as Super Admin
2. Navigate to `/super/analytics`
3. Click Refresh button
4. Verify data reloads (check network tab)
5. Click Export Report button
6. Verify JSON file downloads

**Expected Results:**
- Refresh triggers data fetch
- Export downloads `ecotribe-analytics-YYYY-MM-DD.json`

**Status:** ⬜ Pending

---

## Test Session Log

### Session: 2026-01-28

| Time | Test | Result | Notes |
|------|------|--------|-------|
| 09:00 | Bug #13 - Login Validation | ✅ PASS | Email/password validation working |
| 09:05 | Bug #37 - Page Refresh | ✅ PASS | Session persists after F5 refresh |
| 09:10 | Bug #47 - Analytics Buttons | ✅ PASS | Refresh & Export work correctly |
| 09:15 | Bug #11 - Session Timeout | ❌ FAIL | JWT still 30 min, expected 480 min |
| 09:20 | Bug #9 - Registration Validation | ✅ PASS | GST/PAN/Name/Doc validations work |
| 09:30 | Bug #1 - Operating Hours | ✅ PASS | Dropdowns with 30-min intervals |
| 09:35 | Bug #15 - Org Admin Navigation | ✅ PASS | Stat cards navigate correctly |
| 09:40 | Bug #39 - Create User DB Error | ✅ PASS | Main Admin user created successfully |
| 09:45 | Bug #16 - Branch Validation | ✅ PASS | All 4 field validations working |
| 09:50 | Bug #6 - IT Admin Branches | ✅ PASS | View-only access, no Add/Edit/Delete |

---

## Summary

- **Total Test Cases:** 26
- **Passed:** 9
- **Failed:** 1
- **Pending:** 16
- **Blocked:** 0

### Detailed Results

**Bug #13 - Login Validation:** PASS
- Invalid email format triggers browser HTML5 validation
- Password < 6 chars shows "Password must be at least 6 characters"
- Valid credentials redirect to correct dashboard

**Bug #37 - Page Refresh Persistence:** PASS
- User stays on /super/analytics after page refresh
- Session persists correctly in localStorage

**Bug #47 - Analytics Buttons:** PASS
- Refresh button triggers data fetch
- Export downloads ecotribe-analytics-2026-01-28.json

**Bug #11 - Session Timeout:** FAIL
- JWT token expires in ~28 minutes (not 480 min/8 hours)
- Backend needs restart to apply new config
- Config file has correct value (JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480)

**Bug #9 - Registration Form Validation:** PASS
- Empty form shows all required field errors
- Invalid GST: "Invalid GST format (e.g., 22AAAAA0000A1Z5)"
- Invalid PAN: "Invalid PAN format (e.g., AAAPL1234C)"
- Name with numbers: "Name must contain only letters (no numbers)"
- Skip docs: "GST Certificate is required", "PAN Card is required"

**Bug #1 - Operating Hours Dropdown:** PASS
- Opening Hours is dropdown (combobox)
- Closing Hours is dropdown (combobox)
- Options from 6:00 AM to 11:00 PM
- 30-minute intervals (34 options total)

**Bug #15 - Org Admin Dashboard Navigation:** PASS
- Pending Approvals card → /org-admin/approvals
- EPR Pending card → /org-admin/epr
- No redirects to landing page

**Bug #39 - Create User DB Error:** PASS
- Super Admin can create new Main Admin users
- Form submission successful with valid data
- User appears in Admin Users list immediately
- No database errors on creation
- Duplicate email properly rejected with clear error message

**Bug #16 - Branch Creation Validation:** PASS
- City with numbers: "City name should only contain letters"
- State with numbers: "State name should only contain letters"
- PIN code not 6 digits: "PIN code must be exactly 6 digits"
- Phone not 10 digits: "Phone number must be 10 digits"
- All validations trigger on form submit

**Bug #6 - IT Admin Branch Visibility:** PASS
- Header shows "My Branches" / "View your assigned branches"
- No "Add Branch" button (Org Admin has this)
- No "Bulk Upload" button (Org Admin has this)
- Branch cards have no Edit/Delete menu
- IT Admin only sees their assigned branch(es)
- Org Admin retains full management controls
