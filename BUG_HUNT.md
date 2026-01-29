# EcoTribe Bug Hunt Log

*Started: 2026-01-28*
*Hunter: Claude (Ruthless Mode)*

---

## Objective
Systematically test the entire EcoTribe platform:
- Frontend (React + TypeScript)
- Backend (FastAPI)
- Business Logic (7 user roles, workflows)
- Database (PostgreSQL)

---

## User Roles to Test
1. Super Admin - Platform oversight
2. OPS Admin - Operations management
3. Org Admin - Enterprise administration
4. IT Admin - Branch-level management
5. Sub-User (Employee) - Device submission
6. Logistics Admin - Partner management
7. Logistics User - Field operations

---

## Test Sessions

### Session 1: 2026-01-28

#### Phase 1: Backend Health Check
- [ ] Verify backend is running
- [ ] Test API endpoints accessibility
- [ ] Check database connectivity
- [ ] Verify authentication flow

#### Phase 2: Frontend Health Check
- [ ] Verify frontend is running
- [ ] Test login page loads
- [ ] Check role-based routing

#### Phase 3: User Flow Testing
- [ ] Super Admin workflow
- [ ] Org Admin workflow
- [ ] IT Admin workflow
- [ ] Sub-User workflow
- [ ] Logistics workflow

---

## Bugs Found

| ID | Severity | Component | Description | Status |
|----|----------|-----------|-------------|--------|
| BH-001 | Medium | Backend | JWT token expires in 30 min instead of 480 min. Config is correct but backend needs restart. | Open |

---

## Bugs Fixed

| ID | Component | Fix Description | Date |
|----|-----------|-----------------|------|
| | | | |

---

## Test Results

| Test | Result | Notes |
|------|--------|-------|
| | | |

---

*This document is updated continuously during testing.*
