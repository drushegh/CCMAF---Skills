# Verify and Revert

A change is not done when the command returns. It is done when you have
observed the new state and know the way back works.

## Verification, three levels

1. **State check** (always): re-read the thing you changed, with the same
   probe you used for the before value.
2. **Effect check** (when the change had a purpose): re-run the check that
   showed the original problem: boot time, the error that recurred, the
   setting visible in the UI.
3. **No-collateral check** (Medium/High): the things most likely to break
   still work: network up, the dependent app starts, no new errors in the
   relevant event log since the change.

```powershell
# State: registry value
Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize' -Name EnableTransparency

# State: service
sc.exe qc ExampleSvc; Get-Service ExampleSvc

# No-collateral: new errors since the change started
$since = Get-Date '2026-10-11 09:52'
Get-WinEvent -FilterHashtable @{ LogName = 'System'; Level = 1,2; StartTime = $since } -ErrorAction SilentlyContinue |
  Select-Object TimeCreated, ProviderName, Id, Message -First 20
```

Linux equivalents: `systemctl is-enabled/is-active <unit>`,
`journalctl -p err --since "2026-10-11 09:52"`, re-reading the config file;
macOS: `defaults read`, `log show --predicate 'messageType == error' --last 10m`.

Rules:

- **Verify the effective value, not the written one.** Policy keys, per-user
  overrides and caches can mask a change. If the UI disagrees with the
  registry, the UI (what the user experiences) is the truth and the change is
  not verified.
- **Changes needing a reboot or sign-out** stay `applied-unverified` until
  verified after it. Tell the user what to check, or verify in the next
  session from the journal.
- **Record the verification command and result** in the journal, with time.
- **A failed verification is a stop.** Do not proceed to the next change; go
  to "Reverting one change".

## Testing an undo

For Low-tier changes that are cheap to toggle, test the undo once: apply,
verify, undo, verify the before value is back, re-apply, verify. Do it when
the undo is not a straight inverse (deleting an added value, re-creating a
removed task). For Medium/High changes, an untested undo must be a direct
inverse of a captured before value, and the journal says "undo untested".

## Reverting one change

1. **Stop** the run. No further changes.
2. **Tell the user** what failed and what state the machine is in now.
3. **Re-read the current state** (it may differ from both before and after).
4. **Apply the journalled undo** with confirmation (a revert is also a
   change; for a failed change mid-run the user has usually already said
   "put it back", which counts).
5. **Verify** the before value is restored, at all three levels.
6. **Journal** a revert entry referencing the original change id.

Typical undos:

| Change | Undo |
|---|---|
| Registry value modified | Set captured value with captured type |
| Registry value or key added | `Remove-ItemProperty` / `reg delete` of exactly that value or key |
| Registry key deleted | `reg import <export>` then verify values |
| Service start type | `sc.exe config <svc> start= <captured>` (one of `auto`, `delayed-auto`, `demand`, `disabled`) |
| Scheduled task disabled | `Enable-ScheduledTask -TaskPath <p> -TaskName <n>` |
| Startup entry removed | Re-add with captured command line |
| Package installed | `winget uninstall --id <id> --exact` (check it does not remove data the user created since) |
| Package upgraded | `winget install --id <id> --version <captured> --exact` if that version is still published; otherwise the restore point |
| File replaced | Copy the backup back, verify hash, restore ACL from journal |
| Power plan | `powercfg /setactive <captured GUID>` |

## Reverting a whole run

- Undo changes **in reverse order** of application. Later changes may depend
  on earlier ones.
- Skip entries already `reverted` or `declined`; handle `failed` entries by
  their recorded observed state.
- After the last undo, run the run's original inspection probes and compare
  with the before values in the journal.

## When to use System Restore instead

Use the restore point when:

- the machine does not boot normally, or the shell or sign-in is broken;
- several changes interact and per-change undo is not converging;
- a High-tier change (driver, boot configuration) went wrong.

Tell the user first what System Restore affects: it rolls back system files,
drivers, registry and installed programs to the point's time, for **all**
changes since then, not only this run's, and it does not restore personal
files. It is started by the user (`rstrui.exe`, or from Windows Recovery if
the machine will not boot). An agent does not trigger `Restore-Computer`
on its own; the user confirms and the machine reboots. Journal it as a
revert entry covering the whole run, then re-verify after the reboot.

## Hand-off when the session must end

If a run cannot be finished (time, limits, reboot), write the run summary with
the exact state of each change and the next step. The next session reads the
journal first, re-verifies the `applied-unverified` items, then continues or
reverts.
