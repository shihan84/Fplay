schtasks /Create /TN "Fplay-PortForward" /TR "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\Users\playout\fplay\Fplay\apply-portforward.ps1" /SC ONSTART /RU SYSTEM /RL HIGHEST /F
schtasks /Query /TN "Fplay-PortForward"
netsh interface portproxy show all
pause
