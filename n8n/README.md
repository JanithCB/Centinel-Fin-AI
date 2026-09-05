# Centinel Fin AI — n8n Ingestion Workflows

This directory contains exported, sanitized n8n workflows for the Centinel Fin AI automated ingestion pipeline.

---

## 1. Overview

The `mock_transaction_ingestion_workflow.json` workflow simulates incoming payment and expense notifications from an external automation pipeline (e.g., SMS forwarder, banking alert webhook) without requiring real SMS permissions or exposing sensitive credentials.

### Workflow Architecture:
```text
[Manual Trigger]
       │
       ▼
[Set Mock Transaction Data] ──► Generates CEN-7 compliant payload
       │
       ▼
[HTTP Request Node] ─────────► POST http://localhost:8080/api/v1/ingestion/transaction-messages
       │
       ▼
[Response Output] ───────────► HTTP 202 Accepted (or HTTP 200 Duplicate)
```

---

## 2. Quick Start: Running n8n Locally

You can run n8n locally using either `npx` or Docker:

### Option A: Using `npx` (Node.js 18+)
```bash
npx n8n
```
Once started, open [http://localhost:5678](http://localhost:5678) in your browser.

### Option B: Using Docker
```bash
docker run -it --rm --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
```

---

## 3. Importing the Workflow

1. Open your local n8n interface at `http://localhost:5678`.
2. Click **Workflows** in the left navigation sidebar.
3. Click the **"..."** (More options) menu in the top-right corner and select **"Import from File"**.
4. Select `mock_transaction_ingestion_workflow.json` from the `n8n/` directory in this repository.
5. The workflow **"Centinel Fin AI - Mock Transaction Ingestion"** will open in the editor.

---

## 4. Testing & Verification

### Scenario 1: Happy Path (New Ingestion)
1. Ensure the Spring Boot backend is running on `http://localhost:8080`.
2. Click **"Execute workflow"** in n8n.
3. **Expected Result:**
   * The **HTTP Request** node turns green.
   * The response body contains:
     ```json
     {
       "status": "ACCEPTED",
       "messageId": 1,
       "externalMessageId": "mock-msg-...",
       "message": "Transaction message accepted for processing.",
       "ingestedAt": "..."
     }
     ```
   * HTTP Status Code: `202 Accepted`.

### Scenario 2: Duplicate Ingestion Handling
1. In the **Set Mock Transaction Data** node, change `externalMessageId` to a fixed string (e.g. `"fixed-test-msg-001"`).
2. Execute the workflow once (returns HTTP `202 Accepted`).
3. Execute the workflow a second time with the exact same `externalMessageId`.
4. **Expected Result:**
   * The response returns HTTP `200 OK` with:
     ```json
     {
       "status": "DUPLICATE",
       "messageId": 1,
       "externalMessageId": "fixed-test-msg-001",
       "message": "Duplicate transaction message ignored. Already ingested.",
       "ingestedAt": "..."
     }
     ```
   * Duplicate processing and duplicate database records are prevented.

### Scenario 3: Backend Offline / Failure Visibility
1. Stop the Spring Boot backend application.
2. Click **"Execute workflow"** in n8n.
3. **Expected Result:**
   * The **HTTP Request** node turns red with `ECONNREFUSED`.
   * The error and stack trace are logged in the n8n **Executions** tab.

---

## 5. Security and Privacy Note

* All workflows in this repository are **strictly sanitized** and contain **no API keys, private tokens, or real user identifiers**.
* Mock payloads use synthetic transaction strings (e.g., `LKR 2,500.00 at Keells Super`) for development and testing.
