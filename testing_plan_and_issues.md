# Centinel Fin AI (ParentGuard) — Comprehensive Testing Plan & GitHub Issues

## 1. Executive Summary & Audit Findings

We conducted an end-to-end audit and test execution of the Centinel Fin AI codebase across backend services, authentication mechanisms, database schemas, and frontend integration.

### Current Test Execution Status
- **Backend (Spring Boot)**: Executed via `./mvnw.cmd test`.
  - **Result**: `129/129 Tests Passed (0 Failures, 0 Errors)`.
  - **Coverage**: Unit tests for categorization, masking, transaction parsing, and mock JWT controller tests for `PurchaseRequestController` and `FamilyController`.
- **Frontend (Next.js / TypeScript)**:
  - **Result**: Currently lacks an automated test framework (No Jest, Vitest, or Playwright configured).

---

## 2. Critical Architecture & Auth Findings

During our deep-dive into the authentication flow between Supabase and Spring Boot, we identified four critical discrepancies:

### 1. Supabase JWT Subject Type Mismatch (`CurrentUserResolver.java`)
- **Issue**: `CurrentUserResolver.java` executes `Long.parseLong(jwt.getSubject())`.
- **Root Cause**: Supabase Auth generates standard UUID strings for user IDs (e.g. `550e8400-e29b-41d4-a716-446655440000`), not numeric `Long`s.
- **Impact**: Any real Supabase JWT passed to `/api/v1/families` or `/api/v1/purchase-requests` will fail subject parsing and return `null`, causing authorization failures (403/500).

### 2. Frontend Auth Forms Not Connected to Supabase SDK
- **Issue**: `SignInPage` and `SignUpPage` contain static UI with `onSubmit={(e) => e.preventDefault()}` and hardcoded demo values.
- **Impact**: Users cannot sign in or register through the web interface with Supabase.

### 3. Missing User Registration API Endpoint in Backend
- **Issue**: `api-client.ts` calls `POST /api/v1/users/register`, but no corresponding endpoint or controller exists in the Spring Boot backend.
- **Impact**: After Supabase creates a user, the backend user profile/role entity cannot be synchronized or created.

### 4. Missing Route Protection Middleware in Frontend
- **Issue**: The Next.js frontend has no `middleware.ts` to inspect session cookies and redirect unauthenticated users to `/auth/sign-in`.

---

## 3. Comprehensive Testing Plan

```mermaid
flowchart TD
    A[Supabase Auth (Cloud/Local)] -->|Issue JWT (UUID sub)| B[Frontend (Next.js)]
    B -->|Authorization: Bearer <JWT>| C[Backend (Spring Boot Resource Server)]
    C -->|Validate Signature (JWKS)| D[SecurityFilterChain]
    D -->|Extract Role & Sub| E[CurrentUserResolver]
    E -->|Lookup User by Auth ID| F[PostgreSQL / Supabase DB]
```

### 3.1 Backend Testing Suite (Spring Boot)
- **Unit & MockMvc Tests**:
  - Test JWT decoder with UUID subjects and `app_metadata.role` claims (`PARENT` and `CHILD`).
  - Test RBAC rules: Ensure `ROLE_CHILD` cannot approve requests or create families; ensure `ROLE_PARENT` cannot submit purchase requests on behalf of children.
  - Test missing or expired tokens returning `401 Unauthorized`.
- **Database & JPA Integration Tests**:
  - Verify relational mapping between `User` (with Supabase Auth ID / email), `Family`, `FamilyMember`, and `PurchaseRequest`.

### 3.2 Frontend Testing Suite (Vitest / React Testing Library)
- **Component Tests**:
  - Form validation for email and password fields.
  - Role switcher interactions (`PARENT` vs `CHILD`).
  - Error banner display upon invalid credentials.
- **Auth Client Integration Tests**:
  - Mock `@supabase/ssr` / `@supabase/supabase-js` to test login, registration, and session token injection into `ApiClient.request`.

### 3.3 End-to-End (E2E) Testing Suite (Playwright)
- **User Flow 1: Parent Registration & Family Creation**:
  - Sign up as Parent -> Verify session created -> Create new family space.
- **User Flow 2: Child Onboarding & Purchase Request Flow**:
  - Sign up as Child -> Join family -> Submit purchase request -> Verify status is `PENDING`.
- **User Flow 3: Parent Approval**:
  - Sign in as Parent -> View pending purchase requests in family -> Click Approve -> Verify status updates to `APPROVED`.

---

## 4. GitHub Issues for Review

Below are the structured GitHub issues ready to be tracked and implemented:

### Issue #1: Fix Supabase JWT Subject Resolution & User Entity Mapping in Backend
- **Type:** `bug`, `backend`, `security`
- **Priority:** High
- **Description:**
  `CurrentUserResolver` assumes `jwt.getSubject()` is a `Long`. In Supabase, `sub` is a UUID string.
  1. Add a `supabase_user_id` (UUID/String) or `auth_id` column to `users` table and `User.java`.
  2. Update `CurrentUserResolver` to resolve the current user by UUID `sub` or email claim rather than parsing as `Long`.
  3. Update existing controller unit tests to verify UUID subjects.

### Issue #2: Connect Supabase Authentication Logic in Frontend Sign-In & Sign-Up Forms
- **Type:** `feature`, `frontend`, `auth`
- **Priority:** High
- **Description:**
  Connect the Next.js auth pages to the Supabase client:
  1. In `frontend/src/app/auth/sign-in/page.tsx`, handle form submit via `supabase.auth.signInWithPassword`.
  2. In `frontend/src/app/auth/sign-up/page.tsx`, handle form submit via `supabase.auth.signUp` passing `data.role`.
  3. Add loading indicators, field validation errors, and redirect on successful authentication.

### Issue #3: Implement Backend User Registration / Sync Endpoint (`/api/v1/users/register`)
- **Type:** `feature`, `backend`
- **Priority:** Medium
- **Description:**
  Implement `UserController` with `POST /api/v1/users/register`:
  1. Accepts user role and creates or links the internal `User` entity to the authenticated Supabase user ID.
  2. Protect endpoint with JWT authentication so the user ID is extracted from the verified token.

### Issue #4: Setup Frontend Automated Test Suite (Vitest + React Testing Library)
- **Type:** `enhancement`, `frontend`, `testing`
- **Priority:** High
- **Description:**
  1. Install and configure Vitest, `@testing-library/react`, and `@testing-library/user-event`.
  2. Add test scripts in `package.json` (`npm run test`).
  3. Add component unit tests for `SignInPage`, `SignUpPage`, and `ApiClient`.

### Issue #5: Setup Playwright E2E Test Suite for Auth and Purchase Request Flow
- **Type:** `enhancement`, `testing`, `e2e`
- **Priority:** Medium
- **Description:**
  1. Setup Playwright in `frontend/` or root directory.
  2. Write automated browser tests covering:
     - Sign-in with valid and invalid credentials.
     - Role-based redirection.
     - Submitting and reviewing purchase requests.

### Issue #6: Implement Next.js Auth Middleware for Protected Routes
- **Type:** `security`, `frontend`
- **Priority:** Medium
- **Description:**
  Create `frontend/src/middleware.ts` using `@supabase/ssr` to check session state on protected routes (`/dashboard`, `/family`, etc.) and redirect unauthenticated sessions to `/auth/sign-in`.
