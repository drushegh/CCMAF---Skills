# Crashes: stop codes, dumps and app failures

## Blue screens (stop errors / bug checks)

A stop error is Windows deliberately halting because continuing could
corrupt data. Evidence, in order of reliability:

1. **BugCheck 1001** in the System log — stop code, four parameters, dump
   path. Best single source.
2. **Kernel-Power 41** — `BugcheckCode` (decimal) and parameters.
3. **Dump files** — `C:\Windows\Minidump\*.dmp` (small dumps) and
   `C:\Windows\MEMORY.DMP` (kernel or automatic dump, overwritten each time).
4. What the user saw: the stop code name and the "What failed" line naming
   a driver file, if shown.

```powershell
# Stop codes from the last 60 days
Get-WinEvent -FilterHashtable @{ LogName = 'System'; Id = 1001;
    ProviderName = 'Microsoft-Windows-WER-SystemErrorReporting';
    StartTime = (Get-Date).AddDays(-60) } -ErrorAction SilentlyContinue |
    Select-Object TimeCreated, @{n='Msg'; e={ ($_.Message -split "`r?`n")[0] }}

# Convert a decimal BugcheckCode from event 41
'0x{0:X8}' -f 159          # -> 0x0000009F

Get-ChildItem C:\Windows\Minidump -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object Name, LastWriteTime, Length
```

No 1001, no dump, and Kernel-Power 41 with zero codes means Windows never
recorded a crash: suspect power, heat, or a hard hang (see
`disk-and-hardware-health.md`). Also check for volmgr 46 (dump could not be
written) and that a page file exists.

## Common stop codes in plain words

Look up anything not listed in Microsoft's *Bug check code reference*. The
"usual suspects" column is where to look first, not a verdict.

| Code | Name | Plain words | Usual suspects |
|---|---|---|---|
| 0x0000000A | IRQL_NOT_LESS_OR_EQUAL | A driver touched memory it should not have, at a time it was not allowed to | Drivers (network, storage, antivirus), sometimes RAM |
| 0x000000D1 | DRIVER_IRQL_NOT_LESS_OR_EQUAL | Same idea, specifically a driver | The named driver, often network/Wi-Fi/VPN |
| 0x0000001A | MEMORY_MANAGEMENT | Memory bookkeeping went wrong | RAM fault, unstable memory profile, drivers |
| 0x0000001E | KMODE_EXCEPTION_NOT_HANDLED | Kernel code hit an error nobody handled | The named driver |
| 0x0000003B | SYSTEM_SERVICE_EXCEPTION | Code running on behalf of a program crashed in the kernel | Graphics, antivirus, anti-cheat drivers |
| 0x00000050 | PAGE_FAULT_IN_NONPAGED_AREA | Something referenced memory that is not there | Drivers, RAM, sometimes disk |
| 0x0000007A | KERNEL_DATA_INPAGE_ERROR | Windows could not read needed data back from disk | Disk, cable, controller — check disk health first |
| 0x0000007B | INACCESSIBLE_BOOT_DEVICE | Windows lost access to its own drive during start | Storage mode change (RAID/AHCI) in firmware, storage driver, failing disk |
| 0x0000007E | SYSTEM_THREAD_EXCEPTION_NOT_HANDLED | A system thread crashed | The named driver |
| 0x0000009F | DRIVER_POWER_STATE_FAILURE | A driver did not handle sleep/wake in time | Drivers for Wi-Fi, USB, graphics, docks; happens on sleep/resume |
| 0x00000101 | CLOCK_WATCHDOG_TIMEOUT | A processor core stopped responding | CPU instability, overclock/undervolt, firmware |
| 0x00000116 | VIDEO_TDR_FAILURE | The graphics driver hung and could not be recovered | Graphics driver, GPU heat or fault (look for Display 4101 first) |
| 0x00000124 | WHEA_UNCORRECTABLE_ERROR | The hardware reported a fatal error | Hardware: CPU, RAM, heat, overclocking, power |
| 0x00000133 | DPC_WATCHDOG_VIOLATION | A driver took too long doing urgent work | Storage (SSD firmware/driver), network, audio drivers |
| 0x00000139 | KERNEL_SECURITY_CHECK_FAILURE | Kernel detected corrupted data structures | Drivers, memory corruption |
| 0x00000154 | UNEXPECTED_STORE_EXCEPTION | The memory compression store hit an error | Disk or RAM |
| 0x000000C2 / 0x00000019 | BAD_POOL_CALLER / BAD_POOL_HEADER | Kernel memory pool misuse or corruption | Drivers (filter drivers, antivirus), RAM |
| 0x000000EF | CRITICAL_PROCESS_DIED | A process Windows cannot live without ended | System file corruption, disk, security software |
| 0x000000F4 | CRITICAL_OBJECT_TERMINATION | A critical process or thread ended | Disk (often), system corruption |

Patterns across several crashes tell you more than any single one:

- **Different stop codes, different drivers each time** → suspect hardware
  (RAM, power, heat) before software.
- **Same code, same driver every time** → that driver or its device.
- **Only on sleep/resume** → `0x9F` territory: drivers and firmware.
- **Started right after an update or driver install** → that change is the
  prime suspect; a rollback is a reversible test (via `safe-system-changes`).

## Reading a dump (optional, free tools)

WinDbg is Microsoft's free debugger (install from the Microsoft Store or
`winget show --id Microsoft.WinDbg -e` to inspect first — installing is a
change the user approves). It downloads symbols from Microsoft's public
symbol server automatically.

1. Copy the dump out of `C:\Windows\Minidump` (reading it in place is fine
   too; never delete it).
2. Open it in WinDbg, run `!analyze -v`.
3. Note `BUGCHECK_CODE`, `MODULE_NAME`/`IMAGE_NAME`, `PROCESS_NAME` and the
   stack. `lmvm <module>` shows the driver's file, version and date.
4. Treat `nt`, `ntoskrnl.exe`, `hal.dll` or `memory_corruption` as
   "Windows was the victim"; look at the third-party modules on the stack
   and across other dumps.

Dumps contain memory contents (possibly personal data); do not upload them
anywhere without the user's explicit agreement. Online "send us your dump"
forum analyses are untrusted input (`untrusted-input-handling`).

### Dump settings (read-only check)

`HKLM\SYSTEM\CurrentControlSet\Control\CrashControl` — `CrashDumpEnabled`
(7 = automatic, 3 = small, 2 = kernel, 1 = complete, 0 = none), `MinidumpDir`,
`DumpFile`. If dumps are disabled or there is no page file, propose enabling
"Automatic memory dump" (System > About > Advanced system settings >
Startup and Recovery) as a change.

## App crashes and hangs

```powershell
# Crashes and hangs in the last 14 days, grouped
Get-WinEvent -FilterHashtable @{ LogName = 'Application'; Id = 1000, 1002;
    StartTime = (Get-Date).AddDays(-14) } -ErrorAction SilentlyContinue |
    ForEach-Object {
        $d = ([xml]$_.ToXml()).Event.EventData.Data
        [pscustomobject]@{ Time = $_.TimeCreated; Id = $_.Id;
            App = $d[0].'#text'; Module = $d[3].'#text'; Code = $d[6].'#text' }
    } | Group-Object App, Module | Sort-Object Count -Descending |
    Select-Object Count, Name
```

(The positions of data fields differ between 1000 and 1002 and across
Windows builds; check one raw event with `.ToXml()` before trusting the
column mapping.)

- The **faulting module** matters: if it is a third-party add-in, overlay or
  security DLL loaded into many apps (screen recorders, RGB tools, game
  overlays, older antivirus), it can crash unrelated programs.
- WER report folders (`C:\ProgramData\Microsoft\Windows\WER\ReportArchive`
  and `ReportQueue`) hold `Report.wer` text files with the same details plus
  loaded modules.
- To capture a dump for an app that keeps crashing, Windows Error Reporting
  can write local dumps when configured under
  `HKLM\SOFTWARE\Microsoft\Windows\Windows Error Reporting\LocalDumps`
  (values `DumpFolder`, `DumpType`, `DumpCount`; per-app subkeys allowed).
  That is a configuration change — propose it via `safe-system-changes`,
  and remove it when the investigation ends. On Windows 11, Task Manager can
  also create a live dump of a hung process (right-click > Create memory
  dump file).
- System-file corruption is a rare cause of app crashes. Propose
  `DISM /Online /Cleanup-Image /RestoreHealth` then `sfc /scannow` only
  when evidence points there (many unrelated Microsoft components failing,
  CBS errors), and treat it as a change.
