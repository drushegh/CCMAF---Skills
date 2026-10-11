# Persistence locations (autostart catalogue)

Where Windows code gets itself launched without the user clicking it. Sweep
all of these in a full review. Everything below is **read-only**.

Run elevated where noted; record anything you could not read as "not checked"
in the report rather than silently skipping it.

## Option A: Autoruns / autorunsc (most complete)

Sysinternals Autoruns knows far more autostart locations than any hand list.
Download from Microsoft's Sysinternals site (or run from Sysinternals Live).
The download is an outside file: verify its signature
(`Get-AuthenticodeSignature`, signer should be Microsoft) before running it.

```powershell
# All entry types, verify signatures, show hashes, CSV, all user profiles
.\autorunsc64.exe -a * -s -h -c '*' > autoruns.csv
# Hide entries signed by Microsoft (-m with -s verifies before hiding)
.\autorunsc64.exe -a * -s -m -h -c '*' > autoruns-nonms.csv
```

Documented switches used here: `-a *` (all categories; letters select subsets:
`l` logon, `s` services and drivers, `t` scheduled tasks, `m` WMI, `w`
Winlogon, `h` image hijacks, `d` AppInit DLLs, `b` boot execute, `e` Explorer
add-ons, `k` known DLLs, `n` Winsock, `p` print monitors, `r` LSA providers,
`o` codecs, `i` IE add-ons), `-s` verify signatures, `-h` hashes, `-c` CSV,
`-ct` tab-delimited, `-x` XML, `-t` UTC timestamps, `-m` hide Microsoft
entries, `-u` unsigned/unknown only, trailing `user` or `*` for profiles.

VirusTotal switches (`-v`, `-vr`, `-vs`, `-vt`) send hashes (and with `s`,
files) to a third-party service. Optional, needs user consent, and **never
use the upload variant on user files**. The first run shows a licence prompt;
that is expected.

Autoruns can also disable and delete entries. In this skill we use it for
enumeration only; changes go through `quarantine-and-containment.md`.

## Option B: PowerShell recipes (built-in, no download)

### Run and RunOnce keys

Microsoft documents four keys; also check the 32-bit view on 64-bit Windows.

```powershell
$runKeys = @(
  'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run',
  'HKLM:\Software\Microsoft\Windows\CurrentVersion\RunOnce',
  'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Run',
  'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\RunOnce',
  'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run',
  'HKCU:\Software\Microsoft\Windows\CurrentVersion\RunOnce'
)
foreach ($k in $runKeys) {
  if (Test-Path $k) {
    $props = Get-ItemProperty -Path $k
    $props.PSObject.Properties |
      Where-Object Name -notlike 'PS*' |
      ForEach-Object { [pscustomobject]@{ Key = $k; Name = $_.Name; Command = $_.Value } }
  }
}
```

Notes from the documentation: values are command lines up to 260 characters;
`RunOnce` values are deleted before (or with a `!` prefix, after) they run; a
`*` prefix forces a `RunOnce` entry to run in Safe Mode, which is worth noting
as unusual on a home PC. `HKCU` is only the current user: for other profiles,
use autorunsc with `*`, or review each user while signed in as them.

### Startup folders

```powershell
$folders = @(
  [Environment]::GetFolderPath('Startup'),        # per-user (shell:startup)
  [Environment]::GetFolderPath('CommonStartup')   # all users (shell:common startup)
)
Get-ChildItem -Path $folders -Force -ErrorAction SilentlyContinue |
  Select-Object FullName, Length, CreationTime, LastWriteTime
```

Shortcuts (`.lnk`) point elsewhere: resolve the target before checking it.

```powershell
$shell = New-Object -ComObject WScript.Shell
Get-ChildItem $folders -Filter *.lnk | ForEach-Object {
  $l = $shell.CreateShortcut($_.FullName)
  [pscustomobject]@{ Shortcut = $_.Name; Target = $l.TargetPath; Args = $l.Arguments }
}
```

`Get-CimInstance Win32_StartupCommand` gives a quick combined view of Run keys
and Startup folders, but it is not exhaustive; use it as a cross-check.

### Services (elevated for full detail)

```powershell
Get-CimInstance Win32_Service |
  Select-Object Name, DisplayName, State, StartMode, StartName, PathName |
  Sort-Object StartMode, Name
```

Look at `PathName` (the binary and arguments), not `DisplayName`. Flags: binary
outside `C:\Windows` and `C:\Program Files*`; paths with spaces and no quotes
(unquoted service path); `cmd.exe`/`powershell.exe` as the service binary;
auto-start services from unknown publishers. Drivers are listed separately
(`Get-CimInstance Win32_SystemDriver`); review non-Microsoft drivers too.

### Scheduled tasks

```powershell
Get-ScheduledTask | ForEach-Object {
  foreach ($a in $_.Actions) {
    [pscustomobject]@{
      Path    = $_.TaskPath + $_.TaskName
      State   = $_.State
      Author  = $_.Author
      Execute = $a.Execute
      Args    = $a.Arguments
    }
  }
} | Where-Object Execute
```

Most entries under `\Microsoft\Windows\` are Windows' own; still check the
`Execute` path for anything outside system folders. Pay attention to tasks
triggered at logon or startup, tasks running hidden scripts
(`powershell -w hidden -enc ...`, `mshta`, `wscript`), and tasks at the root
`\` with random-looking names. `Get-ScheduledTaskInfo` adds last and next run
times.

### WMI event subscriptions

Permanent subscriptions pair a filter (the trigger) with a consumer (the
action) through a binding. Legitimate ones exist (some vendor and management
software) but they are rare on a home PC.

```powershell
$ns = 'root\subscription'
Get-CimInstance -Namespace $ns -ClassName __EventFilter |
  Select-Object Name, Query
Get-CimInstance -Namespace $ns -ClassName __EventConsumer |
  Select-Object Name, CommandLineTemplate, ExecutablePath, ScriptText
Get-CimInstance -Namespace $ns -ClassName __FilterToConsumerBinding |
  Select-Object Filter, Consumer
```

`CommandLineEventConsumer` and `ActiveScriptEventConsumer` instances deserve
close attention. Record full properties for any you find.

### Winlogon, image hijacks and other high-value keys

| Location | What to expect | Signal |
|---|---|---|
| `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon` `Userinit` | `C:\Windows\system32\userinit.exe,` | Anything appended after the comma |
| same key, `Shell` | `explorer.exe` | Any other value |
| `HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows NT\CurrentVersion\Winlogon` `Userinit`, `Shell` | Same defaults, or absent | The 32-bit view is checked separately; anything else is a signal |
| `HKCU\Software\Microsoft\Windows NT\CurrentVersion\Winlogon` `Shell` | Absent | A per-user shell replacement; any value needs explaining |
| `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\<exe>` `Debugger` | Usually absent | A `Debugger` value hijacks launches of that exe (except deliberate developer use) |
| `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Windows` `AppInit_DLLs` | Empty | Any DLL listed |
| `HKLM\SYSTEM\CurrentControlSet\Control\Session Manager` `BootExecute` | `autocheck autochk *` | Extra entries |

```powershell
'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon',
'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows NT\CurrentVersion\Winlogon',
'HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Winlogon' |
  Where-Object { Test-Path $_ } |
  ForEach-Object { Get-ItemProperty $_ | Select-Object PSPath, Userinit, Shell }
Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options' |
  ForEach-Object { $d = (Get-ItemProperty $_.PSPath).Debugger; if ($d) { [pscustomobject]@{ Exe = $_.PSChildName; Debugger = $d } } }
```

### Also worth a glance

- **Browser extensions** (per browser profile; review in the browser's own
  extensions page rather than on disk).
- **Office add-ins** (File > Options > Add-ins in each Office app).
- **Defender exclusions** (`Get-MpPreference`, see `defender-operations.md`);
  an exclusion you did not create is a high-value finding.
- **Local accounts and Administrators membership**
  (`Get-LocalUser`, `Get-LocalGroupMember Administrators`).
- **Hosts file** (`C:\Windows\System32\drivers\etc\hosts`) for redirections
  of security or update sites.

## Output of the sweep

One row per entry: `Location | Entry | Command line | Resolved image | Notes`.
Feed resolved images to `signature-and-file-checks.md`, then rate with
`risk-rubric.md`.
