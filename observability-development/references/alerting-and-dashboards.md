# Alerting and dashboards

Alerts exist to interrupt a human; dashboards exist to answer a question.
Both degrade the same way — by accretion — and both need the same medicine:
a deliberate hierarchy and ruthless pruning.

## Page vs ticket

A **page** (wake someone) requires all three:

1. **Urgent** — degrading now or budget burning fast; can't wait for
   morning.
2. **User-visible** — a symptom (SLO burn, error-rate spike at the edge),
   not a cause (one node down, CPU high, disk 80%).
3. **Actionable** — a human can do something, and the alert links a runbook
   that says what (runbook writing → `technical-writing`).

Everything real but not all three is a **ticket**. Everything else is a
deletion. Causes make good tickets and terrible pages: a dead replica behind
a healthy load balancer is not an emergency; users seeing errors is —
whatever the cause turns out to be.

## Alert design rules

- **Burn-rate alerts on SLOs are the primary pager**
  (`slos-and-error-budgets.md`); a handful of symptom alerts (edge error
  rate, certificate expiry, queue age) cover what SLOs miss.
- Every alert has a **for-duration** (or multiwindow structure) so blips
  don't page, an **owner**, a **severity**, and a **runbook link**.
- Group and inhibit: one incident should produce one notification stream,
  not forty (a dead datacentre must not page once per service in it).
- Test alerts the way you test code — fire them in staging, verify routing
  and the runbook, before trusting them with sleep.

## Alert hygiene

- Review the pager log regularly: every page either led to action or is
  evidence for retuning/deleting the alert. "Acknowledged, ignored, it
  cleared" three times running = delete or demote.
- Track pages per week per rotation; a rotation that pages nightly is a
  reliability project, not an on-call problem.
- Silences/maintenance windows have expiry dates; a permanent silence is a
  deletion in denial.

## Dashboard craft

Build a **hierarchy that mirrors triage**, not a page per team member:

1. **SLO overview** — every user journey's SLO status and burn, one screen.
2. **Per-service RED** — rate, errors, duration (p50/p95/p99 from
   histograms) per endpoint group, with exemplar click-through to traces.
3. **Resource/USE** — saturation of the things services run on: pools,
   queues, CPU/memory, dependencies.
4. **Dependency/flow view** — what calls what (trace-derived service map).

Design rules:

- Few, curated, linked top-down — a wall of forty unlabelled graphs answers
  nothing at 3 a.m.
- Consistent time windows, units and colours across panels; label axes;
  percentiles from histograms, never averaged percentiles.
- **Annotate deploys and feature-flag changes** — the majority of incidents
  correlate with a change; make the correlation visible.
- Template variables (environment, region, service) beat cloned dashboards
  that drift apart.
- Dashboards are code: version them, review them, delete dead ones.

## Debugging production from telemetry

The triage walk the instrumentation must support end to end:

1. **Alert** fires → its runbook and the SLO overview say *what* is hurting
   and *how fast* the budget burns.
2. **Narrow** on the RED dashboard: which service, which endpoint group,
   errors or latency, all traffic or one region/tenant.
3. **Exemplar → trace**: open a slow/failing trace from the offending
   panel; the span tree says *where* in the request it breaks.
4. **Logs by `trace_id`**: the correlated log lines say *why* — the error
   detail, the decision, the input shape.
5. **Check change first**: deploy annotations, flags, config — roll back or
   flag off before root-causing (mitigation beats diagnosis mid-incident).
6. From hypothesis onwards, the debugging method routes to
   `systematic-debugging`; this skill's job is that steps 1–5 need no
   tribal knowledge.

If any hop in that walk requires grep-and-hope or asking the one engineer
who knows, treat it as an instrumentation defect and fix it in the next
change — blind spots found during incidents are the highest-value
observability backlog there is.
