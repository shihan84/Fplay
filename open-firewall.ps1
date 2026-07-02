# Run this script as Administrator to open firewall ports for Fplay
# Right-click -> Run as Administrator, OR from an elevated PowerShell

Write-Host "Adding Windows Firewall rules for Fplay..." -ForegroundColor Green

netsh advfirewall firewall add rule name="Fplay HTTP (80)" dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="Fplay HTTPS (443)" dir=in action=allow protocol=TCP localport=443
netsh advfirewall firewall add rule name="Fplay App (3000)" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="Fplay Realtime (3005)" dir=in action=allow protocol=TCP localport=3005
netsh advfirewall firewall add rule name="Fplay Control (3006)" dir=in action=allow protocol=TCP localport=3006

Write-Host ""
Write-Host "Done! Verifying rules:" -ForegroundColor Green
netsh advfirewall firewall show rule name=all dir=in | Select-String "Fplay"

Write-Host ""
Write-Host "Firewall ports open. Access Fplay from any device on your network at:" -ForegroundColor Cyan
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch "Loopback" -and $_.IPAddress -notmatch "^169" } | Select-Object -First 1).IPAddress
Write-Host "  http://$ip" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to close"
