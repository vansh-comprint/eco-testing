# Database Schema Blueprint (Tight, Non-Redundant, Migration-Ready)

This schema maps the current app flows to a production-grade database. It is normalized to avoid duplication, enforces state integrity, and aligns with PRD roles and logistics/pickup/QC/payout/EPR flows.

## Core Principles
- **FK everywhere**: All relations are explicit; no orphan records.
- **Status via enums**: Controlled transitions (enforced in services).
- **Uniqueness**: Serial numbers per enterprise; emails per tenant; one active assignment per pickup.
- **Auditability**: Every transition logged with actor/timestamp.
- **Idempotent upserts**: Bulk imports dedupe on business keys (serial/email).

## Entities

### enterprises
- `id` (pk)
- `name`, `gst_number`, `status`
- `contact_person`, `contact_email`, `contact_phone`
- `address_*`
- `created_at`, `updated_at`

### users
- `id` (pk)
- `enterprise_id` (fk nullable for platform roles)
- `role` (enum: super_admin, main_admin, technician, it_admin, cfo, logistics_admin, logistics_user)
- `name`, `email` (unique), `phone`, `department`
- `status` (active/inactive)
- `created_at`, `updated_at`

### sub_users
- `id` (pk)
- `enterprise_id` (fk)
- `name`, `email` (unique within enterprise), `phone`, `department`
- `token`, `token_expires_at`
- `created_at`, `updated_at`

### batches
- `id` (pk)
- `enterprise_id` (fk)
- `name`, `description`
- `status` (enum: draft, pending_cfo_approval, cfo_approved, cfo_rejected, active, in_progress, completed, cancelled)
- `asset_count`, `accepted_count`, `rejected_count`, `pending_count`
- `estimated_value`, `total_payout`
- `requires_cfo_approval`, `cfo_approval_status`, `cfo_approved_by` (fk users), `cfo_approved_at`, `cfo_rejection_reason`
- `epr_certificate_id` (fk)
- `created_by` (fk users)
- `created_at`, `updated_at`, `completed_at`

### assets
- `id` (pk)
- `enterprise_id` (fk)
- `batch_id` (fk nullable)
- `serial_number` (unique per enterprise)
- `brand`, `model`
- `specs` (jsonb)
- `purchase_date`
- `status` (enum: pending_assignment, assigned, check_in_started, submitted, remote_review, conditionally_accepted, remote_rejected, disputed, ready_for_pickup, pickup_requested, pickup_scheduled, picked_up, in_transit, facility_qc, final_accepted, final_rejected, payout_pending, completed)
- `grade`
- `assigned_sub_user_id` (fk sub_users)
- `assigned_at`
- `base_price`, `final_price`
- `qc_report` (jsonb)
- `treatment_outcome` (enum), `treatment_date`, `recycler_partner_id` (fk), `weight_kg`, `epr_certificate_id` (fk)
- `created_at`, `updated_at`
*Constraint*: UNIQUE(enterprise_id, serial_number)

### submissions
- `id` (pk)
- `asset_id` (fk unique)
- `sub_user_id` (fk)
- `photos` (jsonb, url refs)
- `functional_checks` (jsonb)
- `declaration` (jsonb)
- `submitted_at`
- `created_at`

### reviews_remote
- `id` (pk)
- `asset_id` (fk unique)
- `technician_id` (fk users)
- `decision` (enum: conditionally_accepted, rejected)
- `reason`, `notes`
- `reviewed_at`

### qcs_facility
- `id` (pk)
- `asset_id` (fk unique)
- `technician_id` (fk users)
- `checklist_data` (jsonb)
- `grade`
- `decision` (enum: final_accept, final_reject)
- `reason`, `photos` (jsonb)
- `completed_at`

### disputes
- `id` (pk)
- `asset_id` (fk)
- `type` (enum: remote, facility)
- `it_admin_notes`, `photos` (jsonb)
- `resolution` (enum: overturned, upheld)
- `resolved_by` (fk users)
- `resolved_at`, `resolver_notes`
- `created_at`

### pickup_locations
- `id` (pk)
- `enterprise_id` (fk)
- `label`, `address_*`
- `is_default`, `is_active`
- `created_at`, `updated_at`

### pickup_requests
- `id` (pk)
- `enterprise_id` (fk)
- `location_id` (fk)
- `status` (enum: requested, assigned, scheduled, in_progress, completed, exception, cancelled)
- `preferred_date`, `preferred_time_slot`, `priority`
- `notes`, `it_admin_notes`
- `created_by` (fk users)
- `created_at`, `updated_at`, `completed_at`

### pickup_request_assets
- `id` (pk)
- `pickup_request_id` (fk)
- `asset_id` (fk unique)  // an asset can be in one active pickup at a time
- `status` (enum: requested, scheduled, picked_up, exception, dropped)
- `qc` (jsonb)  // on-site basic QC results
- `proof` (jsonb)  // photos, signature, gps, handover name/time
- `exception_code`, `exception_notes`
- `updated_at`

### logistics_partners
- `id` (pk)
- `name`, `contact_name`, `contact_email`, `contact_phone`
- `coverage_zips` (jsonb)
- `status`
- `created_at`, `updated_at`

### logistics_users
- `id` (pk)
- `partner_id` (fk logistics_partners)
- `user_id` (fk users) // link to auth user
- `availability` (jsonb), `performance` (jsonb), `status`
- `created_at`, `updated_at`

### logistics_assignments
- `id` (pk)
- `pickup_request_id` (fk)
- `logistics_user_id` (fk logistics_users)
- `logistics_admin_id` (fk users)
- `status` (enum: assigned, accepted, en_route, on_site, in_transit, delivered, exception)
- `eta`, `scheduled_at`, `started_at`, `completed_at`
- `exception_code`, `notes`
- `created_at`, `updated_at`
*Constraint*: one active assignment per pickup_request_id

### payouts
- `id` (pk)
- `enterprise_id` (fk)
- `batch_id` (fk nullable)
- `amount`, `status` (enum: draft, processing, processed, failed)
- `processed_at`, `processed_by` (fk users), `reference_id`
- `created_at`, `updated_at`

### payout_items
- `id` (pk)
- `payout_id` (fk)
- `asset_id` (fk unique) // asset paid once
- `amount`
- `created_at`

### epr_certificates
- `id` (pk)
- `batch_id` (fk)
- `certificate_number` (unique)
- `status` (enum: not_started, pending, issued)
- `issued_at`, `expires_at`
- `total_weight`
- `created_at`, `updated_at`

### recycler_partners
- `id` (pk)
- `name` (unique), `license`, `state`
- `contact_name`, `contact_email`, `contact_phone`
- `created_at`, `updated_at`

### notifications
- `id` (pk)
- `recipient_type` (user/sub_user), `recipient_id`
- `channel` (in_app/email/whatsapp)
- `type` (enum)
- `title`, `message`
- `status` (sent/read)
- `created_at`, `read_at`

### audit_logs
- `id` (pk)
- `entity_type`, `entity_id`
- `action`
- `from_status`, `to_status`
- `actor_id` (fk users)
- `metadata` (jsonb)
- `created_at`

## Constraints & Integrity Rules
- `assets`: UNIQUE(enterprise_id, serial_number); FK to batches/enterprise/sub_users.
- `pickup_request_assets`: UNIQUE(asset_id) for active requests; FK to pickup_requests/assets.
- `logistics_assignments`: only one active per pickup_request_id.
- `payout_items`: UNIQUE(asset_id) to prevent double pay.
- `epr_certificates`: UNIQUE(certificate_number).
- Status transitions enforced in services; DB can add CHECK constraints for enums.

## Migration Notes
- Create enums first, then tables with FKs.
- Seed roles and a few partners/logistics users for dev.
- Add indexes on status + foreign keys for queues: assets(status, enterprise_id), pickup_requests(status), logistics_assignments(status).
- For bulk upserts: match sub_users by (enterprise_id, email), assets by (enterprise_id, serial_number).

## Mapping to Current Front-End Stores
- assets ↔ `assetStore`
- batches ↔ `batchStore`
- sub_users ↔ `subUserStore`
- pickup_requests/locations ↔ `pickupStore` (to be extended with assignments/proofs/QC)
- payouts/payout_items ↔ `payoutStore` (new)
- reviews_remote/qcs_facility ↔ `reviewStore`
- notifications ↔ `notificationStore`
- audit_logs ↔ `auditStore`
- logistics_* ↔ new logistics stores/portals

This schema is concise, enforces relationships, and matches the PRD flows, minimizing duplication while keeping every transition auditable. 
