# Network diagnostics

Work up the layers and stop at the first one that fails: link, address,
gateway, DNS, route, then the specific service. Everything below is
read-only unless marked.

## 1. Link: is the adapter connected?

```powershell
Get-NetAdapter | Select-Object Name, InterfaceDescription, Status, LinkSpeed, MediaConnectionState
netsh wlan show interfaces          # Wi-Fi: SSID, signal %, radio type, channel, receive/transmit rate
```

- `Status` `Disconnected` or `Disabled` explains everything above it.
- Wi-Fi signal under about 50%, or a link rate far below normal, points at
  distance, interference or a congested channel rather than Windows.

## 2. Address: did DHCP work?

```powershell
Get-NetIPConfiguration -Detailed
ipconfig /all
```

- An address in `169.254.x.x` (APIPA) means no DHCP answer: router, cable,
  Wi-Fi authentication or the DHCP Client service.
- No default gateway means no route off the local network.

## 3. Gateway and beyond

```powershell
$gw = (Get-NetIPConfiguration | Where-Object IPv4DefaultGateway | Select-Object -First 1).IPv4DefaultGateway.NextHop
Test-NetConnection -ComputerName $gw                      # ICMP to the router
Test-NetConnection -ComputerName 1.1.1.1                  # beyond the router, by IP
Test-NetConnection -ComputerName www.example.com -Port 443   # name + TCP port
Test-NetConnection -ComputerName www.example.com -TraceRoute
pathping -n www.example.com                               # loss per hop (takes a few minutes)
```

Some routers and hosts drop ping; a failed ping with a successful TCP test
on port 443 is fine. Packet loss starting at the first hop is local (Wi-Fi,
cable, router); loss starting further out is the provider or beyond.

## 4. DNS

```powershell
Get-DnsClientServerAddress -AddressFamily IPv4 | Where-Object ServerAddresses
Resolve-DnsName www.example.com
Resolve-DnsName www.example.com -Server 1.1.1.1    # compare with a public resolver
Get-DnsClientCache | Select-Object -First 20 Entry, Data
Get-Content C:\Windows\System32\drivers\etc\hosts | Where-Object { $_ -notmatch '^\s*(#|$)' }
```

- Works by IP but not by name → DNS. Works with a public resolver but not
  the configured one → the configured DNS server (often the router).
- Unexpected entries in the hosts file redirect names silently; treat them as
  a finding for `windows-security-hygiene`.

## 5. Proxy, VPN and filters

```powershell
netsh winhttp show proxy
Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' |
    Select-Object ProxyEnable, ProxyServer, AutoConfigURL
Get-NetAdapter | Where-Object InterfaceDescription -match 'VPN|TAP|WireGuard|Virtual'
Get-NetRoute -AddressFamily IPv4 | Where-Object DestinationPrefix -eq '0.0.0.0/0'
```

A stale proxy setting, a VPN that grabbed the default route, or a security
suite's web filter explains many "browser cannot connect but ping works"
cases.

## 6. Who is using the network?

```powershell
Get-NetTCPConnection -State Established |
    Group-Object OwningProcess | Sort-Object Count -Descending | Select-Object -First 10 |
    ForEach-Object { [pscustomobject]@{ Connections = $_.Count;
        Process = (Get-Process -Id $_.Name -ErrorAction SilentlyContinue).Name } }
Get-NetAdapterStatistics | Select-Object Name, ReceivedBytes, SentBytes, ReceivedDiscardedPackets, ReceivedPacketErrors
```

Resource Monitor's Network tab shows the same live, per process. Rising
error or discard counts on a wired adapter point at the cable, port or
driver.

## 7. Wi-Fi history report

```cmd
netsh wlan show wlanreport
```

Run elevated; writes an HTML report (path printed in the output, under
`C:\ProgramData\Microsoft\Windows\WlanReport\`) covering the last three days
of connections, disconnect reasons and errors. Ideal for "Wi-Fi keeps
dropping": look for disconnect reasons that repeat and their timing (for
example right after sleep, which points at adapter power management or
drivers).

Relevant event logs: `Microsoft-Windows-WLAN-AutoConfig/Operational`
(connects and disconnects with reasons) and System events from the Wi-Fi
driver's own provider.

## Fixes are changes

Each of these goes through `safe-system-changes`, least drastic first:

1. Forget and rejoin the Wi-Fi network; restart the router (user's action).
2. Disable and re-enable the adapter.
3. `ipconfig /release` and `/renew` (drops connectivity briefly).
4. Update the network driver from the PC maker.
5. Change DNS servers (record the old ones).
6. Settings > Network & internet > Advanced network settings > Network
   reset — removes and reinstalls all adapters and resets components;
   VPN clients and virtual switches may need reinstalling. Last resort.

`ipconfig /flushdns` is harmless and can be done in passing, but say you did
it. Never disable the firewall or security software to "test" connectivity.
