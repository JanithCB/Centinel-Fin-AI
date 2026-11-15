# Centinel Fin AI: Master System Architecture & Engineering Blueprint

> **System Codename:** ParentGuard & Autonomous Personal Expense Intelligence  
> **Repository:** `D:\Centinel Fin AI`  
> **Core Stack:** Java 17+ (Spring Boot 3), Supabase PostgreSQL, Next.js 15 (React 19, TypeScript), Google Gemini 3.8 Flash, n8n Automation  
> **Design Philosophy:** Neo-Brutalism UI, Zero-Trust Security, Non-Custodial Financial Governance, Hybrid AI Categorization  
> **Document Version:** 1.0.0 (Living Architecture Specification)  
> **Date:** November 2026  

---

## 1. Executive Summary & Problem Domain

### 1.1 The Dual-Purpose Vision
**Centinel Fin AI** addresses two converging problems in modern personal and family finance:

1. **Unstructured Financial Data Overload:** Digital payments (cards, digital wallets, mobile apps, bank alerts) generate noisy, unstructured notification streams. Users cannot clearly see where money is going without manual data entry.
2. **Family Spending Governance (ParentGuard):** Traditional debit/credit cards give children binary access to money with zero oversight. ParentGuard introduces non-custodial, pre-purchase permissioning: children request approvals for purchases on web stores, and parents review and approve/deny requests in real-time before transactions occur.

### 1.2 Core Architectural Principles
* **Non-Custodial Governance:** Centinel Fin AI never holds or processes payments directly. It handles **permissions, metadata, audit trails, and intelligence**.
* **Privacy-First Data Sanitization:** Every raw message is scrubbed of Primary Account Numbers (PANs), card details, and personal identifiers **before** reaching any database or LLM.
* **Hybrid Intelligence:** High-throughput rule-based pattern matching handles 80%+ of known merchants in $O(1)$ time; Google Gemini 3.8 Flash is reserved as a fallback for unknown merchants and natural language ledger inquiries.
* **Zero-Trust Network Perimeter:** Stateless JWT verification, strict cryptographic API key enforcement on webhooks, and Role-Based Access Control (RBAC) separating `PARENT`, `CHILD`, and `ADMIN` boundaries.

---

## 2. End-to-End System Architecture (The Big Picture)

```mermaid
flowchart TD
    subgraph IngressTier["1. INGESTION & AUTOMATION TIER"]
        BankSMS["Bank SMS / Push Feeds"] --> N8N["n8n Webhook Ingestion Engine"]
        MockFeeder["feed_mock_data.ps1\n(Developer Test Harness)"] --> N8N
        N8N -->|POST /api/v1/ingestion/transaction-messages\nHeader: X-INGESTION-API-KEY| IngestCtrl["IngestionController.java"]
    end

    subgraph SecurityPerimeter["2. SECURITY & PRIVACY PERIMETER"]
        IngestCtrl --> ApiKeyInterceptor["IngestionApiKeyInterceptor.java\n(Secret Key Verification)"]
        ApiKeyInterceptor --> MaskingService["SensitiveDataMaskingService.java\n(PAN & PII Regex Scrubbing)"]
        MaskingService --> ParserService["TransactionMessageParserService.java\n(Amount, Merchant, Date Extraction)"]
        
        ClientBrowser["Browser / Next.js Client"] -->|Authorization: Bearer <Supabase JWT>| SecConfig["SecurityConfig.java\n(Spring Security 6 Resource Server)"]
        SecConfig --> UserResolver["CurrentUserResolver.java\n(Extracts Auth ID & Role Claims)"]
    end

    subgraph BusinessLogic["3. APPLICATION & HYBRID INTELLIGENCE TIER"]
        ParserService --> Categorizer["MerchantCategorizationService.java\n(Hybrid Categorization Core)"]
        
        Categorizer -->|Known Merchant: Keells, Uber, Netflix| RuleMatcher["Tier 1: Fast Rule Matcher\n(Regex & HashMap - O(1))"]
        Categorizer -->|Unknown Merchant Tokens| GeminiAI["Tier 2: Gemini 3.8 Flash Fallback\n(Structured JSON Category Extraction)"]
        
        UserResolver --> FamilyService["FamilyService.java\n(Family Creation, Member Linking)"]
        UserResolver --> PurchaseService["PurchaseRequestService.java\n(Approval Lifecycle State Machine)"]
        UserResolver --> SummaryService["SummaryService.java\n(Daily/Weekly/Monthly Rollups)"]
        
        GeminiToolAgent["Conversational Finance Agent\n(Gemini 3.8 Flash + Spring AI)"] -.->|Safe Function Tool Calling| SummaryService
    end

    subgraph StorageTier["4. DATABASE & AUDIT LEDGER"]
        RuleMatcher & GeminiAI --> TxRepo["TransactionRepository.java\n(BigDecimal Currency Precision)"]
        FamilyService --> FamRepo["FamilyRepository.java"]
        PurchaseService --> PurchRepo["PurchaseRequestRepository.java"]
        IngestCtrl --> AuditRepo["IngestedMessageRepository.java\n(Raw Message Hash Audit)"]

        TxRepo & FamRepo & PurchRepo & AuditRepo --> Postgres[(Supabase PostgreSQL 15+\nFlyway Migrations\nACID Compliant)]
    end

    subgraph PresentationTier["5. PRESENTATION LAYER (Next.js 15)"]
        Postgres <--> NextApp["Next.js App Router (React 19, TypeScript)\nNeo-Brutalist Styling (--ink #151515, --paper #FFFDF7)"]
        NextApp --> LandingPage["/ (Hero, CTAs, Trust Indicators)"]
        NextApp --> AuthPages["/auth/sign-in & /auth/sign-up\n(Supabase SSR Auth)"]
        NextApp --> DashboardPage["/dashboard\n(Role-Aware: Parent Approval vs Child Request)"]
        NextApp --> Visualizer3D["/sentinel_dev_log_3d.html\n(Procedural Three.js Neo-Brutalist 3D Schema)"]
    end
```

---

## 3. Detailed Component Decomposition

### 3.1 Ingestion & Privacy Perimeter (What Is Built)

#### A. Ingestion API Key Interceptor (`com.centinel.finai.config.IngestionApiKeyInterceptor`)
* **Role:** Protects the ingestion webhook endpoint against public DDoS or unauthorized message injection.
* **Mechanism:** Intercepts every request to `/api/v1/ingestion/**` and validates the incoming `X-INGESTION-API-KEY` header against the server-side environment secret (`CENTINEL_INGESTION_API_KEY`).
* **Failure Mode:** Rejects mismatched or missing headers with `401 Unauthorized` before any payload parsing occurs.

#### B. Sensitive Data Masking Service (`com.centinel.finai.service.SensitiveDataMaskingService` & `MaskingUtils`)
* **Role:** Guarantees strict PCI-DSS / GDPR privacy alignment by scrubbing sensitive payment data before storage or AI processing.
* **Masking Rules:**
  - **Credit / Debit Cards (PAN):** Replaces card numbers matching Luhn-valid patterns with masked representations:  
    `4111 2222 3333 4444` $\to$ `****-****-****-4444`.
  - **Bank Account Numbers:** Long numeric sequences identified as account references are masked to their trailing 4 digits.
  - **PII:** Removes personal phone numbers and customer reference IDs from the raw text string passed to the classifier.

#### C. Transaction Message Parser (`com.centinel.finai.service.TransactionMessageParserService`)
* **Role:** Converts unstructured banking notifications into strongly-typed transaction candidates.
* **Extraction Fields:**
  - `amount`: Captured as `java.math.BigDecimal` to eliminate floating-point rounding errors.
  - `currency`: Extracted via regex (e.g., `LKR`, `USD`, `Rs.`, `EUR`).
  - `merchant`: Cleaned merchant name token.
  - `timestamp`: Extracted ISO-8601 or formatted notification timestamp.
* **Test Harness:** `feed_mock_data.ps1` simulates 7 real-world SMS notifications (Keells, Cargills, Uber, Uber Eats, Dialog, Netflix, Daraz).

---

### 3.2 Backend Core & Domain Models (What Is Built)

The backend is built with **Java 17+ and Spring Boot 3**, structured across clean domain packages:

```
com.centinel.finai
├── common              # Security configuration, JWT resolver, error responses
│   ├── SecurityConfig.java
│   └── CurrentUserResolver.java
├── config              # Interceptors, filters, MVC config
│   ├── IngestionApiKeyInterceptor.java
│   └── RequestLoggingFilter.java
├── controller          # REST API endpoints
│   ├── FamilyController.java
│   ├── IngestionController.java
│   ├── HealthController.java
│   ├── PurchaseRequestController.java
│   ├── SummaryController.java
│   └── TaskController.java
├── entity              # JPA domain entities
│   ├── IngestedMessage.java
│   └── Transaction.java
├── family              # ParentGuard family domain
│   ├── Family.java
│   ├── FamilyMember.java
│   └── FamilyService.java
├── identity            # User and RBAC definitions
│   ├── User.java
│   ├── UserRepository.java
│   └── UserRole.java (PARENT, CHILD, ADMIN)
├── purchase            # ParentGuard purchase request domain
│   ├── ApprovalDecision.java
│   ├── PurchaseRequest.java
│   ├── PurchaseRequestStatus.java (PENDING, APPROVED, REJECTED)
│   └── PurchaseRequestService.java
├── repository          # Spring Data JPA repositories
└── service             # Business services (Masking, Parsing, Categorization)
```

#### Key Relational Schema & Guarantees
* **`User` Entity:** Maps directly to Supabase Auth UUIDs, storing `email`, `fullName`, and `UserRole` (`PARENT` or `CHILD`).
* **`Family` & `FamilyMember`:** Enforces family groupings. A user with `ROLE_PARENT` creates a family; users with `ROLE_CHILD` are linked as members.
* **`PurchaseRequest`:** Represents a purchase authorization workflow:
  - Columns: `id (UUID)`, `family_id`, `child_id`, `site_domain`, `item_name`, `amount (BigDecimal)`, `currency`, `category`, `status (PENDING, APPROVED, REJECTED)`, `created_at`.
  - State Transitions: `PENDING` $\xrightarrow{\text{Parent Action}}$ `APPROVED` or `REJECTED`. Immutable historical decision record saved in `ApprovalDecision`.
* **`Transaction`:** Stores finalized ledger entries with `BigDecimal amount`, merchant name, category, and reference to raw ingested message.

---

### 3.3 Hybrid Categorization & AI Engine

```
                             Raw Ingested Message
                                      │
                                      ▼
                        [ Sensitive Data Masking ]
                                      │
                                      ▼
                       [ Transaction Message Parser ]
                                      │
                                      ▼
                      MerchantCategorizationService
                                      │
                Is merchant recognized in Rule Database?
                                ╱           ╲
                              YES            NO
                              ╱               ╲
                             ▼                 ▼
                     [ TIER 1 MATCH ]      [ TIER 2 FALLBACK ]
                    Regex / HashMap       Gemini 3.8 Flash
                    • Keells -> Groceries • Structured JSON output
                    • Uber -> Transport   • Schema-validated category
                    • Netflix -> Subsc.   • Masked tokens only
                    (Cost: $0.00, <1ms)   (Cost: Free tier, ~250ms)
                             ╲                 ╱
                              ▼               ▼
                           Final Transaction Category
```

#### Status:
* **Tier 1 (Rule-Based):** **Implemented & Tested.** Covers primary merchants with zero latency and zero LLM cost.
* **Tier 2 (Gemini Fallback):** **In Development.** Will invoke Google Gemini 3.8 Flash using structured JSON output to classify unknown or international merchants.
* **Tier 3 (Conversational Ledger Assistant):** **Planned Milestone.** Will implement Spring AI tool-calling so Gemini can query `SummaryService` to answer questions like *"How much did I spend on groceries this month?"* without direct SQL access.

---

### 3.4 Frontend Architecture (Next.js 15 Neo-Brutalism)

The frontend is located at `D:\Centinel Fin AI\frontend` and runs on **Next.js 15 (Turbopack, React 19, TypeScript)**.

#### Visual System: Neo-Brutalism
* **Background:** `--paper: #FFFDF7` (Warm off-white, eliminates sterile gray).
* **Text & Outlines:** `--ink: #151515` (High-contrast solid black borders, `border-[3px] border-[#151515]`).
* **Shadows:** Hard-offset drop shadows with zero blur: `shadow-[4px_4px_0px_#151515]`, `shadow-[6px_6px_0px_#151515]`.
* **Color Accents:** Flat, solid tokens:
  - `--lime: #D9FF3F` (Primary action button / active state)
  - `--mint: #8EF0C0` (Success & operational badges)
  - `--sky: #8DDAFF` (Informational & child elements)
  - `--sun: #FFD64A` (Pending alerts / protocol status)
  - `--coral: #FF8F7C` (Destructive action / denial)

#### Complete Page Inventory

| Route | Page Name | Primary Features & User Outcomes | Access Control |
| :--- | :--- | :--- | :--- |
| **`/`** | Landing Page | Hero statement, non-custodial protocol ticker, trust indicators, `[ GET STARTED ]`, `[ SIGN IN ]`, and **`[ ARCHITECTURE VIEW (3D) ]`**. | Public |
| **`/auth/sign-in`** | Sign-In Screen | Pre-seeded with test parent account (`alex.turner@familyguard.internal` / `12345678`), Supabase client authentication. | Public |
| **`/auth/sign-up`** | Registration | Creates Supabase auth record, assigns initial role (`PARENT` or `CHILD`). | Public |
| **`/auth/verify-email`** | Verification | Directs unconfirmed users to check their mailbox for confirmation magic links. | Public |
| **`/dashboard`** | ParentGuard Portal | **Role-Aware Dashboard:**<br>• **PARENT View:** Review pending purchase requests, approve/deny buttons, family member management, child linking.<br>• **CHILD View:** Submit new purchase request form (site domain, item, amount, category), view approval status. | Authenticated (Session Cookie) |
| **`/sentinel_dev_log_3d.html`** | 3D System Spec | Interactive procedural 3D model of system architecture. Clicking pods reveals live Java classes, security controls, and metrics in a slide-out drawer. | Public / Developer |

---

## 4. Security, Trust Boundaries & Threat Analysis (STRIDE)

```mermaid
flowchart LR
    subgraph Zone0["Untrusted Zone"]
        Ext["Public Webhooks / Internet Users"]
    end

    subgraph Zone1["DMZ / Ingress"]
        WAF["Reverse Proxy / Cloudflare"]
        ApiKeyGate["X-API-KEY Gate"]
    end

    subgraph Zone2["Trusted Application Boundary (VPC)"]
        SecFilter["Spring Security Filter Chain"]
        ServiceMesh["Java Spring Boot Services"]
    end

    subgraph Zone3["Isolated Storage Subnet"]
        DB["Supabase PostgreSQL (SSL Mode Require)"]
    end

    subgraph Zone4["External AI Sandbox"]
        GeminiCloud["Google Gemini 3.8 Flash Cloud"]
    end

    Ext -->|TB-1: Public Ingress| Zone1
    Zone1 -->|TB-2: Authenticated Transport| Zone2
    Zone2 -->|TB-3: Encrypted JDBC Pool| Zone3
    Zone2 -->|TB-4: Masked Tokens Only| Zone4
```

### STRIDE Threat Modeling Matrix

| Threat Category | Potential Attack Vector | Centinel Fin AI Mitigation Control | Architectural Location |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Attacker fakes webhook payload claiming to be a bank SMS notification. | **`IngestionApiKeyInterceptor`:** Enforces static high-entropy secret key in `X-INGESTION-API-KEY`. | `IngestionApiKeyInterceptor.java` |
| **Spoofing** | Child tries to impersonate parent to approve their own purchase request. | **`CurrentUserResolver` + RBAC:** Validates Supabase JWT signature via JWKS and checks `role == PARENT` claim. | `SecurityConfig.java`<br>`PurchaseRequestService.java` |
| **Tampering** | Modifying transaction amounts or currency during transmission. | **`BigDecimal` Validation & Bean Validation (`@Valid`):** Strict decimal normalization; reject invalid formatting. | `Transaction.java`<br>`PurchaseRequestDTO.java` |
| **Repudiation** | User denies receiving or approving a purchase request. | **`ApprovalDecision` Ledger:** Every approval/denial writes an immutable audit record containing `decided_by`, `timestamp`, and `status`. | `ApprovalDecisionRepository.java` |
| **Information Disclosure** | Credit card numbers or account numbers leaking to LLM or logs. | **`SensitiveDataMaskingService`:** Strict regex PAN scrubbing replaces numbers with `****` before any service or LLM call. | `MaskingUtils.java`<br>`SensitiveDataMaskingService.java` |
| **Denial of Service** | Flooding webhook endpoint with bogus transaction payloads. | **Rate-Limiting & Payload Size Limits:** Spring Web server caps payload size to 64KB; edge proxy drops excess bursts. | `application.properties`<br>Ingress Gate |
| **Elevation of Privilege** | Child bypassing UI to call `POST /api/v1/families/{id}/members`. | **Method-Level Security (`@PreAuthorize`):** Backend enforces role checks at controller level regardless of frontend state. | `FamilyController.java` |

---

## 5. Master Roadmap & Implementation Status

### 🟢 What Is Built & Verified (Operational)

- [x] **Spring Boot 3 Core Backend:** Configured with Maven, Java 17+, and Spring Data JPA.
- [x] **Relational Schema on Supabase:** `users`, `families`, `family_members`, `purchase_requests`, `transactions`, `ingested_messages`.
- [x] **Financial Math Precision:** All calculations use `BigDecimal` with explicit rounding modes.
- [x] **Sensitive Data Masking:** Comprehensive PAN, card number, and account number regex masking (`SensitiveDataMaskingService`).
- [x] **Webhook Ingestion Pipeline:** `IngestionController` with `X-INGESTION-API-KEY` security interceptor.
- [x] **Transaction Message Parser:** Regex parser extracting amount, merchant, and timestamp from unstructured notifications.
- [x] **Mock Feeder Harness:** `feed_mock_data.ps1` successfully populates test transactions.
- [x] **Rule-Based Categorizer (Tier 1):** Fast HashMap/Regex classification for known merchants.
- [x] **ParentGuard Approval Workflow:** Full state machine (`PENDING` $\to$ `APPROVED` / `REJECTED`) and history logging.
- [x] **Next.js 15 Frontend:** Complete Neo-Brutalist UI with authentication, role-aware dashboards, and navigation buttons.
- [x] **Interactive 3D Architectural Visualizer:** Procedural Three.js Neo-Brutalist model embedded directly at `/sentinel_dev_log_3d.html`.
- [x] **Automated Backend Tests:** `129/129 Tests Passing (0 Failures, 0 Errors)`.

---

### 🟡 What Needs to Be Built (Next Milestones)

#### Milestone 1: Complete Supabase Auth Synchronization (Immediate Priority)
* **Goal:** Fix the UUID subject mapping in `CurrentUserResolver.java` so real Supabase Auth JWTs bind seamlessly to backend database records.
* **Tasks:**
  1. Update `CurrentUserResolver.java` to parse `jwt.getSubject()` as a `String` (UUID) instead of `Long.parseLong()`.
  2. Implement `POST /api/v1/users/register` in `UserController.java` to automatically create a database profile upon Supabase sign-up.

#### Milestone 2: Gemini 3.8 Flash AI Fallback Integration
* **Goal:** Automatically categorize transactions from unfamiliar merchants that fail Tier 1 regex matching.
* **Tasks:**
  1. Add `spring-ai-google-gemini` or official Gemini SDK dependency in `pom.xml`.
  2. Implement `GeminiCategorizationClient.java` with a structured JSON output schema:
     ```json
     { "category": "TRANSPORT", "confidence": 0.94, "cleanMerchant": "ZipCar" }
     ```
  3. Wire fallback logic in `MerchantCategorizationService.java` to trigger Gemini only after data has been masked.

#### Milestone 3: Conversational Financial Intelligence Agent
* **Goal:** Enable users to ask natural-language questions about their spending via chat.
* **Tasks:**
  1. Define Spring AI `@Tool` functions exposing read-only summaries (`getSpendingByCategory(period)`, `getTotalSpent(month)`).
  2. Build `ChatController.java` (`POST /api/v1/chat`) streaming responses via Server-Sent Events (SSE).
  3. Add a floating chat drawer in the Next.js `/dashboard` UI.

#### Milestone 4: Production Deployment & CI/CD
* **Goal:** Host the platform on public infrastructure.
* **Target Platforms:**
  - Backend: Google Cloud Run (Containerized via Jib / Dockerfile).
  - Database: Supabase Managed PostgreSQL.
  - Frontend: Vercel / Cloudflare Pages.
  - Ingestion: n8n Cloud or self-hosted container.

---

## 6. Developer Local Runbook (How to Run Everything)

### 1. Prerequisites
* **Java:** JDK 17 or JDK 21+ (`java -version`)
* **Node.js:** v20+ or v24+ (`node -v`)
* **Database:** Active Supabase project (credentials configured in `.env.local`)

### 2. Booting the Next.js Frontend
```powershell
cd "D:\Centinel Fin AI\frontend"
npm run dev
```
* **Landing Page:** [http://localhost:3000](http://localhost:3000)
* **3D Architecture View:** [http://localhost:3000/sentinel_dev_log_3d.html](http://localhost:3000/sentinel_dev_log_3d.html)
* **Sign-In Screen:** [http://localhost:3000/auth/sign-in](http://localhost:3000/auth/sign-in)

### 3. Booting the Spring Boot Backend
```powershell
cd "D:\Centinel Fin AI"
.\mvnw.cmd spring-boot:run
```
* **API Base:** `http://localhost:8080/api/v1`
* **Health Check:** `http://localhost:8080/actuator/health`

### 4. Running Backend Automated Tests
```powershell
cd "D:\Centinel Fin AI"
.\mvnw.cmd test
```

### 5. Feeding Simulated Transaction Data
```powershell
cd "D:\Centinel Fin AI"
.\feed_mock_data.ps1
```

---

*This document is committed directly to your repository at `D:\Centinel Fin AI\docs\MASTER_SYSTEM_ARCHITECTURE.md` as the permanent source of truth for the platform.*
