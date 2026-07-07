# Sagas and Process Managers

A saga executes a business transaction spanning services as a sequence of
**local transactions**, each publishing an event/command for the next
step; failures are handled by **compensating actions** that semantically
undo completed steps. It exists because distributed ACID (2PC) is
unavailable or unaffordable across service boundaries — and it trades
isolation away to get there. That trade is the design problem.

## Choreography vs orchestration

| | Choreography | Orchestration |
|---|---|---|
| Coordination | Each service reacts to the previous event | A process manager issues commands, consumes replies |
| Flow visibility | Emergent — reconstructed from logs | Explicit — the orchestrator's state machine IS the flow |
| Coupling | Services know the *events* before them | Steps know only the orchestrator |
| Failure/compensation logic | Scattered across services | Centralised, testable in one place |
| Fits | ≤3 steps, linear, stable flow | Branching, compensation, timeouts, audit demands |
| Risk | Invisible cycles ("event spaghetti") | Orchestrator accretes business logic (god-service) |

Default: choreography for short reactive chains, orchestration the moment
the flow has branches, compensations or deadlines anyone must reason
about. The orchestrator sends **commands** (imperative, one addressee)
and consumes **events** (facts) — keeping that distinction is what stops
the orchestrator's messages masquerading as domain events.

## Designing the steps

Order steps by risk, not chronology:

1. **Compensatable steps first** — actions with a defined semantic undo
   (reserve stock ⇢ release stock).
2. **The pivot step** — the point of no return (charge the card). After
   the pivot, the saga must *complete forward*; there is no compensation
   for "the customer was charged and we told them so".
3. **Retryable steps after the pivot** — actions that cannot fail
   permanently, only be retried until they succeed (ship order, send
   receipt).

A step that can fail permanently *after* the pivot is a design defect —
move it before the pivot or make it retryable.

**Compensation is a forward action, not a rollback.** It is a new local
transaction ("refund", "release", "cancel") that must itself be
idempotent, must tolerate arriving out of order with late step-retries,
and *can itself fail* — decide up front: retry forever, or park for a
human with an alert. Money movements compensate as reversing entries
(never deleting records) — the audit trail includes the failure.

## Living without isolation

Between saga steps, other transactions see intermediate state (a reserved
seat, a pending order) — anomalies ACID would have prevented.
Countermeasures:

- **Semantic lock**: mark the record `PENDING`; other flows treat pending
  as untouchable or queue behind it. Pair with a timeout that releases
  the lock via compensation.
- **Commutative/idempotent updates**: design steps so interleaving order
  doesn't change the outcome (debit/credit amounts, not "set balance").
- **Version/precondition re-check**: each step re-validates what it
  assumed (price, availability) rather than trusting step 1's snapshot.
- **Pessimistic ordering**: put the step most likely to be raced (or
  to fail) earliest, shrinking the anomaly window.

## Process-manager mechanics

- **Persist the saga state machine** — saga id, current step, step
  results, deadline — in the orchestrator's database, transitioning state
  and emitting the next command *via the outbox* (same dual-write physics
  as any state+message change).
- **Correlate everything**: every command/reply carries the saga id;
  replies are matched to the awaited step and duplicates dropped (a
  reply may arrive twice; a *stale* reply may arrive after a timeout
  already fired).
- **Timeouts are first-class transitions**: schedule a deadline per step;
  a saga silently stuck "awaiting reply" for six hours is an incident.
  Timeout → retry, alternative path, or compensation — decided at design
  time.
- **Recovery**: on restart, the orchestrator resumes from persisted
  state; stuck-saga metrics (count by step, age) belong on the service
  dashboard (`observability-development`).

## Pitfalls

- Compensation designed after the happy path ships — the failure path
  *is* the deliverable.
- A compensation that can fail with no parking/alert plan.
- Assuming cross-saga ordering — two sagas on the same aggregate
  interleave; semantic locks or aggregate-level serialisation handle it.
- Saga state kept in memory (or in the broker's redelivery behaviour) —
  a restart silently abandons live business transactions.
- Orchestrator performing business logic itself instead of commanding the
  owning services — it coordinates; it does not decide prices.
