# Startup and background trimming

The highest-value, lowest-risk tuning on most PCs. Goal: only things the user
needs at sign-in start at sign-in.

## Startup apps

1. List them (Task Manager > Startup apps; Settings > Apps > Startup).
2. For each enabled entry, classify with the user:
   - **Keep:** security software, input/touchpad/audio drivers' helpers the
     hardware needs, cloud sync the user relies on, accessibility tools.
   - **Delay or keep but question:** chat apps, game launchers, updaters,
     vendor "assistant" tools.
   - **Disable:** things the user never uses at sign-in.
   - **Unknown:** do not disable blind; check it with
     `windows-security-hygiene` first.
3. Disable through **Task Manager or Settings** (the supported toggle). It is
   reversible from the same screen and leaves the app installed.
4. Journal each toggle: entry name, publisher, location shown, prior state.
5. Reboot, re-measure sign-in time and idle resource use.

Many apps also have their own "start with Windows" option; turning that off
inside the app is the cleanest route and survives app updates better.

Edge has two sign-in related features (startup boost and background mode)
that can be turned off in `edge://settings/system`; policy equivalents are in
the catalogue.

## Background apps (Store apps)

On Windows 11, background permission is per app: Settings > Apps > Installed
apps > (app) > Advanced options > **Background app permissions** (shown only for
apps that support it). Set to Never for apps the user does not need
notifications from. Communication apps (mail, chat, phone link) need
background activity for notifications; Microsoft warns that denying it can
break message and email notifications.

A machine-wide policy exists (catalogue entry PT-07) but is blunt; prefer per
app.

## Scheduled tasks

Third-party updaters often add logon or daily tasks. Review read-only:

```powershell
Get-ScheduledTask | Where-Object { $_.TaskPath -notlike '\Microsoft\*' -and $_.State -ne 'Disabled' } |
  Select-Object TaskPath, TaskName, State, Author
```

Disabling a third-party updater task is acceptable with the user's agreement
(`Disable-ScheduledTask`, undo `Enable-ScheduledTask`), after exporting it with
`Export-ScheduledTask`. **Do not disable tasks under `\Microsoft\Windows\`**
for performance; they include servicing, defrag/TRIM, Defender scans and
component clean-up, and their cost is scheduled for idle time.

## Services: the short version

Service tuning is mostly a trap. Windows already sets most services to Manual
or trigger-start, so they do not run unless needed.

**Do not disable** (non-exhaustive): Windows Update (`wuauserv`), Update
Orchestrator, Background Intelligent Transfer Service, Microsoft Defender
services, Windows Firewall (`mpssvc`), Windows Security Center, Cryptographic
Services, Windows Event Log, Windows Installer, Windows Time, RPC services,
DCOM launcher, Plug and Play, Task Scheduler, Windows Search (`WSearch`)
unless the user explicitly accepts losing search, SysMain, Print Spooler while
the user prints.

**Acceptable, with the user's agreement and after export:** setting a
**third-party** vendor's auto-start helper service to Manual when the user no
longer uses that feature, for example a defunct printer vendor's update
service. Capture the original start type with `sc.exe qc <svc>` (it shows
`AUTO_START (DELAYED)`, which `Set-Service` on Windows PowerShell 5.1 cannot
express) and save it to the run's backup folder; change with `sc.exe config
<svc> start= demand`; undo with `sc.exe config <svc> start=
<auto|delayed-auto|demand|disabled>` matching the captured value.

If a Windows service seems to be using resources, that is a diagnosis
question (why is it busy?) for `windows-diagnostics`, not a reason to disable
it.

## Runaway processes

A single process pinning CPU, memory or disk is the most common "my PC is
slow" cause. Identify it (Task Manager, `Get-Process`, Resource Monitor),
then:

- If it is an app: update it, restart it, check its settings, or uninstall it.
- If it is Windows servicing (TiWorker, MsMpEng scanning, Search indexing)
  after an update or first boot: often temporary; re-measure after it settles.
- If it is unknown: `windows-security-hygiene` before anything else.

Ending a process is a change (unsaved work can be lost): ask first.

## Before/after record

| Entry | Type | Prior | New | Measured effect | Kept? | Undo |
|---|---|---|---|---|---|---|
| ChatApp | Startup app | Enabled | Disabled | Sign-in −4 s | Yes | Task Manager > Startup apps > Enable |
