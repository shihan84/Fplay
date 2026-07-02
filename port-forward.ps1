# Run as Administrator — forwards public IP ports to Docker Desktop (WSL2)
# Docker Desktop binds 0.0.0.0 but WSL2 NAT doesn't expose to physical NICs

Write-Host "Setting up port forwarding from public IP to Docker Desktop..." -ForegroundColor Green

# Remove old rules if they exist
netsh interface portproxy delete v4tov4 listenport=80 listenaddress=0.0.0.0 2>$null
netsh interface portproxy delete v4tov4 listenport=443 listenaddress=0.0.0.0 2>$null

# Forward port 80 and 443 from all interfaces to localhost (where Docker listens)
netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=80 connectaddress=127.0.0.1
netsh interface portproxy add v4tov4 listenport=443 listenaddress=0.0.0.0 connectport=443 connectaddress=127.0.0.1

Write-Host ""
Write-Host "Current port proxy rules:" -ForegroundColor Green
netsh interface portproxy show all

Write-Host ""
Write-Host "Done! Fplay should now be accessible at:" -ForegroundColor Cyan
Write-Host "  http://210.89.51.190" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to close"
