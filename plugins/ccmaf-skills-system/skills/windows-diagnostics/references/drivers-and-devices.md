# Drivers and devices

Drivers run with kernel privileges, so a bad one can crash the whole system
(most blue screens) or make a device flaky. Diagnose read-only; any install,
update, rollback, disable or removal is a change for `safe-system-changes`.

## Devices with problems

```powershell
# Devices currently in an error state (PnpDevice module, both editions)
Get-PnpDevice -PresentOnly -Status ERROR, DEGRADED, UNKNOWN -ErrorAction SilentlyContinue |
    Select-Object Status, Class, FriendlyName, InstanceId

# Problem code and driver details for one device
Get-PnpDeviceProperty -InstanceId '<InstanceId>' -KeyName 'DEVPKEY_Device_ProblemCode',
    'DEVPKEY_Device_DriverVersion', 'DEVPKEY_Device_DriverDate', 'DEVPKEY_Device_DriverProvider' |
    Select-Object KeyName, Data
```

```powershell
# pnputil is in-box; run elevated. Flag availability varies by build.
pnputil /enum-devices /problem                  # devices with problems (Windows 10 1903+)
pnputil /enum-devices /problem /deviceids       # plus hardware IDs (/deviceids: Windows 11 21H2+)
pnputil /enum-devices /class Display /drivers   # matching and installed drivers (/drivers: Windows 10 2004+)
pnputil /enum-drivers                           # third-party driver packages (oem#.inf) in the store
```

Device Manager (`devmgmt.msc`) shows the same: a warning icon and, under
Properties > General, the problem code. View > Show hidden devices reveals
disconnected ("ghost") devices.

### Common problem codes in plain words

| Code | Plain words | Typical next step (as a proposed change) |
|---|---|---|
| 10 | The device cannot start | Maker's driver; check event log for the driver's own errors |
| 22 | The device is disabled | Ask whether someone disabled it on purpose |
| 28 | No driver is installed | Windows Update optional drivers or the maker's driver |
| 31 | Windows cannot load the driver | Reinstall the maker's driver |
| 39 | The driver is missing or corrupt | Reinstall; check for security software interfering |
| 43 | The device reported a problem and Windows stopped it | Often hardware or USB power/cable; try another port |
| 45 | The device is not connected right now | Usually harmless (ghost device) |
| 52 | Windows cannot verify the driver's signature | Get a properly signed driver; never disable signature enforcement |

Look up anything else in Microsoft's Device Manager error code list rather
than guessing.

## Driver inventory and "what changed"

```powershell
# Signed drivers with versions and dates (both editions)
Get-CimInstance Win32_PnPSignedDriver |
    Where-Object DriverProviderName -and DeviceName |
    Sort-Object DriverDate -Descending |
    Select-Object -First 25 DeviceName, DriverProviderName, DriverVersion, DriverDate, InfName

# Kernel drivers loaded from unusual places (a hint for security review)
Get-CimInstance Win32_SystemDriver |
    Where-Object { $_.PathName -notmatch '\\Windows\\System32\\(drivers|DriverStore)\\' } |
    Select-Object Name, State, StartMode, PathName

driverquery /v /fo csv | ConvertFrom-Csv | Select-Object -First 5   # classic view
```

Correlate the newest driver dates and the Setup/Kernel-PnP install events
with when the problem started. A driver updated the day before crashes
began is the prime suspect.

## Driver-related events

- System `Microsoft-Windows-Kernel-PnP` 219: a driver failed to load.
- System `Display` 4101: graphics driver timed out and recovered.
- Stop codes naming a `.sys` file (see `crashes-bsod-dumps.md`); look the
  file up: `Get-Item C:\Windows\System32\drivers\<name>.sys | Select-Object VersionInfo`.
- `Microsoft-Windows-DriverFrameworks-UserMode/Operational` (often disabled)
  for user-mode driver hosts.

## What a fix would involve (write it up; do not run it)

When proposing a driver change to `safe-system-changes`, include:

1. **Source**: the PC or device maker's support page, or Windows Update
   optional updates. Not third-party "driver updater" tools, not random
   download sites.
2. **Backup of the current driver**: `pnputil /export-driver oem<N>.inf <folder>`
   (read-only export) so it can be reinstalled.
3. **Rollback option**: Device Manager > device > Driver > Roll Back Driver,
   available only if a previous driver is still present.
4. **Restore point** beforehand (`DEVICE_DRIVER_INSTALL` type, via Windows
   PowerShell 5.1 `Checkpoint-Computer`).
5. **Verification**: the device's problem code clears, and the crash or
   symptom does not recur over an agreed period.

Removing a driver package (`pnputil /delete-driver`) and clean-uninstall
utilities for graphics drivers are bigger changes; propose them only when a
normal reinstall has failed, and with the user's explicit agreement.

Never suggest disabling driver signature enforcement, Memory Integrity
(Core isolation), or Secure Boot to get a driver working. If a driver is
blocked by Memory Integrity, the right answer is an updated, compatible
driver from the maker; turning the protection off is a security decision
for the user with `windows-security-hygiene`, not a fix.
