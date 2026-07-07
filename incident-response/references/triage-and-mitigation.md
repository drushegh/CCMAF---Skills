# Triage and mitigation

The governing rule: **mitigate before you diagnose.** Users experience
duration × blast radius; the root cause will still be there tomorrow, the
outage must not be. Diagnosis gets exactly as much time as mitigation
choice requires — full understanding is the postmortem's job.

## The first five minutes

1. **Confirm impact is real** — a dashboard *and* one manual check of the
   user path (alerts lie in both directions).
2. **Size the blast radius** — which journeys, which users, how many, and
   is it growing? Trajectory drives severity and urgency.
3. **Ask "what changed?"** — most incidents follow a change. Sweep, in
   order of likelihood: deploys, feature flags, config changes, schema
   migrations, dependency incidents (check their status pages),
   certificate expiries, quota/limit exhaustion, traffic shape (launch?
   attack?), scheduled jobs.
4. **Match against known failure modes** — is there a runbook for this
   alert? Executing a tested runbook beats improvising every time.

## The mitigation menu, with risk notes

| Lever | When | Risk notes |
|---|---|---|
| **Rollback** | Impact follows a deploy | Verify rollback safety first — irreversible migrations break naive rollbacks (expand–contract → `sql-development`); roll back the suspect service, not everything |
| **Feature flag off** | The path is flagged | Cheapest, fastest, most reversible; know your flags before the incident |
| **Failover / degraded mode** | A dependency is down | Only if failover is *tested*; an untested failover is a second incident |
| **Traffic shift** | One region/instance sick | Watch capacity at the destination |
| **Shed load / rate-limit** | Overload | Deliberately harms some users to save the rest — an IC decision, stated in-channel |
| **Scale out** | Genuine capacity shortfall | Slow; masks bugs that scaled with load; cost |
| **Stop the writer** | Data corruption in progress | Halts damage at the cost of availability — almost always the right trade |
| **Block traffic** | Abuse/attack | Precision matters; capture samples before blocking |
| **Restart** | Wedged process, unknown cause | Legitimate *after* capturing state; a restart that works is evidence of a state/leak bug, not a resolution |

## Risk-assessing a mitigation

Before pulling any lever, answer in-channel:

- **Is it reversible?** Prefer reversible-and-fast-feedback levers first.
- **Has it been tested?** Untested failovers, restores and failbacks are
  hypotheses, not mitigations.
- **Can it make data worse?** Anything touching data gets a snapshot or
  backup *first*, and the command is stated in-channel before it runs — a
  second pair of eyes on destructive commands is cheap insurance under
  adrenaline.
- **How long until we know it worked?** Prefer levers with observable
  effect in minutes; pair every mitigation with the metric that will
  confirm it.

**Preserve forensics when cheap.** If minutes allow, capture the sick
process's logs, thread/heap dumps and recent metrics before restarting —
the restart destroys the only copy of the evidence. In suspected security
incidents this becomes mandatory, not optional (→ `sentinel-development`).

## When mitigation needs diagnosis

Sometimes no generic lever applies and you must understand the fault to
stop it. Then:

- **Timebox hypotheses** and run them as parallel, non-overlapping
  workstreams (one derisks the rollback path, one investigates) — the IC
  arbitrates and prunes.
- Use **differential thinking**: what is different between the healthy
  state and now — which hosts, which requests, which time window? Bisect
  the change list rather than reading code.
- The full method — reproduce, isolate, hypothesise, verify — is
  `systematic-debugging`; incident conditions just compress its loop and
  raise the bar for touching production.

## Verifying recovery

- **Watch the SLI recover, not just the alert clear** — alerts have
  hysteresis and blind spots; the user-journey metric is the truth.
- Re-run the manual user-path check that confirmed the impact.
- Expect **echo failures**: queued retries, thundering-herd reconnects and
  backlog drains can re-injure a just-recovered system — keep shed-load
  levers to hand while draining.
- Hold the incident in "monitoring" for a stable window before "resolved";
  a premature all-clear costs more trust than a slow one.
