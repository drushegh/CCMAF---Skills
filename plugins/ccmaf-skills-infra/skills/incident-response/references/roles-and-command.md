# Roles and incident command

The model descends from the emergency-services Incident Command System:
one commander, explicit roles, and a span of control small enough that the
commander can actually hold the state. Roles are functions, not ranks —
seniority does not confer command, and the most senior engineer is usually
more valuable running a workstream than running the incident.

## The roles

| Role | Owns | Never does |
|---|---|---|
| **Incident commander (IC)** | The state of the incident: priorities, delegation, decisions, resourcing, severity reviews | Hands-on debugging; writing the fix |
| **Ops lead(s)** | A technical workstream: investigating, mitigating, reporting findings to the IC | Stakeholder comms; freelancing outside their workstream |
| **Comms lead** | Internal and external updates on the promised cadence; the status page; stakeholder questions | Promising ETAs engineering hasn't given; speculating on cause |
| **Scribe** | The timeline: timestamped actions, decisions, observations in the incident channel | Nothing else — a scribe multitasking into ops loses the timeline |

On small teams one person wears several hats — the discipline is to make
the hats explicit ("I'm IC and ops lead until someone else joins; I am not
doing comms — paging Dana for that"). An unnamed role is an undone role;
comms and scribe are the first to silently vanish.

## The IC loop

Roughly every 15 minutes, the IC:

1. **Restates the state** in-channel: what we know / what we're doing /
   what's next / current severity.
2. **Checks each workstream** — findings, blockers, whether it should
   continue, merge or stop.
3. **Decides** — mitigation choices, escalations, severity changes. The
   scribe records each decision *with its rationale* ("chose rollback over
   failover: rollback is tested, failover isn't").
4. **Prunes** — ends stale hypotheses, releases people no longer needed
   (spectators create noise and pressure).
5. **Confirms the comms cadence was met** and the next update time exists.

The IC holds the *decision log*; ops leads hold the terminals. When the IC
is tempted to debug, the correct move is to hand off command first.

## Handover

Fatigued responders make incidents worse. On long incidents, rotate the IC
(and ops leads) every 2–4 hours:

- Outgoing IC posts a handover summary in-channel: current impact, leading
  hypotheses, mitigations in flight, open decisions, next decision point.
- Incoming IC reads it, asks questions, then states explicitly: **"I have
  command."** Until that phrase, the outgoing IC still has it.
- Handover is also the natural severity-review and comms-review point.

## Channel hygiene

- **One channel per incident**, created at declaration; workstreams get
  threads. Cross-incident chatter stays out.
- **A pinned rolling summary** (the IC's restatement) so joiners
  self-brief. "Can someone catch me up?" in-channel is an anti-pattern —
  the summary exists precisely so nobody has to.
- **Voice/video for high-bandwidth moments** (working a tricky mitigation
  live), but every decision made on a call is echoed to text by the scribe
  — voice is invisible to the timeline and to anyone who joins later.
- Joiners announce what they're taking ("here — taking the DB workstream")
  or lurk silently; unrequested parallel actions are how two mitigations
  collide.

## Executives and stakeholders in the room

Pressure flows downhill onto responders unless the IC intercepts it. Give
executives a stakeholder loop — the comms lead's summaries, a separate
channel, a promised cadence — and keep them out of the ops channel. Any
redirection of effort goes *through the IC*, whatever the seniority of the
person suggesting it. An IC saying "noted — we'll take that to the
stakeholder channel" is doing the job, not being obstructive.
