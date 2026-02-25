# EcoTribe UI Test Cases — Bug Regression Suite
**Date:** 2026-02-25 | **Total Bugs:** 40 | **Portals Covered:** 7
**App URL:** `http://localhost:3000` (dev) or `http://localhost:1228` (prod)
**Backend:** `http://localhost:8000/api/v1`

---

## Test Summary Checklist

Check off each bug as you verify it passes:

### Logistics Admin Portal (6 bugs)
- [ ] LA-01: Assign button popup modal with logistics user dropdown
- [ ] LA-02: Logistics user deactivation working
- [ ] LA-03: KPI card "Field Users" redirects to Users section
- [ ] LA-04: KPI card "Completed" redirects with completed filter
- [ ] LA-05: Unassigned logistics users indicator on dashboard
- [ ] LA-06: Phone number validation with inline errors

### Logistics User Portal (1 bug)
- [ ] LU-01: Cards appear below search bar in correct layout

### OPS Admin Portal (2 bugs)
- [ ] OA-01: Logistics user assignment dropdown in pickup queue
- [ ] OA-02: Edit IT Admin and Employee from enterprise detail page

### IT Admin Portal (12 bugs)
- [ ] IT-01: Employee deactivation working
- [ ] IT-02: Employee details update working
- [ ] IT-03: Branch filter for multi-branch IT Admin
- [ ] IT-04: Bank section hidden for IT Admin in Settings
- [ ] IT-05: Enterprise fields read-only for IT Admin in Settings
- [ ] IT-06: Delete and update pickup locations
- [ ] IT-07: Opening/closing days and hours in location form
- [ ] IT-08: Pickup location form uses dropdowns
- [ ] IT-09: Bulk action card layout with X close button
- [ ] IT-10: Employee dropdown filters by selected branch
- [ ] IT-11: Bulk upload file selection from Assets page
- [ ] IT-12: Pickup filtering and stats card in sync

### Employee Portal (1 bug)
- [ ] EM-01: Progress bar reaches "Done" on terminal statuses

### Org Admin Portal (15 bugs)
- [ ] OR-01: Request Redemption shows "Coming Soon"
- [ ] OR-02: Financial reports time range filter working
- [ ] OR-03: IT Admin name in batch export (not garbled characters)
- [ ] OR-04: Financial reports export excludes enterprise DB ID
- [ ] OR-05: Asset/batch export shows batch name, not batch ID
- [ ] OR-06: Asset listing UI proper with consistent modal
- [ ] OR-07: Batch status updates after payout processing
- [ ] OR-08: Dispute KPI cards showing data
- [ ] OR-09: Dispute status filter working
- [ ] OR-10: Bulk employee upload requires branch selection
- [ ] OR-11: Batch listing shows expected value
- [ ] OR-12: Bulk upload catches duplicate emails upfront
- [ ] OR-13: Unassigning IT Admin from branch working
- [ ] OR-14: Branch detail click filters employees/assets
- [ ] OR-15: Batches filtered by branch with branch-specific stats

### Super Admin Portal (4 bugs)
- [ ] SA-01: Dashboard stats and user counts accurate
- [ ] SA-02: QC filters work server-side
- [ ] SA-03: Dispute KPI cards showing data
- [ ] SA-04: Analytics export produces CSV, not JSON

### Cross-Portal (1 bug)
- [ ] CP-01: EPR Certificate push from OPS to Org Admin

---

## Test Credentials

| Role | Email | Password | Portal URL |
|------|-------|----------|------------|
| Super Admin | superadmin@ecotribe.io | password123 | `/super` |
| OPS Admin | opsadmin@ecotribe.io | password123 | `/ops` and `/review` |
| Org Admin | orgadmin@techcorp.com | password123 | `/org-admin` |
| IT Admin | itadmin@techcorp.com | password123 | `/admin` |
| Employee | employee@techcorp.com | password123 | `/check-in` |
| Logistics Admin | logisticsadmin@express.com | password123 | `/logistics-admin` |
| Logistics User | driver@express.com | password123 | `/logistics` |

---

## PORTAL 1: Logistics Admin

**Login**: `logisticsadmin@express.com` / `password123`
**URL**: `/logistics-admin`

---

### LA-01: Assign Button Popup Modal with Logistics User Dropdown
**Portal**: Logistics Admin > Dashboard > Pickup Detail
**Pre-conditions**: At least one pickup request is assigned to this logistics admin (status `assigned_to_logistics_admin`). At least one active logistics user (field user/driver) exists under this admin.

**Steps**:
1. Navigate to Sidebar > Dashboard
2. Click on any pickup request card in the "Upcoming Pickups" section to open its detail page (`/logistics-admin/pickups/<id>`)
3. On the pickup detail page, locate the "Assign to Driver" or "Assign" action button
4. Click the assign button
5. - [ ] Verify a modal or dropdown appears for selecting a logistics user
6. - [ ] Verify the dropdown lists logistics users (drivers) under this admin
7. - [ ] Verify **only active** logistics users appear (inactive users must NOT appear)
8. - [ ] Verify each user entry shows their name and email
9. Select a logistics user from the dropdown
10. Confirm the assignment
11. - [ ] Verify a success toast appears
12. - [ ] Verify the pickup request status changes to `assigned_to_logistics_user`
13. - [ ] Verify the assigned driver name now appears on the pickup detail page

**Expected Result**: A modal opens with a dropdown populated with active logistics users. After selection and confirmation, the pickup is assigned to the driver and the status updates.

**Edge Cases**:
- [ ] If no active logistics users exist, the modal should show an empty state message like "No active field users available. Add a field user in the Users section." rather than a blank dropdown
- [ ] If all logistics users are inactive, the assign dropdown should be empty with the same helpful message

**Pass Criteria**: Modal opens with a populated dropdown of active logistics users; assignment succeeds and status updates to `assigned_to_logistics_user`.

---

### LA-02: Logistics User Deactivation Working
**Portal**: Logistics Admin > Users
**Pre-conditions**: At least one active logistics user exists.

**Steps**:
1. Navigate to Sidebar > Users (Field Users page at `/logistics-admin/users`)
2. Look at the stats cards at the top:
   - [ ] Verify "Total" count, "Active" count, and "Inactive" count are displayed
3. Find an active logistics user in the list
4. - [ ] Verify the user shows a green "Active" status badge
5. Click the power icon (toggle) button on the user's row
6. - [ ] Verify a loading spinner replaces the power icon for THAT specific user (per-user loading, not global)
7. - [ ] Verify a success toast appears: "User Deactivated" with message including the user's name
8. - [ ] Verify the user's status badge changes from "Active" (green) to "Inactive" (gray)
9. - [ ] Verify the stats cards update: "Active" count decreases by 1, "Inactive" count increases by 1, "Total" stays the same

**Expected Result**: User status toggles from active to inactive without errors. The UI updates immediately with per-user loading indicators.

**Edge Cases**:
- [ ] Re-activate the same user by clicking the power icon again: verify status goes back to "Active" and toast says "User Activated"
- [ ] Verify the deactivated user no longer appears in the assign dropdown for pickups (see LA-01)
- [ ] Try deactivating multiple users rapidly: verify each toggle processes correctly without race conditions

**Pass Criteria**: Toggle active/inactive works in both directions. Stats update correctly. Toast notifications appear with user name.

---

### LA-03: KPI Card "Field Users" Redirects to Users Section
**Portal**: Logistics Admin > Dashboard
**Pre-conditions**: None

**Steps**:
1. Navigate to Sidebar > Dashboard (`/logistics-admin`)
2. Locate the "Pickup Overview" stats grid with 4 cards:
   - Pending Assignment
   - Scheduled
   - Completed
   - **Field Users** (rightmost card, lime green icon)
3. - [ ] Verify "Field Users" card displays a numeric count with "Your team" sublabel
4. Click on the "Field Users" card
5. - [ ] Verify the browser navigates to `/logistics-admin/users` (the Users management page)
6. - [ ] Verify the URL in the address bar is `/logistics-admin/users`, NOT `/logistics-admin/assignments`
7. - [ ] Verify the Users page (titled "Field Users") loads with the user list

**Expected Result**: Clicking "Field Users" KPI card navigates to `/logistics-admin/users`, not to Assignments.

**Edge Cases**:
- [ ] Verify the count on the KPI card matches the "Total" user count shown on the Users page

**Pass Criteria**: Navigation target is `/logistics-admin/users`.

---

### LA-04: KPI Card "Completed" Redirects with Completed Filter
**Portal**: Logistics Admin > Dashboard
**Pre-conditions**: Ideally have at least one completed pickup request.

**Steps**:
1. Navigate to Sidebar > Dashboard (`/logistics-admin`)
2. Locate the "Completed" KPI stat card (green with a checkmark icon, shows "This month" sublabel)
3. Note the completed count displayed
4. Click on the "Completed" card
5. - [ ] Verify the browser navigates to `/logistics-admin/assignments?status=completed`
6. - [ ] Verify the URL contains the `?status=completed` query parameter
7. - [ ] Verify the Assignments page loads
8. - [ ] If completed pickups exist, verify they appear in the filtered list
9. - [ ] Verify the number of visible completed pickups matches the count from the KPI card

**Expected Result**: Clicking "Completed" navigates to Assignments page with `?status=completed` URL parameter. Completed pickups are visible if they exist.

**Edge Cases**:
- [ ] With zero completed pickups: verify the page displays normally with a "No pickups" empty state, no errors
- [ ] Verify the status filter on the Assignments page (if present) reflects the "completed" state from the URL

**Pass Criteria**: URL is `/logistics-admin/assignments?status=completed` and the page loads without errors.

---

### LA-05: Dashboard Stats with Pending Assignment Indicator
**Portal**: Logistics Admin > Dashboard
**Pre-conditions**: Have pickup requests in various states (pending, assigned, in-progress, completed).

**Steps**:
1. Navigate to Sidebar > Dashboard (`/logistics-admin`)
2. Review the 4 stat cards in the "Pickup Overview" section:
3. - [ ] Verify "Pending Assignment" card exists with a clock icon
   - [ ] Value shows count of pickups awaiting assignment
   - [ ] Sublabel reads "Awaiting action"
   - [ ] When count > 0: card has an amber/warning accent color
   - [ ] When count = 0: card has a neutral accent color
4. - [ ] Verify "Scheduled" card exists
   - [ ] Value shows combined count of assigned + in-progress pickups
   - [ ] Sublabel reads "In progress"
5. - [ ] Verify "Completed" card exists
   - [ ] Value shows completed pickup count
   - [ ] Sublabel reads "This month"
6. - [ ] Verify "Field Users" card exists
   - [ ] Value shows team member count
   - [ ] Sublabel reads "Your team"
7. Click the "Pending Assignment" card
   - [ ] Verify it navigates to `/logistics-admin/assignments`

**Expected Result**: All four stat cards display accurate data. The "Pending Assignment" card visually highlights when pickups are waiting.

**Pass Criteria**: All four stat cards display, "Pending Assignment" has a warning accent when non-zero, and all navigation targets are correct.

---

### LA-06: Phone Number Validation with Inline Errors
**Portal**: Logistics Admin > Users > Edit User and Add User modals
**Pre-conditions**: At least one logistics user exists.

**Steps -- Edit User:**
1. Navigate to Sidebar > Users (`/logistics-admin/users`)
2. Click the edit (pencil) icon on any user row
3. In the Edit modal, locate the "Phone Number" field
4. Clear the phone field and type `123` (3 digits -- invalid)
5. - [ ] Verify an inline red error appears below the field: "Enter a valid 10-digit phone number (e.g. 9876543210 or +919876543210)"
6. - [ ] Verify the phone field border turns red
7. Type letters like `abcdef`
8. - [ ] Verify only digits and `+` are accepted (letters are stripped automatically)
9. Type `9876543210` (valid 10-digit number)
10. - [ ] Verify the inline error disappears and border returns to normal
11. Type `+919876543210` (valid with country code prefix)
12. - [ ] Verify the inline error disappears
13. Clear the field entirely (empty)
14. - [ ] Verify NO error appears (phone is optional)
15. Enter an invalid number like `12345` and try to click "Save Changes"
16. - [ ] Verify the Save button is disabled when phone has a validation error

**Steps -- Add User:**
17. Go back to Users page and click "Add Field User" button
18. Fill in name, email, and password
19. In the phone field, type `12345` (invalid)
20. - [ ] Verify inline error appears below the phone field
21. - [ ] Verify the "Create User" button is disabled while phone validation error exists
22. Fix the phone to `9876543210` or clear it
23. - [ ] Verify the Create User button becomes enabled

**Expected Result**: Real-time phone validation with inline error messages. Only digits and `+` prefix accepted. 10 digits required (with optional +91 prefix). Phone is optional -- empty is valid.

**Pass Criteria**: Inline errors appear/disappear in real-time. Invalid phone blocks form submission. Empty phone is accepted.

---

## PORTAL 2: Logistics User

**Login**: `driver@express.com` / `password123`
**URL**: `/logistics`

---

### LU-01: Cards Appear Below Search Bar in Correct Layout
**Portal**: Logistics User > Assignments page
**Pre-conditions**: Have at least one pickup assignment for this logistics user.

**Steps**:
1. Log in and navigate to the main Assignments page (`/logistics`)
2. Examine the page layout from top to bottom:
3. - [ ] Verify the status filter control ("Active" / "All" toggle) appears at the TOP of the content area
4. - [ ] Verify pickup assignment cards appear BELOW the filter in a grid/list layout
5. - [ ] Verify cards are NOT positioned alongside, above, or overlapping the filter bar
6. - [ ] Verify the visual stacking order is: filter controls --> assignment cards
7. If there are multiple assignments:
8. - [ ] On desktop: verify cards display in a responsive layout
9. - [ ] Resize browser to mobile width: verify cards stack vertically in a single column

**Expected Result**: Clean layout with filter/status toggle above, assignment cards displayed in a grid below.

**Pass Criteria**: Visual inspection confirms correct vertical stacking order (filter above, cards below).

---

## PORTAL 3: OPS Admin

**Login**: `opsadmin@ecotribe.io` / `password123`
**URL**: `/ops`

---

### OA-01: Logistics User Assignment Dropdown in Pickup Queue
**Portal**: OPS Admin > Pickups (Pickup Queue)
**Pre-conditions**: At least one pickup request exists. A logistics admin with active logistics users exists.

**Steps**:
1. Navigate to Sidebar > Pickups (`/ops/pickups` - the Pickup Queue page)
2. Find a pickup request in the list
3. **Test Logistics Admin Assignment:**
4. - [ ] Verify there is a dropdown or action to assign a logistics ADMIN to the pickup
5. Assign a logistics admin to the pickup
6. - [ ] Verify the assignment succeeds with a success toast

7. **Test Logistics User Assignment:**
8. After a logistics admin is assigned, locate the logistics USER assignment control
9. - [ ] Verify a second dropdown appears specifically for selecting a logistics user (driver)
10. - [ ] Verify the dropdown is labeled something like "Assign Driver" or "Assign Logistics User"
11. Click the logistics user dropdown
12. - [ ] Verify it shows available logistics users associated with the assigned logistics admin
13. - [ ] Verify each entry shows the user's name
14. Select a logistics user
15. - [ ] Verify the assignment succeeds with a success toast
16. - [ ] Verify the pickup status updates to `assigned_to_logistics_user`

**Expected Result**: The Pickup Queue page provides both logistics admin AND logistics user assignment functionality. After assigning an admin, the user dropdown appears.

**Edge Cases**:
- [ ] Before a logistics admin is assigned: verify the logistics user dropdown is disabled or hidden with an appropriate message
- [ ] Verify the logistics user dropdown ONLY shows users belonging to the assigned logistics admin (not users from other logistics admin companies)
- [ ] If the assigned logistics admin has no active users: verify an appropriate empty state message

**Pass Criteria**: Both admin and user assignment dropdowns are present and functional on the pickup queue page.

---

### OA-02: Edit IT Admin and Employee from Enterprise Detail Page
**Portal**: OPS Admin > Enterprises > Enterprise Detail
**Pre-conditions**: At least one enterprise exists with IT Admins and employees (e.g., TechCorp).

**Steps**:
1. Navigate to Sidebar > Enterprises (`/ops/enterprises`)
2. Click on an enterprise (e.g., "TechCorp") to open the detail page
3. Scroll to the users section of the enterprise detail page

**Test IT Admin Editing:**
4. Find the IT Admin listing
5. - [ ] Verify IT Admin users are listed with their name, email, role, and status
6. - [ ] Verify there is an edit action (pencil/edit icon) on each IT Admin row
7. Click edit on an IT Admin
8. - [ ] Verify an edit modal (EditUserModal) opens with the user's current name, email, and phone pre-filled
9. Change a field (e.g., update the phone number)
10. Click Save
11. - [ ] Verify a success toast appears
12. - [ ] Verify the updated details are reflected in the user listing

**Test Employee Editing:**
13. Scroll to or navigate to the Employees (sub-users) section
14. - [ ] Verify employees are listed
15. - [ ] Verify there is an edit action for each employee
16. Click edit on an employee
17. - [ ] Verify an edit modal opens with the employee's details
18. Make a change and save
19. - [ ] Verify the update succeeds with a toast notification

**Test Status Toggle:**
20. - [ ] Verify activate/deactivate toggle buttons are visible on user rows
21. Click deactivate on a user
22. - [ ] Verify a confirmation prompt appears
23. Confirm
24. - [ ] Verify the user's status changes and a success toast appears

**Expected Result**: Both IT Admins and employees can be edited and their status toggled directly from the enterprise detail page.

**Pass Criteria**: Edit modals open and save successfully for both IT Admins and employees. Status toggles work.

---

## PORTAL 4: IT Admin

**Login**: `itadmin@techcorp.com` / `password123`
**URL**: `/admin`

---

### IT-01: Employee Deactivation Working
**Portal**: IT Admin > Employees
**Pre-conditions**: At least one active employee exists in the IT Admin's enterprise/branch.

**Steps**:
1. Navigate to Sidebar > Employees (`/admin/employees`)
2. Find an active employee in the list
3. - [ ] Verify the employee shows a green "Active" status label with a checkmark icon
4. Click the deactivate button (red user-x icon) on the employee's row
5. - [ ] Verify a **DeactivationPreviewModal** appears (NOT just a simple confirmation)
6. - [ ] Verify the modal shows the employee's name
7. - [ ] Verify the modal describes what deactivation means
8. Click "Confirm" / "Deactivate" in the modal
9. - [ ] Verify a loading spinner appears on the button during the API call
10. - [ ] Verify a success toast appears: "Employee Deactivated" with message "Employee has been deactivated."
11. - [ ] Verify the employee's status changes from "Active" (green) to "Inactive" (gray) in the list
12. - [ ] Verify the stats grid updates: "Active" count decreases by 1

**Expected Result**: Employee deactivation works with a preview modal, success toast, and immediate UI update.

**Edge Cases**:
- [ ] Cancel the deactivation modal: verify NO status change occurs
- [ ] Re-activate a deactivated employee: verify a simpler ConfirmationModal appears (not the preview modal) asking "Activate Employee?"
- [ ] Confirm activation: verify status goes back to "Active" with toast "Employee Activated"

**Pass Criteria**: Deactivation and re-activation both work. DeactivationPreviewModal is used for deactivation. ConfirmationModal is used for activation.

---

### IT-02: Employee Details Update Working
**Portal**: IT Admin > Employees > Employee Detail
**Pre-conditions**: At least one employee exists.

**Steps**:
1. Navigate to Sidebar > Employees (`/admin/employees`)
2. Click on an employee row to navigate to the Employee Detail page (`/admin/employees/<id>`)
3. - [ ] Verify the employee's current details are displayed (name, email, phone, department, branch)
4. Click the edit button/icon
5. Modify a field (e.g., change the phone number or department)
6. Click Save
7. - [ ] Verify a success toast appears confirming the update
8. - [ ] Verify the detail page refreshes to show the new values
9. Navigate back to the Employees list (`/admin/employees`)
10. - [ ] Verify the updated details are reflected in the employee's row in the list

**Expected Result**: Employee details are editable from the detail page and changes persist.

**Edge Cases**:
- [ ] Try saving with no changes: verify it either succeeds silently or shows appropriate feedback
- [ ] Edit the employee's name: verify the avatar initials update to match the new name

**Pass Criteria**: Edits save successfully and are visible in both detail and list views.

---

### IT-03: Branch Filter for Multi-Branch IT Admin
**Portal**: IT Admin > Employees
**Pre-conditions**: The test IT Admin (`itadmin@techcorp.com`) must be assigned to **multiple branches**. If not, use the Org Admin to assign additional branches first.

**Steps**:
1. Navigate to Sidebar > Employees (`/admin/employees`)
2. Look at the filter bar area below the stats grid
3. - [ ] Verify a branch dropdown selector appears in the filter bar (this only appears when the IT Admin has 2+ branches assigned)
4. - [ ] Verify the dropdown shows "All Branches" as the default selected option
5. - [ ] Verify each of the IT Admin's assigned branches appears as a selectable option in the dropdown
6. Select a specific branch from the dropdown
7. - [ ] Verify the employee list immediately filters to show ONLY employees belonging to that branch
8. - [ ] Verify the stats cards (Total Users, Active, Pending Invite, Assets Assigned) update to reflect only the selected branch's data
9. Select "All Branches" again
10. - [ ] Verify all employees from all assigned branches reappear
11. - [ ] Verify stats reset to show combined totals

**Expected Result**: Branch dropdown appears for multi-branch IT Admins. Filtering by branch updates both the employee list and the stats grid.

**Edge Cases**:
- [ ] If the IT Admin has only one branch: verify NO branch dropdown appears (it should be hidden, not empty)
- [ ] Branch filter combined with search: type a name while a branch is selected, verify only matching employees from that branch appear
- [ ] Branch filter combined with status filter: select a branch + status "Active", verify both filters apply together
- [ ] Employee list shows a branch badge on each row when multiple branches are managed

**Pass Criteria**: Branch dropdown appears for multi-branch IT Admin, filters employees and updates stats.

---

### IT-04: Bank Section Hidden for IT Admin in Settings
**Portal**: IT Admin > Settings
**Pre-conditions**: None

**Steps**:
1. Navigate to Sidebar > Settings (`/admin/settings`)
2. Review ALL visible sections on the Settings page by scrolling from top to bottom
3. The expected visible sections are:
   - [ ] "Profile" section (personal info, password change)
   - [ ] "Pickup Locations" section (requires MANAGE_PICKUP_LOCATIONS permission)
   - [ ] "Notifications" section (notification preferences)
4. Now verify what is NOT present:
   - [ ] Verify there is NO "Bank" section anywhere on the page
   - [ ] Verify there is NO "Bank Account" section
   - [ ] Verify there is NO "Payment" or "Payout" section
5. Scroll through the entire page one more time to be thorough
6. - [ ] Confirm: Bank/payment section is completely absent

**Expected Result**: The Bank section is hidden for IT Admin role. It is wrapped in a `PermissionGate` that requires `VIEW_PAYOUTS` permission, which IT Admin does not have.

**Edge Cases**:
- [ ] Use browser DevTools (Elements tab) to search for "bank" in the DOM: verify the Bank section is not rendered at all (not just hidden via CSS)

**Pass Criteria**: No bank/payment section visible or rendered on the IT Admin Settings page.

---

### IT-05: Enterprise Fields Read-Only for IT Admin in Settings
**Portal**: IT Admin > Settings
**Pre-conditions**: None

**Steps**:
1. Navigate to Sidebar > Settings (`/admin/settings`)
2. Look for an "Enterprise" section (if it exists)
3. If an Enterprise section is present:
   - [ ] Verify enterprise fields (company name, GST, PAN, address) are displayed as **read-only** text
   - [ ] Verify the text is styled as static display, not as editable input fields
   - [ ] Verify there is NO "Save" or "Update Enterprise" button
   - [ ] Click on the enterprise field values: verify they are NOT editable (no cursor change, no text selection/edit activation)
4. If the Enterprise section is completely hidden (not rendered):
   - [ ] This is also acceptable -- verify there are no enterprise editing fields anywhere

**Expected Result**: Enterprise information is either displayed as read-only or completely hidden for IT Admin. The IT Admin cannot modify enterprise-level settings.

**Edge Cases**:
- [ ] The Enterprise section is wrapped in a `PermissionGate` with `MANAGE_ENTERPRISE_SETTINGS`. IT Admin should not have this permission.

**Pass Criteria**: Enterprise fields are either read-only or completely hidden from IT Admin.

---

### IT-06: Delete and Update Existing Pickup Locations
**Portal**: IT Admin > Settings > Pickup Locations section
**Pre-conditions**: At least one pickup location exists for the IT Admin's branch.

**Steps -- Test Update:**
1. Navigate to Sidebar > Settings (`/admin/settings`)
2. Scroll to the "Pickup Locations" section
3. - [ ] Verify existing pickup locations are listed with their name, address, city, state, and operating hours
4. Click the edit (pencil) icon on an existing pickup location
5. - [ ] Verify the form populates with the current location details
6. Change the location name (e.g., append " - Updated")
7. Click Save / Update
8. - [ ] Verify a success toast appears: "Location updated"
9. - [ ] Verify the updated name is reflected in the list immediately

**Steps -- Test Delete:**
10. Click the delete (trash) icon on a pickup location
11. - [ ] Verify a confirmation prompt or dialog appears before deletion
12. Confirm the deletion
13. - [ ] Verify a success toast appears: "Location deleted"
14. - [ ] Verify the location is removed from the list
15. - [ ] Verify the total location count decreases

**Expected Result**: Both update and delete operations work for existing pickup locations.

**Edge Cases**:
- [ ] Try deleting the default/starred pickup location: verify appropriate handling (may show a warning or prevent deletion)
- [ ] Try setting a location as default (star icon): verify it works and the previous default is unstarred
- [ ] Try updating a location with empty required fields (e.g., blank name): verify validation prevents save

**Pass Criteria**: Edit and delete buttons are functional and produce correct results with toast confirmations.

---

### IT-07: Opening/Closing Days and Hours in Location Form
**Portal**: IT Admin > Settings > Pickup Locations > Add Location
**Pre-conditions**: None

**Steps**:
1. Navigate to Settings > Pickup Locations section
2. Click the "Add" or "+" button to add a new location
3. Examine the form fields:
4. - [ ] Verify an "Operating Days" dropdown field exists with these options:
   - Monday - Friday
   - Monday - Saturday
   - Sunday - Saturday (All Days)
   - Custom
5. - [ ] Verify an "Opening Time" dropdown field exists
6. - [ ] Verify a "Closing Time" dropdown field exists
7. Click the Opening Time dropdown:
8. - [ ] Verify it shows 30-minute interval time options starting from 6:00 AM
9. - [ ] Verify options go up to 10:00 PM (22:00)
10. - [ ] Verify format shows AM/PM labels (e.g., "9:00 AM", "1:30 PM")
11. Select "Monday - Friday" for operating days
12. Select "9:00 AM" for opening time
13. Select "6:00 PM" for closing time
14. Fill in other required fields: name, address, city, state, pincode
15. Save the location
16. - [ ] Verify the saved location appears in the list with operating hours shown

**Expected Result**: Location form includes operating days (dropdown) and opening/closing hours (time dropdowns with 30-min intervals from 6AM-10PM).

**Edge Cases**:
- [ ] Select "Custom" for operating days: verify what custom UI appears (may show individual day toggles)
- [ ] Leave operating days/hours empty: verify the form still saves (they may be optional)

**Pass Criteria**: Operating days and hours fields are present with correct dropdown options.

---

### IT-08: Pickup Location Form Uses Dropdowns
**Portal**: IT Admin > Settings > Pickup Locations > Add Location
**Pre-conditions**: None

**Steps**:
1. Navigate to Settings > Pickup Locations > Add new location
2. Examine each form field type:
3. - [ ] "Operating Days" uses a **dropdown** selector (verified in IT-07)
4. - [ ] "Opening Time" uses a **dropdown** with time options (verified in IT-07)
5. - [ ] "Closing Time" uses a **dropdown** with time options (verified in IT-07)
6. - [ ] "State" uses a **dropdown** selector with Indian states (NOT a free-text input)
7. - [ ] "City" uses a text input (acceptable since cities vary) or a dropdown if available
8. Free-text inputs should be limited to: Location Name, Address/Street line, Pincode/ZIP, Contact details
9. Click each dropdown to confirm they open and display selectable options
10. - [ ] Verify all dropdowns have a default placeholder option (e.g., "Select...", "Choose operating days...")

**Expected Result**: Structured fields (state, operating days, times) use dropdown selectors instead of free-text inputs.

**Pass Criteria**: Key fields use dropdowns. State field is specifically NOT a free-text input.

---

### IT-09: Bulk Action Card Layout with X Close Button
**Portal**: IT Admin > Assets
**Pre-conditions**: At least 2 assets exist.

**Steps**:
1. Navigate to Sidebar > Assets (`/admin/assets`)
2. Select multiple assets using checkboxes (click on individual asset checkboxes or use a select-all control)
3. - [ ] Verify a bulk action bar/card appears at the top or bottom of the list
4. - [ ] Verify the bulk action bar is on a **single horizontal line** (actions side by side, NOT stacked vertically)
5. - [ ] Verify action buttons are visible (e.g., "Assign to Employee", "Add to Batch", "Delete")
6. - [ ] Verify an **X (close) button** appears in the **top-right corner** of the action bar
7. Click the X button
8. - [ ] Verify the bulk action bar closes/dismisses
9. - [ ] Verify the asset selections are cleared (checkboxes unchecked)

**Expected Result**: Bulk action bar displays in a single horizontal line with action buttons and a close (X) button in the top-right corner.

**Edge Cases**:
- [ ] Select only 1 asset: verify the bulk action bar still appears
- [ ] On narrow browser width: verify the bar remains usable (may wrap but all buttons accessible)

**Pass Criteria**: Horizontal layout with X close button. Bar dismisses on X click.

---

### IT-10: Employee Dropdown in Asset Creation Filters by Branch
**Portal**: IT Admin > Assets > Add Asset
**Pre-conditions**: IT Admin must be assigned to **multiple branches**. Employees must exist in different branches (e.g., some in Branch A, some in Branch B).

**Steps**:
1. Navigate to Sidebar > Assets > click "Add Asset" (`/admin/assets/add`)
2. If multiple branches exist, a branch selector appears
3. Select **Branch A** from the branch selector
4. Scroll to the "Assign to Employee" dropdown (EmployeeSelector component)
5. Click to open the employee dropdown
6. - [ ] Verify ONLY employees belonging to Branch A appear in the dropdown list
7. - [ ] Verify employees from Branch B or other branches do NOT appear
8. Note the employee names shown
9. Go back and change the branch selection to **Branch B**
10. Open the employee dropdown again
11. - [ ] Verify the employee list now shows ONLY employees from Branch B
12. - [ ] Verify the previously shown Branch A employees are gone

**Expected Result**: The EmployeeSelector filters employees based on the `branchId` prop, which is set from the currently selected branch.

**Edge Cases**:
- [ ] Select a branch with zero employees: verify the dropdown shows "No employees yet" empty state
- [ ] Click "Add New Employee" in the dropdown: verify the new employee is created in the selected branch
- [ ] With no branch selected (if allowed): verify all employees appear or the form blocks until branch is selected

**Pass Criteria**: Employee dropdown content changes when branch selection changes, showing only branch-specific employees.

---

### IT-11: Bulk Upload File Selection from Assets Page
**Portal**: IT Admin > Assets > Upload Assets
**Pre-conditions**: None

**Steps**:
1. Navigate to Sidebar > Assets (`/admin/assets`)
2. Click the "Upload" or "Bulk Upload" button at the top of the Assets page
3. - [ ] Verify navigation goes to `/admin/assets/upload` (the UploadAssets page)
4. - [ ] Verify the Upload Assets page loads without errors

**Test branch gating (if applicable):**
5. If the IT Admin has multiple branches and no batch is pre-selected:
   - [ ] Verify a "Select a Branch" warning appears with a branch dropdown
   - [ ] Verify the CSV upload area is **disabled/grayed out** until a branch is selected
   - [ ] Select a branch
   - [ ] Verify the upload area becomes enabled

**Test file selection:**
6. - [ ] Verify there is a file upload zone (drag-and-drop area or file picker button)
7. - [ ] Verify "Download Template" button is present and clickable
8. Click the file upload area or "Choose File" button
9. - [ ] Verify the browser file dialog opens
10. Select a valid CSV file
11. - [ ] Verify the file is accepted and a preview of parsed data appears
12. - [ ] Verify CSV and Excel format support is indicated

**Expected Result**: The bulk upload page is accessible from Assets, file selection works, and branch gating is enforced for multi-branch IT Admins.

**Edge Cases**:
- [ ] Try uploading a non-CSV file (e.g., .pdf or .docx): verify it shows an error or is rejected
- [ ] Try uploading a CSV with missing required columns: verify validation errors are displayed per row
- [ ] Click "Download Template": verify a valid CSV template downloads with columns like serialNumber, brand, model, etc.

**Pass Criteria**: File upload works from the Assets page. Branch gating enforced. File parsing produces a preview.

---

### IT-12: Pickup Filtering and Stats Card in Sync
**Portal**: IT Admin > Pickups
**Pre-conditions**: Have pickup requests in various statuses (pending, scheduled, completed, cancelled, etc.).

**Steps**:
1. Navigate to Sidebar > Pickups (`/admin/pickups`)
2. Review the stats cards at the top of the page
3. - [ ] Verify stats cards show counts for different pickup statuses (e.g., Pending, Scheduled, Completed)
4. Note the counts for each status
5. Apply a status filter (e.g., filter by "Completed")
6. - [ ] Verify the pickup list updates to show ONLY completed pickups
7. - [ ] Verify the number of visible items matches the "Completed" stat card number
8. Clear the filter / select "All"
9. - [ ] Verify all pickups reappear
10. - [ ] Verify stats card counts remain consistent (they reflect the unfiltered totals)

**Expected Result**: Stats cards accurately reflect the total data. Filtering the list produces results consistent with the stat card counts.

**Edge Cases**:
- [ ] Apply a filter that returns 0 results: verify an empty state message appears (not a blank page)
- [ ] Verify stats use server-side data (backend `/dashboard/stats` endpoint), not client-side counts

**Pass Criteria**: Stats and filtered list counts are consistent and accurate.

---

## PORTAL 5: Employee (Check-in)

**Login**: `employee@techcorp.com` / `password123`
**URL**: `/check-in`

---

### EM-01: Progress Bar Reaches "Done" on Terminal Statuses
**Portal**: Employee > Dashboard (`/check-in`)
**Pre-conditions**: The employee must have at least one asset in a **terminal status**: `completed`, `final_accepted`, `final_rejected`, or `payout_pending`. If none exist, an OPS Admin or the system must advance an asset to one of these statuses first.

**Steps**:
1. Log in as Employee and navigate to the Dashboard
2. Scroll to the "Your Submissions" section
3. Find an asset in a terminal status (e.g., `completed` or `final_accepted`)
4. Examine the 4-step progress bar below the asset card:
   - Step 1: **Submitted**
   - Step 2: **Review**
   - Step 3: **Pickup**
   - Step 4: **Done**

**For terminal statuses (completed, final_accepted, final_rejected, payout_pending):**
5. - [ ] Verify ALL 4 progress bar segments are **fully filled** with solid green/lime color
6. - [ ] Verify the "Done" step label is highlighted in green/lime text
7. - [ ] Verify the status message matches the terminal state:
   - `completed`: "Complete!"
   - `final_accepted`: "Approved!"
   - `final_rejected`: "Failed QC"
   - `payout_pending`: "Payout processing"

**For non-terminal statuses (e.g., submitted, remote_review, pickup_requested):**
8. Find an asset in a non-terminal status
9. - [ ] Verify the progress bar is only PARTIALLY filled
10. - [ ] Verify the current step's segment shows a lighter/partial fill (semi-transparent green)
11. - [ ] Verify steps AFTER the current step are unfilled (gray)
12. - [ ] Verify steps BEFORE the current step are fully filled (solid green)

**Expected Result**: Terminal statuses (`completed`, `final_accepted`, `final_rejected`, `payout_pending`) cause all 4 progress segments to be fully filled. The code uses `TERMINAL_ASSET_STATUSES` from `lib/constants.ts` to determine this. Non-terminal statuses show partial progress.

**Edge Cases**:
- [ ] `final_rejected` at step 4: all bars filled + red/error status message "Failed QC"
- [ ] `payout_pending` at step 4: all bars filled + amber status message "Payout processing"
- [ ] `submitted` at step 1: only 1 bar partially filled, steps 2-4 gray
- [ ] `remote_review` at step 2: step 1 full, step 2 partial, steps 3-4 gray
- [ ] `in_transit` at step 3: steps 1-2 full, step 3 partial, step 4 gray

**Pass Criteria**: Terminal statuses show fully-filled 4/4 progress bar. Non-terminal statuses show partial progress matching their step number.

---

## PORTAL 6: Org Admin

**Login**: `orgadmin@techcorp.com` / `password123`
**URL**: `/org-admin`

---

### OR-01: Request Redemption Shows "Coming Soon"
**Portal**: Org Admin > Finance > Credits/Wallet
**Pre-conditions**: None

**Steps**:
1. Navigate to Sidebar > Finance > Credits / Wallet (`/org-admin/credits` or equivalent)
2. Locate the "Request Redemption" button in the page header area
3. - [ ] Verify the button is **disabled** (grayed out styling: slate/gray background, no hover effect)
4. - [ ] Verify a **"Coming Soon"** badge appears ON or immediately next to the button (amber/yellow styled badge text)
5. - [ ] Verify the button text reads "Request Redemption" with the Coming Soon badge
6. Click/tap the button area
7. - [ ] Verify NOTHING happens -- no modal, no API call, no error toast
8. - [ ] Verify there is NO "Access denied" or "Required permission: payout_process" error message

**Expected Result**: The Request Redemption button is disabled with a visible "Coming Soon" amber badge. No error is triggered.

**Edge Cases**:
- [ ] Verify the rest of the credits/wallet page loads normally (balance information, transaction history, etc.)
- [ ] Check the browser console: no JavaScript errors related to permissions or payout_process

**Pass Criteria**: Button disabled with "Coming Soon" badge. Zero errors.

---

### OR-02: Financial Reports Time Range Filter Working
**Portal**: Org Admin > Finance > Reports
**Pre-conditions**: Have some assets with dates spanning different time ranges (ideally some completed with final_price values).

**Steps**:
1. Navigate to Sidebar > Finance > Reports (`/org-admin/reports`)
2. Locate the time range filter buttons at the top right: **Week | Month | Quarter | Year**
3. - [ ] Verify "Month" is selected by default (highlighted with primary color)
4. Note the current metric values:
   - Total Disbursed (green card)
   - Pending Payout (amber card)
   - Assets Processed (blue card)
   - Avg Asset Value (purple card)
5. Click **"Week"**
6. - [ ] Verify the button highlights change (Week is now selected)
7. - [ ] Verify ALL 4 metric values update (they filter by last 7 days)
8. - [ ] Watch the Network tab: verify new API requests fire with date_from/date_to parameters
9. Click **"Quarter"**
10. - [ ] Verify metrics update to reflect last 90 days of data
11. Click **"Year"**
12. - [ ] Verify metrics update to reflect last 365 days of data
13. - [ ] Verify: Year values >= Quarter values >= Month values >= Week values (or equal if no new data between periods)

**Expected Result**: Each time range button triggers server-side date-filtered data fetching. Metrics update accordingly with proper growth percentage calculations.

**Edge Cases**:
- [ ] With no data in the "Week" range: all 4 metrics should show 0 or "0.00L" (no errors, no NaN)
- [ ] Click rapidly between time ranges: verify no stale data appears (previous range's data should not flash)
- [ ] The 6-month trend chart at the bottom should NOT change with the time range filter (it always shows all-time data)

**Pass Criteria**: Time range buttons cause metric values to change via server-side filtering.

---

### OR-03: IT Admin Name in Batch Export (Not Garbled Characters)
**Portal**: Org Admin > Batches > Export
**Pre-conditions**: At least one batch exists with an assigned IT Admin who has a name.

**Steps**:
1. Navigate to Sidebar > Batches (`/org-admin/batches`)
2. Click the **"Export"** button in the page header
3. - [ ] Verify a CSV file downloads immediately
4. Open the downloaded CSV file in a text editor or spreadsheet application
5. Locate the **"it_admin"** column (column header)
6. - [ ] Verify IT Admin names are **readable English names** (e.g., "John Doe", "Priya Sharma")
7. - [ ] Verify NO garbled characters like "Aee" or mojibake encoding artifacts
8. - [ ] Verify NO em-dash replacement characters (---) appear where names should be
9. Check other columns:
10. - [ ] "name" column shows batch names (readable)
11. - [ ] "branch" column shows branch names (from `branchMap` lookup, not UUIDs)
12. - [ ] "asset_count" shows numeric values
13. - [ ] "status" shows readable status values

**Expected Result**: The CSV export uses `adminMap` to resolve IT Admin IDs to names. Names are clean and readable.

**Edge Cases**:
- [ ] Batch with no assigned IT Admin: verify the column shows "---" (em-dash placeholder, not garbled text)
- [ ] IT Admin with non-ASCII characters in name (e.g., accented letters): verify they export correctly or are transliterated cleanly

**Pass Criteria**: IT Admin column shows proper human-readable names.

---

### OR-04: Financial Reports Export Excludes Enterprise DB ID
**Portal**: Org Admin > Finance > Reports
**Pre-conditions**: Have some asset data.

**Steps**:
1. Navigate to Sidebar > Finance > Reports (`/org-admin/reports`)
2. Click the **"Export"** button at the top right
3. - [ ] Verify a CSV file downloads (check the file extension is `.csv`)
4. Open the downloaded CSV file
5. Examine the **column headers**:
6. - [ ] Verify the columns are: `serial_number, brand, model, status, grade, base_price, final_price, created_at, updated_at`
7. - [ ] Verify there is **NO** column named `enterprise_id`, `id`, or `_id`
8. Scan the data rows:
9. - [ ] Verify NO UUID strings (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`) appear in any column

**Now test the quick report exports at the bottom:**
10. Click **"Monthly Statement"** export
11. - [ ] Verify download is CSV with columns: `month, total_disbursed, assets_processed, avg_per_asset`
12. - [ ] Verify NO enterprise_id column
13. Click **"Payout Summary"** export
14. - [ ] Verify columns: `serial_number, brand, model, grade, final_price, completed_at`
15. - [ ] Verify NO enterprise_id column
16. Click **"Enterprise Report"** export
17. - [ ] Verify columns use `enterprise_name` (not `enterprise_id`)

**Expected Result**: No exported CSV contains internal database UUIDs. Enterprise references use names, not IDs.

**Pass Criteria**: Zero internal database IDs in any exported CSV file.

---

### OR-05: Batch Export Shows Batch Name, Not Batch ID
**Portal**: Org Admin > Batches > Export
**Pre-conditions**: At least one batch exists.

**Steps**:
1. Navigate to Sidebar > Batches (`/org-admin/batches`)
2. Click "Export"
3. Open the downloaded CSV
4. Find the **"name"** column
5. - [ ] Verify it shows human-readable batch names (e.g., "Q1 2026 Laptops", "Feb Batch") NOT UUID strings
6. Scan ALL columns:
7. - [ ] Verify NO column contains raw batch UUIDs (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

**Expected Result**: Batch export uses human-readable names for batches and branches, not internal IDs.

**Pass Criteria**: Batch name column shows readable names. No UUIDs anywhere in the file.

---

### OR-06: Asset Listing UI Proper with Consistent Modal
**Portal**: Org Admin > Assets
**Pre-conditions**: At least one asset exists in the enterprise.

**Steps**:
1. Navigate to Sidebar > Assets (`/org-admin/assets`)
2. Examine the asset list table/grid:
3. - [ ] Verify proper column alignment (no overlapping text, adequate spacing between columns)
4. - [ ] Verify the "Status" column and "Branch" column have adequate spacing and do not overlap
5. - [ ] Verify the table design is consistent with other portals (IT Admin assets page)
6. Click on an asset row to open the asset detail
7. - [ ] Verify an asset detail view opens (either a page or modal)
8. - [ ] Verify it shows: serial number, brand, model, status with badge, branch name, pricing info
9. - [ ] Verify the design/layout is consistent with the IT Admin's asset detail modal

**Expected Result**: The Org Admin asset list has clean table layout with proper column spacing. The asset detail view matches the design of other portals.

**Edge Cases**:
- [ ] Test on narrow browser width (1024px): verify the table remains readable with horizontal scroll or responsive adjustments
- [ ] Verify status badges use the same color scheme as IT Admin portal

**Pass Criteria**: Clean table layout. Consistent asset detail design across portals.

---

### OR-07: Batch Status Updates After Payout Processing
**Portal**: Org Admin > Batches
**Pre-conditions**: A batch must have progressed through the full lifecycle including payout processing. This requires OPS Admin to process payouts. If no such batch exists, note this as a data dependency.

**Steps**:
1. Navigate to Sidebar > Batches (`/org-admin/batches`)
2. Find a batch that has had all its assets completed with payouts processed
3. - [ ] Verify the batch status badge shows **"Completed"** (lime green badge)
4. - [ ] Verify the batch is NOT stuck showing "Approved" or "Pickup In Progress" despite payouts being done
5. Click on the batch to view its detail page
6. - [ ] Verify the batch detail also shows the correct status

**If no completed batch exists, test the pipeline:**
7. Check the pipeline stat cards at the top
8. - [ ] Verify the "Completed" stat card shows an accurate count
9. Click on "Completed" to filter
10. - [ ] Verify only completed batches appear

**Expected Result**: Batch status correctly reflects the lifecycle stage, including updating to "Completed" after payouts.

**Edge Cases**:
- [ ] Verify this same fix works on the IT Admin batches page (same underlying batch status data)

**Pass Criteria**: Batch status accurately reflects the current lifecycle state.

---

### OR-08: Dispute KPI Cards Showing Data
**Portal**: Org Admin > Disputes
**Pre-conditions**: At least one dispute should exist in the system. If none exist, create one through the dispute flow first.

**Steps**:
1. Navigate to Sidebar > Disputes (`/org-admin/disputes`)
2. Locate the KPI stat grid at the top of the page (4 cards):
   - Total Disputes
   - Pending
   - Upheld
   - Overturned
3. - [ ] Verify "Total Disputes" shows a number (non-zero if disputes exist)
4. - [ ] Verify "Pending" shows the count of unresolved/open disputes
5. - [ ] Verify "Upheld" shows the count of resolved-upheld disputes
6. - [ ] Verify "Overturned" shows the count of resolved-overturned disputes
7. - [ ] Verify the values are numbers (not NaN, undefined, or blank)
8. Count the disputes in the list below
9. - [ ] Verify the "Total Disputes" KPI card value is consistent with the list count

**Expected Result**: KPI cards pull data from `dashStats.dispute_total`, `dashStats.dispute_pending`, `dashStats.dispute_upheld`, `dashStats.dispute_overturned` from the backend stats endpoint.

**Edge Cases**:
- [ ] With zero disputes: all cards should show **0** (not blank, NaN, or missing)
- [ ] Click on the "Pending" card: verify it toggles the status filter to show only pending disputes

**Pass Criteria**: KPI cards display real numeric data from the backend.

---

### OR-09: Dispute Status Filter Working
**Portal**: Org Admin > Disputes
**Pre-conditions**: Have disputes in different statuses (pending/open, upheld, overturned, partial). If all disputes are in one status, at minimum test filtering to a status with 0 results.

**Steps**:
1. Navigate to Sidebar > Disputes (`/org-admin/disputes`)
2. Locate the status filter dropdown (with options: All Status, Pending, Upheld, Overturned, Partial)
3. Note the total number of disputes listed
4. Select **"Pending"** from the dropdown
5. - [ ] Verify only pending/open disputes appear
6. - [ ] Watch the Network tab: verify a new API request fires with status parameters (server-side filtering)
7. - [ ] Verify the filtered list count matches the "Pending" KPI card value
8. Select **"Upheld"**
9. - [ ] Verify only upheld disputes appear
10. Select **"All Status"**
11. - [ ] Verify all disputes reappear
12. Select **"Overturned"**
13. - [ ] Verify only overturned disputes appear

**Expected Result**: The status filter uses server-side filtering. The backend maps display statuses to API parameters: "pending" -> `status=open`, "upheld" -> `status=resolved&resolution=upheld`, etc.

**Edge Cases**:
- [ ] Select a status with 0 results: verify "No disputes found" empty state appears (not blank page)
- [ ] Combine status filter with search text: verify both filters work together (search is client-side for this page)
- [ ] Combine status filter with branch filter: verify all three work together

**Pass Criteria**: Each status filter option produces correct filtered results via server-side API calls.

---

### OR-10: Bulk Employee Upload Requires Branch Selection
**Portal**: Org Admin > Employees > Bulk Upload
**Pre-conditions**: The enterprise must have **multiple active branches**.

**Steps**:
1. Navigate to Sidebar > Employees > click "Bulk Upload" button
2. Verify the page loads (`/org-admin/employees/upload`)
3. **Before selecting a branch:**
4. - [ ] Verify a "Branch Pre-Selection" section appears with a branch dropdown
5. - [ ] Verify an amber warning note appears: "Please select a branch above before downloading the template or uploading employees"
6. - [ ] Verify the CSV upload component below is **grayed out / disabled** (50% opacity, pointer-events disabled)
7. - [ ] Try clicking on the upload zone or "Download Template" button: verify they do NOT respond
8. **Select a branch:**
9. Select a branch from the dropdown
10. - [ ] Verify the amber warning disappears
11. - [ ] Verify the CSV upload component becomes **fully opaque and interactive**
12. - [ ] Verify "Download Template" is now clickable
13. Click "Download Template"
14. - [ ] Verify the template CSV downloads with correct columns (email, name, phone, department, branch_code)

**Expected Result**: For Org Admin with multiple branches, branch selection is required before the upload component is accessible.

**Edge Cases**:
- [ ] For IT Admin with a single branch: verify the branch auto-selects and a blue info note appears stating "All employees will be assigned to branch: [Branch Name]"
- [ ] For IT Admin with multiple branches: verify branch selection is shown but may not be strictly required (different behavior than Org Admin)
- [ ] De-select the branch (if possible): verify the upload area becomes disabled again

**Pass Criteria**: Upload area is gated behind branch selection. Warning message is visible. Template download is blocked until branch is selected.

---

### OR-11: Batch Listing Shows Expected Value
**Portal**: Org Admin > Batches
**Pre-conditions**: At least one batch exists with assets that have `base_price` or `final_price` values set.

**Steps**:
1. Navigate to Sidebar > Batches (`/org-admin/batches`)
2. Examine the batch listing cards
3. For each batch that has valued assets:
4. - [ ] Verify a **value amount in INR** appears on the batch card (e.g., "22K", "1.5L")
5. - [ ] Verify this value uses the format `Rs.XXK` or `Rs.X.XL` (thousands/lakhs)
6. - [ ] Verify the value represents either `batch.estimated_value` or the sum of asset `final_price`/`base_price`
7. Check the page header/subtitle
8. - [ ] Verify the total pipeline value is shown (e.g., "XX batches --- Rs.X.XL total pipeline")

**Test with branch filter:**
9. Select a specific branch from the branch filter dropdown
10. - [ ] Verify the pipeline stats at the top **update to reflect only the selected branch's batch values**
11. - [ ] Verify the subtitle total value updates accordingly

**Expected Result**: Each batch card shows its estimated/actual value. The pipeline stats show aggregate values. Both respond to branch filtering.

**Edge Cases**:
- [ ] Batch with zero-value assets: the value label may not appear (no "Rs.0K" shown) -- this is acceptable
- [ ] Verify the value display uses `batch.estimated_value` first, then falls back to sum of asset prices (`batchAssetValues`)

**Pass Criteria**: Batch value is visible on cards. Stats reflect total pipeline value. Branch filter updates stats.

---

### OR-12: Bulk Upload Catches Duplicate Emails Upfront
**Portal**: Org Admin (or IT Admin) > Employees > Bulk Upload
**Pre-conditions**: At least one employee already exists in the enterprise. Note their email address for testing.

**Steps**:
1. Navigate to Employees > Bulk Upload
2. Select a branch (if required per OR-10)
3. Prepare a test CSV file with:
   - Row 1: A new unique email (e.g., `newuser@test.com`)
   - Row 2: An email that **already exists** in the enterprise (e.g., `employee@techcorp.com`)
   - Row 3: Another new unique email
4. Upload the CSV file
5. **Validation phase (BEFORE clicking the final Upload button):**
6. - [ ] Verify the parsing step displays a preview of all rows
7. - [ ] Verify the row with the duplicate email shows a **red error indicator**
8. - [ ] Verify the error message says something like "Email already exists in this enterprise" or "Duplicate email"
9. - [ ] Verify the error appears as an **inline validation error on the specific row**, not as a generic toast after upload
10. - [ ] Verify the Upload button shows the count (e.g., "Upload 2 valid" with the error count noted)
11. - [ ] Verify the Upload button may still be clickable (to upload the valid rows) but the error rows are clearly excluded

**Expected Result**: The CSVUserUpload component validates emails against existing enterprise users during the parsing phase. Duplicate emails are flagged upfront with inline row-level errors.

**Edge Cases**:
- [ ] Two rows in the CSV with the **same new email** (CSV-internal duplicate): verify this is also flagged
- [ ] Fix the duplicate by editing or removing the row in the preview: verify the error count updates and upload can proceed
- [ ] All rows have errors: verify the Upload button is disabled or shows "0 valid"

**Pass Criteria**: Duplicate email detection happens during CSV parsing, before the upload API call. Errors are shown inline per row.

---

### OR-13: Unassigning IT Admin from Branch Working
**Portal**: Org Admin > enterprise/branch management
**Pre-conditions**: An IT Admin is assigned to at least two branches.

**Steps**:
1. Navigate to the branch management area where IT Admin branch assignments are managed (e.g., Enterprise Detail > Branch > IT Admins, or Settings > Branch Management)
2. Find the IT Admin who is assigned to multiple branches
3. Click to unassign the IT Admin from one specific branch (remove branch assignment)
4. - [ ] Verify the unassignment API call succeeds with a success toast
5. - [ ] Verify the IT Admin is **removed** from that branch's user listing
6. - [ ] Verify the IT Admin **still appears** under their other assigned branch(es)
7. Navigate to the other branch(es)
8. - [ ] Verify the IT Admin is still listed as assigned there

**Expected Result**: Unassigning an IT Admin from a branch removes only that specific branch assignment. Other branch assignments remain intact. The fix involved sending `null` (not `undefined`) for the branch_id on the frontend, and the backend handles bidirectional sync.

**Edge Cases**:
- [ ] Unassign from the IT Admin's LAST branch: verify appropriate behavior (may prevent this, show warning, or succeed)
- [ ] After unassignment, check the IT Admin's Settings page (login as IT Admin): verify the branch dropdown no longer includes the removed branch

**Pass Criteria**: Branch unassignment succeeds cleanly. IT Admin remains assigned to other branches.

---

### OR-14: Branch Detail Click Filters Employees/Assets by Branch
**Portal**: Org Admin > Branch details
**Pre-conditions**: Multiple branches exist with employees and assets in each.

**Steps**:
1. Navigate to a branch detail view or branch cards (where employee/asset counts per branch are shown)
2. Click on a branch's **"Employees"** count or link
3. - [ ] Verify navigation goes to the Employees page with `?branch=<branch-uuid>` in the URL
4. - [ ] Verify the Employees page loads with the branch filter **pre-selected** in the dropdown
5. - [ ] Verify ONLY employees from that specific branch are displayed
6. - [ ] Verify the stats grid reflects the branch-scoped data

7. Go back and click on the branch's **"Assets"** count or link
8. - [ ] Verify navigation goes to the Assets page with `?branch=<branch-uuid>` in the URL
9. - [ ] Verify the Assets page loads with the branch filter pre-applied
10. - [ ] Verify only assets from that branch are displayed

**Expected Result**: Clicking employee/asset counts from branch details navigates to the respective list page with `?branch=<id>` URL parameter, which is read by the page component and used to pre-set the branch filter.

**Edge Cases**:
- [ ] Remove the `?branch=` parameter from the URL manually: verify the filter resets to "All Branches" and all items appear
- [ ] Verify the branch dropdown on the Employees/Assets page reflects the URL parameter (shows the correct branch selected)

**Pass Criteria**: Branch-specific navigation pre-filters the target list page via URL parameter.

---

### OR-15: Batches Filtered by Branch with Branch-Specific Stats
**Portal**: Org Admin > Batches
**Pre-conditions**: Batches exist across multiple branches with assets.

**Steps**:
1. Navigate to Sidebar > Batches (`/org-admin/batches`)
2. Note the pipeline stats (Draft, Pending Approval, Approved, Pickup, Completed, Rejected) and total pipeline value in the subtitle
3. Select a specific branch from the branch filter dropdown (next to the search bar)
4. - [ ] Verify the batch list updates to show ONLY batches from the selected branch
5. - [ ] Verify the 6 pipeline stat cards **UPDATE to reflect only the selected branch's data**
6. - [ ] Verify the subtitle value (total pipeline) updates to reflect the branch-specific total
7. - [ ] Watch the Network tab: verify new API requests fire with `branch_id` parameter (server-side filtering)
8. Select a different branch
9. - [ ] Verify the data changes to reflect the new branch
10. Select **"All Branches"**
11. - [ ] Verify all batches reappear with the global/unfiltered stats

**Expected Result**: Branch filter applies server-side to both the batch list AND the pipeline stat cards. When filters are active, stats are computed from the loaded batch data; when no filters, stats use the global dashboard stats.

**Edge Cases**:
- [ ] Select a branch with zero batches: all 6 stat cards should show 0, empty state message in the list
- [ ] Combine branch filter with search: type a batch name with branch selected, verify both filters apply
- [ ] Combine branch filter with status click (click a pipeline stat card): verify all three filtering dimensions work together

**Pass Criteria**: Branch filter updates both batch list AND pipeline stats simultaneously via server-side filtering.

---

## PORTAL 7: Super Admin

**Login**: `superadmin@ecotribe.io` / `password123`
**URL**: `/super`

---

### SA-01: Dashboard Stats and User Counts Accurate
**Portal**: Super Admin > Dashboard
**Pre-conditions**: The platform has at least one enterprise, some users, and some admin users.

**Steps**:
1. Navigate to the Dashboard (`/super`)
2. Locate the stat grid with 3 cards:
   - **Total Enterprises** (blue icon)
   - **Total Users** (green icon)
   - **Platform Admins** (lime icon)
3. - [ ] Verify "Total Enterprises" shows a number matching the enterprise count
4. - [ ] Verify "Total Users" shows a number representing all users across all roles
5. - [ ] Verify "Platform Admins" shows the count of super_admin + main_admin (OPS Admin) users

**Cross-verify:**
6. Click on "Total Enterprises" stat card
7. - [ ] Verify navigation to `/super/enterprises`
8. - [ ] Verify the enterprise count on the list page is consistent with the Dashboard number
9. Go back to Dashboard. Click "Total Users"
10. - [ ] Verify navigation to `/super/users`
11. - [ ] Verify the user count is consistent
12. Check the "Admin Users" table on the Dashboard
13. - [ ] Verify the number of rows matches the "Platform Admins" stat card value
14. - [ ] Verify each admin shows: name, email, role badge, and status

**Expected Result**: Dashboard stats use efficient backend COUNT queries (`useDashboardStats` hook with keys like `enterprise_count`, `user_count`, `admin_count`). Values are accurate and clickable for navigation.

**Edge Cases**:
- [ ] Create a new OPS Admin via the "+" button: verify "Platform Admins" count increments after creation
- [ ] Verify stat labels match their values (not swapped or mismatched)

**Pass Criteria**: All 3 stats are accurate, consistent with detail pages, and update when data changes.

---

### SA-02: QC Filters Work Server-Side
**Portal**: Super Admin > QC Queue (Review page)
**Pre-conditions**: Have assets in QC/review statuses from multiple enterprises.

**Steps**:
1. Navigate to the QC Queue page (may be under Review or QC in the sidebar)
2. - [ ] Verify the QC queue loads with review items
3. If there is an **enterprise filter** dropdown:
4. Open browser DevTools > Network tab
5. Select a specific enterprise from the dropdown
6. - [ ] Verify a **new API request** fires in the Network tab with an enterprise parameter (e.g., `?enterprise_id=xxx`)
7. - [ ] Verify the list filters to show ONLY items from that enterprise
8. - [ ] Verify items from other enterprises are NOT shown
9. Select "All Enterprises" or clear the filter
10. - [ ] Verify a new API request fires without the enterprise filter
11. - [ ] Verify all items reappear

**Expected Result**: Enterprise filtering uses server-side parameters (not client-side `.filter()`). This ensures performance at scale.

**Edge Cases**:
- [ ] With a large number of review items, verify the response time is acceptable (server-side filtering should be fast)
- [ ] Verify pagination works correctly with the enterprise filter applied

**Pass Criteria**: Network requests confirm server-side filtering. Results match the selected enterprise.

---

### SA-03: Dispute KPI Cards Showing Data
**Portal**: Super Admin > Disputes
**Pre-conditions**: At least one dispute exists in the system.

**Steps**:
1. Navigate to the Disputes page (accessible from Super Admin sidebar or via a disputes route)
2. Locate the KPI stat cards at the top
3. - [ ] Verify "Total Disputes" shows a number (matches dispute count)
4. - [ ] Verify "Pending" shows pending dispute count
5. - [ ] Verify "Upheld" shows upheld count
6. - [ ] Verify "Overturned" shows overturned count
7. - [ ] Verify the "Can Dispute" card shows the count of rejected assets that can be disputed
8. - [ ] Verify NO card shows NaN, undefined, or blank

**Expected Result**: KPI cards display data from `dashStats.dispute_total`, `dashStats.dispute_pending`, etc.

**Edge Cases**:
- [ ] With zero disputes: all cards show 0 (not blank)
- [ ] The Super Admin disputes page uses the same `DisputeList` component as IT Admin/Org Admin, so the fix applies platform-wide

**Pass Criteria**: KPI cards show real numeric data.

---

### SA-04: Analytics Export Produces CSV, Not JSON
**Portal**: Super Admin > Analytics
**Pre-conditions**: None

**Steps**:
1. Navigate to Sidebar > Analytics (`/super/analytics`)
2. - [ ] Verify the Analytics page loads with 4 stat cards: Total Enterprises, Total Users, Total Assets, Total Revenue
3. Locate the **"Export Report"** button at the top right
4. Click "Export Report"
5. - [ ] Verify a file downloads automatically
6. Check the downloaded file:
7. - [ ] Verify the filename follows the pattern `ecotribe-analytics-YYYY-MM-DD.csv`
8. - [ ] Verify the file extension is `.csv` (**NOT** `.json`)
9. Open the file in a text editor:
10. - [ ] Verify the first line is a header row: `metric,value`
11. - [ ] Verify the content is comma-separated values (CSV format)
12. - [ ] Verify it is NOT JSON (no `{`, `}`, `[`, `]` as data structure markers)
13. - [ ] Verify the data rows include:
    - Total Enterprises
    - Active Enterprises
    - Inactive Enterprises
    - Pending Approvals
    - Total Users
    - Total Assets
    - Total Revenue
14. Open in a spreadsheet application (Excel/Google Sheets):
15. - [ ] Verify 2 columns appear: "metric" and "value"
16. - [ ] Verify values match what is displayed on the Analytics page

**Expected Result**: The export uses `Papa.unparse()` (papaparse library) to generate CSV. The file downloads as `.csv` with proper content.

**Edge Cases**:
- [ ] Verify the revenue value is a raw number in the CSV (not formatted as "Rs.X,XX,XXX")
- [ ] Verify the browser MIME type of the download is `text/csv` (check via DevTools Network tab if needed)

**Pass Criteria**: File is `.csv` with valid CSV content. Not JSON.

---

## PORTAL 8: Cross-Portal

---

### CP-01: EPR Certificate Push from OPS Admin to Org Admin
**Portal**: OPS Admin (`/ops`) AND Org Admin (`/org-admin`)

**Part 1 -- OPS Admin Side:**
**Login**: `opsadmin@ecotribe.io` / `password123`

**Steps**:
1. Log in as OPS Admin
2. Navigate to the EPR Certificate management page (may be under Compliance, Certificates, or a dedicated EPR section)
3. Find or create an EPR certificate associated with TechCorp enterprise
4. - [ ] Verify the certificate detail shows certificate information (number, date, enterprise)
5. Locate a **"Push to Enterprise"** or **"Send"** action button
6. - [ ] Verify the push/send button is present and clickable
7. Click the Push/Send button
8. - [ ] Verify a confirmation dialog or toast appears
9. Confirm the action
10. - [ ] Verify a success toast appears (e.g., "Certificate sent to enterprise")
11. - [ ] Verify the certificate's status/state updates to indicate it has been pushed

**Part 2 -- Org Admin Side:**
**Login**: `orgadmin@techcorp.com` / `password123`

12. Log out of OPS Admin and log in as Org Admin
13. Navigate to the EPR Certificates section (look in Finance, Compliance, or Certificates sidebar item)
14. - [ ] Verify the pushed certificate appears in the Org Admin's certificate list
15. - [ ] Verify the certificate details are visible (certificate number, date, issuing details)
16. - [ ] Verify the certificate can be viewed or downloaded

**Expected Result**: OPS Admin can push EPR certificates to enterprises. The certificate then appears in the Org Admin's portal for viewing/download.

**Edge Cases**:
- [ ] Push the same certificate a second time: verify appropriate handling (prevent duplicate or show "already sent")
- [ ] Check if the certificate appears immediately in Org Admin portal (may require a page refresh)
- [ ] Verify the certificate data is complete (no missing fields after the push)

**Pass Criteria**: Certificate is visible in Org Admin portal after being pushed by OPS Admin.

---

## Technical Reference (Source Code Derived)

The following details are extracted directly from the fixed source files and should be used to verify implementation correctness during testing.

### EM-01: Terminal Statuses (src/lib/constants.ts)
```typescript
export const TERMINAL_ASSET_STATUSES = [
  'completed',
  'final_accepted',
  'final_rejected',
  'payout_pending',
] as const;
```
The progress bar must render Step 4 "Done" for all four of these statuses. Any status NOT in this list must NOT show Step 4 as active.

### LA-03 / LA-04: Dashboard KPI Card Navigation Targets (src/pages/logistics-admin/Dashboard.tsx)
```
"Pending Assignment" card → onClick: navigate('/logistics-admin/assignments')
"Scheduled"         card → onClick: navigate('/logistics-admin/assignments')
"Completed"         card → onClick: navigate('/logistics-admin/assignments?status=completed')
"Field Users"       card → onClick: navigate('/logistics-admin/users')   ← FIXED
```

### LA-06: Phone Validation Rule (src/pages/logistics-admin/UserManagement.tsx)
```typescript
const validatePhone = (phone: string): string | null => {
  if (!phone) return null; // optional field
  const digits = phone.replace(/^\+91/, '');
  if (!/^\d{10}$/.test(digits)) return 'Enter a valid 10-digit phone number...';
  return null;
};
```
Valid: `9876543210`, `+919876543210`. Invalid: any other format.

### IT-04 / IT-05: Permission Gates in Settings (src/pages/admin/Settings.tsx)
- Bank section is wrapped in `<PermissionGate permission={Permission.VIEW_PAYOUTS}>` — hidden for IT Admin
- Enterprise edit is wrapped in `<PermissionGate permission={Permission.MANAGE_ENTERPRISE_SETTINGS}>` — hidden for IT Admin

### IT-07 / IT-08: Add Location Form Dropdown Options (src/pages/admin/Settings.tsx)
```typescript
const OPERATING_DAYS_OPTIONS = [
  { value: 'Mon-Fri', label: 'Monday - Friday' },
  { value: 'Mon-Sat', label: 'Monday - Saturday' },
  { value: 'Sun-Sat', label: 'Sunday - Saturday (All Days)' },
  { value: 'Custom', label: 'Custom' },
];
// Time options: 30-min intervals from 06:00 to 22:00 (6:00 AM to 10:00 PM)
```

### OR-02: Financial Reports Time Filter API Behavior (src/pages/org-admin/FinancialReports.tsx)
```typescript
const TIME_RANGE_DAYS = { week: 7, month: 30, quarter: 90, year: 365 };
```
API calls use `date_from` and `date_to` params computed from these day counts. Switching the filter triggers two new `useInfiniteAssets` calls (current period + previous period).

### OR-03: Batch Export CSV Column Order (src/pages/org-admin/EnterpriseBatches.tsx)
```typescript
Papa.unparse(filteredBatches.map(b => ({
  name: b.name,
  status: b.status,
  branch: branchMap.get(b.branch_id || '') || '-',
  it_admin: adminMap.get(b.it_admin_id || '') || '-',   // ← was showing garbled char
  asset_count: batchAssetCounts.get(b.id) || 0,
  estimated_value: b.estimated_value || '',
  created_at: new Date(b.created_at).toLocaleDateString(),
})));
```
The `it_admin` column uses `adminMap` (an `itAdmins` lookup) — if the name is missing, it falls back to the admin's email. Neither case should produce `Äî`.

### OR-04: Financial Report Export (src/pages/org-admin/FinancialReports.tsx)
Main report export columns:
```typescript
{ serial_number, brand, model, status, grade, base_price, final_price, created_at, updated_at }
```
No `enterprise_id` or `id` field. Verify with: `grep -i "enterprise_id\|\" id\"" downloaded_file.csv` — should return zero results.

### OR-08 / OR-09: Dispute Status API Mapping (src/pages/org-admin/EnterpriseDisputes.tsx)
```typescript
const apiFilterMap = {
  pending:    { status: 'open' },
  upheld:     { status: 'resolved', resolution: 'upheld' },
  overturned: { status: 'resolved', resolution: 'overturned' },
  partial:    { status: 'resolved', resolution: 'partial' },
};
```
In DevTools Network tab, selecting "Pending" in the UI should send `status=open` to the API (not `status=pending`).

### OR-10: Bulk Upload Branch Gate Logic (src/pages/admin/BulkUserUpload.tsx)
```typescript
// Upload area is disabled when:
isOrgAdmin && activeBranches.length > 1 && !selectedBranchId
// → className="opacity-50 pointer-events-none"
```
Warning banner is amber; info banner (single branch auto-select) is blue.

### OR-11: Batch Value Display Logic (src/pages/org-admin/EnterpriseBatches.tsx)
```typescript
const batchValue = Number(batch.estimated_value) || batchAssetValues.get(batch.id) || 0;
return batchValue > 0 ? <span>₹{(batchValue / 1000).toFixed(0)}K</span> : null;
```
A batch shows a value only if either `batch.estimated_value` is non-zero OR the sum of its assets' `final_price`/`base_price` is non-zero.

### SA-01: Dashboard Stats Source (src/pages/super/Dashboard.tsx)
```typescript
const statItems = [
  { label: 'Total Enterprises', value: stats.enterprise_count ?? 0 },  // from /stats endpoint
  { label: 'Total Users',       value: stats.user_count ?? 0 },
  { label: 'Platform Admins',   value: stats.admin_count ?? 0 },
];
```
These come from the `useDashboardStats()` hook which calls the backend `/stats` endpoint — NOT computed from loaded entity lists.

### SA-04: Analytics Export Format (src/pages/super/Analytics.tsx)
```typescript
const csv = Papa.unparse(exportData);
const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
a.download = `ecotribe-analytics-${new Date().toISOString().split('T')[0]}.csv`;
```
This confirms the file is CSV (not JSON). The `type` is `text/csv` and the extension is `.csv`.

---

## Test Environment Notes

### General Tips
- Clear browser cache/cookies between portal switches to avoid stale auth tokens
- Use **Incognito/Private** windows for switching between portals quickly (one portal per window)
- Use browser DevTools **Network tab** to verify server-side vs client-side filtering
- Check the browser **Console** for JavaScript errors during each test
- Test in both **light mode** and **dark mode** for UI layout bugs
- Resize the browser window to ~768px width to check responsive behavior

### Data Dependencies
Some tests require specific data states that may not exist after a fresh database seed:
1. **Terminal status asset** for EM-01: Requires an asset to be advanced through the full pipeline
2. **Completed batch** for OR-07: Requires payouts to be processed
3. **Disputes** for OR-08, OR-09, SA-03: Requires filing disputes on rejected assets
4. **Multi-branch IT Admin** for IT-03, IT-10: Requires assigning the test IT Admin to multiple branches

If test data is missing, use the seed script or manually create data:
```bash
cd backend
python seed_test_data.py
```

### Recommended Test Order
1. **Super Admin** first (platform-level, can create data)
2. **OPS Admin** second (can manage enterprises, process reviews)
3. **Org Admin** third (enterprise-level management)
4. **IT Admin** fourth (branch-level operations)
5. **Employee** fifth (needs assets assigned to them)
6. **Logistics Admin** sixth (needs pickup requests)
7. **Logistics User** seventh (needs assignments from logistics admin)
8. **Cross-Portal** last (requires data from multiple portals)

---

## Post-Test Results

After completing all tests, fill in the summary:

| Portal | Total Tests | Passed | Failed | Bug IDs Failed |
|--------|:-----------:|:------:|:------:|----------------|
| Logistics Admin | 6 | | | |
| Logistics User | 1 | | | |
| OPS Admin | 2 | | | |
| IT Admin | 12 | | | |
| Employee | 1 | | | |
| Org Admin | 15 | | | |
| Super Admin | 4 | | | |
| Cross-Portal | 1 | | | |
| **TOTAL** | **42** | | | |

For any failed tests, document:
1. **Bug ID** and test case title
2. **Step number** where failure occurred
3. **Actual behavior** vs **expected behavior**
4. **Screenshot** (if applicable)
5. **Browser console errors** (copy/paste any red errors)
6. **Network tab** details (failed API calls, unexpected responses)
