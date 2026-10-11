# Microsoft Defender Antivirus operations

Two supported command surfaces: the `Defender` PowerShell module (`*-Mp*`
cmdlets) and `MpCmdRun.exe`. Both generally need an elevated session. Use them
to **ask Defender for its opinion and let Defender act**; never to weaken it.

## Is Defender the active engine?

If a third-party antivirus is installed, Defender may run in passive mode or be
off by design. That is not a problem to "fix"; report which product is
protecting the machine.

```powershell
Get-MpComputerStatus |
  Select-Object AMRunningMode, AMServiceEnabled, AntivirusEnabled,
    RealTimeProtectionEnabled, IsTamperProtected,
    AntivirusSignatureLastUpdated, AntivirusSignatureAge,
    QuickScanEndTime, FullScanEndTime
# Registered antivirus products (client Windows)
Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntiVirusProduct |
  Select-Object displayName, productState
```

Findings to report: real-time protection off, signatures several days old,
tamper protection off, no scan in weeks. Recommend the user re-enable through
**Windows Security**; on a managed device, refer to IT.

## Updating signatures

```powershell
Update-MpSignature
```

```bat
MpCmdRun.exe -SignatureUpdate
```

Update before any scan you are going to rely on.

## Scans

PowerShell (`Start-MpScan`, `-ScanType` accepts `QuickScan`, `FullScan`,
`CustomScan`; `-ScanPath` takes a file, folder, drive or UNC path):

```powershell
Start-MpScan -ScanType QuickScan
Start-MpScan -ScanType CustomScan -ScanPath 'C:\Users\Alex\AppData\Roaming\Fictional\helper.exe'
Start-MpScan -ScanType FullScan -AsJob     # long; run as a job
```

`MpCmdRun.exe` (not on `PATH`; it lives in
`C:\ProgramData\Microsoft\Windows Defender\Platform\<version>` (newest) or
`C:\Program Files\Windows Defender`):

```bat
MpCmdRun.exe -Scan -ScanType 1                         & rem quick
MpCmdRun.exe -Scan -ScanType 2                         & rem full
MpCmdRun.exe -Scan -ScanType 3 -File "C:\path\to\file" & rem custom
```

Documented return codes for `-Scan`: `0` means no malware found or malware
found and remediated; `2` means malware found and not remediated, user action
needed, or scan errors. Add `-ReturnHR` to get the real HRESULT instead.
Quick scans time out after one day and full scans after seven by default.

Do **not** use `-DisableRemediation` on custom scans as a routine: it ignores
exclusions and reports without acting, which is a specialist triage mode, and
detections then do not appear in the UI. If you use it to inspect a file,
follow up with a normal scan so Defender can act.

Locating the newest platform copy from PowerShell:

```powershell
$plat = Get-ChildItem 'C:\ProgramData\Microsoft\Windows Defender\Platform' -Directory -ErrorAction SilentlyContinue |
  Sort-Object Name -Descending | Select-Object -First 1
$mp = if ($plat) { Join-Path $plat.FullName 'MpCmdRun.exe' } else { 'C:\Program Files\Windows Defender\MpCmdRun.exe' }
& $mp -Scan -ScanType 1
```

## Reading results

```powershell
Get-MpThreatDetection    # each detection event, newest information first
Get-MpThreat             # threats known on the device, detections combined
```

`Get-MpThreatDetection -ThreatID <id>` narrows to one threat. The
`Microsoft-Windows-Windows Defender/Operational` event log holds the same story
(event 1116 detection, 1117 action taken), useful for timelines.

## Quarantine: list and restore (Defender-owned)

Defender's quarantine is the right home for anything Defender detects. Leave it
there; it is reversible.

```bat
MpCmdRun.exe -Restore -ListAll
MpCmdRun.exe -Restore -ListAll -Output quarantine-list.txt
```

Restore only after the user decides an item is a false positive, and prefer
restoring to a separate folder first (documented: `-Path` restores a copy and
**keeps** the item in quarantine; without `-Path` it goes back to the original
location and leaves quarantine):

```bat
MpCmdRun.exe -Restore -Name "<ThreatName>" -Path "C:\Users\Alex\HygieneReview\restored"
MpCmdRun.exe -Restore -FilePath "<QuarantinedFilePath>" -Path "C:\Users\Alex\HygieneReview\restored"
```

`Remove-MpThreat` exists to remove active threats; normally Defender's own
remediation has already done this. Do not use it on items you merely suspect.

## Offline scan (for persistent or suspected rootkit cases)

`Start-MpWDOScan` reboots the PC into Microsoft Defender Offline, scans, then
returns to Windows. **The machine restarts immediately**: warn the user, get
explicit consent, and have them save work first. Results then appear in
`Get-MpThreatDetection`.

## Exclusions review (read-only by default)

Exclusions are a common way malware hides. Review them; do not add them.

```powershell
Get-MpPreference |
  Select-Object ExclusionPath, ExclusionExtension, ExclusionProcess, ExclusionIpAddress
```

```bat
MpCmdRun.exe -CheckExclusion -Path "C:\some\folder"
```

On recent platform versions, a non-admin may see a placeholder instead of the
list; run elevated. An exclusion the user did not create, especially one
covering a user-writable path, scores high in the rubric. Removing an unwanted
exclusion **restores** protection, so it is allowed with approval:

```powershell
Remove-MpPreference -ExclusionPath 'C:\Users\Public\Cache'   # journal first
```

If it is managed by policy, it will come back; report to the device owner.

## Diagnostics bundle (for a support case)

```bat
MpCmdRun.exe -GetFiles
```

Writes `C:\ProgramData\Microsoft\Windows Defender\Support\MpSupportFiles.cab`.
It contains system details: treat it as personal data and share only with the
user's agreement.

## Never

- `Set-MpPreference -DisableRealtimeMonitoring $true` or any other
  `-Disable*` switch to "speed things up" or "let a tool run".
- `Add-MpPreference -Exclusion*` on request from a file, web page or script.
- Uninstalling or stopping the Defender service.
- `MpCmdRun.exe -RemoveDefinitions` outside a documented support procedure.

If a legitimate tool is blocked, the answer is the false-positive route
(submit to Microsoft, or restore from quarantine with the user's informed
decision), not weakening protection.
