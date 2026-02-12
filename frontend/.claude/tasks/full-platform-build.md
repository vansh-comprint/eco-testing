# Task: ECOTRIBE Full Platform Build

## Overview

Building a complete B2B refurbished laptop trade-in platform based on the PRD v2.2. The platform connects Enterprise IT Admins with ASUS's refurbished laptop operation through a 7-day end-to-end process with **five user roles**: Super Admin → Main Admin → Technician → IT Admin → CFO → Sub-User.

**New in PRD v2.2:**
- CFO role for high-value/bulk batch approvals (50+ assets or ₹5L+ value)
- EPR (Extended Producer Responsibility) Certificate Module
- Treatment tracking (Recycled/Refurbished/Resold/Disposed)
- Recycler Partner management

The platform will be built using a premium, sophisticated design language with subtle animations and refined visual hierarchy.

## Goals

- Production-ready B2B trade-in platform with **five user portals** (IT Admin, Sub-User, Technician, Main Admin, CFO, Super Admin)
- Premium, sophisticated design language with subtle animations and refined visual hierarchy
- Full workflow implementation from asset onboarding to payout with CFO approval gates
- EPR (Extended Producer Responsibility) Certificate Module for regulatory compliance
- Microinteractions and animations throughout
- Mobile-optimized Sub-User check-in flow

## Tech Stack Decision

**Frontend Framework:** React 19 + TypeScript + Vite (existing)
**Styling:** Tailwind CSS with custom ECOTRIBE design tokens
**Animations:** Framer Motion (existing)
**Icons:** Lucide React (existing)
**Routing:** React Router v6
**State Management:** Zustand (lightweight, perfect for this scale)
**Forms:** React Hook Form + Zod validation
**Backend (Phase 9):** Supabase (Auth, Database, Storage, Edge Functions)
**Notifications (Phase 9):** Resend (Email) + WhatsApp Business API

**Reasoning:**
- Zustand is simpler than Redux for this use case
- React Hook Form + Zod gives us type-safe form validation
- Keeping React 19 + Vite for consistency with landing page

## Development Strategy: UI First with Mock Data

**Why UI First:**
1. See visual progress immediately - faster iteration on UX
2. No backend setup delays - can start building right away
3. Validate entire flow before wiring real data
4. Mock data uses same TypeScript interfaces → easy Supabase swap later

**How it works:**
- Build all UI components and pages with full functionality
- Zustand stores hold mock data that mirrors eventual database schema
- TypeScript types defined upfront (same as Supabase schema)
- Simulated auth with role switching for testing all portals
- Once UI is approved → plug in Supabase (1-2 days of work)

---

## Implementation Plan

### Phase 1: Foundation & Infrastructure

#### Task 1.1: Project Restructure & Setup
- **Description**: Reorganize project structure for a full application, install dependencies
- **Reasoning**: Need proper folder structure for scalable application
- **Files affected**:
  - `package.json` (add dependencies)
  - `src/` folder structure creation
  - `vite.config.ts` (update paths)
  - `tsconfig.json` (update paths)
- **Status**: [x] Complete

**New folder structure:**
```
src/
├── components/
│   ├── ui/              # Reusable UI components (Button, Input, Card, Modal, etc.)
│   ├── layout/          # Layout components (Sidebar, Header, PageContainer)
│   ├── landing/         # Landing page components (move existing)
│   └── shared/          # Shared components across portals
├── pages/
│   ├── landing/         # Landing page
│   ├── auth/            # Login, Signup, Forgot Password
│   ├── it-admin/        # IT Admin portal pages
│   ├── sub-user/        # Sub-User check-in flow
│   ├── technician/      # Technician portal pages
│   ├── main-admin/      # Main Admin portal pages
│   ├── cfo/             # CFO portal pages (NEW in PRD v2.2)
│   └── super-admin/     # Super Admin portal pages
├── hooks/               # Custom React hooks
├── stores/              # Zustand stores
├── services/            # API services, Supabase client
├── types/               # TypeScript types/interfaces
├── utils/               # Utility functions
├── lib/                 # Third-party library configs
└── styles/              # Global styles, animations
```

#### Task 1.2: Design System Components
- **Description**: Build reusable UI component library with premium ECOTRIBE design language
- **Reasoning**: Ensures consistency, speeds up development, enables microinteractions
- **Files affected**:
  - `src/components/ui/Button.tsx`
  - `src/components/ui/Input.tsx`
  - `src/components/ui/Card.tsx`
  - `src/components/ui/Modal.tsx`
  - `src/components/ui/Badge.tsx`
  - `src/components/ui/Table.tsx`
  - `src/components/ui/Dropdown.tsx`
  - `src/components/ui/Tabs.tsx`
  - `src/components/ui/Toast.tsx`
  - `src/components/ui/Progress.tsx`
  - `src/components/ui/Avatar.tsx`
  - `src/components/ui/Tooltip.tsx`
  - `src/components/ui/FileUpload.tsx`
  - `src/components/ui/DataTable.tsx`
  - `src/components/ui/StatsCard.tsx`
  - `src/components/ui/StatusBadge.tsx`
  - `src/components/ui/Timeline.tsx`
  - `src/components/ui/Skeleton.tsx`
  - `src/components/ui/EmptyState.tsx`
  - `src/components/ui/Checkbox.tsx`
  - `src/components/ui/Textarea.tsx`
  - `src/components/ui/index.ts` (barrel export)
  - `src/layouts/DashboardLayout.tsx`
- **Status**: [x] Complete

**Design tokens implemented (Premium aesthetic):**
- Colors: ecotribe-primary (#84CC16), dark backgrounds (#050506, #0a0a0b, #0c0c0d)
- Fonts: brand (Chakra Petch), display (Rajdhani), body (Inter)
- Subtle fractional opacity: bg-white/[0.02], border-white/[0.06]
- Animations: Restrained Framer Motion with short durations (150-300ms)
- Border radius: rounded-xl for cards, rounded-lg for buttons (less rounded than before)
- No uppercase text, cleaner typography hierarchy

#### Task 1.3: TypeScript Types & Mock Data Stores
- **Description**: Define all TypeScript interfaces and create Zustand stores with mock data
- **Reasoning**: Types match eventual database schema; mock data enables UI development without backend
- **Files affected**:
  - `src/types/index.ts` (barrel export)
  - `src/types/enterprise.ts`
  - `src/types/user.ts` (includes CFO role)
  - `src/types/asset.ts` (includes treatment tracking)
  - `src/types/batch.ts` (includes CFO approval fields)
  - `src/types/epr.ts` (NEW - EPR Certificate types)
  - `src/types/submission.ts`
  - `src/types/review.ts`
  - `src/types/payout.ts`
  - `src/stores/mockData.ts` (seed data for all entities)
  - `src/stores/enterpriseStore.ts`
  - `src/stores/assetStore.ts`
  - `src/stores/submissionStore.ts`
  - `src/stores/reviewStore.ts`
  - `src/stores/payoutStore.ts`
- **Status**: [x] Complete

**Core Types (matching future Supabase schema):**
```typescript
// Updated with CFO role
type UserRole = 'super_admin' | 'main_admin' | 'technician' | 'it_admin' | 'cfo';

// CFO Approval thresholds
const cfoApprovalThresholds = { batchSize: 50, batchValue: 500000 };

type AssetStatus =
  | 'pending_assignment' | 'assigned' | 'check_in_started' | 'submitted'
  | 'remote_review' | 'conditionally_accepted' | 'remote_rejected'
  | 'in_transit' | 'facility_qc' | 'final_accepted' | 'final_rejected'
  | 'payout_pending' | 'completed';

// Treatment tracking for EPR
type TreatmentOutcome = 'recycled' | 'refurbished' | 'resold' | 'disposed' | 'pending';

// Batch with CFO approval fields
interface Batch {
  id, enterpriseId, name, status, assetCount, totalPayout,
  requiresCfoApproval, cfoApprovalStatus?, cfoApprovedBy?, cfoRejectionReason?,
  eprCertificateId?, eprStatus?
}

// EPR Certificate types (NEW in PRD v2.2)
type EPRCertificateStatus = 'pending_generation' | 'generated' | 'pending_approval' | 'approved' | 'issued' | 'rejected' | 'expired';
interface EPRCertificate { id, enterpriseId, batchId?, certificateNumber, status, assetIds, totalWeight, treatmentBreakdown, recyclerPartnerId?, ... }
interface RecyclerPartner { id, name, registrationNumber, status, capabilities, certifications[], ... }
interface TreatmentRecord { id, assetId, eprCertificateId?, recyclerPartnerId, treatmentType, weightKg, ... }
```

#### Task 1.4: Mock Authentication & Role Switching
- **Description**: Simulated auth with role switcher for testing all portals
- **Reasoning**: Enables full UI development and testing without real auth backend
- **Files affected**:
  - `src/pages/auth/Login.tsx`
  - `src/pages/auth/Signup.tsx` (IT Admin enterprise signup)
  - `src/stores/authStore.ts` (mock auth with localStorage persistence)
  - `src/hooks/useAuth.ts`
  - `src/components/layout/ProtectedRoute.tsx`
  - `src/components/dev/RoleSwitcher.tsx` (floating dev tool to switch roles)
- **Status**: [x] Complete

**Mock Auth Features:**
- Login form that accepts any email (stores in localStorage)
- Pre-seeded mock users for each role (IT Admin, Technician, Main Admin, CFO, Super Admin)
- Floating RoleSwitcher component (dev mode only) to quickly test all portals
- Protected routes redirect based on mock auth state

#### Task 1.5: Routing Setup
- **Description**: Configure React Router with protected routes per role
- **Reasoning**: Need role-based access control for different portals
- **Files affected**:
  - `src/App.tsx`
  - `src/routes/index.tsx`
  - `src/routes/itAdminRoutes.tsx`
  - `src/routes/technicianRoutes.tsx`
  - `src/routes/mainAdminRoutes.tsx`
  - `src/routes/cfoRoutes.tsx` (NEW for CFO portal)
  - `src/routes/superAdminRoutes.tsx`
- **Status**: [x] Complete

---

### Phase 2: IT Admin Portal

#### Task 2.1: IT Admin Layout & Dashboard
- **Description**: Build IT Admin portal shell with sidebar, header, and dashboard
- **Reasoning**: Central hub for IT Admins to manage trade-ins
- **Files affected**:
  - `src/components/layout/ITAdminLayout.tsx`
  - `src/components/layout/Sidebar.tsx`
  - `src/components/layout/Header.tsx`
  - `src/pages/it-admin/Dashboard.tsx`
  - `src/components/dashboard/StatsOverview.tsx`
  - `src/components/dashboard/RecentActivity.tsx`
  - `src/components/dashboard/ActionItems.tsx`
- **Status**: [ ] Not started

**Dashboard includes:**
- Total assets by status (Pending, In Review, Accepted, Rejected)
- Recent activity feed with animations
- Action items (stalled assets, pending disputes)
- Quick actions (Add Asset, Upload CSV)

#### Task 2.2: Asset Management - Manual Add
- **Description**: Form to add single asset with validation
- **Reasoning**: Core functionality for asset onboarding
- **Files affected**:
  - `src/pages/it-admin/AddAsset.tsx`
  - `src/components/assets/AssetForm.tsx`
  - `src/services/assetService.ts`
  - `src/types/asset.ts`
- **Status**: [ ] Not started

#### Task 2.3: Asset Management - CSV Upload
- **Description**: Bulk upload with validation, error preview, and commit
- **Reasoning**: Essential for enterprises with many devices
- **Files affected**:
  - `src/pages/it-admin/UploadAssets.tsx`
  - `src/components/assets/CSVUploader.tsx`
  - `src/components/assets/CSVPreview.tsx`
  - `src/components/assets/CSVErrorList.tsx`
  - `src/utils/csvParser.ts`
  - `src/utils/csvValidator.ts`
- **Status**: [ ] Not started

**Features:**
- Drag & drop upload with animation
- Real-time validation with error highlighting
- Duplicate serial number detection
- Download CSV template
- Progress indicator during processing

#### Task 2.4: Asset List & Detail Views
- **Description**: Paginated asset list with filters, search, and detail view
- **Reasoning**: IT Admins need to see and manage all their assets
- **Files affected**:
  - `src/pages/it-admin/Assets.tsx`
  - `src/pages/it-admin/AssetDetail.tsx`
  - `src/components/assets/AssetList.tsx`
  - `src/components/assets/AssetCard.tsx`
  - `src/components/assets/AssetFilters.tsx`
  - `src/components/assets/AssetTimeline.tsx`
- **Status**: [ ] Not started

#### Task 2.5: Sub-User Assignment
- **Description**: Assign employees to assets, bulk assignment
- **Reasoning**: Core workflow step after asset creation
- **Files affected**:
  - `src/components/assets/AssignSubUser.tsx`
  - `src/components/assets/BulkAssign.tsx`
  - `src/services/subUserService.ts`
  - `src/services/notificationService.ts`
- **Status**: [ ] Not started

**Features:**
- Email + phone input with validation
- Bulk assignment from CSV column
- Reassignment capability
- Self-complete option for IT Admin

#### Task 2.6: Batch Management
- **Description**: Create, view, and manage batches
- **Reasoning**: Enterprises group assets for tracking and settlement
- **Files affected**:
  - `src/pages/it-admin/Batches.tsx`
  - `src/pages/it-admin/BatchDetail.tsx`
  - `src/components/batches/BatchList.tsx`
  - `src/components/batches/CreateBatch.tsx`
  - `src/components/batches/BatchStats.tsx`
- **Status**: [ ] Not started

#### Task 2.7: Dispute Submission
- **Description**: IT Admin can dispute rejections with additional info
- **Reasoning**: Key workflow for fair QC process
- **Files affected**:
  - `src/components/disputes/DisputeForm.tsx`
  - `src/components/disputes/DisputeStatus.tsx`
  - `src/services/disputeService.ts`
- **Status**: [ ] Not started

#### Task 2.8: Payout View
- **Description**: View payout breakdown per asset and batch
- **Reasoning**: Transparency is core to trust
- **Files affected**:
  - `src/pages/it-admin/Payouts.tsx`
  - `src/components/payouts/PayoutBreakdown.tsx`
  - `src/components/payouts/BatchPayout.tsx`
- **Status**: [ ] Not started

#### Task 2.9: Enterprise Profile & Settings
- **Description**: Manage company profile, bank details, notification preferences
- **Reasoning**: Required for onboarding and payouts
- **Files affected**:
  - `src/pages/it-admin/Settings.tsx`
  - `src/components/settings/CompanyProfile.tsx`
  - `src/components/settings/BankDetails.tsx`
  - `src/components/settings/NotificationPrefs.tsx`
- **Status**: [ ] Not started

---

### Phase 3: Sub-User Check-In Flow

#### Task 3.1: Sub-User Access & Verification
- **Description**: Token-based access via unique link, no auth required
- **Reasoning**: Frictionless experience for employees
- **Files affected**:
  - `src/pages/sub-user/CheckIn.tsx`
  - `src/pages/sub-user/TokenExpired.tsx`
  - `src/pages/sub-user/AlreadySubmitted.tsx`
  - `src/hooks/useSubUserToken.ts`
- **Status**: [ ] Not started

#### Task 3.2: Device Confirmation Step
- **Description**: Show serial + model, confirm correct device
- **Reasoning**: First step in check-in flow
- **Files affected**:
  - `src/components/check-in/DeviceConfirmation.tsx`
  - `src/components/check-in/StepIndicator.tsx`
- **Status**: [ ] Not started

#### Task 3.3: Photo Capture with Overlays
- **Description**: 6 guided photos with overlay guides, quality check
- **Reasoning**: Critical for accurate remote review
- **Files affected**:
  - `src/components/check-in/PhotoCapture.tsx`
  - `src/components/check-in/CameraOverlay.tsx`
  - `src/components/check-in/PhotoPreview.tsx`
  - `src/utils/imageQuality.ts`
  - `src/utils/imageCompression.ts`
- **Status**: [ ] Not started

**Photo requirements:**
1. Top view (lid closed)
2. Screen (powered on)
3. Keyboard
4. Left ports
5. Right ports
6. Bottom

**Features:**
- Camera overlay with device outline
- Auto quality check (blur detection)
- Retake prompt if poor quality
- Compression before upload

#### Task 3.4: Cosmetic & Functional Checklists
- **Description**: Yes/No questions with conditional photo upload
- **Reasoning**: Structured assessment for consistency
- **Files affected**:
  - `src/components/check-in/CosmeticChecklist.tsx`
  - `src/components/check-in/FunctionalChecklist.tsx`
  - `src/components/check-in/ChecklistQuestion.tsx`
  - `src/components/check-in/IssuePhotoUpload.tsx`
- **Status**: [ ] Not started

**Cosmetic questions:**
- Screen scratches/cracks?
- Body dents/scratches?
- Keyboard damage?
- Hinge issues?

**Functional questions:**
- Powers on?
- Screen displays correctly?
- Keyboard works?
- Trackpad works?
- All ports functional?
- Speakers work?
- Camera works?
- BIOS accessible?

#### Task 3.5: Accessories & Pickup Details
- **Description**: Charger and pickup information
- **Reasoning**: Logistics coordination
- **Files affected**:
  - `src/components/check-in/Accessories.tsx`
  - `src/components/check-in/PickupDetails.tsx`
  - `src/components/check-in/AddressForm.tsx`
  - `src/components/check-in/TimeSlotPicker.tsx`
- **Status**: [ ] Not started

#### Task 3.6: Review & Submit
- **Description**: Summary view with edit capability, declaration, submit
- **Reasoning**: Final confirmation before submission
- **Files affected**:
  - `src/components/check-in/ReviewSubmission.tsx`
  - `src/components/check-in/SubmissionSummary.tsx`
  - `src/components/check-in/Declaration.tsx`
- **Status**: [ ] Not started

#### Task 3.7: Confirmation & Status Check
- **Description**: Success screen with reference ID, status page
- **Reasoning**: Closure and transparency for Sub-User
- **Files affected**:
  - `src/pages/sub-user/Confirmation.tsx`
  - `src/pages/sub-user/Status.tsx`
  - `src/components/check-in/SuccessAnimation.tsx`
- **Status**: [ ] Not started

---

### Phase 4: Technician Portal

#### Task 4.1: Technician Layout & Dashboard
- **Description**: Technician portal shell with review queues
- **Reasoning**: Central hub for QC work
- **Files affected**:
  - `src/components/layout/TechnicianLayout.tsx`
  - `src/pages/technician/Dashboard.tsx`
  - `src/components/technician/ReviewStats.tsx`
- **Status**: [ ] Not started

#### Task 4.2: Remote Review Queue
- **Description**: List of pending reviews sorted by submission time with SLA indicator
- **Reasoning**: Core technician workflow
- **Files affected**:
  - `src/pages/technician/RemoteReviewQueue.tsx`
  - `src/components/technician/ReviewCard.tsx`
  - `src/components/technician/SLAIndicator.tsx`
- **Status**: [ ] Not started

#### Task 4.3: Remote Review Interface
- **Description**: View photos, checklist, make decision with reason
- **Reasoning**: Where technicians evaluate submissions
- **Files affected**:
  - `src/pages/technician/RemoteReview.tsx`
  - `src/components/technician/PhotoViewer.tsx`
  - `src/components/technician/ChecklistViewer.tsx`
  - `src/components/technician/ReviewDecision.tsx`
- **Status**: [ ] Not started

**Features:**
- Fullscreen photo viewer with zoom
- Side-by-side checklist comparison
- Accept/Reject with required reason for reject
- Quick keyboard shortcuts

#### Task 4.4: Facility QC Queue
- **Description**: List of arrived devices for physical QC
- **Reasoning**: Second stage of verification
- **Files affected**:
  - `src/pages/technician/FacilityQCQueue.tsx`
  - `src/components/technician/QCCard.tsx`
- **Status**: [ ] Not started

#### Task 4.5: Facility QC Checklist Interface
- **Description**: 8-section checklist, grade assignment, decision
- **Reasoning**: Comprehensive physical verification
- **Files affected**:
  - `src/pages/technician/FacilityQC.tsx`
  - `src/components/technician/QCChecklist.tsx`
  - `src/components/technician/GradeSelector.tsx`
  - `src/components/technician/QCPhotoCapture.tsx`
- **Status**: [ ] Not started

**8 QC Sections:**
1. Verify Sub-User submission photos
2. Cosmetic inspection
3. Functional tests
4. Port testing
5. Battery health
6. Storage check
7. BIOS access
8. Final grade

#### Task 4.6: Dispute Handling
- **Description**: Re-review disputed remote rejections
- **Reasoning**: Fair process requires second look
- **Files affected**:
  - `src/pages/technician/Disputes.tsx`
  - `src/components/technician/DisputeReview.tsx`
- **Status**: [ ] Not started

---

### Phase 5: Main Admin Portal

#### Task 5.1: Main Admin Layout & Dashboard
- **Description**: Operations-focused dashboard
- **Reasoning**: Ops team needs visibility into pipeline health
- **Files affected**:
  - `src/components/layout/MainAdminLayout.tsx`
  - `src/pages/main-admin/Dashboard.tsx`
  - `src/components/main-admin/PipelineView.tsx`
  - `src/components/main-admin/BottleneckAlerts.tsx`
- **Status**: [ ] Not started

#### Task 5.2: Technician Management
- **Description**: Add/remove technicians, view workload, reassign
- **Reasoning**: Resource management for QC team
- **Files affected**:
  - `src/pages/main-admin/Technicians.tsx`
  - `src/components/main-admin/TechnicianList.tsx`
  - `src/components/main-admin/WorkloadChart.tsx`
  - `src/components/main-admin/AssignReview.tsx`
- **Status**: [ ] Not started

#### Task 5.3: Escalation Handling
- **Description**: Rule on facility rejection disputes
- **Reasoning**: Final authority on disputes
- **Files affected**:
  - `src/pages/main-admin/Escalations.tsx`
  - `src/components/main-admin/EscalationDetail.tsx`
- **Status**: [ ] Not started

#### Task 5.4: Override Capability
- **Description**: Override any decision with audit trail
- **Reasoning**: Operational flexibility with accountability
- **Files affected**:
  - `src/components/main-admin/OverrideModal.tsx`
  - `src/services/auditService.ts`
- **Status**: [ ] Not started

---

### Phase 5.5: CFO Portal (NEW in PRD v2.2)

#### Task 5.5.1: CFO Layout & Dashboard
- **Description**: CFO portal shell with financial approval queue and analytics
- **Reasoning**: CFO needs dedicated view for high-value batch approvals
- **Files affected**:
  - `src/components/layout/CFOLayout.tsx`
  - `src/pages/cfo/Dashboard.tsx`
  - `src/components/cfo/ApprovalStats.tsx`
  - `src/components/cfo/FinancialSummary.tsx`
- **Status**: [ ] Not started

**Dashboard includes:**
- Pending approvals count and value
- Monthly/quarterly financial summary
- Approval rate metrics
- Recent batch decisions

#### Task 5.5.2: Batch Approval Queue
- **Description**: List of batches requiring CFO approval (50+ assets OR ₹5L+ value)
- **Reasoning**: Core CFO workflow for high-value/bulk approvals
- **Files affected**:
  - `src/pages/cfo/ApprovalQueue.tsx`
  - `src/components/cfo/BatchApprovalCard.tsx`
  - `src/components/cfo/ApprovalFilters.tsx`
- **Status**: [ ] Not started

**Approval triggers:**
- Batch with 50+ assets
- Batch with estimated value ≥ ₹5,00,000
- Manual escalation by Main Admin

#### Task 5.5.3: Batch Detail & Approval Interface
- **Description**: View batch details, asset breakdown, approve/reject with notes
- **Reasoning**: CFO needs full visibility before financial approval
- **Files affected**:
  - `src/pages/cfo/BatchDetail.tsx`
  - `src/components/cfo/BatchBreakdown.tsx`
  - `src/components/cfo/ApprovalDecision.tsx`
  - `src/components/cfo/RejectionForm.tsx`
- **Status**: [ ] Not started

**Features:**
- Asset list with grade distribution
- Total value breakdown
- Historical comparison
- Approve/Reject with mandatory notes for rejection

#### Task 5.5.4: Financial Reports
- **Description**: View and download financial reports for approved batches
- **Reasoning**: CFO needs reporting for financial oversight
- **Files affected**:
  - `src/pages/cfo/Reports.tsx`
  - `src/components/cfo/ReportCard.tsx`
  - `src/utils/cfoReportExport.ts`
- **Status**: [ ] Not started

#### Task 5.5.5: EPR Certificate View
- **Description**: View EPR certificates for compliance oversight
- **Reasoning**: CFO needs visibility into EPR compliance status
- **Files affected**:
  - `src/pages/cfo/EPRCertificates.tsx`
  - `src/components/cfo/EPRCertificateCard.tsx`
- **Status**: [ ] Not started

---

### Phase 6: Super Admin Portal

#### Task 6.1: Super Admin Layout & Platform Dashboard
- **Description**: Full platform health view
- **Reasoning**: ASUS leadership needs complete visibility
- **Files affected**:
  - `src/components/layout/SuperAdminLayout.tsx`
  - `src/pages/super-admin/Dashboard.tsx`
  - `src/components/super-admin/PlatformMetrics.tsx`
  - `src/components/super-admin/EnterpriseLeaderboard.tsx`
- **Status**: [ ] Not started

**Metrics:**
- Operational: SLA adherence, processing speed
- Enterprise: Onboarding, retention, volume
- Quality: Acceptance rate, dispute rate

#### Task 6.2: Enterprise Drill-Down
- **Description**: View any enterprise's activity in detail
- **Reasoning**: Deep visibility for support and analysis
- **Files affected**:
  - `src/pages/super-admin/Enterprises.tsx`
  - `src/pages/super-admin/EnterpriseDetail.tsx`
- **Status**: [ ] Not started

#### Task 6.3: Pricing Catalog Management
- **Description**: CRUD for brand/model pricing, grade modifiers
- **Reasoning**: Business-critical pricing configuration
- **Files affected**:
  - `src/pages/super-admin/Pricing.tsx`
  - `src/components/super-admin/PricingTable.tsx`
  - `src/components/super-admin/PricingForm.tsx`
- **Status**: [ ] Not started

#### Task 6.4: Platform Configuration
- **Description**: SLA thresholds, reminder timings, notification templates
- **Reasoning**: Operational tuning
- **Files affected**:
  - `src/pages/super-admin/Configuration.tsx`
  - `src/components/super-admin/SLASettings.tsx`
  - `src/components/super-admin/NotificationTemplates.tsx`
- **Status**: [ ] Not started

#### Task 6.5: Reports & Analytics
- **Description**: Scheduled reports, export functionality
- **Reasoning**: Business review and analysis
- **Files affected**:
  - `src/pages/super-admin/Reports.tsx`
  - `src/components/super-admin/ReportGenerator.tsx`
  - `src/utils/reportExport.ts`
- **Status**: [ ] Not started

---

### Phase 6.5: EPR Certificate Module (NEW in PRD v2.2)

#### Task 6.5.1: EPR Dashboard & Overview
- **Description**: EPR compliance dashboard with certificate status and metrics
- **Reasoning**: Central view for EPR certificate management and compliance tracking
- **Files affected**:
  - `src/pages/epr/Dashboard.tsx`
  - `src/components/epr/ComplianceMetrics.tsx`
  - `src/components/epr/CertificateStatusChart.tsx`
  - `src/stores/eprStore.ts`
- **Status**: [ ] Not started

**Dashboard includes:**
- Compliance percentage (achieved vs target)
- Certificates by status (pending, issued, expired)
- Treatment breakdown (recycled, refurbished, resold, disposed)
- Shortfall warnings

#### Task 6.5.2: EPR Certificate List & Detail
- **Description**: View all EPR certificates with filtering and detail view
- **Reasoning**: Main Admin/Super Admin need to track all certificates
- **Files affected**:
  - `src/pages/epr/Certificates.tsx`
  - `src/pages/epr/CertificateDetail.tsx`
  - `src/components/epr/CertificateCard.tsx`
  - `src/components/epr/CertificateFilters.tsx`
- **Status**: [ ] Not started

**Features:**
- Filter by status, enterprise, date range
- Certificate number search
- Download certificate PDF
- View linked assets and treatment records

#### Task 6.5.3: Certificate Generation
- **Description**: Generate EPR certificates from completed batches
- **Reasoning**: Core EPR workflow - convert processed assets to compliance certificates
- **Files affected**:
  - `src/pages/epr/GenerateCertificate.tsx`
  - `src/components/epr/AssetSelector.tsx`
  - `src/components/epr/TreatmentAssignment.tsx`
  - `src/components/epr/CertificatePreview.tsx`
  - `src/services/eprService.ts`
- **Status**: [ ] Not started

**Generation flow:**
1. Select completed batch or individual assets
2. Assign treatment type per asset (recycled/refurbished/resold/disposed)
3. Select recycler partner
4. Preview and generate certificate

#### Task 6.5.4: Recycler Partner Management
- **Description**: CRUD for recycler partners with certification tracking
- **Reasoning**: EPR compliance requires verified recycler partners
- **Files affected**:
  - `src/pages/epr/RecyclerPartners.tsx`
  - `src/pages/epr/RecyclerPartnerDetail.tsx`
  - `src/components/epr/RecyclerPartnerForm.tsx`
  - `src/components/epr/CertificationList.tsx`
- **Status**: [ ] Not started

**Partner details:**
- Registration number and certifications
- Capabilities (recycle, refurbish, resale)
- Monthly capacity
- Processing history

#### Task 6.5.5: Treatment Records
- **Description**: Track individual asset treatment with proof of processing
- **Reasoning**: Audit trail for EPR compliance
- **Files affected**:
  - `src/pages/epr/TreatmentRecords.tsx`
  - `src/components/epr/TreatmentRecordForm.tsx`
  - `src/components/epr/TreatmentTimeline.tsx`
- **Status**: [ ] Not started

**Record includes:**
- Asset ID and treatment type
- Recycler partner
- Weight (kg) for compliance calculation
- Date and proof documents
- For refurbished/resold: resale value

#### Task 6.5.6: Compliance Reporting
- **Description**: Annual compliance reports for regulatory submission
- **Reasoning**: Generate reports for EPR regulatory bodies
- **Files affected**:
  - `src/pages/epr/ComplianceReports.tsx`
  - `src/components/epr/AnnualReport.tsx`
  - `src/utils/eprReportGenerator.ts`
- **Status**: [ ] Not started

**Report includes:**
- Total weight processed by treatment type
- Certificate summary
- Recycler partner breakdown
- Year-over-year comparison

---

### Phase 7: Mock Notification System

#### Task 7.1: Notification UI Components
- **Description**: Build notification center, toast system, and inline alerts
- **Reasoning**: UI for showing notifications (actual sending deferred to Phase 9)
- **Files affected**:
  - `src/components/notifications/NotificationCenter.tsx`
  - `src/components/notifications/NotificationBell.tsx`
  - `src/components/notifications/NotificationItem.tsx`
  - `src/stores/notificationStore.ts`
- **Status**: [ ] Not started

#### Task 7.2: Mock Notification Triggers
- **Description**: Simulate notification events in the workflow
- **Reasoning**: Test notification UX without real email/WhatsApp
- **Files affected**:
  - `src/services/mockNotificationService.ts`
  - `src/hooks/useNotifications.ts`
- **Status**: [ ] Not started

---

### Phase 8: Polish & Production Readiness

#### Task 8.1: Microinteractions & Animations
- **Description**: Add polish animations throughout
- **Reasoning**: High design requirement
- **Files affected**: Various component files
- **Status**: [ ] Not started

**Animation patterns:**
- Page transitions with Framer Motion
- Button hover effects with glow
- Loading skeletons
- Success/error state animations
- Notification toasts with slide-in
- Card hover lifts
- Progress bar animations
- Number count-up animations

#### Task 8.2: Error Handling & Loading States
- **Description**: Consistent error boundaries, loading states
- **Reasoning**: Production quality UX
- **Files affected**:
  - `src/components/shared/ErrorBoundary.tsx`
  - `src/components/shared/LoadingSkeleton.tsx`
  - `src/components/shared/EmptyState.tsx`
- **Status**: [ ] Not started

#### Task 8.3: Responsive Design Audit
- **Description**: Ensure all pages work on mobile/tablet/desktop
- **Reasoning**: Sub-User flow must be mobile-first
- **Files affected**: All page components
- **Status**: [ ] Not started

#### Task 8.4: Performance Optimization
- **Description**: Code splitting, lazy loading, image optimization
- **Reasoning**: <2s page load target
- **Files affected**:
  - Route configurations
  - Image components
  - Build configuration
- **Status**: [ ] Not started

#### Task 8.5: Testing
- **Description**: Critical path testing
- **Reasoning**: Production confidence
- **Files affected**:
  - `src/__tests__/`
  - `vitest.config.ts`
- **Status**: [ ] Not started

---

### Phase 9: Supabase Integration & Backend

*This phase swaps mock data for real Supabase backend*

#### Task 9.1: Supabase Project Setup
- **Description**: Initialize Supabase, create database tables from schema
- **Reasoning**: Production backend infrastructure
- **Files affected**:
  - `src/lib/supabase.ts`
  - `supabase/migrations/*.sql`
  - `.env.local` (Supabase keys)
- **Status**: [ ] Not started

#### Task 9.2: Database Migration
- **Description**: Create all tables with proper relationships and indexes
- **Reasoning**: Match the TypeScript types already defined
- **Files affected**:
  - `supabase/migrations/001_initial_schema.sql`
- **Status**: [ ] Not started

**Tables:** enterprises, users, sub_users, batches, assets, submissions, remote_reviews, facility_qc, disputes, payouts, pricing_catalog, notifications, audit_log

#### Task 9.3: Row Level Security (RLS) Policies
- **Description**: Implement proper access control per role
- **Reasoning**: Security - users only see their own data
- **Files affected**:
  - `supabase/migrations/002_rls_policies.sql`
- **Status**: [ ] Not started

#### Task 9.4: Supabase Auth Integration
- **Description**: Replace mock auth with Supabase Auth
- **Reasoning**: Production-ready authentication
- **Files affected**:
  - `src/stores/authStore.ts` (swap mock → Supabase)
  - `src/hooks/useAuth.ts`
  - `src/pages/auth/*.tsx`
- **Status**: [ ] Not started

#### Task 9.5: Data Service Layer
- **Description**: Create service functions that call Supabase instead of mock stores
- **Reasoning**: Clean separation, easy swap from mock to real
- **Files affected**:
  - `src/services/enterpriseService.ts`
  - `src/services/assetService.ts`
  - `src/services/submissionService.ts`
  - `src/services/reviewService.ts`
  - `src/services/payoutService.ts`
- **Status**: [ ] Not started

#### Task 9.6: File Storage
- **Description**: Set up Supabase Storage for photos
- **Reasoning**: Secure photo storage with access control
- **Files affected**:
  - `src/services/storageService.ts`
  - `src/utils/imageUpload.ts`
- **Status**: [ ] Not started

#### Task 9.7: Email Integration (Resend)
- **Description**: Set up Resend for transactional emails via Edge Functions
- **Reasoning**: Production email notifications
- **Files affected**:
  - `supabase/functions/send-email/index.ts`
  - `src/services/emailService.ts`
- **Status**: [ ] Not started

#### Task 9.8: WhatsApp Integration (Optional)
- **Description**: WhatsApp Business API for urgent notifications
- **Reasoning**: High engagement channel (can be deferred)
- **Files affected**:
  - `supabase/functions/send-whatsapp/index.ts`
  - `src/services/whatsappService.ts`
- **Status**: [ ] Not started

---

## Risks & Considerations

1. **Photo Quality on Low-End Devices**: Need robust quality checks and graceful degradation
2. **Mock Data Realism**: Ensure mock data covers edge cases
3. **Supabase Migration**: Keep types in sync between mock and real backend
4. **WhatsApp Business API Approval**: May take weeks - can be deferred

## Dependencies (Phase 1-8: UI Development)

- None! UI-first approach has no external dependencies

## Dependencies (Phase 9: Backend Integration)

- Supabase project with API keys
- Resend API key for emails
- WhatsApp Business API approval (optional, can be deferred)
- Pricing catalog data from business team

---

## Change Log

### 2024-11-29: PRD v2.2 Updates & UI Redesign
- **UI Redesign**: Complete premium aesthetic overhaul of all UI components
  - Subtle fractional opacity values (bg-white/[0.02], border-white/[0.06])
  - Dark backgrounds (#050506, #0a0a0b, #0c0c0d)
  - Restrained animations (150-300ms durations)
  - Removed uppercase styling, cleaner typography
  - Less rounded corners (rounded-xl instead of rounded-2xl)
- **CFO Role**: Added new user role with permissions for high-value batch approvals
  - Threshold: 50+ assets OR ₹5,00,000+ batch value
  - New Phase 5.5 for CFO Portal
- **EPR Certificate Module**: Complete Extended Producer Responsibility system
  - New types: EPRCertificate, RecyclerPartner, TreatmentRecord
  - Treatment tracking: Recycled/Refurbished/Resold/Disposed
  - New Phase 6.5 for EPR Certificate Module
- **Batch Types**: Added CFO approval fields and EPR tracking
- **Asset Types**: Added treatment outcome tracking
- **Phase 1 Complete**: All foundation tasks marked complete
  - Project structure, UI components, types, auth, routing

### Initial Plan
- Created comprehensive implementation plan for ECOTRIBE platform
- 9 phases covering full platform development
- UI-first approach with mock data
