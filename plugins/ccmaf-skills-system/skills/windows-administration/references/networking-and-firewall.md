# Networking and firewall (admin view)

Troubleshooting a broken connection step by step is in `windows-diagnostics`
(`network-diagnostics.md`). This file is about inspecting and configuring.

## Inspect

```powershell
Get-NetIPConfiguration                     # per adapter: IP, gateway, DNS
Get-NetAdapter | Select-Object Name, InterfaceDescription, Status, LinkSpeed, MacAddress
Get-NetConnectionProfile                   # Public / Private / DomainAuthenticated per network
Get-DnsClientServerAddress -AddressFamily IPv4
Get-NetTCPConnection -State Listen |
    Select-Object LocalAddress, LocalPort, OwningProcess,
        @{n='Process'; e={ (Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).Name }} |
    Sort-Object LocalPort
ipconfig /all
netsh winhttp show proxy                    # machine (WinHTTP) proxy
```

The `NetTCPIP`, `NetAdapter`, `NetConnection`, `DnsClient` and `NetSecurity`
modules work in both 5.1 and 7.x.

## Network profiles

`Public` is the safe default (discovery and sharing off). Set a network to
`Private` only for a trusted home or office network the user names:

```powershell
Set-NetConnectionProfile -InterfaceAlias 'Wi-Fi' -NetworkCategory Private -WhatIf
```

Revert by setting it back to `Public`. Never set a café, hotel or other
shared network to `Private`.

## Windows Firewall

```powershell
Get-NetFirewallProfile | Select-Object Name, Enabled, DefaultInboundAction, DefaultOutboundAction

# Enabled inbound allow rules with their ports and programs
Get-NetFirewallRule -Direction Inbound -Enabled True -Action Allow |
    ForEach-Object {
        $p = $_ | Get-NetFirewallPortFilter
        $a = $_ | Get-NetFirewallApplicationFilter
        [pscustomobject]@{ Name = $_.DisplayName; Profile = $_.Profile;
            Protocol = $p.Protocol; Port = $p.LocalPort; Program = $a.Program }
    } | Sort-Object Name
```

Opening a port, narrowly (via `safe-system-changes`):

```powershell
New-NetFirewallRule -DisplayName 'Personal - Example media server 8096' `
    -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8096 `
    -Profile Private -RemoteAddress LocalSubnet `
    -Program 'C:\Program Files\ExampleMedia\examplemedia.exe' -WhatIf

# Revert
Remove-NetFirewallRule -DisplayName 'Personal - Example media server 8096'
```

Rules:

- Scope every rule: one protocol and port, `-Profile Private` (not Public),
  `-RemoteAddress LocalSubnet` or specific addresses, and `-Program` where
  the app is known. Prefix names (`Personal - ...`) so your rules are easy to
  audit and remove.
- Prefer `Disable-NetFirewallRule` over removal when switching something off.
- **Never** turn a firewall profile off (`Set-NetFirewallProfile -Enabled
  False`) to test whether the firewall is the cause; check the specific rule
  and the Security log / firewall log instead.
- Inbound ICMP (ping) is blocked by default; enabling it is a deliberate,
  scoped rule, not a requirement for normal use.
- Third-party security suites may replace Windows Firewall; then configure
  that product, and say so.

## DNS and hosts

- Change DNS servers in Settings (per adapter) or with
  `Set-DnsClientServerAddress -InterfaceAlias 'Wi-Fi' -ServerAddresses ...`
  after recording the current list; revert with `-ResetServerAddresses`.
- The hosts file (`C:\Windows\System32\drivers\etc\hosts`) needs elevation to
  edit. Back it up first; unexpected entries there are a security finding
  for `windows-security-hygiene`.
- `ipconfig /flushdns` only clears the resolver cache; harmless, but mention
  it as an action you took.

## Remote access features

- **Remote Desktop** (Pro and above): enabling it opens the machine to
  sign-in attempts. Only on request, with Network Level Authentication on,
  restricted to the Private profile, and never exposed directly to the
  internet.
- **OpenSSH Server**: an optional feature
  (`Get-WindowsCapability -Online -Name OpenSSH*`). Installing it creates a
  service and a firewall rule — journal both, prefer key authentication.
- **WinRM / PowerShell remoting**: off by default on client Windows; leave it
  off unless the user has a concrete need.
