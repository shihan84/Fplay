Write-Host "Checking scheduled task..." -ForegroundColor Green
schtasks /Query /TN "Fplay-PortForward" /V /FO LIST
Write-Host ""
Write-Host "Port proxy rules:" -ForegroundColor Green
netsh interface portproxy show all
Write-Host ""
Read-Host "Press Enter"
