# ECOTRIBE PLATFORM - COMPREHENSIVE CHANGES REPORT

## For: Claude Code Implementation
## Version: 3.1 Major Restructure
## Priority: HIGH - Architectural Changes

---

# TABLE OF CONTENTS

1. [Role Hierarchy Changes](#1-role-hierarchy-changes)
2. [Enterprise Registration Flow](#2-enterprise-registration-flow)
3. [Org Admin Portal Changes](#3-org-admin-portal-changes)
4. [Branch & Location Structure](#4-branch--location-structure)
5. [IT Admin Management](#5-it-admin-management)
6. [Batch & Pickup Approval Flow](#6-batch--pickup-approval-flow)
7. [Database Schema Changes](#7-database-schema-changes)
8. [UI/UX Improvements](#8-uiux-improvements)
9. [Navigation & Sidebar Changes](#9-navigation--sidebar-changes)
10. [Implementation Order](#10-implementation-order)

---

# 1. ROLE HIERARCHY CHANGES

## Current (Wrong) Hierarchy:
```
IT Admin → CFO → Ops Admin → Super Admin
```

## New (Correct) Hierarchy:
```
┌─────────────────────────────────────────────────────────────┐
│                      SUPER ADMIN                             │
│                   (Ecotribe Platform)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                       OPS ADMIN                              │
│                    (Ecotribe Ops)                            │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                       ORG ADMIN                              │
│              (Enterprise - formerly CFO)                     │
│                          │                                   │
│              ┌───────────┴───────────┐                      │
│              │                       │                       │
│          BRANCH 1               BRANCH 2                     │
│              │                       │                       │
│          IT ADMIN(s)            IT ADMIN(s)                 │
│              │                       │                       │
│          SUB-USERS              SUB-USERS                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Changes Required:

### 1.1 Rename CFO → Org Admin
```
FILES TO UPDATE:
- All database tables: Replace 'cfo' with 'org_admin'
- All API routes: /api/cfo/* → /api/org-admin/*
- All components: CFO* → OrgAdmin*
- All role constants: ROLE_CFO → ROLE_ORG_ADMIN
- Navigation labels: "CFO" → "Org Admin"
- All comments and documentation
```

### 1.2 Update Role Permissions
```javascript
// constants/roles.js
export const ROLES = {
  SUPER_ADMIN: 'super_admin',      // Highest - Ecotribe platform owner
  OPS_ADMIN: 'ops_admin',          // Ecotribe operations
  ORG_ADMIN: 'org_admin',          // Enterprise admin (was CFO)
  IT_ADMIN: 'it_admin',            // Branch-level IT admin
  SUB_USER: 'sub_user',            // Employee with device
  LOGISTICS_ADMIN: 'logistics_admin',
  LOGISTICS_USER: 'logistics_user'
};

export const ROLE_HIERARCHY = {
  super_admin: 4,
  ops_admin: 3,
  org_admin: 2,
  it_admin: 1,
  sub_user: 0
};
```

---

# 2. ENTERPRISE REGISTRATION FLOW

## Current Flow (Broken):
- User clicks "Register Enterprise"
- Immediately shown registration form
- No document guidance
- No approval workflow

## New Flow (Required):

### 2.1 Registration Landing Page

**Route:** `/register/enterprise`

**Step 1: Document Requirements Modal**
```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│              📋 Documents Required for Registration          │
│                                                              │
│  Before proceeding, please ensure you have the following    │
│  documents ready to upload:                                  │
│                                                              │
│  ✓ GST Certificate (PDF/Image)                              │
│  ✓ Company PAN Card (PDF/Image)                             │
│  ✓ Certificate of Incorporation (PDF/Image)                 │
│  ✓ Authorized Signatory ID Proof (PDF/Image)                │
│  ✓ Company Address Proof (PDF/Image)                        │
│                                                              │
│  Optional but recommended:                                   │
│  ○ MSME Certificate (if applicable)                         │
│  ○ Company Logo (PNG/JPG)                                   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ☑ I have all required documents ready              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│            [ Cancel ]        [ Proceed to Registration ]     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Step 2: Registration Form**
```
┌─────────────────────────────────────────────────────────────┐
│                  Register Your Enterprise                    │
│                                                              │
│  COMPANY DETAILS                                             │
│  ─────────────────                                          │
│  Company Legal Name *                                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ e.g., Acme Technologies Private Limited             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  GST Number *                                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ e.g., 29ABCDE1234F1Z5                               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Company PAN *                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ e.g., ABCDE1234F                                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Registered Address *                                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ e.g., 123, Tech Park, Whitefield, Bangalore 560066 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Industry Type *                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Select industry...                              ▼   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Company Size *                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Select employee count range...                  ▼   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ORG ADMIN DETAILS                                          │
│  ─────────────────                                          │
│  Full Name *                                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ e.g., Rajesh Kumar                                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Designation *                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ e.g., Chief Financial Officer                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Email Address *                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ e.g., rajesh.kumar@acmetech.com                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Phone Number *                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ e.g., +91 98765 43210                               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Password *                                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Min 8 characters, 1 uppercase, 1 number, 1 special │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Confirm Password *                                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Re-enter your password                              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│                        [ Next: Upload Documents ]            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Step 3: Document Upload**
```
┌─────────────────────────────────────────────────────────────┐
│                    Upload Documents                          │
│                                                              │
│  GST Certificate *                                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📄 Drop file here or click to upload               │    │
│  │     Accepted: PDF, JPG, PNG (Max 5MB)               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Company PAN Card *                                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📄 Drop file here or click to upload               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Certificate of Incorporation *                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📄 Drop file here or click to upload               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Authorized Signatory ID *                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📄 Drop file here or click to upload               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Address Proof *                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📄 Drop file here or click to upload               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Company Logo (Optional)                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  🖼️ Drop image here or click to upload              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│         [ Back ]                    [ Submit Registration ]  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Step 4: Success Page**
```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                    ✅ Registration Submitted!                │
│                                                              │
│  Thank you for registering your enterprise with Ecotribe.   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │   📋 Your application is under review               │    │
│  │                                                      │    │
│  │   Our team will verify your documents and           │    │
│  │   activate your account within 24-48 hours.         │    │
│  │                                                      │    │
│  │   You will receive an email notification at:        │    │
│  │   rajesh.kumar@acmetech.com                         │    │
│  │                                                      │    │
│  │   Application Reference: ENT-2024-00123             │    │
│  │                                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  What happens next?                                          │
│  1. Our team reviews your documents (24-48 hrs)             │
│  2. You receive approval email with login link              │
│  3. Login and start managing your IT assets                 │
│                                                              │
│  Questions? Contact support@ecotribe.in                     │
│                                                              │
│                      [ Back to Home ]                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Admin Approval Workflow

**Super Admin & Ops Admin receive notification:**
```
┌─────────────────────────────────────────────────────────────┐
│  🔔 New Enterprise Registration                              │
│                                                              │
│  Acme Technologies Private Limited                          │
│  Applied: 15 Jan 2024, 10:30 AM                             │
│  Reference: ENT-2024-00123                                  │
│                                                              │
│  [ Review Application ]                                      │
└─────────────────────────────────────────────────────────────┘
```

**Review Page (Super Admin / Ops Admin):**
```
┌─────────────────────────────────────────────────────────────┐
│  Enterprise Registration Review                              │
│  Reference: ENT-2024-00123                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  COMPANY DETAILS                          STATUS: PENDING    │
│  ─────────────────                                          │
│  Name: Acme Technologies Private Limited                    │
│  GST: 29ABCDE1234F1Z5                                       │
│  PAN: ABCDE1234F                                            │
│  Address: 123, Tech Park, Whitefield, Bangalore 560066      │
│  Industry: Information Technology                           │
│  Size: 201-500 employees                                    │
│                                                              │
│  ORG ADMIN DETAILS                                          │
│  ─────────────────                                          │
│  Name: Rajesh Kumar                                         │
│  Designation: Chief Financial Officer                       │
│  Email: rajesh.kumar@acmetech.com                           │
│  Phone: +91 98765 43210                                     │
│                                                              │
│  UPLOADED DOCUMENTS                                         │
│  ─────────────────                                          │
│  ┌──────────────────────┬──────────┬─────────────────────┐  │
│  │ Document             │ Status   │ Action              │  │
│  ├──────────────────────┼──────────┼─────────────────────┤  │
│  │ GST Certificate      │ Uploaded │ [ View ] [ ✓ ] [ ✗ ]│  │
│  │ PAN Card             │ Uploaded │ [ View ] [ ✓ ] [ ✗ ]│  │
│  │ Incorporation Cert   │ Uploaded │ [ View ] [ ✓ ] [ ✗ ]│  │
│  │ Signatory ID         │ Uploaded │ [ View ] [ ✓ ] [ ✗ ]│  │
│  │ Address Proof        │ Uploaded │ [ View ] [ ✓ ] [ ✗ ]│  │
│  │ Company Logo         │ Uploaded │ [ View ]            │  │
│  └──────────────────────┴──────────┴─────────────────────┘  │
│                                                              │
│  VERIFICATION NOTES                                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Add notes for record...                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────┐  ┌──────────────────┐  ┌──────────────┐   │
│  │   Reject    │  │ Request More Info │  │   Approve    │   │
│  └─────────────┘  └──────────────────┘  └──────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 API Endpoints Required

```javascript
// POST /api/enterprise/register
// Request: { companyDetails, orgAdminDetails, documents[] }
// Response: { success, applicationRef }

// GET /api/admin/enterprise-applications
// Response: { applications[] }

// GET /api/admin/enterprise-applications/:id
// Response: { applicationDetails, documents }

// POST /api/admin/enterprise-applications/:id/approve
// Request: { notes }
// Response: { success }
// Side effects: 
//   - Create enterprise in DB
//   - Create org_admin user
//   - Send approval email with login link

// POST /api/admin/enterprise-applications/:id/reject
// Request: { reason }
// Response: { success }
// Side effects: Send rejection email

// POST /api/admin/enterprise-applications/:id/request-info
// Request: { requestedDocuments[], message }
// Response: { success }
// Side effects: Send email to applicant
```

---

# 3. ORG ADMIN PORTAL CHANGES

## 3.1 Nested Sidebar with IT Admin Toggle

**Org Admin should have access to ALL IT Admin functionality via a toggle, NOT a redirect.**

### Sidebar Structure:
```
┌─────────────────────────────────────────┐
│  🏢 ACME TECHNOLOGIES                   │
│  Org Admin Portal                       │
├─────────────────────────────────────────┤
│                                         │
│  📊 Dashboard                           │
│                                         │
│  🏛️ ORGANIZATION                        │
│     ├─ Branches                         │
│     ├─ IT Admins                        │
│     └─ Settings                         │
│                                         │
│  💰 FINANCE                             │
│     ├─ Credits Wallet                   │
│     ├─ Transactions                     │
│     ├─ Redemptions                      │
│     └─ Reports                          │
│                                         │
│  📜 COMPLIANCE                          │
│     ├─ EPR Certificates                 │
│     └─ Audit Reports                    │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  🔄 IT ADMIN VIEW                [OFF]  │  ← TOGGLE
│                                         │
│  (When ON, shows nested IT Admin menu)  │
│                                         │
└─────────────────────────────────────────┘
```

### When IT Admin Toggle is ON:
```
┌─────────────────────────────────────────┐
│  🏢 ACME TECHNOLOGIES                   │
│  Org Admin Portal                       │
├─────────────────────────────────────────┤
│                                         │
│  📊 Dashboard                           │
│                                         │
│  🏛️ ORGANIZATION                        │
│     ├─ Branches                         │
│     ├─ IT Admins                        │
│     └─ Settings                         │
│                                         │
│  💰 FINANCE                             │
│     ├─ Credits Wallet                   │
│     ├─ Transactions                     │
│     ├─ Redemptions                      │
│     └─ Reports                          │
│                                         │
│  📜 COMPLIANCE                          │
│     ├─ EPR Certificates                 │
│     └─ Audit Reports                    │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  🔄 IT ADMIN VIEW                 [ON]  │  ← TOGGLE
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📦 ASSET MANAGEMENT            │   │
│  │     ├─ All Assets (Nested View) │   │
│  │     ├─ Upload Assets            │   │
│  │     └─ Batches                  │   │
│  │                                 │   │
│  │  👥 SUB-USERS                   │   │
│  │     ├─ All Sub-Users            │   │
│  │     └─ Evaluations              │   │
│  │                                 │   │
│  │  🚚 LOGISTICS                   │   │
│  │     ├─ Pickup Requests          │   │
│  │     ├─ Pickup Locations         │   │
│  │     └─ Tracking                 │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Implementation:
```jsx
// components/OrgAdminSidebar.jsx

const [itAdminViewEnabled, setItAdminViewEnabled] = useState(false);

return (
  <Sidebar>
    {/* Regular Org Admin Menu */}
    <MenuItem icon="dashboard" label="Dashboard" href="/org-admin/dashboard" />
    
    <MenuSection title="ORGANIZATION">
      <MenuItem label="Branches" href="/org-admin/branches" />
      <MenuItem label="IT Admins" href="/org-admin/it-admins" />
      <MenuItem label="Settings" href="/org-admin/settings" />
    </MenuSection>
    
    <MenuSection title="FINANCE">
      <MenuItem label="Credits Wallet" href="/org-admin/wallet" />
      <MenuItem label="Transactions" href="/org-admin/transactions" />
      <MenuItem label="Redemptions" href="/org-admin/redemptions" />
      <MenuItem label="Reports" href="/org-admin/finance-reports" />
    </MenuSection>
    
    <MenuSection title="COMPLIANCE">
      <MenuItem label="EPR Certificates" href="/org-admin/epr" />
      <MenuItem label="Audit Reports" href="/org-admin/audit" />
    </MenuSection>
    
    <Divider />
    
    {/* IT Admin Toggle */}
    <ToggleSwitch
      label="IT ADMIN VIEW"
      icon="refresh"
      checked={itAdminViewEnabled}
      onChange={setItAdminViewEnabled}
    />
    
    {/* Nested IT Admin Menu (shown when toggle ON) */}
    {itAdminViewEnabled && (
      <NestedMenuContainer>
        <MenuSection title="ASSET MANAGEMENT">
          <MenuItem label="All Assets (Nested View)" href="/org-admin/assets" />
          <MenuItem label="Upload Assets" href="/org-admin/assets/upload" />
          <MenuItem label="Batches" href="/org-admin/batches" />
        </MenuSection>
        
        <MenuSection title="SUB-USERS">
          <MenuItem label="All Sub-Users" href="/org-admin/sub-users" />
          <MenuItem label="Evaluations" href="/org-admin/evaluations" />
        </MenuSection>
        
        <MenuSection title="LOGISTICS">
          <MenuItem label="Pickup Requests" href="/org-admin/pickups" />
          <MenuItem label="Pickup Locations" href="/org-admin/locations" />
          <MenuItem label="Tracking" href="/org-admin/tracking" />
        </MenuSection>
      </NestedMenuContainer>
    )}
  </Sidebar>
);
```

## 3.2 Org Admin Nested Asset View

Org Admin should see assets grouped by Branch → IT Admin → Batch:

```
┌─────────────────────────────────────────────────────────────┐
│  All Assets (Organization View)                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🔍 Search: [________________________]  [Filter ▼] [Export] │
│                                                              │
│  ▼ 🏢 BANGALORE HQ (3 IT Admins, 150 Assets)                │
│  │                                                           │
│  │  ▼ 👤 Priya Sharma (IT Admin) - 80 Assets                │
│  │  │                                                        │
│  │  │  ▼ 📦 Batch #B-001 (30 Assets) - Pickup Scheduled     │
│  │  │  │  ├─ Dell Latitude 5520 - ABC123 - Rahul - ✅ Eval  │
│  │  │  │  ├─ HP ProBook 450 - DEF456 - Amit - ✅ Eval       │
│  │  │  │  ├─ Lenovo ThinkPad - GHI789 - Sneha - ⏳ Pending  │
│  │  │  │  └─ ... (27 more)                                   │
│  │  │                                                        │
│  │  │  ▶ 📦 Batch #B-002 (25 Assets) - In Progress          │
│  │  │  ▶ 📦 Batch #B-003 (25 Assets) - Draft                │
│  │  │                                                        │
│  │  ▶ 👤 Amit Singh (IT Admin) - 45 Assets                  │
│  │  ▶ 👤 Neha Gupta (IT Admin) - 25 Assets                  │
│  │                                                           │
│  ▶ 🏢 MUMBAI OFFICE (2 IT Admins, 80 Assets)                │
│  ▶ 🏢 DELHI OFFICE (1 IT Admin, 30 Assets)                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

# 4. BRANCH & LOCATION STRUCTURE

## 4.1 Branch Management (New Feature)

### Branch Entity:
```
Branch belongs to Enterprise
IT Admin belongs to Branch
Assets belong to Branch (via IT Admin/Batch)
```

### Branch Management Page:
```
┌─────────────────────────────────────────────────────────────┐
│  Branches                                    [ + Add Branch ]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🏢 BANGALORE HQ                                [Active] ││
│  │ ─────────────────────────────────────────────────────── ││
│  │ Address: 123 Tech Park, Whitefield, Bangalore 560066    ││
│  │ IT Admins: 3 │ Assets: 150 │ Active Batches: 5          ││
│  │                                                          ││
│  │ Pickup Location: IT Office, Floor 3, Building A          ││
│  │ Contact: Priya Sharma │ +91 98765 43210                  ││
│  │                                                          ││
│  │ [ Edit ] [ Manage IT Admins ] [ View Assets ]           ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🏢 MUMBAI OFFICE                               [Active] ││
│  │ ─────────────────────────────────────────────────────── ││
│  │ Address: 456 Business Center, BKC, Mumbai 400051        ││
│  │ IT Admins: 2 │ Assets: 80 │ Active Batches: 3           ││
│  │                                                          ││
│  │ Pickup Location: Reception, Ground Floor                 ││
│  │ Contact: Amit Singh │ +91 98765 43211                    ││
│  │                                                          ││
│  │ [ Edit ] [ Manage IT Admins ] [ View Assets ]           ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Add/Edit Branch Form:
```
┌─────────────────────────────────────────────────────────────┐
│  Add New Branch                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Branch Name *                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ e.g., Bangalore Headquarters                        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Branch Code *                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ e.g., BLR-HQ (auto-generated, editable)             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Address Line 1 *                                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ e.g., 123, Tech Park, Building A                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Address Line 2                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ e.g., Whitefield                                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  City *                     State *                          │
│  ┌───────────────────┐     ┌───────────────────┐            │
│  │ Bangalore         │     │ Karnataka      ▼  │            │
│  └───────────────────┘     └───────────────────┘            │
│                                                              │
│  PIN Code *                                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ e.g., 560066                                        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  PICKUP LOCATION DETAILS                                     │
│  ───────────────────────                                    │
│  Pickup Point Description *                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ e.g., IT Office, Floor 3, Near Cafeteria            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Site Contact Person *                                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ e.g., Priya Sharma                                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Site Contact Phone *                                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ e.g., +91 98765 43210                               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Operating Hours *                                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ e.g., Mon-Fri, 9:00 AM - 6:00 PM                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Special Instructions                                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ e.g., Visitor pass required at gate, parking in B2  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│              [ Cancel ]              [ Save Branch ]         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

# 5. IT ADMIN MANAGEMENT

## 5.1 Bulk IT Admin Upload

Org Admin can bulk upload IT Admins and assign them to branches.

### Upload Page:
```
┌─────────────────────────────────────────────────────────────┐
│  IT Admin Management                     [ + Add IT Admin ] │
│                                          [ ⬇ Bulk Upload ]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  BULK UPLOAD IT ADMINS                                       │
│  ─────────────────────                                      │
│                                                              │
│  Step 1: Download Template                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  [ ⬇ Download Excel Template ]                      │    │
│  │                                                      │    │
│  │  Template includes columns:                          │    │
│  │  • Full Name (required)                              │    │
│  │  • Email (required)                                  │    │
│  │  • Phone (required)                                  │    │
│  │  • Branch (dropdown - required)                      │    │
│  │  • Employee ID (optional)                            │    │
│  │  • Department (optional)                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Step 2: Upload Filled Template                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │       📄 Drop Excel file here or click to upload    │    │
│  │                                                      │    │
│  │          Supported: .xlsx, .csv (Max 5MB)           │    │
│  │                                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Excel Template Structure:
```
| Full Name      | Email                  | Phone          | Branch       | Employee ID | Department |
|----------------|------------------------|----------------|--------------|-------------|------------|
| Priya Sharma   | priya@acmetech.com     | +919876543210  | Bangalore HQ | EMP001      | IT         |
| Amit Singh     | amit@acmetech.com      | +919876543211  | Mumbai Office| EMP002      | IT         |
| Neha Gupta     | neha@acmetech.com      | +919876543212  | Bangalore HQ | EMP003      | IT         |
```

**Branch column should have dropdown validation with all active branches.**

### Upload Validation Preview:
```
┌─────────────────────────────────────────────────────────────┐
│  Upload Preview                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ✅ 8 Valid    ❌ 2 Errors    ⚠️ 1 Warning                  │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Row │ Name          │ Email              │ Branch │ Status││
│  ├─────┼───────────────┼────────────────────┼────────┼───────┤│
│  │ 2   │ Priya Sharma  │ priya@acme.com     │ BLR-HQ │ ✅    ││
│  │ 3   │ Amit Singh    │ amit@acme.com      │ MUM    │ ✅    ││
│  │ 4   │ Invalid User  │ not-an-email       │ BLR-HQ │ ❌    ││
│  │     │               │ Invalid email format         │      ││
│  │ 5   │ Neha Gupta    │ neha@acme.com      │ DELHI  │ ❌    ││
│  │     │               │ Branch 'DELHI' not found     │      ││
│  │ 6   │ Raj Kumar     │ raj@acme.com       │ BLR-HQ │ ⚠️    ││
│  │     │               │ Email already registered     │      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  [ Download Error Report ]                                   │
│                                                              │
│  ☑ Proceed with 8 valid IT Admins (skip errors)            │
│                                                              │
│              [ Cancel ]        [ Create IT Admin Accounts ]  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 5.2 IT Admin Assignment to Branch

### Reassignment Feature:
```
┌─────────────────────────────────────────────────────────────┐
│  IT Admin: Priya Sharma                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Current Branch: Bangalore HQ                                │
│  Assets Managed: 80                                          │
│  Active Batches: 3                                           │
│                                                              │
│  REASSIGN TO DIFFERENT BRANCH                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Select New Branch:  [ Mumbai Office           ▼ ]   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ⚠️ Warning: This IT Admin has 80 assets and 3 active       │
│     batches. These will be moved to the new branch.         │
│                                                              │
│  What happens on reassignment:                               │
│  • IT Admin's branch tag changes                            │
│  • All their assets move to new branch                      │
│  • All their batches move to new branch                     │
│  • Sub-users remain assigned to their assets                │
│  • Pending pickups need to be rescheduled                   │
│                                                              │
│              [ Cancel ]              [ Reassign IT Admin ]   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

# 6. BATCH & PICKUP APPROVAL FLOW

## 6.1 Remove CFO/Org Admin Verification for Batches

**OLD FLOW (Remove):**
```
IT Admin creates batch → CFO verifies → Ready for pickup
```

**NEW FLOW:**
```
IT Admin creates batch → IT Admin adds assets/users → 
IT Admin fills pickup details → IT Admin sends for approval →
Org Admin approves → Pickup automatically initiated
```

## 6.2 New Batch Workflow

### Batch Statuses:
```javascript
const BATCH_STATUS = {
  DRAFT: 'draft',                    // IT Admin creating/editing
  PENDING_APPROVAL: 'pending_approval', // Sent to Org Admin
  APPROVED: 'approved',              // Org Admin approved, pickup auto-initiated
  PICKUP_SCHEDULED: 'pickup_scheduled', // Logistics assigned
  PICKUP_IN_PROGRESS: 'pickup_in_progress',
  PICKED_UP: 'picked_up',
  WAREHOUSE_QC: 'warehouse_qc',
  COMPLETED: 'completed',
  REJECTED: 'rejected'               // Org Admin rejected
};
```

### IT Admin Batch View:
```
┌─────────────────────────────────────────────────────────────┐
│  Batch: #B-2024-00123                        Status: DRAFT  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  BATCH DETAILS                                               │
│  ─────────────                                              │
│  Branch: Bangalore HQ                                        │
│  Created: 15 Jan 2024                                        │
│  Assets: 30                                                  │
│  Evaluations: 25 Complete, 5 Pending                         │
│                                                              │
│  ASSETS IN BATCH                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Serial      │ Device          │ Employee │ Eval Status  ││
│  ├─────────────┼─────────────────┼──────────┼──────────────┤│
│  │ ABC123      │ Dell Latitude   │ Rahul    │ ✅ Complete  ││
│  │ DEF456      │ HP ProBook      │ Amit     │ ✅ Complete  ││
│  │ GHI789      │ Lenovo ThinkPad │ Sneha    │ ⏳ Pending   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  [ Add Assets ] [ Remove Selected ] [ Send Reminders ]       │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  ⚠️ 5 evaluations pending. You can still submit for         │
│     approval, but only completed evaluations will be        │
│     included in the pickup.                                  │
│                                                              │
│                    [ Submit for Pickup Approval → ]          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Submit for Approval - Pickup Details Form:
```
┌─────────────────────────────────────────────────────────────┐
│  Submit Batch for Pickup Approval                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  BATCH SUMMARY                                               │
│  Batch: #B-2024-00123                                        │
│  Total Assets: 30                                            │
│  Ready for Pickup: 25 (evaluations complete)                 │
│  Not Ready: 5 (evaluations pending - will be excluded)       │
│                                                              │
│  PICKUP DETAILS                                              │
│  ──────────────                                             │
│                                                              │
│  Pickup Location *                                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Bangalore HQ - IT Office, Floor 3              ▼    │    │
│  └─────────────────────────────────────────────────────┘    │
│  (Pre-filled from branch, can change)                        │
│                                                              │
│  Preferred Pickup Date *                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 📅  20 Jan 2024                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Preferred Time Slot *                                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ○ Morning (9 AM - 12 PM)                            │    │
│  │ ● Afternoon (12 PM - 4 PM)                          │    │
│  │ ○ Evening (4 PM - 7 PM)                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Priority                                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ○ Normal                                            │    │
│  │ ○ Urgent (additional charges may apply)             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Notes for Org Admin                                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ e.g., End of quarter asset refresh, please approve  │    │
│  │ by tomorrow...                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Special Instructions for Logistics                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ e.g., Contact security desk on arrival, large       │    │
│  │ vehicle parking available in basement...            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ☑ I confirm all 25 devices are ready for pickup            │
│  ☑ I understand pending evaluations will be excluded        │
│                                                              │
│          [ Cancel ]          [ Submit for Org Admin Approval ]│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Org Admin Approval View:
```
┌─────────────────────────────────────────────────────────────┐
│  Pickup Approval Requests                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🔔 NEW APPROVAL REQUEST                                 ││
│  │                                                          ││
│  │ Batch: #B-2024-00123                                     ││
│  │ Branch: Bangalore HQ                                     ││
│  │ IT Admin: Priya Sharma                                   ││
│  │ Submitted: 15 Jan 2024, 3:45 PM                          ││
│  │                                                          ││
│  │ Assets: 25 ready for pickup                              ││
│  │ Requested Date: 20 Jan 2024, Afternoon                   ││
│  │                                                          ││
│  │ IT Admin Notes:                                          ││
│  │ "End of quarter asset refresh, please approve by         ││
│  │  tomorrow."                                              ││
│  │                                                          ││
│  │           [ View Details ]  [ Reject ]  [ ✓ Approve ]   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Org Admin Approval Detail View:
```
┌─────────────────────────────────────────────────────────────┐
│  Approve Pickup Request                                      │
│  Batch: #B-2024-00123                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  BATCH DETAILS                                               │
│  Branch: Bangalore HQ                                        │
│  IT Admin: Priya Sharma                                      │
│  Created: 15 Jan 2024                                        │
│                                                              │
│  PICKUP DETAILS                                              │
│  Location: IT Office, Floor 3, Building A                    │
│  Date: 20 Jan 2024                                           │
│  Time: Afternoon (12 PM - 4 PM)                              │
│  Priority: Normal                                            │
│                                                              │
│  ASSETS (25)                                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Serial      │ Device          │ Employee │ Est. Value   ││
│  ├─────────────┼─────────────────┼──────────┼──────────────┤│
│  │ ABC123      │ Dell Latitude   │ Rahul    │ ~₹15,000     ││
│  │ DEF456      │ HP ProBook      │ Amit     │ ~₹12,000     ││
│  │ ...         │ ...             │ ...      │ ...          ││
│  ├─────────────┴─────────────────┴──────────┴──────────────┤│
│  │                              Total Est.: ~₹3,50,000     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Org Admin Notes (Optional)                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ e.g., Approved. Coordinate with reception for access.   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  On Approval:                                                │
│  • Pickup will be automatically initiated                   │
│  • Logistics Admin will be notified                         │
│  • All 25 assets will be marked "Scheduled for Pickup"      │
│  • Sub-users will be notified to bring devices              │
│                                                              │
│      [ Back ]    [ Reject with Reason ]    [ ✓ Approve ]    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Post-Approval Automatic Actions:
```javascript
// When Org Admin clicks "Approve":

async function approvePickupRequest(batchId, orgAdminNotes) {
  // 1. Update batch status
  await updateBatch(batchId, {
    status: 'approved',
    approved_by: orgAdminId,
    approved_at: new Date(),
    org_admin_notes: orgAdminNotes
  });
  
  // 2. Mark all assets in batch as "Scheduled for Pickup"
  await updateAssetsInBatch(batchId, {
    status: 'scheduled_for_pickup'
  });
  
  // 3. Create pickup request for Logistics Admin
  await createPickupRequest({
    batch_id: batchId,
    enterprise_id: batch.enterprise_id,
    branch_id: batch.branch_id,
    pickup_location: batch.pickup_location,
    preferred_date: batch.preferred_date,
    preferred_slot: batch.preferred_slot,
    asset_count: batch.assets.length,
    status: 'pending_assignment'
  });
  
  // 4. Notify Logistics Admin
  await sendNotification({
    to: 'logistics_admin',
    type: 'new_pickup_request',
    data: { batchId, enterpriseName, assetCount }
  });
  
  // 5. Notify all Sub-Users to bring devices
  await notifySubUsers(batch.assets, {
    type: 'bring_device_for_pickup',
    location: batch.pickup_location,
    date: batch.preferred_date,
    time: batch.preferred_slot
  });
  
  // 6. Notify IT Admin of approval
  await sendNotification({
    to: batch.it_admin_id,
    type: 'batch_approved',
    data: { batchId }
  });
  
  // 7. Log audit trail
  await createAuditLog({
    action: 'batch_pickup_approved',
    actor: orgAdminId,
    entity: 'batch',
    entity_id: batchId
  });
}
```

---

# 7. DATABASE SCHEMA CHANGES

## 7.1 Updated Schema

```sql
-- =============================================
-- ENTERPRISE & REGISTRATION
-- =============================================

CREATE TABLE enterprise_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) NOT NULL,
  gst_number VARCHAR(15) NOT NULL,
  pan_number VARCHAR(10) NOT NULL,
  registered_address TEXT NOT NULL,
  industry_type VARCHAR(100),
  company_size VARCHAR(50),
  
  -- Org Admin details
  org_admin_name VARCHAR(255) NOT NULL,
  org_admin_email VARCHAR(255) NOT NULL,
  org_admin_phone VARCHAR(20) NOT NULL,
  org_admin_designation VARCHAR(100),
  password_hash VARCHAR(255) NOT NULL,
  
  -- Documents (S3/storage paths)
  doc_gst_certificate VARCHAR(500),
  doc_pan_card VARCHAR(500),
  doc_incorporation_cert VARCHAR(500),
  doc_signatory_id VARCHAR(500),
  doc_address_proof VARCHAR(500),
  doc_company_logo VARCHAR(500),
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, info_requested
  application_ref VARCHAR(50) UNIQUE,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  rejection_reason TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ENTERPRISE (Created after approval)
-- =============================================

CREATE TABLE enterprises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES enterprise_applications(id),
  
  company_name VARCHAR(255) NOT NULL,
  gst_number VARCHAR(15) UNIQUE NOT NULL,
  pan_number VARCHAR(10) NOT NULL,
  registered_address TEXT NOT NULL,
  industry_type VARCHAR(100),
  company_size VARCHAR(50),
  company_logo VARCHAR(500),
  
  status VARCHAR(50) DEFAULT 'active', -- active, suspended, inactive
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- BRANCHES (NEW)
-- =============================================

CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  
  branch_name VARCHAR(255) NOT NULL,
  branch_code VARCHAR(50) NOT NULL,
  
  -- Address
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pin_code VARCHAR(10) NOT NULL,
  
  -- Pickup Location Details
  pickup_point_description TEXT,
  site_contact_person VARCHAR(255),
  site_contact_phone VARCHAR(20),
  operating_hours VARCHAR(100),
  special_instructions TEXT,
  
  status VARCHAR(50) DEFAULT 'active', -- active, inactive
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(enterprise_id, branch_code)
);

-- =============================================
-- USERS (Updated)
-- =============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Role: super_admin, ops_admin, org_admin, it_admin, sub_user, logistics_admin, logistics_user
  role VARCHAR(50) NOT NULL,
  
  -- Enterprise association (NULL for super_admin, ops_admin, logistics_*)
  enterprise_id UUID REFERENCES enterprises(id),
  
  -- Branch association (for IT Admin only)
  branch_id UUID REFERENCES branches(id),
  
  -- User details
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255),
  designation VARCHAR(100),
  employee_id VARCHAR(100),
  department VARCHAR(100),
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, pending
  email_verified BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  last_login_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_users_enterprise ON users(enterprise_id);
CREATE INDEX idx_users_branch ON users(branch_id);
CREATE INDEX idx_users_role ON users(role);

-- =============================================
-- BATCHES (Updated)
-- =============================================

CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Ownership
  enterprise_id UUID NOT NULL REFERENCES enterprises(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  created_by UUID NOT NULL REFERENCES users(id), -- IT Admin
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft',
  -- draft, pending_approval, approved, rejected,
  -- pickup_scheduled, pickup_in_progress, picked_up,
  -- warehouse_qc, completed
  
  -- Pickup Details (filled by IT Admin before submission)
  pickup_location_id UUID REFERENCES branches(id),
  pickup_location_override TEXT, -- If different from branch default
  preferred_pickup_date DATE,
  preferred_pickup_slot VARCHAR(50), -- morning, afternoon, evening
  pickup_priority VARCHAR(50) DEFAULT 'normal', -- normal, urgent
  it_admin_notes TEXT,
  logistics_instructions TEXT,
  
  -- Approval
  submitted_for_approval_at TIMESTAMP,
  approved_by UUID REFERENCES users(id), -- Org Admin
  approved_at TIMESTAMP,
  org_admin_notes TEXT,
  rejected_by UUID REFERENCES users(id),
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  
  -- Stats (denormalized for performance)
  total_assets INT DEFAULT 0,
  completed_evaluations INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_batches_enterprise ON batches(enterprise_id);
CREATE INDEX idx_batches_branch ON batches(branch_id);
CREATE INDEX idx_batches_status ON batches(status);

-- =============================================
-- ASSETS (Updated)
-- =============================================

CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id VARCHAR(50) UNIQUE NOT NULL,
  
  -- Ownership hierarchy
  enterprise_id UUID NOT NULL REFERENCES enterprises(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  batch_id UUID REFERENCES batches(id),
  it_admin_id UUID NOT NULL REFERENCES users(id),
  sub_user_id UUID REFERENCES users(id),
  
  -- Device details
  serial_number VARCHAR(255) NOT NULL,
  device_make VARCHAR(100) NOT NULL,
  device_model VARCHAR(100) NOT NULL,
  cpu_configuration VARCHAR(255),
  ram VARCHAR(50),
  storage_type VARCHAR(50),
  storage_capacity VARCHAR(50),
  gpu VARCHAR(255),
  
  -- Assignment
  assignment_date DATE,
  department VARCHAR(100),
  asset_tag VARCHAR(100),
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending_evaluation',
  -- pending_evaluation, evaluation_in_progress, evaluation_completed,
  -- ready_for_pickup, scheduled_for_pickup, pickup_in_progress,
  -- picked_up, warehouse_qc, qc_passed, qc_failed, completed
  
  -- Credits (set after warehouse QC)
  estimated_credits INT,
  final_credits INT,
  credit_adjustment_reason TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(enterprise_id, serial_number)
);

-- Indexes
CREATE INDEX idx_assets_enterprise ON assets(enterprise_id);
CREATE INDEX idx_assets_branch ON assets(branch_id);
CREATE INDEX idx_assets_batch ON assets(batch_id);
CREATE INDEX idx_assets_it_admin ON assets(it_admin_id);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_serial ON assets(serial_number);

-- =============================================
-- PICKUP REQUESTS (Updated)
-- =============================================

CREATE TABLE pickup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Source
  batch_id UUID NOT NULL REFERENCES batches(id),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  
  -- Pickup details
  pickup_location TEXT NOT NULL,
  pickup_address TEXT NOT NULL,
  pickup_city VARCHAR(100) NOT NULL,
  pickup_pin_code VARCHAR(10) NOT NULL,
  contact_person VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(20) NOT NULL,
  
  scheduled_date DATE,
  scheduled_slot VARCHAR(50),
  
  -- Assignment
  logistics_admin_id UUID REFERENCES users(id),
  logistics_user_id UUID REFERENCES users(id),
  assigned_at TIMESTAMP,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending_assignment',
  -- pending_assignment, assigned, scheduled, in_progress,
  -- completed, partial_complete, exception
  
  -- Counts
  total_assets INT NOT NULL,
  picked_up_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  
  -- Completion
  completed_at TIMESTAMP,
  completion_notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CREDITS WALLET (Org Admin / CFO access only)
-- =============================================

CREATE TABLE credit_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID UNIQUE NOT NULL REFERENCES enterprises(id),
  
  available_balance INT DEFAULT 0,
  pending_balance INT DEFAULT 0,
  total_earned INT DEFAULT 0,
  total_redeemed INT DEFAULT 0,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id),
  wallet_id UUID NOT NULL REFERENCES credit_wallets(id),
  
  type VARCHAR(50) NOT NULL, -- credit, withdrawal, redemption, adjustment
  amount INT NOT NULL,
  balance_after INT NOT NULL,
  
  -- Reference
  reference_type VARCHAR(50), -- asset, batch, redemption_order
  reference_id UUID,
  
  description TEXT,
  
  -- For withdrawals/redemptions
  redemption_type VARCHAR(50), -- cash, asus_products, comprint_products
  redemption_rate DECIMAL(5,2), -- 1.0, 1.1, 1.05
  
  status VARCHAR(50) DEFAULT 'completed',
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- Org Admin: Nested view of all assets
CREATE VIEW org_admin_asset_view AS
SELECT 
  a.*,
  b.branch_name,
  b.branch_code,
  bt.batch_number,
  bt.status as batch_status,
  u_it.name as it_admin_name,
  u_sub.name as sub_user_name,
  u_sub.email as sub_user_email
FROM assets a
JOIN branches b ON a.branch_id = b.id
LEFT JOIN batches bt ON a.batch_id = bt.id
JOIN users u_it ON a.it_admin_id = u_it.id
LEFT JOIN users u_sub ON a.sub_user_id = u_sub.id;

-- Branch summary for Org Admin
CREATE VIEW branch_summary AS
SELECT 
  b.id as branch_id,
  b.enterprise_id,
  b.branch_name,
  b.branch_code,
  b.city,
  COUNT(DISTINCT u.id) as it_admin_count,
  COUNT(DISTINCT a.id) as asset_count,
  COUNT(DISTINCT bt.id) FILTER (WHERE bt.status NOT IN ('completed', 'rejected')) as active_batch_count
FROM branches b
LEFT JOIN users u ON u.branch_id = b.id AND u.role = 'it_admin'
LEFT JOIN assets a ON a.branch_id = b.id
LEFT JOIN batches bt ON bt.branch_id = b.id
GROUP BY b.id;
```

## 7.2 Key Relationships

```
Enterprise (1) ─────────── (N) Branch
     │                           │
     │                           │
     └──── (1) ─── (1) ──── Org Admin
                                 │
                                 │
Branch (1) ──────────────── (N) IT Admin
     │                           │
     │                           │
     └──── (N) ─── (1) ──── Batch
                                 │
                                 │
Batch (1) ───────────────── (N) Asset
     │                           │
     │                           │
     └──── (1) ─── (1) ──── Pickup Request
```

---

# 8. UI/UX IMPROVEMENTS

## 8.1 Placeholder Text Updates

Replace all generic placeholders with helpful explanatory text:

### Before (Bad):
```
Name: [John Doe]
Email: [john@example.com]
Phone: [1234567890]
```

### After (Good):
```
Full Name *
┌─────────────────────────────────────────────────────────────┐
│ e.g., Rajesh Kumar                                          │
└─────────────────────────────────────────────────────────────┘

Email Address *
┌─────────────────────────────────────────────────────────────┐
│ e.g., rajesh.kumar@yourcompany.com                          │
└─────────────────────────────────────────────────────────────┘

Phone Number *
┌─────────────────────────────────────────────────────────────┐
│ e.g., +91 98765 43210                                       │
└─────────────────────────────────────────────────────────────┘

GST Number *
┌─────────────────────────────────────────────────────────────┐
│ e.g., 29ABCDE1234F1Z5 (15 characters)                       │
└─────────────────────────────────────────────────────────────┘

Serial Number *
┌─────────────────────────────────────────────────────────────┐
│ e.g., ABC123XYZ (found on device sticker)                   │
└─────────────────────────────────────────────────────────────┘

CPU Configuration *
┌─────────────────────────────────────────────────────────────┐
│ e.g., Intel Core i5-1135G7 or AMD Ryzen 5 5600H             │
└─────────────────────────────────────────────────────────────┘

RAM *
┌─────────────────────────────────────────────────────────────┐
│ e.g., 16GB DDR4                                             │
└─────────────────────────────────────────────────────────────┘
```

## 8.2 Form Labels with Help Text

Add help icons with tooltips:

```jsx
<FormField
  label="GST Number"
  required
  helpText="15-character GST Identification Number. Format: 29ABCDE1234F1Z5"
  placeholder="e.g., 29ABCDE1234F1Z5"
/>

<FormField
  label="Assignment Start Date"
  required
  helpText="Date when the device was assigned to the employee. Used for depreciation calculation."
  placeholder="YYYY-MM-DD"
/>
```

---

# 9. NAVIGATION & SIDEBAR CHANGES

## 9.1 Role-Based Navigation

### Super Admin Sidebar:
```
📊 Dashboard
👥 Users
   ├─ Ops Admins
   └─ All Users
🏢 Enterprises
   ├─ Applications (Pending)
   ├─ Active Enterprises
   └─ Suspended
🚚 Logistics
   ├─ Partners
   └─ Overview
⚙️ Settings
   ├─ Platform Config
   ├─ Pricing Rules
   └─ Notifications
📈 Reports
```

### Ops Admin Sidebar:
```
📊 Dashboard
🏢 Enterprises
   ├─ Applications (Pending)
   ├─ All Enterprises
   └─ Flagged
📦 Operations
   ├─ All Assets
   ├─ Agent Reports
   ├─ Warehouse QC
   └─ Credit Release
🚚 Logistics
   ├─ All Pickups
   └─ Exceptions
📈 Reports
```

### Org Admin Sidebar:
```
📊 Dashboard

🏛️ ORGANIZATION
   ├─ Branches
   ├─ IT Admins
   └─ Settings

💰 FINANCE
   ├─ Credits Wallet
   ├─ Transactions
   ├─ Redemptions
   └─ Reports

📜 COMPLIANCE
   ├─ EPR Certificates
   └─ Audit Reports

─────────────────────────
🔄 IT ADMIN VIEW  [Toggle]
─────────────────────────

(When ON:)
┌─────────────────────────┐
│ 📦 ASSET MANAGEMENT     │
│    ├─ All Assets        │
│    ├─ Upload Assets     │
│    └─ Batches           │
│                         │
│ 👥 SUB-USERS            │
│    ├─ All Sub-Users     │
│    └─ Evaluations       │
│                         │
│ 🚚 LOGISTICS            │
│    ├─ Pickup Requests   │
│    └─ Tracking          │
└─────────────────────────┘
```

### IT Admin Sidebar:
```
📊 Dashboard

📦 ASSETS
   ├─ All Assets
   ├─ Upload Assets
   └─ My Batches

👥 SUB-USERS
   ├─ All Sub-Users
   └─ Evaluations

🚚 LOGISTICS
   ├─ Pickup Requests
   └─ Tracking

📈 Reports
```

---

# 10. IMPLEMENTATION ORDER

## Phase 1: Database & Core (Week 1-2)
1. ☐ Update database schema (add branches, update users, etc.)
2. ☐ Rename CFO → Org Admin everywhere
3. ☐ Update role hierarchy constants
4. ☐ Create database migrations
5. ☐ Update all foreign key relationships

## Phase 2: Enterprise Registration (Week 2-3)
1. ☐ Create document requirements modal
2. ☐ Build multi-step registration form
3. ☐ Implement document upload
4. ☐ Create success/pending page
5. ☐ Build admin review interface
6. ☐ Implement approval/rejection workflow
7. ☐ Set up email notifications

## Phase 3: Branch Management (Week 3-4)
1. ☐ Create branch CRUD APIs
2. ☐ Build branch management UI
3. ☐ Implement branch-IT Admin assignment
4. ☐ Update asset creation to require branch
5. ☐ Build nested asset view for Org Admin

## Phase 4: IT Admin Management (Week 4)
1. ☐ Build bulk IT Admin upload
2. ☐ Create Excel template with branch dropdown
3. ☐ Implement IT Admin reassignment
4. ☐ Update IT Admin list view

## Phase 5: Batch & Approval Flow (Week 5-6)
1. ☐ Remove old CFO verification flow
2. ☐ Build new batch submission flow
3. ☐ Create pickup details form for IT Admin
4. ☐ Build Org Admin approval interface
5. ☐ Implement auto-initiation on approval
6. ☐ Update all status transitions
7. ☐ Set up notifications

## Phase 6: Org Admin Portal (Week 6-7)
1. ☐ Build new Org Admin sidebar with toggle
2. ☐ Implement nested IT Admin view
3. ☐ Create combined dashboard
4. ☐ Ensure all IT Admin features work in Org Admin context

## Phase 7: UI/UX Polish (Week 7-8)
1. ☐ Update all placeholders
2. ☐ Add help text to forms
3. ☐ Improve error messages
4. ☐ Mobile responsiveness check
5. ☐ Testing & bug fixes

---

# SUMMARY OF KEY CHANGES

| Area | Old | New |
|------|-----|-----|
| Role Name | CFO | Org Admin |
| Role Hierarchy | IT Admin → CFO → Ops → Super | IT Admin → Org Admin → Ops Admin → Super Admin |
| Registration | Instant access | Document upload → Admin approval → Access |
| Org Structure | Flat | Enterprise → Branch → IT Admin |
| IT Admin Mgmt | Manual add | Bulk upload with branch assignment |
| Asset Structure | Enterprise → IT Admin | Enterprise → Branch → IT Admin → Batch |
| Batch Approval | CFO verifies batch | IT Admin submits → Org Admin approves → Auto pickup |
| Pickup Initiation | IT Admin initiates | Auto on Org Admin approval |
| Org Admin View | Separate from IT Admin | Toggle to access all IT Admin features |
| Placeholders | Generic names | Explanatory examples |

---

*Document Version: 3.1*
*Created for: Claude Code Implementation*
*Total Estimated Time: 7-8 weeks*
