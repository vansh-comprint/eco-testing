# Analyst Agent Memory

## EcoTribe Frontend Auth System Security Audit (2026-02-10)

### Token Storage Architecture
- **Access token**: `ecotribe_access_token` (localStorage)
- **Refresh token**: `ecotribe_refresh_token` (localStorage)
- **Auth state**: `ecotribe-auth-api` (Zustand persist key, localStorage)
- **[SECURITY ISSUE]**: localStorage vulnerable to XSS — tokens readable by any injected script

### Token Refresh Flow (client.ts:94-133)
- **Mutex protection**: `refreshPromise` prevents concurrent refresh races (GOOD)
- **Automatic retry**: 401 triggers refresh → retries original request (GOOD)
- **Rotation support**: Backend can rotate refresh token, client accepts new one (line 126)
- **[ISSUE]**: No max retry limit — infinite loop possible if refresh endpoint returns 401

### Logout Flow (authStoreApi.ts:318-330)
- **Fire-and-forget**: Backend logout called but errors ignored (line 320)
- **Local cleanup**: clearTokens() removes both tokens + Zustand persist state (GOOD)
- **[ISSUE]**: No token blacklist confirmation — if backend call fails, token remains valid server-side
- **Navigation**: Sets isInitialized=false, forcing re-auth on next action (GOOD)

### Page Unload Guard (client.ts:25-31, 58-68)
- **Purpose**: Prevents token clearing during hard refresh / navigation
- **Implementation**: beforeunload sets flag, forceLogout checks flag before clearing
- **[GOOD]**: Prevents UX bug where refresh loses session

### Auth Initialization (authStoreApi.ts:96-179)
- **Guard**: Prevents concurrent initialization (line 98)
- **Token check**: If no token, immediately sets isInitialized=true (no API call)
- **User fetch**: Calls `/auth/me` to validate token
- **Enterprise fetch**: Auto-fetches enterprise data if user.enterpriseId exists
- **[SECURITY ISSUE]**: Transient errors (NETWORK_ERROR, PAGE_UNLOADING) keep tokens — potential expired token persistence (lines 150-158)
- **[GOOD]**: onRehydrateStorage forces isInitialized=false, isAuthenticated=false (lines 414-421)

### Role Mapping (authStoreApi.ts:50-63)
- **Backward compat**: main_admin → ops_admin, technician → ops_admin, sub_user → employee
- **Fallback**: Unknown roles default to 'employee' (line 63)
- **[ISSUE]**: Silent role downgrade could grant unintended access

### Route Protection (ProtectedRoute.tsx:11-66)
- **Loading state**: Shows spinner while !isInitialized (GOOD)
- **Auth check**: Redirects to /login if !isAuthenticated || !user (GOOD)
- **Role check**: Redirects to role's default portal if access denied (GOOD)
- **[ISSUE]**: No session timeout — relies only on backend token expiry

### Login Flow (LoginPage.tsx:49-77)
- **Validation**: Client-side email regex + min password length (6 chars)
- **[SECURITY ISSUE]**: Password min 6 chars is WEAK (industry standard 8-12)
- **Navigation**: Role-based redirect after successful login (GOOD)
- **[ISSUE]**: No rate limiting on frontend (relies on backend)

### API Client Security
- **No CSRF protection**: No CSRF tokens in requests (JWT-only auth)
- **No XSS protection**: No dangerouslySetInnerHTML found (GOOD)
- **[ISSUE]**: No Content-Security-Policy headers in index.html
- **[ISSUE]**: No X-Frame-Options, X-Content-Type-Options headers
- **CORS**: Backend handles CORS (main.py:162-164), frontend sends credentials via Authorization header

### Environment Configuration
- **Production**: VITE_API_URL=https://api-wrapper.ecotribe.co/api/v1 (.env.production)
- **Development**: Auto-detect from window.location (localhost:8000)
- **[GOOD]**: No hardcoded secrets in frontend code
- **[GOOD]**: API wrapper hides backend internal IP

### OTP Flow (authStoreApi.ts:240-312)
- **Employee login**: requestOTP → email sent → verifyOTP → tokens issued
- **[ISSUE]**: No rate limiting visible on frontend
- **[ISSUE]**: No OTP expiry shown to user (relies on backend)

### Session Management
- **No explicit timeout**: No inactivity logout, no session expiry warning
- **No concurrent session limit**: Frontend doesn't enforce (backend has max 5 sessions per user)
- **No remember me**: Tokens stored indefinitely in localStorage

### React Query Integration (App.tsx:11-27)
- **Global invalidation**: ALL queries invalidated after ANY mutation (line 23)
- **[PERFORMANCE ISSUE]**: Over-invalidation could cause excessive refetches
- **staleTime**: 5s (short), refetchOnWindowFocus: true (GOOD for security)
- **No query persistence**: React Query cache is memory-only (GOOD)

### Zustand Persistence (authStoreApi.ts:403-423)
- **Persist key**: 'ecotribe-auth-api'
- **Partialize**: Only persists user, enterprise, isAuthenticated (NOT isInitialized)
- **[GOOD]**: onRehydrateStorage forces re-validation on app load
- **[ISSUE]**: Persisted state in localStorage readable by XSS

### Missing Security Features
1. **No HttpOnly cookies**: Tokens in localStorage, not secure HttpOnly cookies
2. **No SameSite cookies**: No cookie-based auth at all
3. **No CSP headers**: index.html missing Content-Security-Policy
4. **No token expiry UI**: No warning before token expires
5. **No session timeout UI**: No inactivity logout
6. **No device fingerprinting**: No device/browser tracking
7. **No 2FA support**: No two-factor auth flow visible

### Production Readiness Score: 6/10
**Strengths**:
- Mutex-protected token refresh
- Proper role-based routing
- Clean auth state management
- No XSS injection vectors found

**Critical Gaps**:
- localStorage token storage (XSS vulnerability)
- No CSP/security headers
- Weak password validation (6 chars)
- No session timeout
- No explicit token blacklist confirmation

### Scan Strategy Effectiveness: 5/5
- Reading auth store → context → API client → login page → protected route in sequence was complete
- Grepping for dangerouslySetInnerHTML, eval, cookie patterns caught all security vectors
- Checking both .env files revealed production config
- Following token lifecycle from storage → refresh → logout → initialization covered all flows

---

## EcoTribe Frontend UX Audit (2026-02-12)

### Audit Scope
Scanned: `frontend/src/pages/`, `frontend/src/components/ui/`
Focus: Forms, modals, mutations, empty states, error feedback
Files analyzed: 90+ page components, 4 modal components

### Critical UX Issues Found: 23 total
- **Critical (user-blocking)**: 3 issues
- **High (causes frustration)**: 7 issues
- **Medium (annoying)**: 8 issues
- **Low (polish)**: 5 issues

### Top 5 Critical/High Issues
1. **RemoteReview.tsx:78-87** — Silent validation failure (no error toast)
2. **SignupPage.tsx:105-157** — Multi-step form data loss on error (no localStorage persistence)
3. **AssetList.tsx:298-322** — Bulk operations missing progress feedback (loops with no UI update)
4. **EmployeeInvite.tsx:166-192** — Partial failure handling broken (shows success even if some fail)
5. **BatchDetail.tsx:354-384** — Double-submit risk on pickup creation (button disabled but no spinner)

### Patterns That Work Well
- **Error handling**: 145 instances of `showSuccess/showError/addToast` across 36 files
- **Keyboard support**: Modal.tsx and ConfirmationModal.tsx handle Escape key
- **Form validation**: Real-time inline errors with field-specific messages
- **Confirmation modals**: Destructive actions protected by ConfirmationModal
- **Loading states**: Most buttons use `disabled={isLoading}` pattern

### Missing Patterns (Should Exist)
- ❌ No global loading overlay for long operations
- ❌ No optimistic updates
- ❌ No mutation retry mechanism
- ❌ No session timeout warning (JWT expires silently)
- ❌ No unsaved changes warning on navigation
- ❌ No form auto-save to localStorage

### Scan Strategy Used
1. Read key pages: LoginPage, SignupPage, BatchCreate, BatchDetail, AssetList, EmployeeInvite, DeviceSubmit
2. Read modal components: Modal, ConfirmationModal, DeleteBatchModal
3. Grep for patterns:
   - `disabled={isPending}` (button loading states)
   - `onClick.*delete` (destructive actions)
   - `length === 0` (empty states)
   - `catch|handleError` (error handling coverage)
   - `toast|addToast|showSuccess` (feedback mechanisms)
4. Check high-traffic flows: login → batch creation → asset add → submission → review

### Effectiveness Score: 4/5
- Reading full page components caught context-dependent issues (e.g., multi-step form state)
- Grep patterns effective for counting patterns (145 error handlers found)
- **Missed**: Would have benefited from checking Toast/ErrorBoundary implementation for completeness
- **Future improvement**: Grep for `useForm` + `reset()` to find form reset issues faster

### Key Findings by Category

**Loading States (7 issues)**
- RemoteReview, BatchDetail, AssetList bulk ops, EmployeeInvite all missing visual spinners
- Buttons disabled but no progress indicator

**Form Reset (5 issues)**
- BatchCreate, EmployeeInvite, DeviceSubmit don't clear form after success
- SignupPage multi-step loses data on error

**Empty States (4 issues)**
- BatchList, AssetList infinite scroll, RemoteReview queue
- Most show blank space instead of helpful "No items" message

**Validation Feedback (3 issues)**
- RemoteReview returns silently on validation error
- BatchCreate submit button not disabled when form invalid
- DeviceSubmit photo upload has no size/format validation

**Destructive Actions (GOOD)**
- All delete operations use confirmation modals
- DeleteBatchModal, ConfirmationModal have proper disabled states during operations

### Recommendations Priority Order
1. Fix RemoteReview silent validation (CRITICAL)
2. Add progress to bulk operations (HIGH)
3. Persist SignupPage to localStorage (HIGH)
4. Add spinners to all mutation buttons (HIGH)
5. Fix EmployeeInvite partial failure (HIGH)
6. Add "End of list" to infinite scroll (MEDIUM)
7. Reset forms on success (MEDIUM)
8. Add empty state components (MEDIUM)
9. Add unsaved changes warning (LOW)
10. Cap EmployeeInvite max invites (LOW)

### Files Requiring Immediate Attention
1. `frontend/src/pages/review/RemoteReview.tsx`
2. `frontend/src/pages/auth/SignupPage.tsx`
3. `frontend/src/pages/admin/BatchDetail.tsx`
4. `frontend/src/pages/admin/AssetList.tsx`
5. `frontend/src/pages/admin/EmployeeInvite.tsx`
