# Centinel Fin AI

> An AI-assisted personal expense intelligence platform that turns permissioned transaction messages into organized spending data, actionable analytics, and conversational financial insights.

## Overview

Centinel Fin AI helps users understand where their money goes in a digital-payment world. It processes transaction notifications that a user has explicitly authorized, extracts useful spending information, categorizes expenses, and presents personal analytics.

Instead of manually reviewing payment messages, users will be able to view daily, weekly, and monthly spending patterns and ask questions such as:

- How much did I spend on groceries this month?
- What did I spend the most on this week?
- Show my latest transport expenses.
- Did I spend more this month than last month?

## Problem

Modern payments happen through cards, banking apps, mobile taps, ATMs, and digital wallets. While users commonly receive transaction notifications, those messages are unstructured and difficult to turn into a clear personal spending record.

Centinel Fin AI is designed to convert permissioned transaction-message data into a structured personal ledger, making spending easier to track, analyse, and understand.

## Solution

The platform will:

1. Receive transaction-message data only through a user-authorized ingestion flow.
2. Store the raw message and transaction details securely.
3. Extract transaction data such as amount, currency, merchant, and date/time.
4. Categorize spending into meaningful categories.
5. Generate daily, weekly, and monthly spending analytics.
6. Offer an AI assistant that answers questions using the user's actual stored transaction data.
7. Generate proactive insights such as weekly spending summaries.

## Core Features

### Transaction ledger

- Store users and their transactions in PostgreSQL.
- Use `BigDecimal` for all financial amounts.
- Support transaction amount, currency, merchant, category, date/time, and source message.
- Provide REST APIs for transaction creation and spending summaries.

### Hybrid categorization engine

Centinel Fin AI will use a hybrid approach rather than sending every message to an LLM.

- **Rule-based categorization:** Fast Java rules, regex, and merchant mappings handle known merchants.
  - `Keells` -> `Groceries`
  - `Uber` / `PickMe` -> `Transport`
  - `Netflix` / `Spotify` -> `Subscriptions`
- **AI fallback categorization:** Unknown merchants or unfamiliar message formats are processed by an LLM after sensitive data has been masked.

This approach improves speed, cost efficiency, reliability, and privacy.

### Spending analytics

- Daily, weekly, and monthly totals.
- Spending by category.
- Recent transaction history.
- Period-over-period comparisons.
- Dashboard charts and summaries.

### Conversational finance assistant

Users will be able to ask natural-language questions about their own spending. The AI will use safe backend tools to query the transaction ledger instead of guessing.

Example questions:

```text
How much did I spend on food this week?
What was my largest transaction this month?
Compare this month's transport spending with last month.
```

### Automation and insights

- Webhook-based transaction-message ingestion.
- Scheduled weekly spending summaries.
- Optional delivery of insights through a notification channel such as Telegram or Discord.

## Architecture

```text
Permissioned Transaction Message Source
                |
                v
       n8n / Webhook Ingestion
                |
                v
      Java Spring Boot Backend
                |
      +---------+----------+
      |                    |
      v                    v
Rule-Based Engine    AI Fallback Engine
(HashMap / Regex)    (Masked data only)
      |                    |
      +---------+----------+
                |
                v
      PostgreSQL / Supabase Ledger
                |
      +---------+----------+
      |                    |
      v                    v
 Analytics REST API    AI Tool Calling API
      |                    |
      +---------+----------+
                |
                v
    React / Next.js Dashboard
```

## Technology Stack

| Area | Technologies |
|---|---|
| Backend | Java, Spring Boot, Maven |
| API | Spring Web, REST APIs, Bean Validation |
| Database | PostgreSQL, Supabase, Spring Data JPA |
| AI | Gemini API, Spring AI, structured JSON output, tool calling |
| Automation | n8n, webhooks, scheduled workflows |
| Frontend | React or Next.js, charts, dashboard UI |
| Testing | JUnit, Mockito, integration tests |
| Deployment | Google Cloud Platform, Supabase, Vercel |

## Development Roadmap

### Week 1: Core Ledger Engine

- Set up Java Spring Boot backend with Maven.
- Learn JVM basics, stack vs heap, objects, dependency injection, REST, JPA, `BigDecimal`, and testing.
- Connect to Supabase PostgreSQL.
- Create `users` and `transactions` data models.
- Build `POST /api/transactions`.
- Build `GET /api/summary`.
- Write unit tests for transaction and calculation logic.

### Week 2: Ingestion and Processing

- Learn webhooks, event-driven architecture, asynchronous processing, `HashMap`, regex, Big O, and privacy masking.
- Build an n8n webhook ingestion workflow.
- Implement rule-based merchant categorization.
- Mask sensitive information.
- Mark unknown transactions as pending for AI processing.

### Week 3: AI Agent Integration

- Learn LLM fundamentals, prompts, structured JSON, schemas, and tool calling.
- Integrate Gemini with the Spring Boot backend.
- Add AI fallback categorization for unknown messages.
- Build a chat API backed by safe Java query tools.

### Week 4: Dashboard and Deployment

- Build a dashboard for spending analytics and AI chat.
- Add scheduled weekly insights through n8n.
- Deploy backend, frontend, and database configuration.
- Complete documentation, architecture visuals, and a project demo.

## Project Structure

```text
centinel-fin-ai/
├── backend/
│   ├── src/
│   │   ├── main/java/com/centinelfinai/
│   │   │   ├── controller/
│   │   │   ├── service/
│   │   │   ├── repository/
│   │   │   ├── entity/
│   │   │   ├── dto/
│   │   │   ├── config/
│   │   │   └── exception/
│   │   └── test/
│   └── pom.xml
├── frontend/                 # Added during Week 4
├── n8n/                      # Workflow exports with no credentials
├── docs/
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```

## Security and Privacy

Centinel Fin AI is a learning and portfolio project, not a production banking application.

- Use only data for which the user has given explicit permission.
- Use mock transaction messages during development and demos.
- Never commit API keys, database credentials, private tokens, real bank messages, card numbers, account numbers, or personal data.
- Store secrets in environment variables.
- Mask sensitive identifiers before any message data is sent to an external AI provider.
- Use `BigDecimal`, not `double` or `float`, for monetary values.

## Current Status

**Active development — Week 1: Core Ledger Engine**

The initial focus is a correct, testable Java Spring Boot transaction ledger before adding automation, AI features, or a dashboard.

## License

This project is licensed under the [MIT License](LICENSE).
