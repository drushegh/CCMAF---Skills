# Event log catalogue

Event IDs are only meaningful together with their **provider** (source): the
same number means different things from different providers. Always filter on
both. Wording below is a plain-words gloss, not the official message text.
Where an ID is marked *(verify)*, confirm the meaning on the machine
(`Get-WinEvent -ListProvider <name>`) or in Microsoft's documentation before
relying on it.

## Power, restarts and shutdowns (System log)

| Provider | ID | Plain words |
|---|---|---|
| Microsoft-Windows-Kernel-Power | 41 | Windows restarted without shutting down cleanly. Look at `BugcheckCode` (decimal) and `PowerButtonTimestamp` in the event data. |
| EventLog | 6008 | The previous shutdown at a given time was unexpected. |
| EventLog | 6005 / 6006 | Event log service started (boot) / stopped (clean shutdown). |
| EventLog | 6009 | OS version recorded at boot. |
| User32 | 1074 | A person or program asked for a restart or shutdown, with the reason. |
| Microsoft-Windows-WER-SystemErrorReporting (BugCheck) | 1001 | The PC restarted after a blue screen; message gives the stop code, parameters and dump path. |
| Microsoft-Windows-Kernel-General | 12 / 13 | Operating system start / shutdown time. |
| Microsoft-Windows-Power-Troubleshooter | 1 | Returned from sleep; includes the wake source. |
| volmgr | 46 | Crash dump initialisation failed — the PC could not save a dump (often page file settings). |

Reading 41: `BugcheckCode` non-zero = a stop error (convert to hex);
`PowerButtonTimestamp` non-zero = someone held the power button; both zero =
power loss, hard hang, or failure before anything could be written.

## Application crashes and hangs (Application log)

| Provider | ID | Plain words |
|---|---|---|
| Application Error | 1000 | A program crashed. Gives the faulting app, faulting module and exception code. |
| Application Hang | 1002 | A program stopped responding and was closed. |
| Windows Error Reporting | 1001 | A problem report was created (fault bucket, report folder). Same ID as BugCheck but a different provider and log. |
| .NET Runtime | 1026 | A .NET app ended with an unhandled exception; the message has the exception and stack. |
| MsiInstaller | 11707 / 11708, 1033 | An MSI install succeeded / failed; product installed (useful for "what changed"). |

Common exception codes in 1000 events: `0xc0000005` access violation (bad
memory access, very often a bug or an injected add-in), `0xc0000409` stack
buffer overrun / fail-fast (the app deliberately stopped itself), `0xe0434352`
unhandled .NET exception (see the matching 1026), `0x80000003` breakpoint
(debug build or deliberate crash), `0xc0000374` heap corruption.

## Services (System log, provider Service Control Manager)

| ID | Plain words |
|---|---|
| 7000 | A service failed to start. |
| 7001 | A service did not start because a service it depends on failed. |
| 7009 | Timed out waiting for a service to connect (slow start). |
| 7011 | Timed out waiting for a service to respond to a request. |
| 7023 / 7024 | A service stopped with an error / with a service-specific error. |
| 7031 | A service stopped unexpectedly; the recovery action is listed. |
| 7034 | A service stopped unexpectedly (count given). |
| 7040 | A service's start type was changed. |
| 7045 | A new service was installed (path and account given) — good "what changed" marker and worth a glance from `windows-security-hygiene`. |

## Storage and file system (System log)

| Provider | ID | Plain words |
|---|---|---|
| disk | 7 | The disk has a bad block. Hardware warning. |
| disk | 11 | The driver detected a controller error. |
| disk | 51 | An error was detected during a paging operation. |
| disk | 153 | An I/O was retried (the miniport timed out a request). |
| disk | 157 | A disk was surprise-removed (cable, enclosure, USB power, failing drive). |
| storahci / stornvme / other miniport | 129 | Reset to device issued — the storage driver timed out a request. |
| Ntfs | 55, 98, 50, 140 | File system structure problems; `chkdsk` is needed (repair is a change). |

Repeated 7/51/153/129 with freezes means: back up now, then check health
(`disk-and-hardware-health.md`).

## Hardware errors (System log, provider Microsoft-Windows-WHEA-Logger)

| ID | Plain words |
|---|---|
| 17, 19 | A hardware error was detected and **corrected** (PCIe link, CPU cache). Occasional ones are tolerable; floods matter. |
| 18 | A **fatal** hardware error; usually accompanies stop code 0x124. |

The message names the component (processor core, PCI Express root port and
device). Overclocking, undervolting, unstable XMP/EXPO memory profiles and
heat are common causes on desktops.

## Drivers and devices (System log)

| Provider | ID | Plain words |
|---|---|---|
| Microsoft-Windows-Kernel-PnP | 219 | A driver failed to load for a device. Often harmless once at boot; matters if the device then misbehaves. |
| Display | 4101 | The display driver stopped responding and recovered (a GPU timeout, "TDR"). Repeated = driver, overheating or failing GPU. |
| Microsoft-Windows-Resource-Exhaustion-Detector | 2004 | Windows ran low on virtual memory; names the biggest consumers. |

## Boot and shutdown performance

Log `Microsoft-Windows-Diagnostics-Performance/Operational`, provider
`Microsoft-Windows-Diagnostics-Performance`:

| ID | Plain words |
|---|---|
| 100 | Boot performance record: total boot time and phases (`BootTime` in ms in the event data). |
| 101–110 *(verify)* | A specific app, driver, service or device slowed the boot; the event names it. |
| 200 | Shutdown performance record. |
| 201–203 *(verify)* | A specific component slowed shutdown. |

## Windows Update

| Log / provider | ID | Plain words |
|---|---|---|
| System / Microsoft-Windows-WindowsUpdateClient | 19 | An update installed successfully. |
| System / Microsoft-Windows-WindowsUpdateClient | 20 | An update failed to install (error code in the message). |
| System / Microsoft-Windows-WindowsUpdateClient | 43 / 44 | Installation started / download started. |

Translate the error code (`0x800f0922`, `0x80070002` and so on) through
Microsoft's Windows Update error documentation; servicing detail is in
`%windir%\Logs\CBS\CBS.log`.

## Security-relevant (for context only)

Defender detections: `Microsoft-Windows-Windows Defender/Operational` 1116
(threat detected) and 1117 (action taken). Logon failures: Security 4625.
Interpretation belongs to `windows-security-hygiene` / `incident-response`.

## Usually noise

DistributedCOM 10016; Kernel-PnP 219 for a device that works; Time-Service
warnings after being offline; ESENT and "the description for event ID cannot
be found" messages from uninstalled software. Only act if they line up with
the symptom.
