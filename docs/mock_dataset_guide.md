# Mock Transaction Message Dataset & Demo Guide

## 1. Overview
The Centinel Fin AI mock transaction dataset is stored in [`docs/mock-transaction-messages.json`](file:///d:/Centinel%20Fin%20AI/docs/mock-transaction-messages.json) and mirrored in [`src/test/resources/mock-transaction-messages.json`](file:///d:/Centinel%20Fin%20AI/src/test/resources/mock-transaction-messages.json).

It provides **31 synthetic transaction messages** designed for automated testing, developer workflows, and live portfolio demonstrations.

### Safety & Privacy Guarantee
> [!IMPORTANT]
> All dataset records are 100% fake and synthetic:
> - **Phone Numbers**: Built with the fictional range `+94770000001` through `+94770000010`.
> - **Card Numbers**: Test sequences (e.g. `4111-2222-3333-4444`, `ending 1234`).
> - **Bank Accounts**: Dummy formats (`001234567890`).
> - **Amounts & Merchants**: Fictional combinations reflecting common Sri Lankan and global consumer patterns.

---

## 2. Dataset Composition & Coverage

| Category / Flow | Record Count | Sample Merchants / Scenarios | Target Status |
| :--- | :--- | :--- | :--- |
| **Groceries** | 4 | Keells Super, Cargills Food City, Spar Supermarket, Whole Foods | `RULE_CATEGORIZED` |
| **Transport** | 4 | Uber, PickMe, Ceypetco Petrol, Emirates | `RULE_CATEGORIZED` |
| **Food & Dining** | 4 | Uber Eats, McDonald's, Starbucks Coffee, Domino's Pizza | `RULE_CATEGORIZED` |
| **Bills & Utilities** | 4 | Dialog Axiata, Mobitel, CEB, Water Board | `RULE_CATEGORIZED` |
| **Subscriptions** | 3 | Netflix, Spotify, YouTube | `RULE_CATEGORIZED` |
| **Shopping** | 2 | Daraz, Amazon | `RULE_CATEGORIZED` |
| **Healthcare** | 1 | Asiri Hospital | `RULE_CATEGORIZED` |
| **Education** | 1 | Coursera | `RULE_CATEGORIZED` |
| **Unrecognized (Pending AI)** | 2 | Artisan Roastery, Mystery Vintage Studio | `PENDING_AI` |
| **Credit / Inflows** | 2 | Salary Deposit (Apex Systems), E-Commerce Refund (Daraz) | `PENDING_AI` / `RULE_CATEGORIZED` |
| **Duplicate Events (Idempotency)** | 1 | Duplicate of `mock-sms-keells-001` | `DUPLICATE` |
| **Invalid / Noise Messages** | 3 | Bank OTP Code, Dining Promotion SMS, Support Ticket Resolution | `PARSE_FAILED` |

---

## 3. Webhook Integration Payload Format

Centinel Fin AI receives ingestion webhooks via the following contract:

```http
POST /api/v1/ingest/message
Content-Type: application/json

{
  "source": "n8n_sms_webhook",
  "userPhone": "+94770000001",
  "externalMessageId": "mock-sms-keells-001",
  "rawMessage": "LKR 4,500.00 was spent at Keells Super using card ending 1234 on 2026-09-01."
}
```

### Response Scenarios

#### 1. Rule Categorized (HTTP 200 OK)
```json
{
  "status": "PROCESSED",
  "processingStatus": "RULE_CATEGORIZED",
  "transactionId": 1,
  "merchant": "Keells Super",
  "category": "Groceries",
  "message": "Message successfully ingested, parsed, and categorized via rules",
  "timestamp": "2026-09-09T18:45:00"
}
```

#### 2. Unknown Merchant / Pending AI (HTTP 200 OK)
```json
{
  "status": "PROCESSED",
  "processingStatus": "PENDING_AI",
  "transactionId": 24,
  "merchant": "Artisan Roastery",
  "category": "Other",
  "message": "Message successfully ingested and parsed. Categorization pending AI fallback.",
  "timestamp": "2026-09-09T18:45:00"
}
```

#### 3. Duplicate Message ID (HTTP 200 OK)
```json
{
  "status": "DUPLICATE",
  "processingStatus": "DUPLICATE",
  "transactionId": null,
  "merchant": null,
  "category": null,
  "message": "Duplicate ingestion ignored: externalMessageId already processed",
  "timestamp": "2026-09-09T18:45:00"
}
```

#### 4. Invalid Message / Unparseable (HTTP 202 Accepted)
```json
{
  "status": "PARSE_FAILED",
  "processingStatus": "PARSE_FAILED",
  "transactionId": null,
  "merchant": null,
  "category": null,
  "message": "Message accepted for audit but could not be parsed: Could not extract valid transaction amount",
  "timestamp": "2026-09-09T18:45:00"
}
```

---

## 4. Running the Automated Dataset Verification Test

The mock dataset is verified as part of the automated Maven build:

```powershell
.\mvnw.cmd test -Dtest=MockDatasetIntegrationTest
```
