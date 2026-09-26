# Testing Plan and GitHub Issues

## 1. Testing Plan

### 1.1 Backend Testing (Spring Boot)
- **Unit Tests**: Add JUnit tests for core services (e.g., `TransactionService`, `FamilyMemberService`) mocking repositories with Mockito.
- **Integration Tests**: Use `@SpringBootTest` with an in-memory H2 database to test repository interactions and JPA mappings.
- **Security Tests**: Test protected endpoints with `@WithMockUser` and verify that unauthorized requests return `401 Unauthorized` or `403 Forbidden`. Test JWT validation.
- **Controller Tests**: Use `MockMvc` to verify the request/response payloads, status codes, and HTTP methods.

### 1.2 Frontend Testing (Next.js)
- **Framework Setup**: Setup Jest and React Testing Library (RTL) for unit and component testing.
- **Component Tests**: Test UI components for correct rendering and interaction (e.g., login forms, transaction lists).
- **Authentication Context**: Mock the Supabase Auth context to test rendering of protected routes vs public routes.
- **E2E Tests**: Set up Playwright (or Cypress) to run full browser end-to-end testing, specifically for the signup, login, and logout flows connecting the frontend to Supabase.

### 1.3 Supabase & Authentication specific testing
- **Backend Token Verification**: Ensure the backend properly decodes and validates the JWT from Supabase.
- **Frontend Auth State**: Ensure the frontend securely handles the session state, redirects properly on unauthenticated access, and persists sessions correctly.

---

## 2. GitHub Issues to Create

### Issue 1: Setup Frontend Testing Suite (Jest + React Testing Library)
**Title:** Setup Jest and React Testing Library for Frontend Unit Tests
**Description:**
The Next.js frontend currently lacks a testing framework.
- Install Jest, React Testing Library, and necessary dependencies.
- Configure `jest.config.js` and test environments.
- Create a sample test for a basic UI component.
**Labels:** `frontend`, `testing`, `enhancement`

### Issue 2: Implement Unit and Integration Tests for Backend Services
**Title:** Implement Unit and Integration Tests for Backend Services
**Description:**
We need to ensure business logic is robust.
- Write unit tests for `TransactionService` and other core services using Mockito.
- Implement repository tests with H2 database.
**Labels:** `backend`, `testing`

### Issue 3: Setup End-to-End (E2E) Testing for Authentication Flows
**Title:** Implement E2E Testing for Authentication Flows with Playwright
**Description:**
Set up an E2E testing framework (like Playwright) to test the critical authentication paths.
- Test user registration.
- Test user login and logout.
- Test protected route redirects.
**Labels:** `frontend`, `e2e`, `auth`

### Issue 4: Implement API Security and JWT Validation Tests
**Title:** Implement Security and JWT Validation Tests
**Description:**
Ensure that our API endpoints are properly secured.
- Write `MockMvc` tests to verify that endpoints require authentication.
- Test token validation logic to ensure forged or expired tokens are rejected.
**Labels:** `backend`, `security`, `testing`

### Issue 5: Test Supabase Auth Integration on Frontend
**Title:** Test Supabase Auth Integration and Protected Routes
**Description:**
- Write tests to verify the Supabase client initialization.
- Test the auth provider context.
- Verify that users are redirected to `/login` when trying to access dashboard routes without an active session.
**Labels:** `frontend`, `auth`, `testing`
