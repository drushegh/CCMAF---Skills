# Slowdowns: performance, boot, sleep and battery

"Slow" means different things. Pin it down first: slow all the time, slow
after a while, slow to start, one app slow, or stutters/freezes. Then measure
the four resources — CPU, memory, disk, network — before blaming anything.

## Quick look (with the user)

- **Task Manager** (`Ctrl+Shift+Esc`): Processes sorted by CPU, Memory,
  Disk; Performance tab for totals; Startup apps for startup impact. The
  Disk column showing "Active time" near 100% while throughput is tiny means
  the drive is the bottleneck.
- **Resource Monitor** (`resmon` or `perfmon /res`): which files a process
  is reading (Disk tab), hard faults per second (Memory tab), which process
  owns network connections.
- **Performance Monitor** (`perfmon /sys`) for live counter graphs;
  `perfmon /report` runs a 60-second System Diagnostics report (needs
  elevation; read-only, writes a report).

## Counters from PowerShell

`Get-Counter` works in both editions. Counter paths are **localised**: these
English names only work on English-language Windows; on other languages use
`Get-Counter -ListSet *` to find the local names.

```powershell
$counters = @(
  '\Processor(_Total)\% Processor Time'
  '\System\Processor Queue Length'
  '\Memory\Available MBytes'
  '\Memory\Pages/sec'
  '\Memory\% Committed Bytes In Use'
  '\PhysicalDisk(_Total)\% Idle Time'
  '\PhysicalDisk(_Total)\Avg. Disk sec/Read'
  '\PhysicalDisk(_Total)\Avg. Disk sec/Write'
  '\PhysicalDisk(_Total)\Current Disk Queue Length'
  '\Network Interface(*)\Bytes Total/sec'
)
Get-Counter -Counter $counters -SampleInterval 2 -MaxSamples 15 |
    ForEach-Object { $_.CounterSamples } |
    Group-Object Path |
    Select-Object Name, @{n='Avg'; e={ [Math]::Round(($_.Group.CookedValue | Measure-Object -Average).Average, 3) }}

# Top processes by CPU time and memory right now
Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 Name, Id, CPU, WorkingSet64
Get-Process | Sort-Object WorkingSet64 -Descending |
    Select-Object -First 10 Name, Id, @{n='MB'; e={ [int]($_.WorkingSet64 / 1MB) }}
```

### Reading the numbers (rules of thumb, not hard limits)

| Signal | Suggests |
|---|---|
| CPU near 100% with one process on top | That process (or what it is doing — indexing, scanning, updating) |
| CPU high with `System`/`Interrupts` on top | A driver or device problem (see `drivers-and-devices.md`) |
| Processor queue persistently above about 2 per core | CPU-bound |
| Available MBytes low and committed bytes near 100% | Not enough RAM for the workload, or a leak (watch one process grow over hours) |
| Pages/sec high together with low available memory | Paging to disk — feels like freezing |
| Disk idle time near 0% and read/write latency over ~20 ms (SSD) or ~50 ms (HDD) | Disk-bound; on an HDD this is often the drive itself |
| Disk busy and Disk/Ntfs events in the log | Failing storage — go to `disk-and-hardware-health.md` |

Common benign causes of temporary slowness: Windows Update installing,
Defender scheduled scans, search indexing after a big file copy, OneDrive
first sync, maintenance shortly after waking. Check before blaming.

### Slow after a while

Watch a process's memory over time (`Get-Process -Id <pid>` at intervals)
for a leak; look for Resource-Exhaustion-Detector 2004 in the System log; on
laptops check thermal throttling (CPU frequency dropping under load in Task
Manager's Performance tab).

## Slow boot and shutdown

```powershell
Get-WinEvent -FilterHashtable @{ LogName = 'Microsoft-Windows-Diagnostics-Performance/Operational'; Id = 100 } -MaxEvents 10 |
    ForEach-Object {
        $d = ([xml]$_.ToXml()).Event.EventData.Data
        [pscustomobject]@{ Time = $_.TimeCreated;
            BootSeconds = [Math]::Round([int]($d | Where-Object Name -eq 'BootTime').'#text' / 1000, 1) }
    }

# Components the log blames for slow boot
Get-WinEvent -FilterHashtable @{ LogName = 'Microsoft-Windows-Diagnostics-Performance/Operational'; Id = 101..110 } -MaxEvents 30 -ErrorAction SilentlyContinue |
    Select-Object TimeCreated, Id, @{n='Msg'; e={ ($_.Message -split "`r?`n")[0..2] -join ' ' }}
```

Also check: number and weight of startup items (`windows-administration`,
`startup-and-settings.md`), a pending reboot that re-applies updates every
start, a hard drive as the boot drive, and services timing out (SCM 7009/7011).
Trimming startup is a change and belongs to `windows-performance-tuning`.

## Sleep, wake and battery (powercfg)

All read-only; reports are written as HTML in the current folder unless
`/output` is given. Some need an elevated prompt.

| Command | Answers |
|---|---|
| `powercfg /requests` | What is keeping the PC or display awake right now |
| `powercfg /lastwake` | What woke the PC last time |
| `powercfg /waketimers` | Scheduled things allowed to wake it |
| `powercfg /devicequery wake_armed` | Devices allowed to wake it |
| `powercfg /a` | Which sleep states this machine supports (S3 vs Modern Standby) |
| `powercfg /sleepstudy /output "$env:USERPROFILE\sleepstudy.html"` | Modern Standby drain per session over the last 3 days (`/duration` up to 28) |
| `powercfg /batteryreport /output "$env:USERPROFILE\battery.html"` | Design vs full-charge capacity, usage history, life estimate |
| `powercfg /energy /output "$env:USERPROFILE\energy.html"` | 60-second efficiency check; run on an idle machine |
| `powercfg /systemsleepdiagnostics` | Report of recent sleep transitions |

Plain-words battery rule: full-charge capacity well below design capacity
(for example under 60–70%) means a worn battery — shorter runtime, and at the
extreme, sudden shutdowns under load. Battery replacement is a hardware job.

Changing wake devices, wake timers or power plans is a change
(`windows-performance-tuning` / `safe-system-changes`).

## Deep traces (optional)

Windows Performance Recorder (`wpr.exe`, in-box on current Windows) records
an ETW trace of a slow moment:

```powershell
wpr -start GeneralProfile      # start recording (elevated)
# reproduce the slowness for 30-60 seconds
wpr -stop "$env:USERPROFILE\slow.etl"
```

Analysis needs Windows Performance Analyzer (free, from the Store or the
Windows ADK). Recording is lightweight but writes a large file and slightly
loads the system while running — tell the user. Traces can contain file
names and window titles; treat them as personal data.
