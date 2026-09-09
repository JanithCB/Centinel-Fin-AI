# Transaction Message Parser Architecture (CEN-11)

> **Jira Epic:** [SCRUM-16](https://janiya2k04.atlassian.net/browse/SCRUM-16)  
> **Story:** CEN-11 – Build transaction-message parser for basic field extraction  
> **Component:** `TransactionMessageParserService.java`, `ParsedTransactionData.java`, `TransactionDirection.java`

This document details the rule-based extraction engine in **Centinel Fin AI** that converts raw banking and SMS notifications into structured transaction records without requiring external AI.

---

## 1. Objectives & Scope

* **Deterministic Field Extraction:** Extract `amount`, `currency`, `merchant`, `direction` (debit/credit), and `transactionDate` from common notification formats.
* **Cost & Latency Efficiency:** Process high-frequency, well-known notification formats via fast regular expressions and merchant dictionaries before falling back to LLM processing.
* **Fail-Safe Processing:** If any mandatory fields (`amount`, `currency`, `merchant`) cannot be detected with high confidence, the parser returns a failure response (`success = false`) to prevent recording corrupted or fabricated financial data.

---

## 2. Extracted Fields

| Field | Type | Description / Normalization |
| :--- | :--- | :--- |
| `amount` | `BigDecimal` | Extracted numerical value, stripping thousands separators (e.g. `2,500.00` ➔ `2500.00`). |
| `currency` | `String` | Normalized ISO code (e.g., `Rs.`, `Rs`, `SLR`, `LKR` ➔ `LKR`; `$`, `USD` ➔ `USD`; `€`, `EUR` ➔ `EUR`; `£`, `GBP` ➔ `GBP`). |
| `merchant` | `String` | Extracted brand name normalized via known merchant dictionary or cleaned preposition matching (`at`, `to`, `from`). |
| `direction` | `TransactionDirection` | `DEBIT` (Expense) or `CREDIT` (Income). |
| `transactionDate` | `LocalDateTime` | Embedded ISO dates (`YYYY-MM-DD`), slash dates (`DD/MM/YYYY`), or month/day indicators. |

---

## 3. Supported Mock Formats & Examples

### Example 1: POS / Debit Card Spend
* **Input:** `LKR 2,500.00 was spent at Keells Super using card ending 1234.`
* **Parsed:**
  * `amount`: `2500.00`
  * `currency`: `LKR`
  * `merchant`: `Keells Super`
  * `direction`: `DEBIT`
  * `success`: `true`

### Example 2: Account Debit / Transport
* **Input:** `Your account was debited by Rs. 1,200.00 at Uber.`
* **Parsed:**
  * `amount`: `1200.00`
  * `currency`: `LKR`
  * `merchant`: `Uber`
  * `direction`: `DEBIT`
  * `success`: `true`

### Example 3: Completed Payment / Food Delivery
* **Input:** `Payment of LKR 850.00 completed to PickMe Food.`
* **Parsed:**
  * `amount`: `850.00`
  * `currency`: `LKR`
  * `merchant`: `PickMe Food`
  * `direction`: `DEBIT`
  * `success`: `true`

### Example 4: Salary Deposit / Direct Inflow
* **Input:** `Salary credit of LKR 150,000.00 received from Acme Corp.`
* **Parsed:**
  * `amount`: `150000.00`
  * `currency`: `LKR`
  * `merchant`: `Acme Corp`
  * `direction`: `CREDIT`
  * `success`: `true`

---

## 4. Failure & Fallback Strategy

When a message is ambiguous or missing required fields:
```java
ParsedTransactionData result = parserService.parseMessage("Thank you for shopping!");
// result.isSuccess() == false
// result.getFailureReason() == "Could not extract valid transaction amount"
```
Unparseable messages are flagged as `pendingForAi = true` for processing by the AI fallback categorizer once sensitive information has been masked.

---

## 5. Test Suite

Unit tests in `TransactionMessageParserServiceTest.java` cover:
1. Exact mock examples from acceptance criteria.
2. Direction recognition (`DEBIT` vs `CREDIT`).
3. Embedded date/time parsing.
4. Prefix and suffix currency combinations.
5. Error handling for null, blank, and incomplete messages.
