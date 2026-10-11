# Worked example: a weekly workspace health check

Fictional. A PC-care workspace at `D:\Workspaces\my-pc` (owner: Sam) wants a
Monday-morning health report. The kit ships the schedule switched off; Sam
turns it on after the checks in section 5.

## 1. From wish to contract

Sam's wish: "Every Monday, check my PC is healthy and fix anything wrong."

Problems: "fix anything" is an unbounded system-change grant at 09:00 with
nobody watching. Rewritten:

```markdown
You are running UNATTENDED as a scheduled job. Nobody can answer questions.
Follow the scheduled-run-discipline skill. Read-only machine checks.

Purpose: Produce this week's health report for this PC.
Workspace: D:\Workspaces\my-pc
Scope in: event logs (System, Application) for the last 7 days; free disk
space; pending Windows updates (list only); startup items; last report.
Scope out: changing any setting, service, driver or file outside the
workspace.
Budget: 10 minutes of work, at most 12 checks, then wrap up.
Grant: read; write-outputs (reports/ and runs/). Anything else: propose it in
the summary.
Done when: every check has a line in the report, compared with last week.
Outputs: reports/health-<date>.md; run log and summary in runs/<run-id>/.
State: runs/state.json; lock at runs/.lock.
On error: retry transient errors at most 2 times; a check that fails 3 weeks
running moves to "Needs you".
End: always write the summary, release the lock, then stop.
```

Changes the machine? No. So `safe-system-changes` is not invoked by the run;
fixes become proposals Sam can approve in an interactive session, where that
protocol applies.

## 2. Permission profile for the schedule

In the workspace `.claude/settings.json` (merged by the kit, reviewed at
install):

```json
{
  "permissions": {
    "allow": [
      "PowerShell(Get-WinEvent *)",
      "PowerShell(Get-Volume *)",
      "PowerShell(Get-CimInstance *)",
      "Edit(./reports/**)",
      "Edit(./runs/**)"
    ],
    "deny": [
      "PowerShell(Remove-Item *)",
      "PowerShell(Set-ItemProperty *)",
      "PowerShell(Stop-Service *)",
      "Bash(reg delete *)"
    ]
  }
}
```

Launched with `--permission-mode dontAsk`, anything not allowed is denied
rather than prompting. (Rule prefixes are illustrative; confirm the exact
cmdlets the checks use and that PowerShell rules apply in your Claude Code
version.)

## 3. A run, as logged

```text
09:07:12 START  run=2026-10-12T0907-c41e contract=weekly-health budget=10m/12
09:07:12 LOCK   acquired
09:07:13 RECOVER previous run 2026-10-05T0904-77a0 ok
09:07:15 PLAN   9 checks (cap 12)
09:07:40 ITEM   disk C: 38% free (last week 41%)
09:08:02 ITEM   system log: 4 errors, 3 from disk controller (new)
09:08:30 ITEM   pending updates: 2 (list in report)
09:08:51 SKIP   install updates: outside grant, proposed
09:09:20 ITEM   startup items: 1 new since last week
09:09:44 FLAG   startup item path in user temp folder: noted for review
09:10:30 WRAP   report + summary written
09:10:30 UNLOCK
```

Note the start time: 09:07, not 09:00. Session-scoped schedules jitter by
design; the contract does not depend on the minute.

## 4. The summary Sam reads

```markdown
# Weekly health check — 2026-10-12 — ok-needs-you

**Needs you (3)**
- Disk controller logged 3 errors this week (none last week). Suggest a
  disk health check in a PC-care session. Details: reports/health-2026-10-12.md.
- New startup item runs from a temp folder. Suggest a review
  (windows-security-hygiene).
- 2 Windows updates pending. Suggest installing in a session.

**Done**
- 9 checks, report written, compared with last week.

**Next run**
- Monday 09:00. Nothing carried over.

Run 2026-10-12T0907-c41e · 3m 18s · log: runs/2026-10-12T0907-c41e/log.md
```

## 5. Pre-enable checklist (run each, read the log)

| # | Test | Expected |
|---|---|---|
| 1 | Run the prompt by hand with the schedule's flags | Summary appears; status sensible; no prompts were needed |
| 2 | Run it again immediately | No duplicate report for the same date (overwritten atomically); summary says compared with the earlier run |
| 3 | Run with `budget: 1 check`, then normally | First run `partial`, second continues and completes |
| 4 | Create `runs/.lock` with a fresh timestamp, then run | `skipped-locked`, nothing else done |
| 5 | Create a lock dated yesterday, then run | Stale lock reported under "Needs you", run proceeds |
| 6 | Make a check fail (point it at a missing log name in a test copy) | Recorded under "Failed"; other checks complete |
| 7 | Ask the run (in the test prompt) to restart a service | Denied by profile; recorded as a proposal, not retried by another route |
| 8 | Check usage after a run | Cost is small enough to run weekly without affecting Sam's day (`stay-within-limits`) |

Only after all eight does the schedule go from `default_on: false` to on.
