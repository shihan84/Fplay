# Run as Administrator — creates a scheduled task to restore port forwarding on boot
# Docker Desktop (WSL2) binds to IPv6 loopback; this bridges IPv4 traffic to it.

Write-Host "Creating persistent port forwarding (survives reboot)..." -ForegroundColor Green

$taskName = "Fplay-PortForward"

# Remove existing task if present
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

# Script block that sets up the port proxy rules
$scriptBlock = @'
netsh interface portproxy delete v4tov6 listenport=80 listenaddress=0.0.0.0 2>$null
netsh interface portproxy delete v4tov6 listenport=443 listenaddress=0.0.0.0 2>$null
netsh interface portproxy add v4tov6 listenport=80 listenaddress=0.0.0.0 connectport=80 connectaddress=::1
netsh interface portproxy add v4tov6 listenport=443 listenaddress=0.0.0.0 connectport=443 connectaddress=::1
'@

$scriptPath = "C:\Users\playout\fplay\Fplay\apply-portforward.ps1"
Set-Content -Path $scriptPath -Value $scriptBlock -Force

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest -LogonType ServiceAccount
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Forward IPv4 ports 80/443 to Docker Desktop (IPv6 loopback) for Fplay"

Write-Host ""
Write-Host "Scheduled task '$taskName' created!" -ForegroundColor Green
Write-Host "  Runs at: System startup (as SYSTEM)" -ForegroundColor Cyan
Write-Host "  Script:  $scriptPath" -ForegroundColor Cyan
Write-Host ""

# Also run it now to ensure current session is working
& $scriptPath
Write-Host "Port forwarding applied for current session too." -ForegroundColor Green
netsh interface portproxy show all

Write-Host ""
Read-Host "Press Enter to close"
