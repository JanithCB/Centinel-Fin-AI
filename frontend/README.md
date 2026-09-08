# Centinel Fin AI Frontend (Sovereign Hub)

A cybernetic, institutional dark-mode financial intelligence dashboard generated with **Google Stitch** and wired directly to the **Centinel Fin AI** Spring Boot backend.

## Features

- **Live Enclave Sync**: Automatically tests connectivity against `http://localhost:8080/api/summary`.
- **KPI Metrics & Velocity Charts**: Visualizes monthly spend, predicted surplus, and AI categorization rates.
- **Interactive Phone Mirror**: Simulates incoming bank SMS notifications and dispatches live HTTP POST requests to `/api/v1/ingestion/transaction-messages` with the configured `X-INGESTION-API-KEY`.
- **Manual Ledger Logging**: Modal form allowing direct writes to `/api/transactions`.
- **Node Settings**: Configurable backend URL and ingestion API key persisted in local storage.

## How to Run

### Option 1: Using `npx serve` (Port 3000)
Run this command from inside the `frontend/` directory or project root:
```bash
# From d:\Centinel Fin AI\frontend
npm start
# OR directly
npx serve -l 3000 .
```
Then visit: `http://localhost:3000`

### Option 2: Using Python HTTP Server
```bash
python -m http.server 3000
```

### Option 3: VS Code / IDE Live Server
Right-click on `index.html` and select **Open with Live Server**.
*(Note: If using another port, you can customize the Backend URL in the node settings pill in the top-right corner).*
