# Run as Administrator — forwards public IP to Docker Desktop (listening on IPv6)
Write-Host "Fixing port forwarding: public IPv4 -> Docker on IPv6 loopback..." -ForegroundColor Green

# Remove old v4tov4 rules
netsh interface portproxy delete v4tov4 listenport=80 listenaddress=0.0.0.0 2>$null
netsh interface portproxy delete v4tov4 listenport=443 listenaddress=0.0.0.0 2>$null

# Forward IPv4 to IPv6 loopback where Docker Desktop actually listens
netsh interface portproxy add v4tov6 listenport=80 listenaddress=0.0.0.0 connectport=80 connectaddress=::1
netsh interface portproxy add v4tov6 listenport=443 listenaddress=0.0.0.0 connectport=443 connectaddress=::1

Write-Host ""
Write-Host "Port proxy rules:" -ForegroundColor Green
netsh interface portproxy show all

Write-Host ""
Write-Host "Testing connection..." -ForegroundColor Green
$result = Test-NetConnection -ComputerName 210.89.51.190 -Port 80 -WarningAction SilentlyContinue
if ($result.TcpTestSucceeded) {
    Write-Host "SUCCESS! Port 80 reachable on 210.89.51.190" -ForegroundColor Green
} else {
    Write-Host "Port 80 test failed - may need a moment to activate" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Access Fplay at: http://210.89.51.190" -ForegroundColor Cyan
Read-Host "Press Enter to close"
