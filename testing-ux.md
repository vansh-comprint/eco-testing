# EcoTribe Platform - Production Readiness UX Testing Guide

This document provides comprehensive testing instructions, user journeys, and checklists for validating the EcoTribe platform before production deployment.

---

## Table of Contents

1. [Testing Instructions](#1-testing-instructions)
2. [Master Claude Code Prompt](#2-master-claude-code-prompt)
3. [User Journey Flows](#3-user-journey-flows)
4. [Screen-by-Screen Checklists](#4-screen-by-screen-checklists)
5. [Component Testing Matrix](#5-component-testing-matrix)
6. [Data Flow & Integration Tests](#6-data-flow--integration-tests)
7. [Edge Cases & Error Scenarios](#7-edge-cases--error-scenarios)
8. [Progress Tracking](#8-progress-tracking)
9. [Issue Reporting Template](#9-issue-reporting-template)
10. [Business Logic & Flow Validation](#10-business-logic--flow-validation)
11. [API & Database Logic Tests](#11-api--database-logic-tests)
12. [Calculation & Pricing Logic](#12-calculation--pricing-logic)
13. [Security & Permission Logic](#13-security--permission-logic)

---

# 1. Testing Instructions

## 1.1 Using Ralph Loop for Continuous Testing

Ralph Loop enables continuous, autonomous testing sessions that persist across context limits.

### Starting Ralph Loop
```
/ralph-loop
```

Then paste the Master Prompt from Section 2 to begin systematic testing.

### Ralph Loop Features
- **Automatic continuation**: Resumes testing after context window limits
- **State preservation**: Maintains progress across sessions
- **Issue accumulation**: Collects all issues found throughout testing

### Ralph Loop Commands
- `/ralph-loop` - Start a new testing loop
- `/cancel-ralph` - Cancel active Ralph Loop
- `/help` - Get help on Ralph Loop commands

## 1.2 Using Loki-mode for Parallel Testing

Loki-mode enables parallel agent testing for faster coverage.

### Activating Loki Mode
Simply say: **"Loki Mode"** followed by your testing instructions.

### When to Use Loki Mode
- Testing multiple portals simultaneously
- Running independent test suites in parallel
- Large-scale regression testing

### Example Loki Mode Invocation
```
Loki Mode: Test all 7 user portals in parallel. Each agent should:
1. Login as the respective role
2. Navigate all screens in that portal
3. Test all interactive components
4. Document issues found
5. Report completion status
```

## 1.3 Todo Management for Progress Tracking

The testing agent should use TodoWrite to track progress:

```
TodoWrite: [
  { "content": "Test Super Admin Portal", "status": "in_progress", "activeForm": "Testing Super Admin Portal" },
  { "content": "Test OPS Admin Portal", "status": "pending", "activeForm": "Testing OPS Admin Portal" },
  ...
]
```

### Todo States
- `pending` - Not started
- `in_progress` - Currently testing (only ONE at a time)
- `completed` - Verified and documented

## 1.4 Session Continuity

To maintain continuity across sessions:

1. **Before ending a session**, document in `testing-progress.md`:
   - Last completed test
   - Current test in progress
   - Issues found so far
   - Next tests to run

2. **When resuming**, read `testing-progress.md` and continue from where you left off.

3. **Use this format**:
```markdown
## Session State - [Date/Time]
### Completed
- [x] Super Admin Dashboard
- [x] Super Admin Enterprises

### In Progress
- [ ] Super Admin Pricing (50% complete)

### Next Up
- [ ] Super Admin Analytics
- [ ] OPS Admin Portal

### Issues Found This Session
| ID | Screen | Issue |
|----|--------|-------|
| 1  | /super | Button misaligned |
```

---

# 2. Master Claude Code Prompt

Copy and paste this entire prompt to start systematic testing:

---

```
## ECOTRIBE PLATFORM PRODUCTION READINESS TESTER

You are a QA Engineer testing the EcoTribe B2B IT asset lifecycle management platform for production readiness. Your mission is to systematically test every screen, component, and workflow to ensure the platform is fully functional.

### YOUR OBJECTIVES

1. **Navigate every screen** in the platform (68+ pages across 7 portals)
2. **Test every component** (buttons, forms, modals, tables, etc.)
3. **Validate every workflow** (asset lifecycle, batch approval, pickup flow, etc.)
4. **Document all issues** found with severity ratings
5. **Track progress** using TodoWrite
6. **Generate a final report** when complete

### TESTING APPROACH

Use the Playwright MCP tools to interact with the application:
- `browser_navigate` - Go to URLs
- `browser_snapshot` - Capture page state (PREFERRED over screenshots)
- `browser_click` - Click elements
- `browser_type` - Enter text
- `browser_fill_form` - Fill multiple fields
- `browser_take_screenshot` - Visual documentation

### APPLICATION DETAILS

**Base URL**: http://localhost:3000 (or the deployed URL)

**Demo Accounts** (use RoleSwitcher in dev mode):
| Role | Email | Portal |
|------|-------|--------|
| Super Admin | superadmin@ecotribe.io | /super |
| OPS Admin | admin@ecotribe.io | /ops |
| Org Admin | orgadmin@techcorp.com | /org-admin |
| IT Admin | it@techcorp.com | /admin |
| Sub User | employee@techcorp.com | /check-in |
| Logistics Admin | logistics-admin@ecotribe.io | /logistics-admin |
| Logistics User | logistics-user@ecotribe.io | /logistics |

### TESTING SEQUENCE

Follow this order for systematic coverage:

#### Phase 1: Authentication & Public Pages
1. Landing Page (/)
2. Login Page (/login)
3. Signup Page (/signup)
4. Enterprise Registration (/register)
5. Legal pages (/privacy, /terms, /cookies)

#### Phase 2: Super Admin Portal (/super)
1. Dashboard - Platform stats, quick actions
2. Enterprises - List, create, detail views
3. Admins - Platform admin management
4. All Users - User directory
5. All Assets - Global asset view
6. Logistics - Partner management
7. Pickups - Platform-wide pickups
8. Pricing - Device pricing config
9. Analytics - Platform metrics
10. Settings - Configuration

#### Phase 3: OPS Admin Portal (/ops)
1. Dashboard - Operations overview
2. Enterprise Applications - Registration queue
3. Enterprise List/Detail - Approved enterprises
4. Pickup Queue - 3-tier assignment
5. Remote Review Queue - Tech assignment
6. OPS Assets - Global assets
7. OPS Logistics - Partner management
8. OPS Disputes - Resolution queue
9. Payout Processing - Bulk payouts

#### Phase 4: Org Admin Portal (/org-admin)
1. Branch Management - CRUD, bulk upload
2. Branch Detail - Individual branch view
3. IT Admin Management - Invite, manage
4. Pickup Approvals - Batch approval queue
5. Credits Wallet - Enterprise finances
6. EPR Certificates - Compliance tracking

#### Phase 5: IT Admin Portal (/admin)
1. Dashboard - Branch overview, action items
2. Asset List/Detail - Asset management
3. Add Asset - Single asset creation
4. Upload Assets - Bulk CSV import
5. Batch List/Create/Detail - Batch workflow
6. Sub-User management - Employee CRUD
7. Pickup Requests - Initiation and tracking
8. Disputes - Issue management
9. Payout View - Financial summary
10. Settings - Account config

#### Phase 6: Sub-User Portal (/check-in)
1. Dashboard - Pending devices, submissions
2. Device Submit - Multi-step evaluation
3. Submission tracking - Progress view

#### Phase 7: Technician Portal (/tech)
1. Dashboard - Review queues
2. Facility QC - Quality check workflow

#### Phase 8: Logistics Admin Portal (/logistics-admin)
1. Dashboard - Pickup overview
2. Assignment Queue - Driver assignment
3. User Management - Driver CRUD

#### Phase 9: Logistics User Portal (/logistics)
1. Assignments - Active pickups, on-site QC

#### Phase 10: Business Logic Validation
1. Asset State Machine - Test all valid/invalid transitions
2. Batch Lifecycle - Creation to completion
3. Pickup Assignment - 3-tier flow validation
4. Enterprise Registration - Multi-step approval
5. Payout Calculations - Verify all grade/price combinations

#### Phase 11: Integration & Data Flow
1. End-to-End Asset Journey - pending_assignment → completed
2. Batch Approval → Auto Pickup Creation
3. Review Decision → Status Update Cascade
4. Wallet Balance → Transaction Accuracy

#### Phase 12: Security & Permissions
1. Role-Based Access - Each role's boundaries
2. Cross-Enterprise Isolation - Data separation
3. API Authorization - Forbidden requests rejected
4. RLS Policy Enforcement - Database level checks

### FOR EACH SCREEN, VERIFY:

```markdown
## Screen: [Name] ([Route])

### Load Test
- [ ] Page loads without console errors
- [ ] No infinite loading states
- [ ] Correct role access (unauthorized should redirect)

### Visual Test
- [ ] Layout renders correctly
- [ ] No overlapping elements
- [ ] Dark mode displays properly
- [ ] Mobile responsive (if applicable)

### Data Test
- [ ] Data loads and displays
- [ ] Empty states show correctly
- [ ] Pagination works (if applicable)
- [ ] Filters work (if applicable)
- [ ] Search works (if applicable)

### Interaction Test
- [ ] Buttons are clickable
- [ ] Forms validate inputs
- [ ] Modals open/close
- [ ] Navigation works
- [ ] Actions complete successfully

### Error Handling
- [ ] Invalid inputs show errors
- [ ] Failed requests show error message
- [ ] Network errors handled gracefully
```

### ISSUE DOCUMENTATION FORMAT

When you find an issue:

```markdown
### ISSUE #[N]
**Screen**: /admin/assets
**Component**: DataTable
**Severity**: High | Medium | Low | Critical
**Type**: Bug | UX | Performance | Accessibility
**Description**: [Clear description of the issue]
**Steps to Reproduce**:
1. Navigate to /admin/assets
2. Click on "Sort by Date" column header
3. Observe: [what happens]
4. Expected: [what should happen]
**Screenshot**: [if captured]
```

### PROGRESS TRACKING

After each portal, update your todos:

```
TodoWrite: [
  { "content": "Test Super Admin Portal", "status": "completed", "activeForm": "..." },
  { "content": "Test OPS Admin Portal", "status": "in_progress", "activeForm": "Testing OPS Admin Portal" },
  ...remaining portals as pending...
]
```

### COMPLETION CRITERIA

Testing is complete when:
1. All 68+ screens have been visited and verified
2. All interactive components tested
3. All 5 major workflows validated end-to-end
4. All business logic rules verified (see Section 10)
5. All state machine transitions tested (valid + invalid)
6. All calculation logic verified (pricing, payouts, totals)
7. All security/permission boundaries tested
8. All issues documented with severity
9. Final report generated

### LOGIC TESTING CHECKLIST

For each workflow, verify:
```markdown
## Workflow: [Name]

### State Transitions
- [ ] All valid transitions work
- [ ] Invalid transitions are blocked
- [ ] Correct status after each action

### Side Effects
- [ ] Related records created/updated
- [ ] Notifications triggered
- [ ] Timestamps recorded
- [ ] Audit trail created

### Calculations
- [ ] Amounts calculated correctly
- [ ] Totals accurate
- [ ] Edge cases handled

### Permissions
- [ ] Only authorized roles can perform action
- [ ] Unauthorized attempts blocked
- [ ] Error messages appropriate
```

### FINAL REPORT FORMAT

```markdown
# EcoTribe Production Readiness Report

## Summary
- **Screens Tested**: X / 68
- **Components Verified**: X / 23
- **Workflows Validated**: X / 5
- **Business Logic Rules Tested**: X / Y
- **State Transitions Verified**: X / 14
- **Calculation Tests Passed**: X / Y
- **Security Tests Passed**: X / Y
- **Issues Found**: X (Critical: N, High: N, Medium: N, Low: N)

## Portal Status
| Portal | Screens | UI Status | Logic Status | Issues |
|--------|---------|-----------|--------------|--------|
| Super Admin | 19 | PASS/FAIL | PASS/FAIL | N |
| OPS Admin | 11 | PASS/FAIL | PASS/FAIL | N |
| Org Admin | 9 | PASS/FAIL | PASS/FAIL | N |
| IT Admin | 26 | PASS/FAIL | PASS/FAIL | N |
| Sub-User | 4 | PASS/FAIL | PASS/FAIL | N |
| Technician | 2 | PASS/FAIL | PASS/FAIL | N |
| Logistics Admin | 3 | PASS/FAIL | PASS/FAIL | N |
| Logistics User | 1 | PASS/FAIL | PASS/FAIL | N |

## Workflow & Logic Status
| Workflow | UI Flow | Business Logic | Data Integrity |
|----------|---------|----------------|----------------|
| Asset Lifecycle | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| Batch Approval | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| Pickup Assignment | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| Enterprise Registration | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| Payout Processing | PASS/FAIL | PASS/FAIL | PASS/FAIL |

## State Machine Validation
| Entity | Valid Transitions | Invalid Blocked | Edge Cases |
|--------|-------------------|-----------------|------------|
| Asset Status | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| Batch Status | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| Pickup Status | PASS/FAIL | PASS/FAIL | PASS/FAIL |

## Calculation Accuracy
| Calculation | Tested | Passed | Failed |
|-------------|--------|--------|--------|
| Payout (Grade A) | Y/N | Y/N | Y/N |
| Payout (Grade B) | Y/N | Y/N | Y/N |
| Payout (Grade C) | Y/N | Y/N | Y/N |
| Payout (Grade D) | Y/N | Y/N | Y/N |
| Batch Totals | Y/N | Y/N | Y/N |
| Wallet Balance | Y/N | Y/N | Y/N |
| Dashboard Stats | Y/N | Y/N | Y/N |

## Security & Permissions
| Test Area | Tested | Passed | Issues |
|-----------|--------|--------|--------|
| Role-Based Access | Y/N | Y/N | N |
| Cross-Enterprise Isolation | Y/N | Y/N | N |
| API Authorization | Y/N | Y/N | N |
| RLS Policies | Y/N | Y/N | N |

## Critical Issues (Must Fix)
[List all critical issues]

## High Priority Issues
[List all high priority issues]

## Logic/Flow Issues
[List issues related to business rules, calculations, or state]

## Recommendations
[Production readiness assessment and recommendations]
```

### BEGIN TESTING

Start by:
1. Creating your todo list for all portals
2. Navigating to the application
3. Testing the landing page
4. Proceeding through each portal systematically

Document everything. Be thorough. The goal is production readiness.
```

---

# 3. User Journey Flows

## 3.1 Super Admin Journey

**Persona**: Platform Administrator at EcoTribe
**Goal**: Manage the entire platform, approve enterprises, configure pricing

### Complete Journey

```
START: Login as superadmin@ecotribe.io
  │
  ├─→ Dashboard (/super)
  │   ├── View platform statistics (total enterprises, assets, revenue)
  │   ├── Check system alerts and notifications
  │   ├── Quick actions: Jump to key sections
  │   └── VERIFY: Stats load, charts render, alerts display
  │
  ├─→ Enterprise Applications (/super/applications) [via OPS redirect or direct]
  │   ├── View pending enterprise registrations
  │   ├── Click to review application details
  │   ├── View uploaded documents (GST, PAN, Incorporation)
  │   ├── APPROVE or REJECT application
  │   ├── VERIFY: Application status updates, enterprise created on approval
  │   └── VERIFY: Org Admin account activated on approval
  │
  ├─→ Enterprises (/super/enterprises)
  │   ├── View all active/inactive enterprises
  │   ├── Search and filter enterprises
  │   ├── Click enterprise for detail view
  │   ├── View branches, users, assets, financials
  │   ├── VERIFY: Data accuracy, navigation works
  │   └── Create new enterprise manually (if needed)
  │
  ├─→ All Users (/super/users)
  │   ├── View platform-wide user directory
  │   ├── Filter by role, enterprise, status
  │   ├── View user details
  │   └── VERIFY: All users visible, filtering works
  │
  ├─→ All Assets (/super/assets)
  │   ├── View global asset inventory
  │   ├── Filter by status, enterprise, branch
  │   ├── View asset lifecycle history
  │   └── VERIFY: Asset data accurate, status badges correct
  │
  ├─→ Logistics (/super/logistics)
  │   ├── View logistics admin partners
  │   ├── Create new logistics admin
  │   ├── View logistics users under each admin
  │   ├── Create new logistics user
  │   └── VERIFY: Partner creation works, assignment possible
  │
  ├─→ Pickups (/super/pickups)
  │   ├── View all pickup requests platform-wide
  │   ├── Filter by status, enterprise, date
  │   ├── View pickup details and asset lists
  │   └── VERIFY: Pickup data complete, status tracking accurate
  │
  ├─→ Pricing (/super/pricing)
  │   ├── Configure device type base prices
  │   ├── Set grade modifiers (A/B/C/D)
  │   ├── Configure logistics charges
  │   ├── Save pricing configuration
  │   └── VERIFY: Prices save correctly, calculations accurate
  │
  ├─→ Analytics (/super/analytics)
  │   ├── View platform metrics and trends
  │   ├── Export reports
  │   └── VERIFY: Charts render, data accurate
  │
  └─→ Settings (/super/settings)
      ├── Configure platform settings
      └── VERIFY: Settings save and persist

END: Logout
```

### Key Validations
- [ ] Can approve/reject enterprise applications
- [ ] Enterprise creation triggers Org Admin account
- [ ] Pricing changes reflect in payout calculations
- [ ] All data is visible platform-wide
- [ ] Can create/manage logistics partners

---

## 3.2 OPS Admin Journey

**Persona**: Operations Manager at EcoTribe
**Goal**: Process applications, assign pickups, manage remote reviews

### Complete Journey

```
START: Login as admin@ecotribe.io
  │
  ├─→ Dashboard (/ops)
  │   ├── View operations pipeline (7-stage asset funnel)
  │   ├── Check pending actions count
  │   ├── View top enterprises by revenue
  │   ├── See recent activity feed
  │   └── VERIFY: Pipeline stages accurate, counts match
  │
  ├─→ Enterprise Applications (/ops/applications)
  │   ├── View pending applications queue
  │   ├── Review application details
  │   ├── Download and verify documents
  │   ├── Request more information (optional)
  │   ├── APPROVE or REJECT
  │   └── VERIFY: Status updates, notifications sent
  │
  ├─→ Enterprise List (/ops/enterprises)
  │   ├── View approved enterprises
  │   ├── Select enterprise for context
  │   ├── View enterprise details
  │   └── VERIFY: Context switching works
  │
  ├─→ Pickup Queue (/ops/pickups)
  │   ├── View pending pickup assignments
  │   ├── Filter by enterprise, date, priority
  │   ├── Select pickup request
  │   ├── ASSIGN to Logistics Admin (Tier 2)
  │   ├── VERIFY: Assignment saves, status updates
  │   └── VERIFY: Logistics Admin receives assignment
  │
  ├─→ Remote Review Queue (/ops/reviews)
  │   ├── View submitted assets pending review
  │   ├── Filter by enterprise, device type
  │   ├── Select asset for review
  │   ├── View submission photos and details
  │   ├── ACCEPT (conditionally) or REJECT
  │   ├── VERIFY: Asset status updates correctly
  │   └── VERIFY: Rejection triggers dispute option
  │
  ├─→ OPS Assets (/ops/assets)
  │   ├── View all assets in operations pipeline
  │   ├── Filter by status stage
  │   └── VERIFY: Status distribution matches dashboard
  │
  ├─→ OPS Disputes (/ops/disputes)
  │   ├── View open disputes
  │   ├── Review dispute details and evidence
  │   ├── RESOLVE: Uphold or Overturn
  │   └── VERIFY: Resolution updates asset status
  │
  └─→ Payout Processing (/ops/payouts)
      ├── View pending payouts
      ├── Process bulk payouts
      ├── View payout history
      └── VERIFY: Calculations accurate, status updates

END: Logout
```

### Key Validations
- [ ] Application approval creates enterprise + Org Admin
- [ ] Pickup assignment reaches Logistics Admin
- [ ] Remote review decisions update asset status
- [ ] Dispute resolution flows work
- [ ] Payout calculations match pricing config

---

## 3.3 Org Admin Journey

**Persona**: Enterprise Administrator (formerly CFO)
**Goal**: Manage branches, IT admins, approve pickups, track finances

### Complete Journey

```
START: Login as orgadmin@techcorp.com
  │
  ├─→ Dashboard (redirects based on role)
  │   └── VERIFY: Correct dashboard for org_admin role
  │
  ├─→ Branch Management (/org-admin/branches)
  │   ├── View all enterprise branches
  │   ├── CREATE new branch
  │   │   ├── Enter branch details (name, code, address)
  │   │   ├── Optionally assign IT Admin
  │   │   └── VERIFY: Branch created successfully
  │   ├── EDIT existing branch
  │   ├── DELETE branch (with confirmation)
  │   ├── BULK UPLOAD branches via CSV
  │   │   ├── Download template
  │   │   ├── Upload filled CSV
  │   │   ├── Review validation results
  │   │   └── VERIFY: All valid branches created
  │   └── View branch summary statistics
  │
  ├─→ Branch Detail (/org-admin/branches/:id)
  │   ├── View branch overview
  │   ├── See assigned IT Admins
  │   ├── View branch assets and batches
  │   └── VERIFY: Data scoped to branch correctly
  │
  ├─→ IT Admin Management (/org-admin/it-admins)
  │   ├── View all IT Admins across branches
  │   ├── INVITE new IT Admin
  │   │   ├── Enter details (name, email, phone)
  │   │   ├── Assign to branch(es)
  │   │   └── VERIFY: Invitation sent, account created
  │   ├── EDIT IT Admin details
  │   ├── DEACTIVATE IT Admin
  │   ├── BULK UPLOAD IT Admins via CSV
  │   └── VERIFY: IT Admin can access assigned branch
  │
  ├─→ Pickup Approvals (/org-admin/approvals)
  │   ├── View pending pickup approval queue
  │   ├── Review batch details
  │   │   ├── Asset list and values
  │   │   ├── Pickup location and schedule
  │   │   └── IT Admin who submitted
  │   ├── APPROVE batch pickup
  │   │   └── VERIFY: Pickup auto-initiated after approval
  │   ├── REJECT with reason
  │   │   └── VERIFY: IT Admin notified of rejection
  │   └── VERIFY: Approval thresholds enforced (50+ assets OR 5L+ value)
  │
  ├─→ Credits Wallet (/org-admin/wallet)
  │   ├── View enterprise credit balance
  │   ├── View transaction history
  │   ├── See pending payouts
  │   └── VERIFY: Balance calculations accurate
  │
  └─→ EPR Certificates (/org-admin/epr)
      ├── View EPR compliance status
      ├── Download issued certificates
      ├── Track recycling metrics
      └── VERIFY: Certificate generation works

END: Logout
```

### Key Validations
- [ ] Can create/edit/delete branches
- [ ] Bulk upload processes correctly
- [ ] IT Admin assignment works
- [ ] Batch approval triggers pickup creation
- [ ] Approval thresholds enforced
- [ ] Wallet balance accurate

---

## 3.4 IT Admin Journey

**Persona**: Branch IT Administrator
**Goal**: Manage assets, create batches, coordinate pickups, manage employees

### Complete Journey

```
START: Login as it@techcorp.com
  │
  ├─→ Dashboard (/admin)
  │   ├── View branch asset/batch summary
  │   ├── Check action items (stalled assets, rejections)
  │   ├── See pending approvals status
  │   ├── View recent activity
  │   └── VERIFY: Stats scoped to IT Admin's branch
  │
  ├─→ Asset Management (/admin/assets)
  │   ├── View all branch assets
  │   ├── Filter by status, type, assignment
  │   ├── Search assets
  │   │
  │   ├── ADD SINGLE ASSET (/admin/assets/add)
  │   │   ├── Enter device details (type, brand, model)
  │   │   ├── Enter specifications (RAM, storage, processor)
  │   │   ├── Enter serial number, asset tag
  │   │   ├── Optionally assign to employee
  │   │   └── VERIFY: Asset created with pending_assignment status
  │   │
  │   ├── BULK UPLOAD (/admin/assets/upload)
  │   │   ├── Download CSV template
  │   │   ├── Upload filled CSV
  │   │   ├── Review validation results
  │   │   ├── Fix errors if any
  │   │   └── VERIFY: All valid assets created
  │   │
  │   ├── VIEW ASSET DETAIL (/admin/assets/:id)
  │   │   ├── See full asset information
  │   │   ├── View assignment history
  │   │   ├── View submission/review history
  │   │   ├── See status timeline
  │   │   └── VERIFY: All history accurate
  │   │
  │   └── ACTIONS on assets:
  │       ├── Assign to employee
  │       ├── Unassign from employee
  │       ├── Add to batch
  │       └── VERIFY: Status transitions correct
  │
  ├─→ Sub-User (Employee) Management (/admin/sub-users)
  │   ├── View all employees
  │   ├── INVITE new employee
  │   │   ├── Enter details (name, email, department)
  │   │   └── VERIFY: Employee receives invitation
  │   ├── BULK UPLOAD employees
  │   ├── VIEW employee detail
  │   │   ├── See assigned devices
  │   │   ├── See submission history
  │   │   └── VERIFY: Data scoped correctly
  │   └── DEACTIVATE employee
  │
  ├─→ Batch Management (/admin/batches)
  │   ├── View all batches
  │   ├── Filter by status (draft, pending, approved, etc.)
  │   │
  │   ├── CREATE BATCH (/admin/batches/create)
  │   │   ├── Enter batch name
  │   │   ├── Select assets to include
  │   │   │   └── VERIFY: Only eligible assets shown
  │   │   ├── Review batch summary
  │   │   └── SAVE as draft
  │   │
  │   ├── EDIT BATCH
  │   │   ├── Add/remove assets
  │   │   ├── Update details
  │   │   └── VERIFY: Changes save correctly
  │   │
  │   ├── SUBMIT FOR APPROVAL
  │   │   ├── Fill pickup location
  │   │   ├── Select preferred date/time slot
  │   │   ├── Add special instructions
  │   │   ├── SUBMIT
  │   │   └── VERIFY: Status changes to pending_approval
  │   │
  │   └── VIEW BATCH DETAIL (/admin/batches/:id)
  │       ├── See all batch assets
  │       ├── See approval status
  │       ├── See pickup details (if approved)
  │       └── VERIFY: Accurate data
  │
  ├─→ Pickup Requests (/admin/pickups)
  │   ├── View pickup request status
  │   ├── Track pickup progress
  │   │   ├── Pending assignment
  │   │   ├── Assigned to Logistics Admin
  │   │   ├── Assigned to Logistics User
  │   │   ├── Scheduled
  │   │   ├── In Progress
  │   │   └── Completed
  │   └── VERIFY: Status updates in real-time
  │
  ├─→ Disputes (/admin/disputes)
  │   ├── View rejected assets
  │   ├── CREATE dispute
  │   │   ├── Select rejection to dispute
  │   │   ├── Enter dispute reason
  │   │   ├── Upload supporting evidence
  │   │   └── SUBMIT
  │   ├── Track dispute status
  │   └── VERIFY: Dispute reaches OPS queue
  │
  ├─→ Payout View (/admin/payouts)
  │   ├── View branch payout summary
  │   ├── See completed payouts
  │   ├── See pending payouts
  │   └── VERIFY: Calculations match pricing
  │
  └─→ Settings (/admin/settings)
      ├── Update profile
      └── Configure preferences

END: Logout
```

### Key Validations
- [ ] Asset CRUD works completely
- [ ] Bulk uploads process correctly
- [ ] Employee management works
- [ ] Batch creation and submission flow
- [ ] Pickup tracking accurate
- [ ] Dispute submission works

---

## 3.5 Sub-User (Employee) Journey

**Persona**: Enterprise Employee
**Goal**: Submit assigned devices for trade-in

### Complete Journey

```
START: Login as employee@techcorp.com
  │
  ├─→ Dashboard (/check-in)
  │   ├── View "Action Required" section
  │   │   ├── Devices pending self-evaluation
  │   │   └── VERIFY: Only assigned devices shown
  │   ├── View "In Progress" submissions
  │   │   ├── Step tracker (Submitted → Review → QC → Done)
  │   │   └── VERIFY: Status accurate
  │   └── View completed submissions
  │
  ├─→ Start Device Evaluation
  │   ├── Click "Start Evaluation" on pending device
  │   └── VERIFY: Asset status changes to check_in_started
  │
  ├─→ Device Submit Flow (/check-in/submit/:assetId)
  │   │
  │   ├── STEP 1: Device Confirmation
  │   │   ├── Verify device details (type, brand, model)
  │   │   ├── Confirm serial number
  │   │   └── VERIFY: Correct device loaded
  │   │
  │   ├── STEP 2: Physical Condition
  │   │   ├── Rate overall condition
  │   │   ├── Mark visible damage areas
  │   │   ├── Note scratches, dents, cracks
  │   │   └── VERIFY: All fields validate
  │   │
  │   ├── STEP 3: Photo Upload (10 mandatory slots)
  │   │   ├── Top Lid (closed laptop from above)
  │   │   ├── Bottom Panel (showing vents)
  │   │   ├── Left Side (ports visible)
  │   │   ├── Right Side (ports visible)
  │   │   ├── Screen (powered on)
  │   │   ├── Keyboard Deck (full keyboard)
  │   │   ├── Trackpad (close-up)
  │   │   ├── Ports (all ports)
  │   │   ├── Charger (charger + cable)
  │   │   ├── Damage (optional - visible damage)
  │   │   └── VERIFY: Upload works, preview shows
  │   │
  │   ├── STEP 4: Functional Checks
  │   │   ├── Powers on: Yes/No
  │   │   ├── Battery backup duration
  │   │   ├── Screen condition (dead pixels, discoloration, etc.)
  │   │   ├── Keyboard condition
  │   │   ├── Trackpad condition
  │   │   ├── Port functionality
  │   │   ├── WiFi/Bluetooth status
  │   │   ├── Camera/Mic status
  │   │   └── VERIFY: All checks recorded
  │   │
  │   ├── STEP 5: Additional Info
  │   │   ├── Original accessories included
  │   │   ├── Password/lock status
  │   │   ├── Data backup confirmation
  │   │   └── VERIFY: Required fields enforced
  │   │
  │   └── STEP 6: Review & Submit
  │       ├── Review all entered information
  │       ├── Confirm submission
  │       ├── SUBMIT
  │       └── VERIFY: Status changes to "submitted"
  │
  ├─→ Submission Success (/check-in/success)
  │   ├── See confirmation message
  │   ├── See submission ID
  │   ├── See next steps
  │   └── VERIFY: Success page displays correctly
  │
  └─→ Track Submission Progress
      ├── Return to dashboard
      ├── See submission in "In Progress"
      ├── Track through stages:
      │   ├── Submitted ✓
      │   ├── Under Review (remote_review)
      │   ├── QC Check (facility_qc)
      │   └── Complete (final_accepted/payout)
      └── VERIFY: Status updates reflect backend

END: Logout
```

### Key Validations
- [ ] Only assigned devices visible
- [ ] Photo upload works (all 10 slots)
- [ ] Functional checks save correctly
- [ ] Submission creates submission record
- [ ] Asset status updates to "submitted"
- [ ] Progress tracking accurate

---

## 3.6 Logistics Admin Journey

**Persona**: Logistics Partner Administrator
**Goal**: Manage pickups and assign drivers

### Complete Journey

```
START: Login as logistics-admin@ecotribe.io
  │
  ├─→ Dashboard (/logistics-admin)
  │   ├── View pickup statistics
  │   │   ├── Pending assignments
  │   │   ├── Scheduled today
  │   │   ├── Completed this week
  │   │   └── VERIFY: Stats accurate
  │   ├── View upcoming pickups calendar
  │   └── See priority pickups
  │
  ├─→ Assignment Queue (/logistics-admin/assignments)
  │   ├── View pickups assigned by OPS Admin
  │   ├── Filter by date, location, priority
  │   │
  │   ├── SELECT pickup to assign
  │   │   ├── View pickup details
  │   │   │   ├── Enterprise and branch
  │   │   │   ├── Location address
  │   │   │   ├── Asset count
  │   │   │   ├── Preferred date/time
  │   │   │   └── Special instructions
  │   │   │
  │   │   ├── SELECT Logistics User (driver)
  │   │   │   ├── View available drivers
  │   │   │   ├── See driver workload
  │   │   │   └── ASSIGN to driver
  │   │   │
  │   │   └── VERIFY: Assignment saves, driver notified
  │   │
  │   └── Track assignment status
  │
  └─→ User Management (/logistics-admin/users)
      ├── View all logistics users (drivers)
      ├── CREATE new driver
      │   ├── Enter details (name, phone, email)
      │   ├── Upload ID verification
      │   └── VERIFY: Driver account created
      ├── EDIT driver details
      ├── DEACTIVATE driver
      └── View driver performance

END: Logout
```

### Key Validations
- [ ] Can see pickups assigned by OPS
- [ ] Can assign pickups to drivers
- [ ] Driver management works
- [ ] Assignment notifications sent

---

## 3.7 Logistics User (Driver) Journey

**Persona**: Field Logistics Agent
**Goal**: Execute pickups and perform on-site QC

### Complete Journey

```
START: Login as logistics-user@ecotribe.io
  │
  ├─→ Assignments (/logistics)
  │   ├── View "Active Pickups" tab
  │   │   ├── Assigned pickups
  │   │   ├── Location and schedule
  │   │   └── Asset count
  │   │
  │   ├── View "Completed" tab
  │   │   └── Past pickup history
  │   │
  │   ├── SELECT active pickup
  │   │   ├── View full details
  │   │   │   ├── Enterprise/Branch info
  │   │   │   ├── Contact person
  │   │   │   ├── Address with map link
  │   │   │   ├── Asset list
  │   │   │   └── Special instructions
  │   │   │
  │   │   ├── START PICKUP
  │   │   │   └── VERIFY: Status → in_progress
  │   │   │
  │   │   ├── ON-SITE QC (for each asset)
  │   │   │   ├── Serial Number Verification
  │   │   │   │   ├── Scan/enter serial
  │   │   │   │   ├── Match with records
  │   │   │   │   └── VERIFY: Mismatch flagged
  │   │   │   │
  │   │   │   ├── Power-On Check
  │   │   │   │   ├── Device powers on: Yes/No
  │   │   │   │   └── VERIFY: Failure recorded
  │   │   │   │
  │   │   │   ├── Condition Assessment
  │   │   │   │   ├── Match with submission photos
  │   │   │   │   ├── Note discrepancies
  │   │   │   │   └── VERIFY: Mismatch options available
  │   │   │   │
  │   │   │   ├── Photo Capture
  │   │   │   │   ├── Take verification photos
  │   │   │   │   └── VERIFY: Camera access works
  │   │   │   │
  │   │   │   └── QC Result: PASS or FAIL
  │   │   │       ├── Pass: Asset ready for collection
  │   │   │       └── Fail: Select failure reason
  │   │   │
  │   │   ├── COLLECT DEVICES
  │   │   │   ├── Confirm collected assets
  │   │   │   ├── Note any no-shows
  │   │   │   └── VERIFY: Collection recorded
  │   │   │
  │   │   ├── HANDOFF PROOF
  │   │   │   ├── Signature Capture
  │   │   │   │   ├── Person handing over signs
  │   │   │   │   ├── Enter signer name
  │   │   │   │   └── VERIFY: Signature saves
  │   │   │   │
  │   │   │   ├── Photo Proof
  │   │   │   │   ├── Handover photo
  │   │   │   │   ├── Packaging photo
  │   │   │   │   └── Transport photo
  │   │   │   │
  │   │   │   └── Location Capture
  │   │   │       ├── GPS coordinates
  │   │   │       └── VERIFY: Location recorded
  │   │   │
  │   │   └── COMPLETE PICKUP
  │   │       ├── Review summary
  │   │       ├── SUBMIT
  │   │       └── VERIFY: Status → completed
  │   │
  │   └── VERIFY: Completed pickup appears in history

END: Logout
```

### Key Validations
- [ ] Can see assigned pickups
- [ ] On-site QC workflow complete
- [ ] Serial verification works
- [ ] Photo capture works
- [ ] Signature capture works
- [ ] GPS location captured
- [ ] Pickup completion updates status

---

# 4. Screen-by-Screen Checklists

## 4.1 Super Admin Portal (19 Screens)

### /super - Dashboard
- [ ] Page loads without errors
- [ ] Platform stats display correctly
- [ ] Quick action buttons work
- [ ] Recent activity shows
- [ ] Alerts/notifications visible
- [ ] Dark mode renders correctly
- [ ] Mobile responsive

### /super/enterprises - Enterprise List
- [ ] Enterprise list loads
- [ ] Active/inactive tabs work
- [ ] Search functionality works
- [ ] Filter options work
- [ ] Click opens detail modal/page
- [ ] Create enterprise button works

### /super/enterprises/:id - Enterprise Detail
- [ ] Detail page loads
- [ ] All enterprise info displays
- [ ] Branches section shows
- [ ] Users section shows
- [ ] Assets section shows
- [ ] Financial summary accurate
- [ ] Edit functionality works

### /super/enterprises/create - Create Enterprise
- [ ] Form renders
- [ ] Validation works
- [ ] Submit creates enterprise
- [ ] Success message shows
- [ ] Redirects correctly

### /super/admins - Admin Management
- [ ] Admin list loads
- [ ] Filter by role works
- [ ] Create admin modal works
- [ ] Edit admin works
- [ ] Deactivate works

### /super/users - All Users
- [ ] User list loads
- [ ] Search works
- [ ] Filter by enterprise works
- [ ] Filter by role works
- [ ] User detail accessible

### /super/assets - All Assets
- [ ] Asset list loads
- [ ] Filter by enterprise works
- [ ] Filter by status works
- [ ] Asset detail accessible
- [ ] Status badges correct

### /super/logistics - Logistics Management
- [ ] Logistics admin list loads
- [ ] Create logistics admin works
- [ ] Logistics user list loads
- [ ] Create logistics user works
- [ ] Assignment visible

### /super/pickups - Pickup Overview
- [ ] Pickup list loads
- [ ] Filter by status works
- [ ] Filter by enterprise works
- [ ] Pickup detail accessible
- [ ] Status tracking accurate

### /super/pricing - Pricing Configuration
- [ ] Pricing page loads
- [ ] Device types list
- [ ] Base prices editable
- [ ] Grade modifiers editable
- [ ] Save functionality works
- [ ] Changes persist after reload

### /super/analytics - Analytics
- [ ] Analytics page loads
- [ ] Charts render
- [ ] Date range filter works
- [ ] Export functionality works
- [ ] Data accurate

### /super/settings - Settings
- [ ] Settings page loads
- [ ] Configuration options work
- [ ] Save functionality works

### Modal Components (Super Admin)
- [ ] AddUserModal opens/closes
- [ ] CreateMainAdminModal works
- [ ] CreateLogisticsAdminModal works
- [ ] CreateLogisticsUserModal works
- [ ] CreateEnterpriseUserModal works
- [ ] All form validations work
- [ ] Submit actions complete

---

## 4.2 OPS Admin Portal (11 Screens)

### /ops - Dashboard
- [ ] Dashboard loads
- [ ] Asset pipeline displays (7 stages)
- [ ] Top enterprises section works
- [ ] Alerts section works
- [ ] Quick actions work

### /ops/applications - Enterprise Applications
- [ ] Application list loads
- [ ] Status filter works
- [ ] Application detail modal opens
- [ ] Document viewer works
- [ ] Approve action works
- [ ] Reject action works
- [ ] Request info action works

### /ops/enterprises - Enterprise List
- [ ] Enterprise list loads
- [ ] Context switching works
- [ ] Enterprise selector works

### /ops/enterprises/:id - Enterprise Detail
- [ ] Detail page loads
- [ ] Scoped to selected enterprise
- [ ] All sections render

### /ops/pickups - Pickup Queue
- [ ] Pickup queue loads
- [ ] Filter by status works
- [ ] Assign to Logistics Admin works
- [ ] Assignment saves correctly

### /ops/reviews - Remote Review Queue
- [ ] Review queue loads
- [ ] Asset submissions visible
- [ ] Photo viewer works
- [ ] Accept action works
- [ ] Reject action works
- [ ] Status updates correctly

### /ops/assets - OPS Assets
- [ ] Asset list loads
- [ ] Enterprise filter works
- [ ] Status filter works
- [ ] Matches dashboard counts

### /ops/logistics - OPS Logistics
- [ ] Partner list loads
- [ ] User management works
- [ ] Assignment visible

### /ops/disputes - Disputes
- [ ] Dispute list loads
- [ ] Filter by status works
- [ ] Dispute detail opens
- [ ] Resolve action works

### /ops/payouts - Payout Processing
- [ ] Payout list loads
- [ ] Bulk processing works
- [ ] History visible
- [ ] Calculations accurate

---

## 4.3 Org Admin Portal (9 Screens)

### /org-admin/branches - Branch Management
- [ ] Branch list loads
- [ ] Create branch form works
- [ ] Edit branch works
- [ ] Delete branch works (with confirmation)
- [ ] Bulk upload works
- [ ] IT Admin assignment works
- [ ] Branch summary stats accurate

### /org-admin/branches/:id - Branch Detail
- [ ] Detail page loads
- [ ] Branch info correct
- [ ] IT Admins section works
- [ ] Assets section works
- [ ] Batches section works

### /org-admin/bulk-branches - Bulk Branch Upload
- [ ] Template download works
- [ ] File upload works
- [ ] Validation results display
- [ ] Import completes successfully

### /org-admin/it-admins - IT Admin Management
- [ ] IT Admin list loads
- [ ] Invite form works
- [ ] Branch assignment works
- [ ] Edit works
- [ ] Deactivate works

### /org-admin/bulk-it-admins - Bulk IT Admin Upload
- [ ] Template download works
- [ ] File upload works
- [ ] Validation results display
- [ ] Import completes successfully

### /org-admin/approvals - Pickup Approvals
- [ ] Approval queue loads
- [ ] Batch detail modal opens
- [ ] Asset list visible
- [ ] Approve action works
- [ ] Reject action works (with reason)
- [ ] Approval triggers pickup creation

### /org-admin/wallet - Credits Wallet
- [ ] Wallet page loads
- [ ] Balance displays
- [ ] Transaction history loads
- [ ] Pending payouts visible

### /org-admin/epr - EPR Certificates
- [ ] EPR page loads
- [ ] Compliance status shows
- [ ] Certificate list loads
- [ ] Download works

---

## 4.4 IT Admin Portal (26 Screens)

### /admin - Dashboard
- [ ] Dashboard loads
- [ ] Asset summary correct
- [ ] Batch summary correct
- [ ] Action items show
- [ ] Recent activity works
- [ ] Quick actions work

### /admin/assets - Asset List
- [ ] Asset list loads
- [ ] Search works
- [ ] Filter by status works
- [ ] Filter by assignment works
- [ ] Pagination works
- [ ] Sort works

### /admin/assets/:id - Asset Detail
- [ ] Detail page loads
- [ ] All asset info displays
- [ ] Specs section works
- [ ] History timeline accurate
- [ ] Submission visible (if exists)
- [ ] Review visible (if exists)

### /admin/assets/add - Add Asset
- [ ] Form renders
- [ ] Device type selection works
- [ ] Spec fields render based on type
- [ ] Validation works
- [ ] Employee assignment optional
- [ ] Submit creates asset

### /admin/assets/upload - Bulk Upload
- [ ] Template download works
- [ ] File upload works
- [ ] Validation results display
- [ ] Error details shown
- [ ] Import completes

### /admin/assets/upload/:id - Bulk Upload Detail
- [ ] Detail page loads
- [ ] Progress tracking works
- [ ] Error list visible
- [ ] Retry option (if applicable)

### /admin/batches - Batch List
- [ ] Batch list loads
- [ ] Filter by status works
- [ ] Status badges correct
- [ ] Click opens detail

### /admin/batches/create - Create Batch
- [ ] Form renders
- [ ] Asset selection works
- [ ] Only eligible assets shown
- [ ] Batch summary updates
- [ ] Save as draft works

### /admin/batches/:id - Batch Detail
- [ ] Detail page loads
- [ ] Asset list visible
- [ ] Status accurate
- [ ] Pickup details (if approved)
- [ ] Actions available based on status

### /admin/batches/:id/submit - Submit for Approval
- [ ] Pickup location selector works
- [ ] Date picker works
- [ ] Time slot selection works
- [ ] Instructions field works
- [ ] Submit action works
- [ ] Status changes to pending_approval

### /admin/sub-users - Sub-User List
- [ ] Employee list loads
- [ ] Search works
- [ ] Department filter works
- [ ] Click opens detail

### /admin/sub-users/:id - Sub-User Detail
- [ ] Detail page loads
- [ ] Profile info correct
- [ ] Assigned devices show
- [ ] Submission history shows

### /admin/sub-users/invite - Invite Sub-User
- [ ] Form renders
- [ ] Validation works
- [ ] Submit sends invitation

### /admin/sub-users/bulk - Bulk User Upload
- [ ] Template download works
- [ ] File upload works
- [ ] Validation results display
- [ ] Import completes

### /admin/submissions/:id - Submission Detail
- [ ] Submission loads
- [ ] Photos display
- [ ] Functional checks show
- [ ] Review status shows

### /admin/evaluations - My Evaluations
- [ ] Evaluation list loads
- [ ] Filter by status works

### /admin/pickups - Pickup Requests
- [ ] Pickup list loads
- [ ] Status filter works
- [ ] Detail accessible

### /admin/pickups/:id - Pickup Request Detail
- [ ] Detail loads
- [ ] Status tracking shows
- [ ] Asset list visible

### /admin/pickup-locations - Pickup Locations
- [ ] Location list loads
- [ ] Create location works
- [ ] Edit works
- [ ] Set default works

### /admin/logistics - Logistics View
- [ ] Assigned partners visible
- [ ] Contact info shows

### /admin/logistics/assignments - Assignments
- [ ] Assignment list loads
- [ ] Status tracking works

### /admin/logistics/users - Logistics Users
- [ ] User list visible
- [ ] Assignment status shows

### /admin/disputes - Dispute List
- [ ] Dispute list loads
- [ ] Status filter works
- [ ] Create dispute works

### /admin/disputes/:id - Dispute Detail
- [ ] Detail loads
- [ ] Evidence visible
- [ ] Status tracking shows

### /admin/payouts - Payout View
- [ ] Payout summary loads
- [ ] Pending payouts show
- [ ] Completed payouts show
- [ ] Calculations accurate

### /admin/settings - Settings
- [ ] Settings page loads
- [ ] Profile update works
- [ ] Preferences save

---

## 4.5 Sub-User Portal (4 Screens)

### /check-in - Dashboard
- [ ] Dashboard loads
- [ ] Action required section shows pending devices
- [ ] In progress section shows submissions
- [ ] Completed section shows finished
- [ ] Only assigned devices visible
- [ ] Status tracking accurate

### /check-in/submit/:assetId - Device Submit
- [ ] Multi-step form loads
- [ ] Step navigation works
- [ ] All photo upload slots work
- [ ] Functional checks save
- [ ] Validation on each step
- [ ] Submit creates submission
- [ ] Asset status updates

### /check-in/success - Submission Success
- [ ] Success page displays
- [ ] Submission ID shown
- [ ] Next steps visible
- [ ] Return to dashboard works

---

## 4.6 Technician Portal (2 Screens)

### /tech - Dashboard
- [ ] Dashboard loads
- [ ] Remote review queue shows
- [ ] Facility QC queue shows
- [ ] Quick actions work
- [ ] Asset counts accurate

### /tech/facility-qc - Facility QC
- [ ] QC page loads
- [ ] Asset detail visible
- [ ] Checklist sections work
- [ ] Photo comparison works
- [ ] Accept action works
- [ ] Reject action works
- [ ] Status updates correctly

---

## 4.7 Logistics Admin Portal (3 Screens)

### /logistics-admin - Dashboard
- [ ] Dashboard loads
- [ ] Pickup stats accurate
- [ ] Upcoming pickups visible
- [ ] Date filter works

### /logistics-admin/assignments - Assignment Queue
- [ ] Queue loads
- [ ] Filter by status works
- [ ] Select pickup works
- [ ] Driver selection works
- [ ] Assignment saves

### /logistics-admin/users - User Management
- [ ] User list loads
- [ ] Create user works
- [ ] Edit user works
- [ ] Deactivate works
- [ ] Workload visible

---

## 4.8 Logistics User Portal (1 Screen)

### /logistics - Assignments
- [ ] Page loads
- [ ] Active tab shows assigned pickups
- [ ] Completed tab shows history
- [ ] Pickup detail accessible
- [ ] Start pickup works
- [ ] On-site QC workflow complete
- [ ] Serial verification works
- [ ] Power-on check works
- [ ] Photo capture works
- [ ] Signature capture works
- [ ] GPS capture works
- [ ] Complete pickup works
- [ ] Status updates correctly

---

## 4.9 Auth & Public Pages (9 Screens)

### / - Landing Page
- [ ] Page loads
- [ ] Hero section renders
- [ ] Features section works
- [ ] CTA buttons work
- [ ] Navigation works
- [ ] Mobile responsive

### /login - Login Page
- [ ] Page loads
- [ ] Email input works
- [ ] Password input works
- [ ] Validation works
- [ ] Login action works
- [ ] Redirects to correct portal
- [ ] Error messages display

### /signup - Signup Page
- [ ] Page loads
- [ ] Registration form works
- [ ] Validation works
- [ ] Submit creates account

### /register - Enterprise Registration
- [ ] Multi-step form loads
- [ ] Company info step works
- [ ] Contact info step works
- [ ] Document upload works
- [ ] Review step works
- [ ] Submit creates application
- [ ] Success message shows

### /pending-approval - Pending Approval
- [ ] Page loads for pending enterprises
- [ ] Status message displays
- [ ] Contact info visible

### /privacy - Privacy Policy
- [ ] Page loads
- [ ] Content renders
- [ ] Navigation works

### /terms - Terms of Service
- [ ] Page loads
- [ ] Content renders
- [ ] Navigation works

### /cookies - Cookie Policy
- [ ] Page loads
- [ ] Content renders

---

# 5. Component Testing Matrix

## 5.1 UI Components (src/components/ui/)

### Button Component
- [ ] Primary variant renders
- [ ] Secondary variant renders
- [ ] Ghost variant renders
- [ ] Danger variant renders
- [ ] Outline variant renders
- [ ] Subtle variant renders
- [ ] Size xs works
- [ ] Size sm works
- [ ] Size md works
- [ ] Size lg works
- [ ] Loading state shows spinner
- [ ] Disabled state prevents click
- [ ] Left icon renders
- [ ] Right icon renders
- [ ] Full width option works
- [ ] Click handler fires

### Input Component
- [ ] Default render works
- [ ] Label displays
- [ ] Placeholder works
- [ ] Error state shows message
- [ ] Hint text displays
- [ ] Left icon renders
- [ ] Right icon renders
- [ ] Size variants work
- [ ] Disabled state works
- [ ] Required indicator shows
- [ ] onChange fires
- [ ] onBlur fires

### Textarea Component
- [ ] Default render works
- [ ] Label displays
- [ ] Error state works
- [ ] Character count shows (if configured)
- [ ] Resize works
- [ ] Disabled state works

### Checkbox Component
- [ ] Renders unchecked
- [ ] Click toggles state
- [ ] Checked state renders
- [ ] Disabled state works
- [ ] Label displays

### Dropdown Component
- [ ] Opens on click
- [ ] Options render
- [ ] Selection works
- [ ] Close on selection
- [ ] Close on outside click
- [ ] Multi-select works (if enabled)
- [ ] Search/filter works (if enabled)

### Card Component
- [ ] Default variant renders
- [ ] Elevated variant renders
- [ ] Bordered variant renders
- [ ] Highlight variant renders
- [ ] Ghost variant renders
- [ ] Subtle variant renders
- [ ] Padding sm works
- [ ] Padding md works
- [ ] Padding lg works
- [ ] Hover effect works (if enabled)
- [ ] Click handler works (if clickable)

### Modal Component
- [ ] Opens when triggered
- [ ] Closes on X button
- [ ] Closes on outside click
- [ ] Closes on Escape key
- [ ] Size sm works
- [ ] Size md works
- [ ] Size lg works
- [ ] Size xl works
- [ ] Size full works
- [ ] Title displays
- [ ] Description displays
- [ ] Content renders
- [ ] Footer actions work

### Badge Component
- [ ] Default variant renders
- [ ] Primary variant renders
- [ ] Success variant renders
- [ ] Warning variant renders
- [ ] Error variant renders
- [ ] Info variant renders
- [ ] Size xs works
- [ ] Size sm works
- [ ] Size md works
- [ ] Size lg works
- [ ] Dot indicator shows
- [ ] Accent border works
- [ ] StatusBadge maps status correctly

### Tabs Component
- [ ] TabsList renders
- [ ] TabsTrigger renders
- [ ] TabsContent renders
- [ ] Click switches tab
- [ ] Active tab styled
- [ ] Content changes with tab

### Toast Component
- [ ] ToastProvider wraps app
- [ ] toast.success() works
- [ ] toast.error() works
- [ ] toast.warning() works
- [ ] toast.info() works
- [ ] Auto-dismiss works
- [ ] Manual dismiss works
- [ ] Multiple toasts stack

### Progress Component
- [ ] Progress bar renders
- [ ] Percentage displays
- [ ] Animation works
- [ ] StepProgress shows steps
- [ ] Current step highlighted

### FileUpload Component
- [ ] Drop zone renders
- [ ] Click to select works
- [ ] Drag and drop works
- [ ] File type validation works
- [ ] File size validation works
- [ ] Preview shows
- [ ] Remove file works
- [ ] Multiple files (if enabled)

### DataTable Component
- [ ] Headers render
- [ ] Rows render
- [ ] Sorting works (click header)
- [ ] Pagination works
- [ ] Page size selector works
- [ ] Empty state shows
- [ ] Loading state shows
- [ ] Row click works (if enabled)
- [ ] Selection works (if enabled)
- [ ] Actions column works

### StatsCard Component
- [ ] Card renders
- [ ] Value displays
- [ ] Label displays
- [ ] Icon renders
- [ ] Trend indicator shows
- [ ] StatsGrid layout works

### DashboardStatBox Component
- [ ] StatBox renders
- [ ] CompactStatBox renders
- [ ] HighlightStatBox renders
- [ ] ConnectedSection works
- [ ] Icon renders
- [ ] Values accurate

### PageHeader Component
- [ ] Title renders
- [ ] Subtitle renders
- [ ] Actions render
- [ ] Breadcrumbs work (if present)
- [ ] SectionHeader variant works
- [ ] CardSectionHeader variant works

### Timeline Component
- [ ] Timeline renders
- [ ] Events display
- [ ] Status icons correct
- [ ] Dates format correctly
- [ ] StatusTimeline maps status

### Avatar Component
- [ ] Image displays
- [ ] Fallback shows initials
- [ ] Size variants work
- [ ] AvatarGroup stacks correctly

### Skeleton Component
- [ ] SkeletonText renders
- [ ] SkeletonCard renders
- [ ] SkeletonTable renders
- [ ] Animation plays

### EmptyState Component
- [ ] Message displays
- [ ] Icon renders
- [ ] Action button works (if present)

### Spinner Component
- [ ] SpinnerSVG renders
- [ ] Animation plays
- [ ] Size variants work
- [ ] LoadingOverlay covers content
- [ ] ButtonSpinner shows in button

### ThemeToggle Component
- [ ] Toggle renders
- [ ] Click switches theme
- [ ] ThemeToggleCompact works
- [ ] Theme persists

### NotificationDropdown Component
- [ ] Dropdown opens
- [ ] Notifications list
- [ ] Unread count shows
- [ ] Mark as read works
- [ ] Click notification works
- [ ] Mobile variant works

### ConfirmationModal Component
- [ ] Modal opens on trigger
- [ ] Title displays
- [ ] Message displays
- [ ] Confirm button works
- [ ] Cancel button works
- [ ] Closes after action

---

## 5.2 Domain Components

### ProtectedRoute (src/components/auth/)
- [ ] Redirects unauthenticated users to login
- [ ] Redirects wrong role to their portal
- [ ] Allows correct role access
- [ ] Loading state shows while checking

### RoleSwitcher (src/components/auth/)
- [ ] Shows in dev mode only
- [ ] Lists all demo accounts
- [ ] Click switches role
- [ ] Portal updates after switch

### DashboardLayout (src/components/layout/)
- [ ] Sidebar renders
- [ ] Header renders
- [ ] Content area works
- [ ] Mobile responsive
- [ ] Sidebar collapse works

### Sidebar (src/components/layout/)
- [ ] Logo displays
- [ ] Navigation links render
- [ ] Active link highlighted
- [ ] Icons display
- [ ] Badge counts show (if applicable)
- [ ] Collapse/expand works

### AssetForm (src/components/assets/)
- [ ] All fields render
- [ ] Device type selection works
- [ ] Dynamic fields based on type
- [ ] Validation works
- [ ] Submit action works

### CSVUpload (src/components/assets/)
- [ ] File selection works
- [ ] Parsing works
- [ ] Validation results show
- [ ] Error details display
- [ ] Import action works

### BranchSelector (src/components/org-admin/)
- [ ] Selector renders
- [ ] Branch list populates
- [ ] Selection works
- [ ] Context updates

### EnterpriseSelector (src/components/ops/)
- [ ] Selector renders
- [ ] Enterprise list populates
- [ ] Selection works
- [ ] Context updates

### ReviewHistory (src/components/reviews/)
- [ ] History renders
- [ ] Timeline accurate
- [ ] Details expand

---

## 5.3 Form Validation Tests

### Required Field Validation
- [ ] Empty required fields show error
- [ ] Error clears when filled
- [ ] Submit blocked if errors

### Email Validation
- [ ] Invalid email rejected
- [ ] Valid email accepted
- [ ] Error message clear

### Phone Validation
- [ ] Invalid phone rejected
- [ ] Valid phone accepted
- [ ] Format hint shown

### File Upload Validation
- [ ] Wrong file type rejected
- [ ] Oversized file rejected
- [ ] Valid file accepted
- [ ] Error message clear

### Numeric Validation
- [ ] Non-numeric rejected (where applicable)
- [ ] Range validation works
- [ ] Decimal handling correct

### Date Validation
- [ ] Invalid date rejected
- [ ] Past date validation (where applicable)
- [ ] Future date validation (where applicable)

---

# 6. Data Flow & Integration Tests

## 6.1 Asset Lifecycle (14 Status Transitions)

Test each status transition:

```
pending_assignment
    │
    ├─→ [IT Admin assigns to employee]
    ▼
assigned
    │
    ├─→ [Employee starts evaluation]
    ▼
check_in_started
    │
    ├─→ [Employee submits evaluation]
    ▼
submitted
    │
    ├─→ [Tech/OPS starts review]
    ▼
remote_review
    │
    ├─→ [Accept] ──→ conditionally_accepted
    │
    └─→ [Reject] ──→ remote_rejected
                        │
                        └─→ [Can create dispute]

conditionally_accepted
    │
    ├─→ [Batch approved, pickup created]
    ▼
pickup_requested
    │
    ├─→ [OPS assigns to Logistics Admin]
    │   [Logistics Admin assigns to User]
    ▼
pickup_scheduled
    │
    ├─→ [Logistics User starts pickup]
    ▼
picked_up (or in_transit)
    │
    ├─→ [Arrives at facility]
    ▼
facility_qc
    │
    ├─→ [Accept] ──→ final_accepted
    │
    └─→ [Reject] ──→ final_rejected
                        │
                        └─→ [Can create dispute]

final_accepted
    │
    ├─→ [Payout initiated]
    ▼
payout_pending
    │
    ├─→ [Payout completed]
    ▼
completed
```

### Transition Tests
- [ ] pending_assignment → assigned (IT Admin assigns)
- [ ] assigned → check_in_started (Employee starts)
- [ ] check_in_started → submitted (Employee submits)
- [ ] submitted → remote_review (Auto after submit)
- [ ] remote_review → conditionally_accepted (Tech accepts)
- [ ] remote_review → remote_rejected (Tech rejects)
- [ ] conditionally_accepted → pickup_requested (Batch approved)
- [ ] pickup_requested → pickup_scheduled (Assigned + scheduled)
- [ ] pickup_scheduled → picked_up (Logistics starts)
- [ ] picked_up → facility_qc (Arrives at facility)
- [ ] facility_qc → final_accepted (QC pass)
- [ ] facility_qc → final_rejected (QC fail)
- [ ] final_accepted → payout_pending (Payout initiated)
- [ ] payout_pending → completed (Payout done)

### Invalid Transitions (Should Fail)
- [ ] pending_assignment → submitted (Skip steps)
- [ ] assigned → pickup_requested (Skip evaluation)
- [ ] remote_rejected → completed (Skip dispute/re-review)
- [ ] facility_qc → completed (Skip payout)

---

## 6.2 Batch Approval Workflow

```
IT Admin creates batch (draft)
    │
    ├─→ IT Admin adds assets
    │
    ├─→ IT Admin fills pickup details
    │
    ├─→ IT Admin submits for approval
    │   (status: pending_approval)
    │
    ▼
Org Admin reviews
    │
    ├─→ [Approve]
    │   ├── Batch status → approved
    │   ├── Pickup request auto-created
    │   └── Assets → pickup_requested
    │
    └─→ [Reject]
        ├── Batch status → rejected
        ├── IT Admin notified
        └── Assets remain conditionally_accepted
```

### Tests
- [ ] Draft batch allows asset add/remove
- [ ] Submit requires pickup details
- [ ] Submit changes status to pending_approval
- [ ] Approval creates pickup request
- [ ] Approval updates asset status
- [ ] Rejection keeps assets in previous status
- [ ] Rejection includes reason
- [ ] Notification sent on approve/reject

### Threshold Tests
- [ ] Batch with 50+ assets requires approval
- [ ] Batch with 5L+ value requires approval
- [ ] Smaller batches may auto-approve (if configured)

---

## 6.3 Pickup 3-Tier Assignment

```
Tier 1: Pickup Request Created (after batch approval)
    │
    ├─→ OPS Admin views pickup queue
    │
    ├─→ OPS Admin assigns to Logistics Admin
    │   (Tier 2 assignment)
    │
    ▼
Tier 2: Logistics Admin receives assignment
    │
    ├─→ Logistics Admin views assignment queue
    │
    ├─→ Logistics Admin assigns to Logistics User (driver)
    │   (Tier 3 assignment)
    │
    ▼
Tier 3: Logistics User receives assignment
    │
    ├─→ Driver views active pickups
    │
    ├─→ Driver starts pickup
    │
    ├─→ Driver performs on-site QC
    │
    ├─→ Driver collects devices
    │
    └─→ Driver completes pickup
```

### Tests
- [ ] Pickup request appears in OPS queue
- [ ] OPS can assign to Logistics Admin
- [ ] Assignment notification sent to Logistics Admin
- [ ] Pickup appears in Logistics Admin queue
- [ ] Logistics Admin can assign to Logistics User
- [ ] Assignment notification sent to Logistics User
- [ ] Pickup appears in Logistics User assignments
- [ ] Status updates at each tier

---

## 6.4 Enterprise Registration Flow

```
Applicant fills registration form
    │
    ├─→ Company details entered
    │
    ├─→ Contact details entered
    │
    ├─→ Documents uploaded
    │   ├── GST Certificate
    │   ├── PAN Card
    │   ├── Incorporation Certificate
    │   └── Other required docs
    │
    ├─→ Application submitted
    │   (enterprise_application created)
    │
    ▼
OPS/Super Admin reviews
    │
    ├─→ [Request More Info]
    │   ├── Applicant notified
    │   └── Applicant can update
    │
    ├─→ [Approve]
    │   ├── Enterprise record created
    │   ├── Org Admin user created
    │   ├── Enterprise wallet created
    │   └── Credentials sent to Org Admin
    │
    └─→ [Reject]
        ├── Application status → rejected
        └── Applicant notified with reason
```

### Tests
- [ ] Registration form validates all steps
- [ ] Document upload works for all types
- [ ] Application appears in OPS/Super queue
- [ ] Review shows all application details
- [ ] Document viewer works
- [ ] Approve creates enterprise record
- [ ] Approve creates org_admin user
- [ ] Approve creates wallet with 0 balance
- [ ] Reject records reason
- [ ] Notifications sent appropriately

---

## 6.5 Payout Processing

```
Assets reach final_accepted status
    │
    ├─→ Payout calculation runs
    │   ├── Base price from catalog
    │   ├── Grade modifier applied
    │   ├── Logistics charge deducted
    │   └── Final amount calculated
    │
    ├─→ Payout record created (payout_pending)
    │
    ▼
OPS Admin processes payout
    │
    ├─→ Review payout details
    │
    ├─→ Bulk process payouts
    │
    ├─→ Payout status → completed
    │
    └─→ Enterprise wallet credited
```

### Tests
- [ ] Payout calculated correctly for Grade A
- [ ] Payout calculated correctly for Grade B
- [ ] Payout calculated correctly for Grade C
- [ ] Payout calculated correctly for Grade D
- [ ] Logistics charge deducted (₹150/device)
- [ ] Payout appears in OPS queue
- [ ] Bulk processing works
- [ ] Wallet balance updates
- [ ] Transaction record created

### Calculation Example
```
Base Price: ₹10,000 (from pricing config)
Device Grade: B
Grade B Modifier: -₹500
Logistics Charge: -₹150
---
Final Payout: ₹9,350
```

---

# 7. Edge Cases & Error Scenarios

## 7.1 Permission Denials

### Test Cases
- [ ] Unauthenticated user redirects to login
- [ ] IT Admin cannot access /super routes
- [ ] IT Admin cannot access /ops routes
- [ ] IT Admin cannot access /org-admin routes
- [ ] Sub-User cannot access /admin routes
- [ ] Logistics User cannot access admin portals
- [ ] API returns 403 for unauthorized actions
- [ ] Error message is user-friendly

### Expected Behavior
- Redirect to login if not authenticated
- Redirect to user's default portal if wrong role
- Show "Access Denied" message for API errors

---

## 7.2 Invalid State Transitions

### Test Cases
- [ ] Cannot submit evaluation for unassigned asset
- [ ] Cannot approve batch without pickup details
- [ ] Cannot complete pickup without QC
- [ ] Cannot process payout without final_accepted
- [ ] System prevents skipping workflow steps
- [ ] Error messages explain why action blocked

---

## 7.3 Network Failures

### Test Cases
- [ ] Form submission shows error on network failure
- [ ] Retry option available after failure
- [ ] Data not lost after network error
- [ ] Loading states don't hang indefinitely
- [ ] Timeout errors handled gracefully
- [ ] Offline state detected (if applicable)

---

## 7.4 Concurrent Operations

### Test Cases
- [ ] Two users editing same asset (last write wins or conflict)
- [ ] Batch approval while IT Admin editing
- [ ] Pickup assignment to already-assigned driver
- [ ] Multiple evaluations for same asset
- [ ] Duplicate submission prevention

---

## 7.5 Data Validation Edge Cases

### Test Cases
- [ ] Maximum length inputs
- [ ] Special characters in names
- [ ] Very long email addresses
- [ ] Unicode characters
- [ ] Empty strings vs null
- [ ] Zero values where unexpected
- [ ] Negative numbers where invalid
- [ ] Future dates where invalid
- [ ] Past dates where invalid

---

## 7.6 File Upload Edge Cases

### Test Cases
- [ ] Maximum file size reached
- [ ] Invalid file type
- [ ] Corrupted file
- [ ] Very long filename
- [ ] Filename with special characters
- [ ] Multiple files at once
- [ ] Upload interruption
- [ ] Browser compatibility

---

## 7.7 Empty States

### Test Cases
- [ ] Dashboard with no assets
- [ ] Asset list with no assets
- [ ] Batch list with no batches
- [ ] Pickup queue with no pickups
- [ ] Search with no results
- [ ] Filter with no results
- [ ] Enterprise with no branches
- [ ] Branch with no IT Admins

---

# 8. Progress Tracking

## 8.1 Todo Template for Testing Sessions

```markdown
## EcoTribe Testing Progress

### Current Session: [Date/Time]
### Tester: [Name/Agent]

---

## Portal Progress

### Super Admin Portal
- [ ] Dashboard
- [ ] Enterprises
- [ ] Enterprise Detail
- [ ] Create Enterprise
- [ ] Admins
- [ ] All Users
- [ ] All Assets
- [ ] Logistics
- [ ] Pickups
- [ ] Pricing
- [ ] Analytics
- [ ] Settings

### OPS Admin Portal
- [ ] Dashboard
- [ ] Enterprise Applications
- [ ] Enterprise List
- [ ] Pickup Queue
- [ ] Remote Review Queue
- [ ] OPS Assets
- [ ] OPS Logistics
- [ ] OPS Disputes
- [ ] Payout Processing

### Org Admin Portal
- [ ] Branch Management
- [ ] Branch Detail
- [ ] Bulk Branch Upload
- [ ] IT Admin Management
- [ ] Bulk IT Admin Upload
- [ ] Pickup Approvals
- [ ] Credits Wallet
- [ ] EPR Certificates

### IT Admin Portal
- [ ] Dashboard
- [ ] Asset List
- [ ] Asset Detail
- [ ] Add Asset
- [ ] Upload Assets
- [ ] Batch List
- [ ] Batch Create
- [ ] Batch Detail
- [ ] Sub-User List
- [ ] Sub-User Detail
- [ ] Sub-User Invite
- [ ] Bulk User Upload
- [ ] Submission Detail
- [ ] My Evaluations
- [ ] Pickup Requests
- [ ] Pickup Request Detail
- [ ] Pickup Locations
- [ ] Logistics
- [ ] Logistics Assignments
- [ ] Logistics Users
- [ ] Dispute List
- [ ] Dispute Detail
- [ ] Payout View
- [ ] Settings

### Sub-User Portal
- [ ] Dashboard
- [ ] Device Submit Flow
- [ ] Submission Success

### Technician Portal
- [ ] Dashboard
- [ ] Facility QC

### Logistics Admin Portal
- [ ] Dashboard
- [ ] Assignment Queue
- [ ] User Management

### Logistics User Portal
- [ ] Assignments (with full QC flow)

### Auth & Public
- [ ] Landing Page
- [ ] Login
- [ ] Signup
- [ ] Enterprise Register
- [ ] Pending Approval
- [ ] Privacy Policy
- [ ] Terms of Service
- [ ] Cookie Policy

---

## Workflow Progress

- [ ] Asset Lifecycle (all 14 transitions)
- [ ] Batch Approval Flow
- [ ] Pickup 3-Tier Assignment
- [ ] Enterprise Registration
- [ ] Payout Processing

---

## Issues Found

| ID | Screen | Component | Severity | Description |
|----|--------|-----------|----------|-------------|
| 1 | | | | |
| 2 | | | | |

---

## Session Notes

[Add notes about blockers, observations, or items needing follow-up]
```

---

## 8.2 Session Continuity Protocol

### At End of Session

1. **Document Current State**
   ```markdown
   ### Session End State
   - Last completed test: /admin/batches
   - Current test in progress: /admin/sub-users (50%)
   - Next test queued: /admin/pickups
   ```

2. **Save Progress File**
   - Update `testing-progress.md` with checklist status
   - Record all issues found
   - Note any blockers

3. **Export Issues**
   - Ensure all issues documented with ID
   - Include reproduction steps
   - Attach screenshots if captured

### At Start of New Session

1. **Read Progress File**
   ```
   Read testing-progress.md and continue from last state
   ```

2. **Resume TodoWrite**
   - Mark completed items
   - Set current item to in_progress
   - Keep remaining as pending

3. **Review Open Issues**
   - Check if any issues need verification
   - Note issues that may be fixed

---

## 8.3 Completion Metrics

### Screen Coverage
```
Total Screens: 68
Tested: X
Remaining: Y
Completion: X/68 (Z%)
```

### Component Coverage
```
Total Components: 23
Tested: X
Remaining: Y
Completion: X/23 (Z%)
```

### Workflow Coverage
```
Total Workflows: 5
Tested: X
Remaining: Y
Completion: X/5 (Z%)
```

### Issue Summary
```
Critical: X
High: X
Medium: X
Low: X
Total: X
```

### Pass/Fail by Portal
```
| Portal | Screens | Passed | Failed | Blocked |
|--------|---------|--------|--------|---------|
| Super Admin | 19 | X | Y | Z |
| OPS Admin | 11 | X | Y | Z |
| Org Admin | 9 | X | Y | Z |
| IT Admin | 26 | X | Y | Z |
| Sub-User | 4 | X | Y | Z |
| Technician | 2 | X | Y | Z |
| Logistics Admin | 3 | X | Y | Z |
| Logistics User | 1 | X | Y | Z |
| Auth/Public | 9 | X | Y | Z |
```

---

# 9. Issue Reporting Template

## 9.1 Standard Issue Format

```markdown
## ISSUE #[Sequential Number]

### Basic Info
- **Screen**: [Route, e.g., /admin/assets]
- **Component**: [Component name, e.g., DataTable]
- **Severity**: Critical | High | Medium | Low
- **Type**: Bug | UX | Performance | Accessibility | Security

### Description
[Clear, concise description of the issue]

### Steps to Reproduce
1. Navigate to [route]
2. [Action]
3. [Action]
4. Observe: [What happens]

### Expected Behavior
[What should happen instead]

### Actual Behavior
[What actually happens]

### Environment
- Browser: [Chrome/Firefox/Safari/Edge]
- Screen Size: [Desktop/Tablet/Mobile or specific resolution]
- User Role: [Role used during testing]
- Dark Mode: [Yes/No]

### Evidence
- Screenshot: [filename or "Not captured"]
- Console Errors: [Any relevant errors]
- Network Errors: [Any failed requests]

### Impact
[How this affects users or business]

### Possible Cause
[If obvious, suggest what might be causing it]

### Suggested Fix
[If obvious, suggest a fix]
```

---

## 9.2 Severity Definitions

### Critical
- Application crashes
- Data loss or corruption
- Security vulnerability
- Complete feature failure
- Blocks entire workflow

### High
- Major feature broken
- Significant UX issue
- Performance severely degraded
- Workaround difficult

### Medium
- Feature partially broken
- Moderate UX issue
- Performance noticeably slow
- Workaround available

### Low
- Minor visual issue
- Small UX improvement
- Slight performance issue
- Edge case only

---

## 9.3 Issue Categories

### Bug
- Incorrect behavior
- Broken functionality
- Data display errors
- State management issues

### UX
- Confusing interface
- Poor feedback
- Missing guidance
- Accessibility concerns

### Performance
- Slow loading
- Laggy interactions
- Memory issues
- Excessive API calls

### Security
- Data exposure
- Missing authentication
- Injection vulnerability
- Permission bypass

---

## 9.4 Final Report Template

```markdown
# EcoTribe Production Readiness Report

## Executive Summary
[2-3 sentence summary of testing results and recommendation]

## Testing Scope
- **Screens Tested**: X / 68 (Y%)
- **Components Tested**: X / 23 (Y%)
- **Workflows Validated**: X / 5 (Y%)
- **Total Test Duration**: [Time]

## Issue Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | X | [All fixed / X remaining] |
| High | X | [All fixed / X remaining] |
| Medium | X | [All fixed / X remaining] |
| Low | X | [All fixed / X remaining] |
| **Total** | **X** | |

## Portal Status

| Portal | Screens | Status | Critical | High | Medium | Low |
|--------|---------|--------|----------|------|--------|-----|
| Super Admin | 19 | PASS/FAIL | X | X | X | X |
| OPS Admin | 11 | PASS/FAIL | X | X | X | X |
| Org Admin | 9 | PASS/FAIL | X | X | X | X |
| IT Admin | 26 | PASS/FAIL | X | X | X | X |
| Sub-User | 4 | PASS/FAIL | X | X | X | X |
| Technician | 2 | PASS/FAIL | X | X | X | X |
| Logistics Admin | 3 | PASS/FAIL | X | X | X | X |
| Logistics User | 1 | PASS/FAIL | X | X | X | X |
| Auth/Public | 9 | PASS/FAIL | X | X | X | X |

## Workflow Status

| Workflow | Status | Issues |
|----------|--------|--------|
| Asset Lifecycle | PASS/FAIL | X |
| Batch Approval | PASS/FAIL | X |
| Pickup Assignment | PASS/FAIL | X |
| Enterprise Registration | PASS/FAIL | X |
| Payout Processing | PASS/FAIL | X |

## Critical Issues (Must Fix Before Production)

[List all critical issues with brief description]

1. **ISSUE #X**: [Brief description]
2. **ISSUE #X**: [Brief description]

## High Priority Issues

[List all high priority issues]

1. **ISSUE #X**: [Brief description]
2. **ISSUE #X**: [Brief description]

## Recommendations

### Immediate Actions Required
1. [Action item]
2. [Action item]

### Pre-Production Checklist
- [ ] All critical issues resolved
- [ ] All high priority issues resolved or accepted
- [ ] Security audit complete
- [ ] Performance benchmarks met
- [ ] Mobile testing complete
- [ ] Cross-browser testing complete

### Production Readiness Assessment

**READY FOR PRODUCTION**: [ ] Yes / [ ] No / [ ] Conditional

**Conditions (if conditional)**:
1. [Condition]
2. [Condition]

## Appendix

### A. All Issues Detail
[Full issue reports]

### B. Test Coverage Matrix
[Detailed coverage data]

### C. Screenshots
[Attached evidence]
```

---

# 10. Business Logic & Flow Validation

This section tests the business rules, state machines, and logical flows independent of UI.

## 10.1 Asset State Machine Logic

The asset status follows a strict state machine. Test that transitions are enforced:

### Valid Transition Matrix

| From Status | Valid Next Status(es) | Trigger |
|-------------|----------------------|---------|
| `pending_assignment` | `assigned` | IT Admin assigns to employee |
| `assigned` | `check_in_started`, `pending_assignment` | Employee starts / IT Admin unassigns |
| `check_in_started` | `submitted` | Employee completes evaluation |
| `submitted` | `remote_review` | Auto-transition after submit |
| `remote_review` | `conditionally_accepted`, `remote_rejected` | Tech decision |
| `remote_rejected` | `remote_review` | Dispute overturned |
| `conditionally_accepted` | `pickup_requested` | Batch approved |
| `pickup_requested` | `pickup_scheduled` | Logistics assigned + scheduled |
| `pickup_scheduled` | `picked_up` | Logistics starts pickup |
| `picked_up` | `in_transit`, `facility_qc` | Driver collects / arrives |
| `in_transit` | `facility_qc` | Arrives at facility |
| `facility_qc` | `final_accepted`, `final_rejected` | QC decision |
| `final_rejected` | `facility_qc` | Dispute overturned |
| `final_accepted` | `payout_pending` | Payout initiated |
| `payout_pending` | `completed` | Payout processed |

### Logic Tests

```markdown
## State Machine Tests

### Forward Transitions
- [ ] LOGIC: pending_assignment → assigned
  - Verify: `assigned_sub_user_id` is set
  - Verify: `assigned_at` timestamp recorded
  - Verify: Sub-user can see asset in their dashboard

- [ ] LOGIC: assigned → check_in_started
  - Verify: Only assigned sub-user can start
  - Verify: `evaluation_started_at` timestamp recorded
  - Verify: Asset locked from reassignment

- [ ] LOGIC: check_in_started → submitted
  - Verify: Submission record created with FK to asset
  - Verify: All required photos uploaded
  - Verify: Functional checks recorded
  - Verify: `submitted_at` timestamp set

- [ ] LOGIC: submitted → remote_review
  - Verify: Auto-transition (no manual trigger)
  - Verify: Asset appears in tech queue

- [ ] LOGIC: remote_review → conditionally_accepted
  - Verify: Remote review record created
  - Verify: Grade assigned (A/B/C/D)
  - Verify: Estimated RV calculated
  - Verify: `reviewed_at` timestamp set

- [ ] LOGIC: remote_review → remote_rejected
  - Verify: Rejection reason recorded
  - Verify: Dispute option becomes available
  - Verify: Notification sent to IT Admin

- [ ] LOGIC: conditionally_accepted → pickup_requested
  - Verify: Only happens via batch approval
  - Verify: Pickup request record references asset
  - Verify: Batch status also updates

- [ ] LOGIC: pickup_requested → pickup_scheduled
  - Verify: Logistics Admin assigned
  - Verify: Logistics User assigned
  - Verify: Schedule confirmed

- [ ] LOGIC: pickup_scheduled → picked_up
  - Verify: On-site QC passed
  - Verify: Serial verification completed
  - Verify: Pickup proof captured

- [ ] LOGIC: facility_qc → final_accepted
  - Verify: Facility QC record created
  - Verify: Final grade confirmed or adjusted
  - Verify: Final RV locked

- [ ] LOGIC: final_accepted → payout_pending
  - Verify: Payout record created
  - Verify: Amount calculated correctly
  - Verify: Linked to enterprise wallet

### Invalid Transitions (Must Fail)
- [ ] LOGIC-FAIL: pending_assignment → submitted (skip assignment)
- [ ] LOGIC-FAIL: assigned → pickup_requested (skip evaluation)
- [ ] LOGIC-FAIL: submitted → pickup_requested (skip review)
- [ ] LOGIC-FAIL: remote_rejected → pickup_requested (skip dispute)
- [ ] LOGIC-FAIL: facility_qc → completed (skip payout)
- [ ] LOGIC-FAIL: Any status → pending_assignment (backward reset)

### Backward Transitions (Special Cases)
- [ ] LOGIC: assigned → pending_assignment (unassign)
  - Verify: `assigned_sub_user_id` cleared
  - Verify: Asset removed from sub-user dashboard
  - Verify: Only allowed before evaluation started

- [ ] LOGIC: remote_rejected → remote_review (dispute overturn)
  - Verify: Dispute must be resolved as "overturned"
  - Verify: New review can proceed
```

---

## 10.2 Batch Lifecycle Logic

### Batch State Machine

| From Status | Valid Next Status(es) | Trigger |
|-------------|----------------------|---------|
| `draft` | `pending_approval`, `cancelled` | Submit / Cancel |
| `pending_approval` | `approved`, `rejected` | Org Admin decision |
| `approved` | `active`, `pickup_scheduled` | Pickup creation |
| `rejected` | `draft` | IT Admin revises |
| `active` | `pickup_scheduled` | Pickup assigned |
| `pickup_scheduled` | `picked_up` | Pickup started |
| `picked_up` | `completed` | All assets processed |

### Logic Tests

```markdown
## Batch Logic Tests

### Creation Rules
- [ ] LOGIC: Batch requires at least 1 asset
- [ ] LOGIC: Batch name must be unique per enterprise
- [ ] LOGIC: Draft batch allows asset add/remove
- [ ] LOGIC: Cannot add assets already in another active batch
- [ ] LOGIC: Cannot add assets with incompatible status
  - Valid: conditionally_accepted
  - Invalid: pending_assignment, submitted, picked_up, etc.

### Submission Rules
- [ ] LOGIC: Submit requires pickup location
- [ ] LOGIC: Submit requires preferred date
- [ ] LOGIC: Submit requires time slot selection
- [ ] LOGIC: Submit changes status to pending_approval
- [ ] LOGIC: Submitted batch is read-only (no asset changes)

### Approval Thresholds
- [ ] LOGIC: Auto-approval for small batches (if configured)
- [ ] LOGIC: 50+ assets requires Org Admin approval
- [ ] LOGIC: ₹5,00,000+ total value requires Org Admin approval
- [ ] LOGIC: Either threshold triggers approval requirement

### Approval Effects
- [ ] LOGIC: Approval auto-creates pickup request
- [ ] LOGIC: Approval updates all batch assets to pickup_requested
- [ ] LOGIC: Approval sends notification to IT Admin
- [ ] LOGIC: Approval records approver and timestamp

### Rejection Effects
- [ ] LOGIC: Rejection requires reason
- [ ] LOGIC: Rejection allows resubmission (status → draft)
- [ ] LOGIC: Rejection sends notification to IT Admin
- [ ] LOGIC: Assets remain in conditionally_accepted
```

---

## 10.3 Pickup Assignment Logic (3-Tier)

### Assignment Flow

```
Pickup Created (from batch approval)
    │
    ├─→ Tier 1: In OPS Admin queue
    │   └─→ OPS assigns to Logistics Admin
    │
    ├─→ Tier 2: In Logistics Admin queue
    │   └─→ Logistics Admin assigns to Logistics User
    │
    └─→ Tier 3: In Logistics User assignments
        └─→ User executes pickup
```

### Logic Tests

```markdown
## Pickup Assignment Logic Tests

### Tier 1 (OPS → Logistics Admin)
- [ ] LOGIC: New pickup appears in OPS queue
- [ ] LOGIC: Can only assign to active Logistics Admin
- [ ] LOGIC: Assignment records timestamp and assigner
- [ ] LOGIC: Pickup status updates to "assigned"
- [ ] LOGIC: Notification sent to Logistics Admin

### Tier 2 (Logistics Admin → Logistics User)
- [ ] LOGIC: Assigned pickup appears in Logistics Admin queue
- [ ] LOGIC: Can only assign to users under that Logistics Admin
- [ ] LOGIC: Cannot assign to user with conflicting schedule
- [ ] LOGIC: Assignment records timestamp
- [ ] LOGIC: Pickup status updates to "scheduled"
- [ ] LOGIC: Notification sent to Logistics User

### Tier 3 (Logistics User Execution)
- [ ] LOGIC: Only assigned user can start pickup
- [ ] LOGIC: Start updates status to "in_progress"
- [ ] LOGIC: GPS location recorded at start
- [ ] LOGIC: Each asset requires on-site QC
- [ ] LOGIC: Failed QC marks asset separately
- [ ] LOGIC: Complete requires proof (signature, photos)
- [ ] LOGIC: Complete updates pickup and all assets

### Edge Cases
- [ ] LOGIC: Reassignment from one Logistics Admin to another
- [ ] LOGIC: Reassignment from one Logistics User to another
- [ ] LOGIC: Partial pickup (some assets no-show)
- [ ] LOGIC: Pickup cancellation flow
```

---

## 10.4 Enterprise Registration Logic

### Logic Tests

```markdown
## Enterprise Registration Logic Tests

### Application Validation
- [ ] LOGIC: GST number format validation (15 chars, checksum)
- [ ] LOGIC: PAN number format validation (10 chars, pattern)
- [ ] LOGIC: Duplicate GST check against existing enterprises
- [ ] LOGIC: Duplicate email check for Org Admin
- [ ] LOGIC: All required documents uploaded
- [ ] LOGIC: Document file type validation (PDF, JPG, PNG)

### Approval Multi-Step
- [ ] LOGIC: Approval creates enterprise record
  - Verify: enterprise.id generated
  - Verify: enterprise.gst_number matches application
  - Verify: enterprise.status = 'active'

- [ ] LOGIC: Approval creates Org Admin user
  - Verify: user.role = 'org_admin'
  - Verify: user.enterprise_id links to enterprise
  - Verify: Auth record created in Supabase
  - Verify: Password from application used

- [ ] LOGIC: Approval creates enterprise wallet
  - Verify: wallet.enterprise_id links to enterprise
  - Verify: wallet.balance = 0
  - Verify: wallet.currency = 'INR'

- [ ] LOGIC: Approval sends credentials notification
- [ ] LOGIC: Application status updates to 'approved'

### Rejection
- [ ] LOGIC: Rejection requires reason text
- [ ] LOGIC: Rejection records rejector and timestamp
- [ ] LOGIC: Application status updates to 'rejected'
- [ ] LOGIC: No enterprise/user/wallet created
- [ ] LOGIC: Applicant notified with reason

### Request More Info
- [ ] LOGIC: Request returns application to applicant
- [ ] LOGIC: Request message recorded
- [ ] LOGIC: Applicant can update and resubmit
- [ ] LOGIC: History of info requests preserved
```

---

## 10.5 Sub-User & Assignment Logic

### Logic Tests

```markdown
## Sub-User Logic Tests

### Sub-User Scoping
- [ ] LOGIC: Sub-user belongs to one enterprise
- [ ] LOGIC: Sub-user can see only assets assigned to them
- [ ] LOGIC: Sub-user cannot see other sub-users' data
- [ ] LOGIC: Sub-user actions scoped to their assignments

### Asset Assignment Rules
- [ ] LOGIC: Asset can be assigned to one sub-user at a time
- [ ] LOGIC: Assignment records IT Admin who assigned
- [ ] LOGIC: Assignment creates audit log entry
- [ ] LOGIC: Sub-user notified of new assignment
- [ ] LOGIC: Dashboard count updates immediately

### Unassignment Rules
- [ ] LOGIC: Cannot unassign after evaluation started
- [ ] LOGIC: Unassignment clears sub_user reference
- [ ] LOGIC: Unassignment returns asset to IT Admin pool
- [ ] LOGIC: Unassignment creates audit log entry

### Self-Assignment (IT Admin as evaluator)
- [ ] LOGIC: IT Admin can self-assign for evaluation
- [ ] LOGIC: Self-assigned asset marked differently
- [ ] LOGIC: IT Admin can evaluate own assigned assets
- [ ] LOGIC: Evaluation flow same as sub-user
```

---

## 10.6 Submission & Evaluation Logic

### Logic Tests

```markdown
## Submission Logic Tests

### Photo Requirements
- [ ] LOGIC: 10 photo slots required for laptop
- [ ] LOGIC: Each slot has specific purpose (topLid, screen, etc.)
- [ ] LOGIC: Photos must meet minimum resolution
- [ ] LOGIC: Photos stored with asset reference
- [ ] LOGIC: Damage photo optional but recorded if present

### Functional Check Recording
- [ ] LOGIC: Powers on is required boolean
- [ ] LOGIC: Battery backup is required if powers on
- [ ] LOGIC: Screen condition multi-select recorded
- [ ] LOGIC: Keyboard condition recorded
- [ ] LOGIC: All checks serialized to submission record

### Submission Completion
- [ ] LOGIC: Cannot submit with missing required photos
- [ ] LOGIC: Cannot submit with incomplete checks
- [ ] LOGIC: Submission creates timestamp
- [ ] LOGIC: Asset status auto-transitions to remote_review
- [ ] LOGIC: IT Admin notified of submission

### Submission Edit
- [ ] LOGIC: Cannot edit after submitted status
- [ ] LOGIC: Can save draft and continue later
- [ ] LOGIC: Draft preserves partial progress
```

---

## 10.7 Review & QC Decision Logic

### Logic Tests

```markdown
## Remote Review Logic Tests

### Review Decision
- [ ] LOGIC: Reviewer can view all submission data
- [ ] LOGIC: Reviewer assigns grade (A/B/C/D)
- [ ] LOGIC: Grade determines price modifier
- [ ] LOGIC: Accept calculates estimated RV
- [ ] LOGIC: Reject requires reason selection
- [ ] LOGIC: Decision creates remote_review record

### Grade Assignment Rules
- [ ] LOGIC: Grade A = no deduction
- [ ] LOGIC: Grade B = -₹500
- [ ] LOGIC: Grade C = -₹1500
- [ ] LOGIC: Grade D = -₹3000
- [ ] LOGIC: Grade based on condition + functional checks

### Facility QC Logic
- [ ] LOGIC: QC checklist must be completed
- [ ] LOGIC: Photo verification against submission
- [ ] LOGIC: Serial number verification
- [ ] LOGIC: Grade can be adjusted up or down
- [ ] LOGIC: Final grade determines actual payout
- [ ] LOGIC: QC creates facility_qc record

### Grade Adjustment Rules
- [ ] LOGIC: Can upgrade if condition better than photos
- [ ] LOGIC: Can downgrade if condition worse
- [ ] LOGIC: Adjustment records reason
- [ ] LOGIC: Downgrade may trigger dispute option
```

---

## 10.8 Dispute Resolution Logic

### Logic Tests

```markdown
## Dispute Logic Tests

### Dispute Creation
- [ ] LOGIC: Can dispute remote rejection
- [ ] LOGIC: Can dispute facility QC rejection
- [ ] LOGIC: Can dispute grade downgrade (>1 level)
- [ ] LOGIC: Dispute requires evidence/reason
- [ ] LOGIC: Dispute has time limit (X days from decision)

### Dispute Processing
- [ ] LOGIC: Dispute appears in OPS queue
- [ ] LOGIC: OPS can view original decision + dispute
- [ ] LOGIC: Resolution options: uphold, overturn

### Dispute Effects
- [ ] LOGIC: Upheld = original decision stands
- [ ] LOGIC: Overturned (rejection) = return to review queue
- [ ] LOGIC: Overturned (grade) = adjust to disputed grade
- [ ] LOGIC: Resolution notifies IT Admin
- [ ] LOGIC: Resolution records resolver and timestamp
```

---

## 10.9 Wallet & Transaction Logic

### Logic Tests

```markdown
## Wallet Logic Tests

### Balance Rules
- [ ] LOGIC: Balance cannot go negative
- [ ] LOGIC: Balance updates only via transactions
- [ ] LOGIC: All transactions have audit trail

### Transaction Types
- [ ] LOGIC: CREDIT from payout
- [ ] LOGIC: DEBIT for withdrawal (future)
- [ ] LOGIC: Each transaction links to source (payout_id)

### Payout to Wallet
- [ ] LOGIC: Payout completion credits wallet
- [ ] LOGIC: Credit amount matches payout amount
- [ ] LOGIC: Transaction reference links to payout
- [ ] LOGIC: Running balance updated
```

---

# 11. API & Database Logic Tests

## 11.1 Database Constraint Tests

### Logic Tests

```markdown
## Foreign Key Constraints

- [ ] DB: Cannot create asset with invalid branch_id
- [ ] DB: Cannot create asset with invalid batch_id
- [ ] DB: Cannot assign asset to non-existent sub_user
- [ ] DB: Cannot create batch for non-existent enterprise
- [ ] DB: Cannot create user for non-existent enterprise
- [ ] DB: Cannot create pickup with invalid location_id

## Unique Constraints

- [ ] DB: Enterprise GST number must be unique
- [ ] DB: User email must be unique
- [ ] DB: Asset serial_number unique within enterprise
- [ ] DB: Branch code unique within enterprise
- [ ] DB: Batch name unique within enterprise

## Not Null Constraints

- [ ] DB: Asset must have device_type
- [ ] DB: Asset must have branch_id
- [ ] DB: User must have role
- [ ] DB: Enterprise must have name
- [ ] DB: Batch must have name

## Check Constraints

- [ ] DB: User role must be valid enum value
- [ ] DB: Asset status must be valid enum value
- [ ] DB: Batch status must be valid enum value
- [ ] DB: Payout amount must be positive
```

---

## 11.2 RLS (Row Level Security) Tests

### Logic Tests

```markdown
## RLS Policy Tests

### Enterprise Scoping
- [ ] RLS: IT Admin can only see assets in their enterprise
- [ ] RLS: IT Admin can only see users in their enterprise
- [ ] RLS: IT Admin can only see batches in their enterprise
- [ ] RLS: Org Admin sees all enterprise data

### Branch Scoping
- [ ] RLS: IT Admin (branch-scoped) sees only branch assets
- [ ] RLS: IT Admin (branch-scoped) sees only branch sub-users
- [ ] RLS: IT Admin (enterprise-scoped) sees all branches

### Sub-User Scoping
- [ ] RLS: Sub-user sees only their assigned assets
- [ ] RLS: Sub-user sees only their submissions
- [ ] RLS: Sub-user cannot see other employees

### Logistics Scoping
- [ ] RLS: Logistics Admin sees only their assigned pickups
- [ ] RLS: Logistics User sees only their assignments
- [ ] RLS: Logistics cannot see enterprise financials

### Cross-Enterprise Isolation
- [ ] RLS: Enterprise A cannot see Enterprise B assets
- [ ] RLS: Enterprise A cannot see Enterprise B users
- [ ] RLS: API rejects cross-enterprise queries
```

---

## 11.3 Query Logic Validation

### Logic Tests

```markdown
## Query Result Tests

### Asset Queries
- [ ] QUERY: fetchAssets returns correct count
- [ ] QUERY: fetchAssetsByBranch filters correctly
- [ ] QUERY: fetchAssetsByStatus filters correctly
- [ ] QUERY: Asset includes nested submission data
- [ ] QUERY: Asset includes nested review data
- [ ] QUERY: Pagination returns correct pages

### Batch Queries
- [ ] QUERY: fetchBatches returns correct count
- [ ] QUERY: Batch includes asset count
- [ ] QUERY: Batch includes total value calculation
- [ ] QUERY: Batch approval queue filters pending only

### User Queries
- [ ] QUERY: fetchUsers filters by role
- [ ] QUERY: fetchITAdmins returns correct branch assignment
- [ ] QUERY: User includes branch information

### Aggregation Queries
- [ ] QUERY: Dashboard stats match actual counts
- [ ] QUERY: Branch summary totals are accurate
- [ ] QUERY: Payout totals match individual sums
```

---

## 11.4 Mutation Logic Validation

### Logic Tests

```markdown
## Mutation Side Effect Tests

### Asset Mutations
- [ ] MUTATION: createAsset generates unique ID
- [ ] MUTATION: createAsset sets initial status
- [ ] MUTATION: updateAsset records updated_at
- [ ] MUTATION: bulkCreateAssets handles partial failures

### Batch Mutations
- [ ] MUTATION: approveBatch creates pickup request
- [ ] MUTATION: approveBatch updates all asset statuses
- [ ] MUTATION: rejectBatch preserves asset statuses
- [ ] MUTATION: deleteBatch removes asset associations

### User Mutations
- [ ] MUTATION: createUser creates auth record
- [ ] MUTATION: createUser sends invitation (if configured)
- [ ] MUTATION: deactivateUser preserves data
- [ ] MUTATION: deactivateUser prevents login

### Multi-Step Mutations
- [ ] MUTATION: approveEnterprise is atomic
  - Success: all records created
  - Failure: no partial records
- [ ] MUTATION: approveBatchWithPrices updates all or none
```

---

## 11.5 Real-time Subscription Logic

### Logic Tests

```markdown
## Real-time Event Tests

### Asset Events
- [ ] REALTIME: Asset insert triggers subscription
- [ ] REALTIME: Asset update triggers subscription
- [ ] REALTIME: Asset delete triggers subscription
- [ ] REALTIME: Events filtered by enterprise_id

### Notification Events
- [ ] REALTIME: New notification triggers badge update
- [ ] REALTIME: Mark read triggers badge decrease
- [ ] REALTIME: Events scoped to user_id

### Reconnection Logic
- [ ] REALTIME: Recovers after disconnect
- [ ] REALTIME: Catches up on missed events
- [ ] REALTIME: No duplicate events
```

---

# 12. Calculation & Pricing Logic

## 12.1 Payout Calculation Tests

### Calculation Formula

```
Final Payout = Base Price - Grade Modifier - Logistics Charge

Where:
- Base Price: From pricing config (by device type)
- Grade Modifier: A=0, B=-500, C=-1500, D=-3000
- Logistics Charge: ₹150 per device (fixed)
```

### Logic Tests

```markdown
## Payout Calculation Tests

### Base Price Lookup
- [ ] CALC: Correct base price for Laptop
- [ ] CALC: Correct base price for Desktop
- [ ] CALC: Correct base price for Monitor
- [ ] CALC: Correct base price for Mobile
- [ ] CALC: Unknown device type handling

### Grade Modifier Application
- [ ] CALC: Grade A asset = Base - 0 - 150
- [ ] CALC: Grade B asset = Base - 500 - 150
- [ ] CALC: Grade C asset = Base - 1500 - 150
- [ ] CALC: Grade D asset = Base - 3000 - 150

### Specific Calculations
| Device Type | Base Price | Grade | Modifier | Logistics | Expected Payout |
|-------------|-----------|-------|----------|-----------|-----------------|
| Laptop | ₹10,000 | A | ₹0 | ₹150 | ₹9,850 |
| Laptop | ₹10,000 | B | ₹500 | ₹150 | ₹9,350 |
| Laptop | ₹10,000 | C | ₹1,500 | ₹150 | ₹8,350 |
| Laptop | ₹10,000 | D | ₹3,000 | ₹150 | ₹6,850 |
| Desktop | ₹15,000 | A | ₹0 | ₹150 | ₹14,850 |
| Monitor | ₹5,000 | B | ₹500 | ₹150 | ₹4,350 |

### Edge Cases
- [ ] CALC: Zero base price handling
- [ ] CALC: Negative result handling (floor at 0)
- [ ] CALC: Currency rounding rules
- [ ] CALC: Bulk calculation consistency
```

---

## 12.2 Batch Value Calculations

### Logic Tests

```markdown
## Batch Totals Tests

### Asset Count
- [ ] CALC: Asset count matches batch.assets.length
- [ ] CALC: Count updates when assets added
- [ ] CALC: Count updates when assets removed

### Total Estimated Value
- [ ] CALC: Sum of all asset estimated RVs
- [ ] CALC: Updates when asset grades change
- [ ] CALC: Displayed value matches calculation

### Approval Threshold Check
- [ ] CALC: 49 assets = no approval needed (if no value threshold)
- [ ] CALC: 50 assets = approval required
- [ ] CALC: ₹4,99,999 value = no approval needed (if < 50 assets)
- [ ] CALC: ₹5,00,000 value = approval required
- [ ] CALC: Either threshold triggers requirement
```

---

## 12.3 Wallet Balance Calculations

### Logic Tests

```markdown
## Wallet Balance Tests

### Balance Accuracy
- [ ] CALC: Initial balance = 0
- [ ] CALC: After 1 payout: balance = payout amount
- [ ] CALC: After N payouts: balance = sum of all payouts
- [ ] CALC: Running balance always accurate

### Transaction Integrity
- [ ] CALC: Transaction amount matches payout
- [ ] CALC: Transaction creates audit trail
- [ ] CALC: No balance update without transaction
```

---

## 12.4 Dashboard Statistics Calculations

### Logic Tests

```markdown
## Dashboard Stats Tests

### Asset Pipeline Counts
- [ ] CALC: "Pending Assignment" = count where status = 'pending_assignment'
- [ ] CALC: "Assigned" = count where status = 'assigned'
- [ ] CALC: "Submitted" = count where status = 'submitted'
- [ ] CALC: "Under Review" = count where status = 'remote_review'
- [ ] CALC: "Ready for Pickup" = count where status = 'conditionally_accepted'
- [ ] CALC: All stages sum to total assets

### Revenue/Value Calculations
- [ ] CALC: Total estimated value = sum of all asset RVs
- [ ] CALC: Completed value = sum of completed payouts
- [ ] CALC: Pending value = sum of pending payouts

### Time-based Stats
- [ ] CALC: "This Week" filters by date range
- [ ] CALC: "This Month" filters correctly
- [ ] CALC: Timezone handling consistent
```

---

# 13. Security & Permission Logic

## 13.1 Authentication Logic Tests

### Logic Tests

```markdown
## Authentication Tests

### Login Flow
- [ ] AUTH: Valid credentials → session created
- [ ] AUTH: Invalid email → error message (no account hint)
- [ ] AUTH: Invalid password → error message (generic)
- [ ] AUTH: Account deactivated → appropriate error
- [ ] AUTH: Session token stored securely

### Session Management
- [ ] AUTH: Session expires after timeout
- [ ] AUTH: Refresh token extends session
- [ ] AUTH: Logout clears all session data
- [ ] AUTH: Cannot access app after logout

### Password Rules
- [ ] AUTH: Minimum length enforced
- [ ] AUTH: Complexity requirements (if configured)
- [ ] AUTH: Password not logged anywhere
```

---

## 13.2 Authorization Logic Tests

### Logic Tests

```markdown
## Role-Based Access Tests

### Super Admin Permissions
- [ ] AUTHZ: Can access all portals
- [ ] AUTHZ: Can view all enterprises
- [ ] AUTHZ: Can approve applications
- [ ] AUTHZ: Can modify pricing

### OPS Admin Permissions
- [ ] AUTHZ: Can access OPS portal
- [ ] AUTHZ: Cannot modify pricing
- [ ] AUTHZ: Can approve applications
- [ ] AUTHZ: Can assign pickups

### Org Admin Permissions
- [ ] AUTHZ: Limited to own enterprise
- [ ] AUTHZ: Can manage branches
- [ ] AUTHZ: Can manage IT Admins
- [ ] AUTHZ: Can approve pickups
- [ ] AUTHZ: Cannot access other enterprises

### IT Admin Permissions
- [ ] AUTHZ: Limited to own branch (or enterprise if no branch)
- [ ] AUTHZ: Can manage assets
- [ ] AUTHZ: Can manage batches
- [ ] AUTHZ: Can manage sub-users
- [ ] AUTHZ: Cannot approve own batches

### Sub-User Permissions
- [ ] AUTHZ: Limited to assigned assets
- [ ] AUTHZ: Can submit evaluations
- [ ] AUTHZ: Cannot access admin functions
- [ ] AUTHZ: Cannot see other employees

### Logistics Admin Permissions
- [ ] AUTHZ: Can see assigned pickups
- [ ] AUTHZ: Can manage logistics users
- [ ] AUTHZ: Cannot access enterprise data

### Logistics User Permissions
- [ ] AUTHZ: Can see own assignments only
- [ ] AUTHZ: Can perform pickup actions
- [ ] AUTHZ: Cannot assign to others
```

---

## 13.3 API Security Tests

### Logic Tests

```markdown
## API Security Tests

### Authentication Enforcement
- [ ] API: Unauthenticated requests rejected (401)
- [ ] API: Expired token rejected (401)
- [ ] API: Invalid token rejected (401)

### Authorization Enforcement
- [ ] API: Wrong role rejected (403)
- [ ] API: Cross-enterprise request rejected (403)
- [ ] API: Cross-branch request rejected (403)
- [ ] API: Detailed error for debugging (dev) / generic (prod)

### Input Validation
- [ ] API: SQL injection blocked
- [ ] API: XSS payloads sanitized
- [ ] API: Oversized payloads rejected
- [ ] API: Invalid data types rejected

### Rate Limiting
- [ ] API: Rate limits applied
- [ ] API: Rate limit exceeded returns 429
- [ ] API: Rate limits per user/IP
```

---

## 13.4 Data Security Tests

### Logic Tests

```markdown
## Data Security Tests

### Sensitive Data Handling
- [ ] DATA: Passwords never in API responses
- [ ] DATA: Auth tokens not logged
- [ ] DATA: PII not in error messages
- [ ] DATA: Financial data encrypted

### File Upload Security
- [ ] UPLOAD: File type verified (not just extension)
- [ ] UPLOAD: Virus scan (if configured)
- [ ] UPLOAD: Storage access controlled
- [ ] UPLOAD: No path traversal

### Data Deletion
- [ ] DELETE: Soft delete preserves audit
- [ ] DELETE: Cascade rules enforced
- [ ] DELETE: No orphaned records
```

---

# Quick Start

## To Begin Testing:

1. **Start Ralph Loop**:
   ```
   /ralph-loop
   ```

2. **Paste the Master Prompt** from Section 2

3. **Or use Loki Mode** for parallel testing:
   ```
   Loki Mode: Execute the EcoTribe production readiness test plan
   ```

4. **Track Progress** using TodoWrite and the templates in Section 8

5. **Document Issues** using the format in Section 9

6. **Generate Report** when complete using the template in Section 9.4

---

*Document Version: 1.0*
*Last Updated: [Current Date]*
*Platform: EcoTribe V3*
