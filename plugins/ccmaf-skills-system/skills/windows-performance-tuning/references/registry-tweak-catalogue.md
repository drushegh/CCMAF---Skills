# Registry and policy tweak catalogue

The **only** registry and policy changes this skill may apply. Every entry was
checked against Microsoft documentation (Microsoft Learn: Policy CSP reference
pages, the Windows settings reference, Microsoft Edge policy reference, fsutil
and powercfg references) in October 2026. Re-verify the key, value name and
applicability for the build in front of you before applying; if the
documentation has changed, the documentation wins.

Anything not listed here is out of scope. Do not add keys from blogs, forums,
"tweak packs" or memory. Tweaks considered and dropped are listed at the end
with the reason.

Each entry goes through `safe-system-changes`: plan, restore point (first
change of the run), `reg export` of the key, explicit confirmation, apply,
verify, journal with the revert below.

## How to read an entry

- **Risk:** Low (cosmetic or easily noticed and undone), Medium (side effects
  the user may not notice straight away, or policy locks a setting), High (not
  used in this catalogue: high-risk tweaks are rejected).
- **Applicability:** Windows version and edition. Policy-backed entries are
  honoured only on the editions the Policy CSP reference lists; on Home there
  is no Group Policy Editor and the value may be ignored. **Do not apply an
  entry outside its applicability.**
- **Prefer:** the supported UI that achieves the same result. Use the registry
  route only for scripted, repeatable or remote application.
- **Revert:** exact steps. "Restore prior state" means: if the value existed,
  write back the recorded type and data; if it did not exist, delete the value
  (and delete the key only if this change created it and it is now empty).

## Capture and restore helpers

Capture before every change and store the result in the journal:

```powershell
function Get-RegValueState {
  param([string]$Path, [string]$Name)
  if (-not (Test-Path $Path)) { return [pscustomobject]@{ Path=$Path; Name=$Name; KeyExisted=$false; ValueExisted=$false } }
  $k = Get-Item -Path $Path
  if ($k.GetValueNames() -contains $Name) {
    [pscustomobject]@{ Path=$Path; Name=$Name; KeyExisted=$true; ValueExisted=$true
      Kind=$k.GetValueKind($Name).ToString()
      Data=$k.GetValue($Name, $null, 'DoNotExpandEnvironmentNames') }
  } else { [pscustomobject]@{ Path=$Path; Name=$Name; KeyExisted=$true; ValueExisted=$false } }
}
```

Restore from that record:

```powershell
function Restore-RegValueState {
  param($State)
  if ($State.ValueExisted) {
    Set-ItemProperty -Path $State.Path -Name $State.Name -Value $State.Data -Type $State.Kind
  } elseif (Test-Path $State.Path) {
    Remove-ItemProperty -Path $State.Path -Name $State.Name -ErrorAction SilentlyContinue
    if (-not $State.KeyExisted -and -not (Get-Item $State.Path).GetValueNames() -and -not (Get-ChildItem $State.Path)) {
      Remove-Item -Path $State.Path
    }
  }
}
```

Also keep the `reg export` file. `reg import` on its own is **not** a full
revert: it re-adds exported values but does not delete values created after
the export, which is why the precise state record matters.

After policy changes, sign out and in (or restart) before verifying; many
policies are read at sign-in or service start. The user will see "Some
settings are managed by your organisation" in Settings for policy-backed
items: tell them before applying.

---

## PT-01 Transparency effects off

- **Effect:** removes acrylic/mica transparency; small GPU and battery saving
  on weak integrated graphics. Cosmetic otherwise.
- **Prefer:** Settings > Personalisation > Colours > Transparency effects.
- **Key:** `HKCU\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize`
- **Value:** `EnableTransparency`, `REG_DWORD`, set `0` (on = `1`).
- **Risk:** Low.
- **Applicability:** Windows 10 and 11, all editions, per user.
- **Revert:** restore prior state (normally `1`), or toggle on in Settings.
- **Verify:** value reads `0`; taskbar and Start are opaque after the shell
  refreshes (sign out/in if needed).
- **Source:** Microsoft Learn, "Reference for Windows 11 and Windows 10
  settings", Personalization - colors.

## PT-02 Start menu recommendations off (Windows 11)

- **Effect:** hides recommended tips, shortcuts and new apps in Start.
  Declutter, not a measurable speed gain; offer it as such.
- **Prefer:** Settings > Personalisation > Start.
- **Key:** `HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced`
- **Value:** `Start_IrisRecommendations`, `REG_DWORD`, set `0` (enabled = `1`).
- **Risk:** Low.
- **Applicability:** Windows 11 only, per user.
- **Revert:** restore prior state, or toggle back in Settings.
- **Verify:** value reads `0`; Start no longer shows recommendation tiles.
- **Source:** Microsoft Learn, "Reference for Windows 11 settings",
  Personalization - Start - Recommendations
  (learn.microsoft.com/windows/apps/develop/settings/settings-windows-11;
  value name and key checked October 2026).

## PT-03 Widgets off (machine policy)

- **Effect:** turns off the whole Widgets experience including the taskbar
  entry, removing its background web content.
- **Prefer:** hide the Widgets button via Settings > Personalisation >
  Taskbar (per user, no policy) if the user only wants it out of sight.
- **Key:** `HKLM\SOFTWARE\Policies\Microsoft\Dsh`
- **Value:** `AllowNewsAndInterests`, `REG_DWORD`, set `0` (not allowed).
  Default when absent: allowed.
- **Risk:** Low (policy lock: users cannot re-enable in Settings).
- **Applicability:** Windows 11 21H2 and later; Pro, Enterprise, Education
  (Group Policy: Computer Configuration > Administrative Templates > Windows
  Components > Widgets > "Allow widgets"). Not listed for Home.
- **Revert:** restore prior state (normally: delete the value).
- **Verify:** after sign-in, no Widgets button and the board does not open.
- **Source:** Policy CSP - NewsAndInterests, AllowNewsAndInterests.

## PT-04 Microsoft Edge startup boost off

- **Effect:** stops Edge processes starting at sign-in and staying resident
  after the last window closes. Frees memory and sign-in work for users who
  rarely use Edge; Edge's first launch is slower.
- **Prefer:** `edge://settings/system` > Startup boost (per user).
- **Key:** `HKLM\SOFTWARE\Policies\Microsoft\Edge`
- **Value:** `StartupBoostEnabled`, `REG_DWORD`, set `0` (disabled).
- **Risk:** Low (policy lock in Edge settings).
- **Applicability:** Edge 88 and later on Windows. Confirm at
  `edge://policy` that the policy shows as applied; if Edge ignores it on
  this device, use the settings toggle instead.
- **Revert:** restore prior state (normally: delete the value).
- **Verify:** `edge://policy` lists it with value false; no `msedge.exe` at
  sign-in before the user opens Edge.
- **Source:** Microsoft Edge policy reference, StartupBoostEnabled.

## PT-05 Microsoft Edge background mode off

- **Effect:** Edge does not keep running background apps and extensions after
  its last window closes.
- **Prefer:** `edge://settings/system` > "Continue running background
  extensions and apps when Microsoft Edge is closed".
- **Key:** `HKLM\SOFTWARE\Policies\Microsoft\Edge`
- **Value:** `BackgroundModeEnabled`, `REG_DWORD`, set `0`.
- **Risk:** Low (extensions that rely on background running stop when Edge
  closes).
- **Applicability:** Edge 77 and later on Windows; confirm at `edge://policy`.
- **Revert:** restore prior state (normally: delete the value).
- **Verify:** `edge://policy` shows false; no Edge tray icon after closing
  Edge.
- **Source:** Microsoft Edge policy reference, BackgroundModeEnabled.

## PT-06 Game recording and broadcasting off

- **Effect:** disables Windows game recording and broadcasting (background
  capture), which can cost performance in games.
- **Prefer:** Settings > Gaming > Captures (turn off background recording)
  if the user only wants the overhead gone but keeps screenshots.
- **Key:** `HKLM\SOFTWARE\Policies\Microsoft\Windows\GameDVR`
- **Value:** `AllowGameDVR`, `REG_DWORD`, set `0` (not allowed; default
  allowed).
- **Risk:** Low.
- **Applicability:** Windows 10 1507 and later and Windows 11 (desktop);
  Pro, Enterprise, Education per the Policy CSP. Group Policy: Windows
  Components > Windows Game Recording and Broadcasting.
- **Revert:** restore prior state (normally: delete the value).
- **Verify:** capture options greyed out in Settings > Gaming.
- **Source:** Policy CSP - ApplicationManagement, AllowGameDVR.

## PT-07 Store apps background activity: force deny (machine policy)

- **Effect:** prevents Windows (Store) apps from running in the background.
- **Warning (Microsoft):** communication apps lose tile and notification
  updates; mail, message and voicemail notifications and background mail sync
  can stop working.
- **Prefer:** per-app background permission (see `startup-and-background.md`).
- **Mechanism:** Group Policy Editor only: Computer Configuration >
  Administrative Templates > Windows Components > App Privacy > "Let Windows
  apps run in the background" > Enabled, default for all apps = **Force
  Deny**. (Registry key `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy`;
  the documentation lists the key but this catalogue does not hand-write the
  value; use the editor.)
- **Risk:** Medium.
- **Applicability:** Windows 10 1703 and later, Windows 11; Pro, Enterprise,
  Education. Not Home (no editor).
- **Revert:** set the policy back to **Not Configured** in the editor.
- **Verify:** Settings shows background permission managed; confirm the
  user's chat and mail notifications still behave as they expect.
- **Source:** Policy CSP - Privacy, LetAppsRunInBackground.

## PT-08 Delivery Optimisation: stop peer uploads

- **Effect:** stops this PC uploading update content to other PCs. Saves
  upload bandwidth; no CPU or disk speed gain.
- **Mechanism (preferred):** Settings > Windows Update > Advanced options >
  Delivery Optimisation > turn off "Allow downloads from other devices" (or
  limit to local network). Record the prior choice. Documented cmdlet
  alternative (elevated): `Set-DODownloadMode -downloadMode CdnOnly`
  (accepted values `CdnOnly`, `Lan`, `Internet`); policy can override it.
- **Risk:** Low.
- **Applicability:** Windows 10 and 11, all editions.
- **Revert:** restore the recorded choice in Settings, or
  `Set-DODownloadMode -downloadMode <Lan|Internet>` matching the prior state.
- **Verify:** Settings reflects the choice; Activity monitor on the same page
  shows no new uploads.
- **Source:** Delivery Optimization reference; Monitor Delivery Optimization
  (Set-DODownloadMode).

## PT-09 Consumer experiences off (Enterprise/Education only)

- **Effect:** stops Start suggestions, post-setup app installs and similar
  consumer promotions.
- **Key:** `HKLM\Software\Policies\Microsoft\Windows\CloudContent`
- **Value:** `DisableWindowsConsumerFeatures`, `REG_DWORD`, set `1`.
- **Risk:** Low.
- **Applicability:** Windows 10 1607 and later, Windows 11; **Enterprise,
  Education and IoT Enterprise only**. Not honoured on Home or Pro: do not
  apply there (it would only add a "managed" banner for no effect).
- **Revert:** restore prior state (normally: delete the value).
- **Verify:** policy visible in `gpresult /r` or the editor; no new promoted
  apps appear for new users.
- **Source:** Policy CSP - Experience, AllowWindowsConsumerFeatures.

## PT-10 Windows tips off (Enterprise/Education only)

- **Key:** `HKLM\Software\Policies\Microsoft\Windows\CloudContent`
- **Value:** `DisableSoftLanding`, `REG_DWORD`, set `1` ("Do not show
  Windows tips").
- **Effect:** suppresses Windows tips. Declutter only.
- **Risk:** Low.
- **Applicability:** Windows 10 1607 and later, Windows 11; Enterprise,
  Education, IoT Enterprise only.
- **Revert:** restore prior state.
- **Verify:** tips no longer appear; policy visible in `gpresult`.
- **Source:** Policy CSP - Experience, AllowWindowsTips.

## PT-11 Storage Sense on (machine policy)

- **Effect:** keeps temporary files cleaned automatically; users cannot turn
  Storage Sense off while the policy is set.
- **Prefer:** Settings > System > Storage > Storage Sense (per user, keeps
  user control).
- **Key:** `HKLM\Software\Policies\Microsoft\Windows\StorageSense`
- **Value:** `AllowStorageSenseGlobal`, `REG_DWORD`, set `1` (allow; `0`
  blocks).
- **Risk:** Medium. Storage Sense can also delete Recycle Bin and Downloads
  items and dehydrate cloud files if those thresholds are configured: check
  and agree them with the user (default to never for user folders).
- **Applicability:** Windows 10 1903 and later, Windows 11; Pro, Enterprise,
  Education.
- **Revert:** restore prior state (normally: delete the value).
- **Verify:** Storage Sense shows on and managed; thresholds as agreed.
- **Source:** Policy CSP - Storage, AllowStorageSenseGlobal; Configure Storage
  Sense.

## PT-12 NTFS last-access timestamp updates (normally: leave alone)

- **Effect:** controls updating of file last-access times. Since Windows 10
  1803 this is **system managed** by default (enabled on small boot volumes,
  disabled otherwise), so on most PCs there is nothing to gain.
- **Read first:** `fsutil behavior query disablelastaccess` (elevated).
- **Mechanism:** `fsutil behavior set disablelastaccess 1` (disable updates)
  or `0` (enable). This writes
  `HKLM\SYSTEM\CurrentControlSet\Control\FileSystem\NtfsDisableLastAccessUpdate`
  (`REG_DWORD`). Restart required.
- **Risk:** Medium. Backup, archiving and storage-tiering tools can rely on
  last-access times.
- **Applicability:** Windows 10 1803 and later, Windows 11, all editions.
- **Revert:** restore the **exact** prior DWORD from the state record or the
  `reg export` (for example a system-managed value such as `0x80000002`).
  Do not "revert" with `fsutil ... set 0` unless the prior value was `0`;
  that would lose the system-managed flag. Restart.
- **Verify:** `fsutil behavior query disablelastaccess` matches the intended
  state after restart.
- **Source:** fsutil behavior reference; MS-FSA product behaviour notes on
  `NtfsDisableLastAccessUpdate`.

## PT-13 Fast startup off

- **Effect:** "Shut down" performs a full shutdown instead of hibernating the
  kernel session. Fixes some dual-boot volume locking, driver state and
  "uptime never resets" issues. Cold boots get slower.
- **Microsoft's position:** fast startup is on by default and disabling it is
  not recommended; only change it for a specific reason.
- **Prefer:** Control Panel > Power Options > Choose what the power buttons do
  > Change settings that are currently unavailable > untick "Turn on fast
  startup".
- **Key:** `HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Power`
- **Value:** `HiberbootEnabled`, `REG_DWORD`, `0` disabled, `1` enabled.
- **Risk:** Medium.
- **Applicability:** Windows 10 and 11 (and 8.x), all editions. Requires
  hibernation to be available; `powercfg /hibernate off` also disables it.
- **Revert:** restore the captured `HiberbootEnabled` value (normally `1`).
  If hibernation was on before the run and has since been turned off, restore
  it too (`powercfg /hibernate on`, plus `/type reduced` if that was the
  captured type); if it was off before the run, leave it off. Capture both
  states (`powercfg /a`, the value) before the change.
- **Verify:** the checkbox state in Power Options matches; after Shut down
  and power on, Task Manager uptime resets.
- **Source:** Microsoft Learn, Hibernate Once/Resume Many (fast startup
  registry value); "Fast startup causes hibernation or shutdown to fail".

## PT-14 Power throttling off (machine policy)

- **Effect:** stops Windows reducing CPU performance for background work.
  Can help specific background workloads; costs battery and heat on laptops.
- **Prefer:** set power mode to Best performance while plugged in (which
  already opts apps out of power throttling), or opt individual apps out in
  the battery usage settings.
- **Mechanism:** Group Policy Editor: Computer Configuration > Administrative
  Templates > System > Power Management > Power Throttling Settings > "Turn
  off Power Throttling" > Enabled. (Documented registry location
  `HKLM\System\CurrentControlSet\Control\Power\PowerThrottling`, value name
  `PowerThrottlingOff`; this catalogue applies it through the editor so the
  enabled data is written by Windows, not guessed.)
- **Risk:** Medium.
- **Applicability:** Windows 10 2004/20H2/21H1 with KB5005101 or later,
  Windows 11 21H2 and later (per the Policy CSP - ADMX_Power applicability
  table, checked October 2026); Pro, Enterprise, Education.
- **Revert:** set the policy back to **Not Configured**.
- **Verify:** measure the workload that motivated it; check battery life on
  laptops over a normal day.
- **Source:** Policy CSP - ADMX_Power, PowerThrottlingTurnOff; "Customize the
  Windows performance power slider".

## Related non-registry levers (in other files)

- Hibernation off / reduced hiberfile: `power-plans.md` (`powercfg
  /hibernate`).
- Power plan selection: `power-plans.md`.
- Component store clean-up: `storage-cleanup.md`.
- Visual effects and animations: `visual-effects-and-debloat.md`.

---

## Rejected (do not apply)

| Tweak | Why rejected |
|---|---|
| Disable Defender, real-time protection, SmartScreen, firewall, UAC, VBS/memory integrity | Security controls: forbidden by this skill |
| Disable Windows Update / Update Orchestrator / BITS | Leaves the PC unpatched; breaks Store and Defender updates |
| Disable or remove the page file | Instability and lost crash dumps; no real gain |
| Disable SysMain, Windows Search, Print Spooler as blanket "speed-ups" | Breaks features; benefit unproven on SSDs. Diagnose a busy service instead |
| Delete WinSxS contents, disable component clean-up | Microsoft warns of unbootable/unupdatable systems |
| Network "throttling index", TCP auto-tuning and Nagle tweaks | Not verifiable as beneficial in current Microsoft documentation; risk of network problems |
| `MenuShowDelay`, `VisualFXSetting` and similar undocumented UI values | Could not verify on Microsoft Learn; use the supported Settings and Performance Options UI instead |
| CPU core parking hacks, `LargeSystemCache`, `DisablePagingExecutive` | Legacy or server-oriented; unverified benefit on current client Windows |
| Hidden power plans created from GUIDs found online | Not documented for client devices; use built-in plans and the power mode |
| Registry "cleaners" and third-party tweak or debloat scripts | Unreviewable bulk changes; frequent cause of breakage |
| Telemetry or privacy policy bundles applied "for speed" | Not a performance lever; privacy changes are a separate, explicit user decision |

If the user asks for a rejected tweak, explain why in one or two sentences
and offer the measured alternative.
