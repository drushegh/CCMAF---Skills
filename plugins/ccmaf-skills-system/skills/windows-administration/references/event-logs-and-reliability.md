# Event logs and Reliability Monitor (admin view)

This file covers finding and reading logs. Interpreting crash and slowdown
evidence in depth — event-ID catalogue, stop codes, dumps — is
`windows-diagnostics`.

## The logs that matter

| Log | Holds |
|---|---|
| `System` | Kernel, drivers, services (Service Control Manager), power, disks, Windows Update client |
| `Application` | App crashes and hangs (Application Error, Application Hang, WER), installers (MsiInstaller) |
| `Security` | Logons, account and group changes (elevation needed) |
| `Setup` | Servicing and feature-update installs |
| `Microsoft-Windows-TaskScheduler/Operational` | Task runs (disabled by default on client) |
| `Microsoft-Windows-Windows Defender/Operational` | Scans and detections |
| `Microsoft-Windows-Diagnostics-Performance/Operational` | Boot and shutdown timing |
| `Microsoft-Windows-WindowsUpdateClient/Operational` | Update scans, downloads, installs |

```powershell
Get-WinEvent -ListLog * -ErrorAction SilentlyContinue |
    Where-Object RecordCount -gt 0 |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 25 LogName, RecordCount, LastWriteTime, IsEnabled
```

GUI: `eventvwr.msc`; Custom Views > Administrative Events is a good first
view (errors and warnings from all admin logs).

## Get-WinEvent recipes

`Get-WinEvent` works in both editions; `Get-EventLog` exists only in 5.1 and
only reads classic logs. Filter at the source with `-FilterHashtable` (fast)
rather than piping everything to `Where-Object` (slow).

```powershell
# Critical (1) and Error (2) in System over the last 3 days
Get-WinEvent -FilterHashtable @{ LogName = 'System'; Level = 1, 2;
    StartTime = (Get-Date).AddDays(-3) } |
    Select-Object TimeCreated, Id, ProviderName, Message

# One provider, specific IDs
Get-WinEvent -FilterHashtable @{ LogName = 'System';
    ProviderName = 'Service Control Manager'; Id = 7000, 7009, 7031, 7034 } -MaxEvents 30

# Restart and shutdown history
Get-WinEvent -FilterHashtable @{ LogName = 'System'; Id = 41, 1074, 6005, 6006, 6008 } -MaxEvents 40 |
    Select-Object TimeCreated, Id, ProviderName, @{n='Msg'; e={ $_.Message.Split("`n")[0] }}

# Event data fields by name (for example the bugcheck code in Kernel-Power 41)
$e = Get-WinEvent -FilterHashtable @{ LogName = 'System'; Id = 41 } -MaxEvents 1
([xml]$e.ToXml()).Event.EventData.Data | Select-Object Name, '#text'
```

Levels: 1 Critical, 2 Error, 3 Warning, 4 Information, 5 Verbose.
`-FilterHashtable` keys: `LogName`, `ProviderName`, `Id`, `Level`,
`StartTime`, `EndTime`, `Keywords`, `UserID`, `Data`, `Path` (for an
exported `.evtx`).

Command-line alternative: `wevtutil qe System /c:20 /rd:true /f:text`.

## Exporting evidence

```powershell
wevtutil epl System "$env:USERPROFILE\journal\System-$(Get-Date -Format yyyyMMdd).evtx"
```

Exporting is read-only. **Clearing** a log (`wevtutil cl`, `Clear-EventLog`)
destroys evidence and is out of bounds for routine work. Changing log size
or enabling an operational log is a small configuration change — journal it.

## Reliability Monitor

Reliability Monitor (`perfmon /rel`, or Control Panel > Security and
Maintenance > View reliability history) draws a daily stability index from
1 to 10 with markers for app failures, Windows failures, warnings and
software installs/updates. It is the fastest way to answer "since when?" and
"what changed just before?" for a non-technical user.

```powershell
# The data behind it (populated by a built-in scheduled task; may be empty
# if that task has been disabled)
Get-CimInstance Win32_ReliabilityRecords |
    Sort-Object TimeGenerated -Descending |
    Select-Object -First 30 TimeGenerated, SourceName, ProductName, EventIdentifier, Message

Get-CimInstance Win32_ReliabilityStabilityMetrics |
    Sort-Object TimeGenerated -Descending |
    Select-Object -First 14 TimeGenerated, SystemStabilityIndex
```

Read it as a timeline: a drop in the index lined up with an install or
driver update is a lead, not a verdict. Hand the lead to
`windows-diagnostics` for confirmation.

## Noise you can usually leave alone

DistributedCOM 10016 (permission warnings for built-in components), a single
Kernel-PnP 219 at boot for a device that later works, Time-Service sync
warnings on a laptop that was offline, and ESENT informational chatter. Only
act on these when they line up with a real symptom.
