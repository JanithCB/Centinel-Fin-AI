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

## 4. Live GitHub Issues

All 6 issues have been created and published to the GitHub repository:

### [Issue #4: Fix Supabase JWT Subject Resolution & User Entity Mapping in Backend](https://github.com/JanithCB/Centinel-Fin-AI/issues/4)
- **Status:** Resolved (Implemented & Tested)
- **Labels:** `bug`, `security`
- **Link:** https://github.com/JanithCB/Centinel-Fin-AI/issues/4

### [Issue #5: Connect Supabase Authentication Logic in Frontend Sign-In & Sign-Up Forms](https://github.com/JanithCB/Centinel-Fin-AI/issues/5)
- **Status:** Resolved (Implemented & Tested)
- **Labels:** `enhancement`
- **Link:** https://github.com/JanithCB/Centinel-Fin-AI/issues/5

### [Issue #6: Implement Backend User Registration / Sync Endpoint (`/api/v1/users/register`)](https://github.com/JanithCB/Centinel-Fin-AI/issues/6)
- **Status:** Resolved (Implemented & Tested)
- **Labels:** `enhancement`
- **Link:** https://github.com/JanithCB/Centinel-Fin-AI/issues/6

### [Issue #7: Setup Frontend Automated Test Suite (Vitest + React Testing Library)](https://github.com/JanithCB/Centinel-Fin-AI/issues/7)
- **Status:** Resolved (Implemented & Tested)
- **Labels:** `enhancement`
- **Link:** https://github.com/JanithCB/Centinel-Fin-AI/issues/7

### [Issue #8: Implement Next.js Auth Middleware for Protected Routes](https://github.com/JanithCB/Centinel-Fin-AI/issues/8)
- **Status:** Resolved (Implemented & Tested)
- **Labels:** `security`
- **Link:** https://github.com/JanithCB/Centinel-Fin-AI/issues/8

### [Issue #9: Setup Playwright E2E Test Suite for Auth and Purchase Request Flow](https://github.com/JanithCB/Centinel-Fin-AI/issues/9)
- **Status:** Open (Ready for implementation)
- **Labels:** `enhancement`
- **Link:** https://github.com/JanithCB/Centinel-Fin-AI/issues/9

