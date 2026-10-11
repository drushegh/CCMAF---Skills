# Disk and hardware health

When storage or hardware evidence appears, the first advice is always the
same: **make sure there is a current backup**. Diagnosis comes second.

## Storage health

```powershell
Get-PhysicalDisk |
    Select-Object DeviceId, FriendlyName, MediaType, BusType, HealthStatus, OperationalStatus,
        @{n='SizeGB'; e={ [int]($_.Size / 1GB) }}

# Reliability (SMART-derived) counters - elevated session needed
Get-PhysicalDisk | Get-StorageReliabilityCounter |
    Select-Object DeviceId, Temperature, TemperatureMax, Wear, PowerOnHours,
        ReadErrorsUncorrected, ReadErrorsCorrected, WriteErrorsUncorrected,
        ReadLatencyMax, WriteLatencyMax

Get-Volume | Select-Object DriveLetter, FileSystemLabel, FileSystem, HealthStatus,
    @{n='FreeGB'; e={ [Math]::Round($_.SizeRemaining / 1GB, 1) }},
    @{n='SizeGB'; e={ [Math]::Round($_.Size / 1GB, 1) }}
```

How to read it:

- `HealthStatus` other than `Healthy` (`Warning`, `Unhealthy`) → back up now.
- `Wear` is a percentage of rated endurance used (100 = estimated limit
  reached). Not every drive reports it; blank is "unknown", not "fine".
- Any non-zero **uncorrected** read/write errors, or a rising count between
  two checks, is serious. Corrected errors alone are less alarming but worth
  re-checking in a week.
- `Temperature` near `TemperatureMax` → cooling or airflow problem.
- `ReadLatencyMax`/`WriteLatencyMax` in the multi-second range point at a
  struggling device or controller.
- Counters depend on what the drive and driver expose; USB enclosures often
  hide them. The vendor's own free tool may show more — installing it is the
  user's choice.

A nearly full system drive (under about 10% free) causes its own slowness and
update failures; that is housekeeping for `windows-performance-tuning`.

## Disk and file system events

Look in the System log for disk 7, 11, 51, 153, 157, miniport 129 and Ntfs
55/98/50/140 (meanings in `event-log-catalogue.md`).

```powershell
Get-WinEvent -FilterHashtable @{ LogName = 'System';
    ProviderName = 'disk', 'Ntfs', 'stornvme', 'storahci';
    StartTime = (Get-Date).AddDays(-30) } -ErrorAction SilentlyContinue |
    Where-Object Level -le 3 |
    Select-Object TimeCreated, ProviderName, Id, @{n='Msg'; e={ ($_.Message -split "`r?`n")[0] }}
```

(Miniport provider names vary with the controller — check one 129 event for
the exact name on this machine.)

### chkdsk: which forms are read-only

| Command | Effect |
|---|---|
| `chkdsk C:` | Read-only check (no parameters): reports status, fixes nothing. May report spurious errors on the in-use system volume because it cannot lock it |
| `chkdsk C: /scan` | Online scan (NTFS); the volume stays usable, but online self-healing repairs can happen. Treat as a light change and say so |
| `chkdsk C: /scan /forceofflinefix` | Online scan with no online repair; defects are queued for a later offline fix |
| `chkdsk C: /f`, `/r`, `/x`, `/b`, `/spotfix`, `/offlinescanandfix` | **Repairs** — a change; locks the volume, often needs a restart |

Exit codes: 0 no errors, 1 errors found and fixed, 2 clean-up performed or
skipped, 3 could not check or errors not fixed (because `/f` was absent).
Results of boot-time runs are in the Application log (providers `Chkdsk` and
`Wininit`).

Run the plain read-only form elevated. If it finds problems, propose the repair
through `safe-system-changes` *after* the backup is confirmed — repairs on a
failing drive can make data loss worse; copying the important files off
comes first.

## WHEA hardware errors

```powershell
Get-WinEvent -FilterHashtable @{ LogName = 'System'; ProviderName = 'Microsoft-Windows-WHEA-Logger';
    StartTime = (Get-Date).AddDays(-30) } -ErrorAction SilentlyContinue |
    Group-Object Id | Select-Object Name, Count
```

- A handful of corrected errors (17/19) naming a PCIe device: often a power
  management quirk with that device; note it, check for firmware/driver
  updates from the maker.
- Floods of corrected errors, or any fatal (18), especially with stop code
  0x124: hardware instability. Ask about overclocking, undervolting, XMP/EXPO
  memory profiles, recent hardware changes, dust and heat. Returning settings
  to firmware defaults is a change the user makes in firmware setup, with
  their agreement.

## Memory

Windows Memory Diagnostic (`mdsched.exe`) tests RAM at the next restart.
Scheduling it means a reboot — the user chooses when. Results appear in the
System log from provider `Microsoft-Windows-MemoryDiagnostics-Results` after
sign-in. One pass that finds nothing does not prove RAM is good; random,
varied stop codes are the stronger hint.

## Heat and power

- Windows exposes little reliable temperature data for CPUs and GPUs.
  `Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature`
  works on some machines (tenths of a kelvin, needs elevation) and is absent
  or meaningless on many. Do not over-interpret it; the maker's utility, or
  the user's own monitoring tool, is better evidence.
- Practical signs of heat: fans at full speed, throttled CPU frequency in
  Task Manager under load, crashes only under sustained load, worse in warm
  rooms or on soft surfaces.
- Power: sudden off with Kernel-Power 41 and zero codes, especially under
  load (desktop PSU) or at low battery (laptop), points at power delivery.
  `powercfg /batteryreport` shows battery wear.

## Firmware

`Get-CimInstance Win32_BIOS | Select-Object Manufacturer, SMBIOSBIOSVersion, ReleaseDate`
shows the firmware version. Firmware (BIOS/UEFI) and SSD firmware updates
fix many sleep, stability and storage problems, but flashing firmware is a
higher-risk change: the maker's official tool or Windows Update only, on mains
power, with the user's explicit agreement, via `safe-system-changes`.
