# Triage playbook: the first ten minutes

Everything here is read-only. Some queries need an elevated session
(Security log, storage reliability counters, some `powercfg` reports); say
when you need it and why.

## 1. Interview checklist

- What exactly happened? (blue screen, black screen, freeze, restart, app
  closed, slow, noise, smell, heat)
- When? Date and rough time of the last two or three occurrences.
- How often, and is it getting worse?
- What were you doing? (gaming, video call, sleeping, waking, charging,
  plugged into a dock)
- What changed in the weeks before? (updates, new app, new driver, new
  hardware, moved house, dropped the laptop)
- Anything on screen? (stop code text or QR code, error dialog wording)

## 2. Identify the machine

```powershell
Get-ComputerInfo -Property OsName, OsVersion, OsBuildNumber, CsManufacturer, CsModel, BiosSMBIOSBIOSVersion
$os = Get-CimInstance Win32_OperatingSystem
"Last boot: $($os.LastBootUpTime)  Uptime: $((Get-Date) - $os.LastBootUpTime)"
Get-PhysicalDisk | Select-Object FriendlyName, MediaType, BusType, HealthStatus, Size
Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors
"{0:N1} GB RAM" -f ((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB)
```

Note: a machine with weeks of uptime and fast startup enabled has not done
a full restart; many "fixed after reboot" problems need a real restart
(Start > Power > Restart), not shut down and power on.

## 3. Timeline around the anchor time

```powershell
$from = Get-Date '2026-10-07 21:00'; $to = Get-Date '2026-10-07 23:00'

# Errors and criticals from System and Application in the window
Get-WinEvent -FilterHashtable @{ LogName = 'System','Application';
    Level = 1, 2, 3; StartTime = $from; EndTime = $to } -ErrorAction SilentlyContinue |
    Sort-Object TimeCreated |
    Select-Object TimeCreated, LogName, Id, ProviderName,
        @{n='Msg'; e={ ($_.Message -split "`r?`n")[0] }}

# Restart history for the last 30 days
Get-WinEvent -FilterHashtable @{ LogName = 'System';
    Id = 41, 1074, 6005, 6006, 6008, 1001; StartTime = (Get-Date).AddDays(-30) } |
    Sort-Object TimeCreated |
    Select-Object TimeCreated, Id, ProviderName, @{n='Msg'; e={ ($_.Message -split "`r?`n")[0] }}

# Reliability records for the same period
Get-CimInstance Win32_ReliabilityRecords |
    Where-Object { $_.TimeGenerated -gt (Get-Date).AddDays(-30) } |
    Sort-Object TimeGenerated |
    Select-Object TimeGenerated, SourceName, ProductName, @{n='Msg'; e={ ($_.Message -split "`r?`n")[0] }}
```

Add what changed: recent update history (see `windows-administration`,
`updates-and-packages.md`), new services (System event 7045), driver installs
(`pnputil /enum-drivers` dates, Setup and `Microsoft-Windows-Kernel-PnP`
events), new apps (`winget list`, MsiInstaller 11707/1033 in Application).

For a non-technical user, open Reliability Monitor (`perfmon /rel`) with
them; the red crosses and the install markers on the same days tell the
story quickly.

## 4. Sort the evidence

Line everything up by time and ask:

1. What is the **first** abnormal event before each occurrence?
2. Does the same pattern repeat every time?
3. Did it start after a specific change?
4. Is there hardware evidence (disk, WHEA, temperature, power) anywhere
   in the window?

Then pick the matching reference: crashes, performance, disk/hardware,
drivers or network.

## 5. Report

Use the plain-words report shape in `SKILL.md`: what happened, data risk,
what to do next, evidence, confidence.

## Worked example (fictional)

**Report from the owner of a two-year-old laptop:** "It just goes black and
restarts, maybe once a day, usually in the evening."

1. *Machine*: Windows 11 24H2, NVMe SSD (`HealthStatus Healthy`), 16 GB RAM,
   uptime 9 hours.
2. *Restart history*: five Kernel-Power 41 events in 10 days. Each has
   `BugcheckCode 0` and `PowerButtonTimestamp 0`; no 1001 BugCheck events;
   no files in `C:\Windows\Minidump`.
3. *Reading it*: no stop code and no dump means Windows did not get the
   chance to record a crash — a sudden loss of power or a hard hang, not a
   software blue screen.
4. *Window around each event*: nothing from disks or drivers; a
   low-battery Kernel-Power warning and, in two windows,
   `Microsoft-Windows-Kernel-Processor-Power` warnings that firmware was
   limiting the processor speed.
   `powercfg /batteryreport` shows design capacity 52 Wh, full charge
   capacity 21 Wh.
5. *Interview follow-up*: always happens on battery, after the laptop
   reports 25–30 %.
6. *Conclusion (medium-high confidence)*: the worn battery cannot hold
   voltage under load and the laptop powers off before Windows can react.
   Data risk: unsaved work only.
7. *Next steps*: work on mains power for now; replace the battery through
   the manufacturer; back up first (any sudden power loss risks unsaved
   files). No software change needed, so nothing goes to
   `safe-system-changes`.
8. *Fixed means*: no Kernel-Power 41 for two weeks of normal battery use
   after the replacement.
