netsh interface portproxy delete v4tov6 listenport=80 listenaddress=0.0.0.0 2>$null
netsh interface portproxy delete v4tov6 listenport=443 listenaddress=0.0.0.0 2>$null
netsh interface portproxy add v4tov6 listenport=80 listenaddress=0.0.0.0 connectport=80 connectaddress=::1
netsh interface portproxy add v4tov6 listenport=443 listenaddress=0.0.0.0 connectport=443 connectaddress=::1
