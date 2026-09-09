$headers = @{ "X-INGESTION-API-KEY" = "local-dev-ingestion-secret-2026" }
$txs = @(
  @{ source='n8n_sms'; externalMessageId='user-live-tx-01'; userReference='+94771234567'; messageText='LKR 4,500.00 was spent at Keells Super using card ending 1234 on 2026-09-01.'; receivedAt=[DateTimeOffset]::UtcNow.ToString('o') },
  @{ source='n8n_sms'; externalMessageId='user-live-tx-02'; userReference='+94771234567'; messageText='Your account was debited by Rs. 2,150.50 at Cargills Food City on 2026-09-02.'; receivedAt=[DateTimeOffset]::UtcNow.ToString('o') },
  @{ source='n8n_sms'; externalMessageId='user-live-tx-03'; userReference='+94771234567'; messageText='Payment of LKR 1,450.00 completed to Uber for ride on 2026-09-05.'; receivedAt=[DateTimeOffset]::UtcNow.ToString('o') },
  @{ source='n8n_sms'; externalMessageId='user-live-tx-04'; userReference='+94771234567'; messageText='Payment of LKR 2,450.00 completed to Uber Eats on 2026-09-07.'; receivedAt=[DateTimeOffset]::UtcNow.ToString('o') },
  @{ source='n8n_sms'; externalMessageId='user-live-tx-05'; userReference='+94771234567'; messageText='Bill payment of LKR 3,500.00 completed to Dialog Axiata on 2026-09-08.'; receivedAt=[DateTimeOffset]::UtcNow.ToString('o') },
  @{ source='n8n_sms'; externalMessageId='user-live-tx-06'; userReference='+94771234567'; messageText='Visa card ending 4321 charged USD 9.99 at Netflix on 2026-09-08.'; receivedAt=[DateTimeOffset]::UtcNow.ToString('o') },
  @{ source='n8n_sms'; externalMessageId='user-live-tx-07'; userReference='+94771234567'; messageText='Payment of LKR 5,600.00 completed to Daraz on 2026-09-08.'; receivedAt=[DateTimeOffset]::UtcNow.ToString('o') }
)

foreach ($tx in $txs) {
  $body = $tx | ConvertTo-Json
  Invoke-RestMethod -Uri "http://localhost:8080/api/v1/ingestion/transaction-messages" -Method POST -Headers $headers -ContentType "application/json" -Body $body | Out-Null
}
Write-Host "Populated user +94771234567 with 7 live transactions!" -ForegroundColor Green

$summary = Invoke-RestMethod -Uri "http://localhost:8080/api/summary?phone=%2B94771234567&period=monthly"
$summary | ConvertTo-Json -Depth 5
