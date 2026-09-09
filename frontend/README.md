# Centinel Fin AI Frontend

A sleek, modern dark-mode financial intelligence dashboard connected directly to the **Centinel Fin AI** Spring Boot backend and Supabase PostgreSQL database.

## System Features

- **Live Backend & DB Health**: Continuously checks latency and connectivity against `GET /health` and `GET /api/summary`.
- **Dynamic Spending Analytics**:
  - Live Total Outflow and Top Spending Category calculated from backend data.
  - Category Spending Breakdown dynamically rendered from `totalsByCategory`.
  - Period Timeline Breakdown with **Monthly / Daily** toggle dynamically rendered from `totalsPerPeriod`.
- **Message Ingestion Simulator**:
  - Ingests raw bank SMS and webhook events via `POST /api/v1/ingestion/transaction-messages` with `X-INGESTION-API-KEY`.
  - Live Webhook & API Response Inspector showing exact HTTP Status (202 Accepted, 200 Duplicate on idempotency, 401 Unauthorized, etc.) and JSON payloads.
- **Manual Ledger Logging**:
  - Form to record manual transactions directly into the ledger via `POST /api/transactions`.
- **Session Activity Feed**:
  - Real-time stream of transactions and ingested events created during the active browser session, with CSV export.
- **Node Settings**:
  - Configurable Backend Base URL, Ingestion Secret Key, and Active User Phone stored in `localStorage`.

## How to Run

### Option 1: Using `npx serve` (Port 3000)
Run this command from inside the `frontend/` directory:
```bash
npx serve -l 3000 .
```
Then visit: `http://localhost:3000`

### Option 2: Using Python HTTP Server
```bash
python -m http.server 3000
```

### Option 3: VS Code / IDE Live Server
Right-click on `index.html` and select **Open with Live Server**.
*(Note: If using another port, you can customize the Backend URL in the Node Settings in the top-right corner).*
