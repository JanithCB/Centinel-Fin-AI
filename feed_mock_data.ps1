# Centinel Fin AI - Mock Data Feeder Script
$ErrorActionPreference = "Continue"

$datasetPath = "docs/mock-transaction-messages.json"
if (-not (Test-Path $datasetPath)) {
    Write-Error "Dataset file not found at $datasetPath"
    exit 1
}

$rawJson = Get-Content $datasetPath -Raw | ConvertFrom-Json
$records = $rawJson.records

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host " Feeding $($records.Count) Mock Transactions to Centinel Fin AI Backend" -ForegroundColor Cyan
Write-Host " Target URL: http://localhost:8080/api/v1/ingestion/transaction-messages" -ForegroundColor Cyan
Write-Host "=========================================================`n" -ForegroundColor Cyan

$successCount = 0
$pendingAiCount = 0
$duplicateCount = 0
$parseFailedCount = 0

foreach ($rec in $records) {
    $payload = @{
        source = $rec.source
        externalMessageId = $rec.externalMessageId
        userReference = $rec.userPhone
        messageText = $rec.rawMessage
        receivedAt = [DateTimeOffset]::UtcNow.ToString("o")
    } | ConvertTo-Json

    $headers = @{
        "X-INGESTION-API-KEY" = "local-dev-ingestion-secret-2026"
    }

    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/ingestion/transaction-messages" -Method POST -Headers $headers -ContentType "application/json" -Body $payload
        $status = $response.status
        $msg = $response.message

        switch ($status) {
            "RULE_CATEGORIZED" {
                Write-Host "[SUCCESS: RULE_CATEGORIZED] $($rec.id) | Merchant: $($rec.expected.parsedMerchant) | Category: $($rec.expected.expectedCategory)" -ForegroundColor Green
                $successCount++
            }
            "PENDING_AI" {
                Write-Host "[PENDING_AI] $($rec.id) | Merchant: $($rec.expected.parsedMerchant) | Queued for AI" -ForegroundColor Yellow
                $pendingAiCount++
            }
            "DUPLICATE" {
                Write-Host "[DUPLICATE] $($rec.id) | Idempotently Ignored" -ForegroundColor Magenta
                $duplicateCount++
            }
            "PARSE_FAILED" {
                Write-Host "[PARSE_FAILED] $($rec.id) | Valid Audit Log Created ($msg)" -ForegroundColor DarkYellow
                $parseFailedCount++
            }
            Default {
                Write-Host "[$status] $($rec.id) | $msg" -ForegroundColor White
            }
        }
    }
    catch {
        Write-Host "[ERROR] $($rec.id): $_" -ForegroundColor Red
    }
}

Write-Host "`n=========================================================" -ForegroundColor Cyan
Write-Host " Ingestion Summary:" -ForegroundColor Cyan
Write-Host " - Rule Categorized: $successCount" -ForegroundColor Green
Write-Host " - Pending AI:       $pendingAiCount" -ForegroundColor Yellow
Write-Host " - Duplicate:        $duplicateCount" -ForegroundColor Magenta
Write-Host " - Parse Failed:     $parseFailedCount" -ForegroundColor DarkYellow
Write-Host "=========================================================`n" -ForegroundColor Cyan

Write-Host "Fetching Live Summary for User +94770000001..." -ForegroundColor Cyan
try {
    $summary = Invoke-RestMethod -Uri "http://localhost:8080/api/summary?phone=%2B94770000001"
    Write-Host "Total Spending:   $($summary.currency) $($summary.totalSpending)" -ForegroundColor Green
    Write-Host "Total Inflow:     $($summary.currency) $($summary.totalInflow)" -ForegroundColor Green
    Write-Host "Net Savings:      $($summary.currency) $($summary.netSavings)" -ForegroundColor Green
    Write-Host "Period:           $($summary.period)" -ForegroundColor Green
    Write-Host "`nCategory Breakdown:" -ForegroundColor Cyan
    foreach ($cat in $summary.categories) {
        Write-Host "  - $($cat.category): $($summary.currency) $($cat.totalAmount)" -ForegroundColor White
    }
}
catch {
    Write-Host "Could not fetch summary: $_" -ForegroundColor Red
}
