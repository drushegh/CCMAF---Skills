# Measure first

Every tuning session starts and ends with the same read-only measurements,
saved into the workspace as `baseline-<date>.json` (or `.md`) and
`after-<change>-<date>`. Run elevated where noted.

## Conditions for a fair comparison

- Same power state (plugged in vs battery) and same power plan, unless the
  plan is the thing being tested.
- Fresh reboot (Restart, not Shut down: with fast startup on, Shut down does
  not fully restart the kernel), then wait a fixed idle period (for example
  five minutes) before sampling.
- Same apps open (ideally none) and no updates installing (check Windows
  Update first).
- Take at least three samples for anything noisy and compare medians.

## System facts (once per session)

```powershell
Get-ComputerInfo -Property OsName, OsVersion, OsBuildNumber, WindowsEditionId,
  CsTotalPhysicalMemory, CsProcessors
Get-PhysicalDisk | Select-Object FriendlyName, MediaType, HealthStatus, Size
powercfg /getactivescheme
```

`WindowsEditionId` matters: many policy-based tweaks only apply to Pro,
Enterprise or Education. `HealthStatus` other than Healthy, or a mechanical
disk running the OS, changes the advice (disk health goes to
`windows-diagnostics`).

## Boot and sign-in time

The Diagnostics-Performance operational log records boot performance (event
ID 100, with a boot duration in milliseconds) when the system collects it:

```powershell
Get-WinEvent -FilterHashtable @{ LogName = 'Microsoft-Windows-Diagnostics-Performance/Operational'; Id = 100 } -MaxEvents 5 |
  ForEach-Object {
    $x = [xml]$_.ToXml()
    [pscustomobject]@{
      Time       = $_.TimeCreated
      BootMs     = ($x.Event.EventData.Data | Where-Object Name -eq 'BootTime').'#text'
      MainPathMs = ($x.Event.EventData.Data | Where-Object Name -eq 'MainPathBootTime').'#text'
      PostBootMs = ($x.Event.EventData.Data | Where-Object Name -eq 'BootPostBootTime').'#text'
    }
  }
```

Field names vary by build; if they come back empty, print the event's
`EventData` and read the names from it rather than guessing. If the log has
no events, fall back to a stopwatch measurement: power button to usable
desktop (Start opens and an app launches), three runs.

## Startup impact

- Task Manager > **Startup apps**: each entry with status and "Startup impact"
  (High/Medium/Low/Not measured). Screenshot or transcribe.
- Settings > Apps > **Startup** shows the same toggles.
- Cross-check with a read-only list:

```powershell
Get-CimInstance Win32_StartupCommand |
  Select-Object Name, Command, Location, User
```

## Resource use at idle

```powershell
Get-Counter -Counter '\Processor(_Total)\% Processor Time',
  '\Memory\Available MBytes', '\Memory\% Committed Bytes In Use',
  '\PhysicalDisk(_Total)\% Disk Time', '\PhysicalDisk(_Total)\Avg. Disk Queue Length' `
  -SampleInterval 5 -MaxSamples 12
```

Top consumers:

```powershell
Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 Name, Id, CPU, WorkingSet64
Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 10 Name, Id, @{n='WS_MB';e={[math]::Round($_.WorkingSet64/1MB)}}
```

`CPU` is total processor seconds since start, so a long-running process ranks
high even if idle now; use the counter samples or Task Manager's live view for
current load. Resource Monitor (`resmon`) shows per-process disk and network
activity when a single number is not enough.

## Free space

```powershell
Get-PSDrive -PSProvider FileSystem |
  Select-Object Name, @{n='UsedGB';e={[math]::Round($_.Used/1GB,1)}}, @{n='FreeGB';e={[math]::Round($_.Free/1GB,1)}}
Dism.exe /Online /Cleanup-Image /AnalyzeComponentStore   # elevated; reports reclaimable component store
```

## Thermals and power

Sustained slowness under load on a laptop is often thermal throttling or a
battery-saver state. Note the power mode (Settings > System > Power & battery)
and whether the slowdown disappears when plugged in. `powercfg /energy`
(elevated, PC idle, 60 seconds by default) produces an HTML report of
energy-efficiency problems; see `power-plans.md`.

## Recording the baseline

```markdown
# Baseline — <date> — <reason>
- Edition/build: ...
- Power: plugged in / battery, plan: ..., mode: ...
- Boot (event 100, median of 3): ... ms   | stopwatch: ... s
- Startup apps enabled: N (High impact: ...)
- Idle CPU median: ...%  Available RAM: ... MB  Committed: ...%
- Disk C: free ... GB of ... GB; component store reclaimable: ...
- Top idle consumers: ...
```

After each change, record the same block and a one-line verdict: kept or
reverted, and why.
