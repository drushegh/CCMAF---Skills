# C4 and architecture views

A design is reviewable only through its views — and a view is evidence
only if it's at one abstraction level, labelled, and true. The C4 model
(context, container, component, code) is the working standard because it
fixes the abstraction levels that ad-hoc box-and-arrow diagrams mix.

## The C4 levels and what each answers

| Level | Shows | The review question it serves |
|---|---|---|
| 1. System context | The system as one box, its users and neighbouring systems | Is the scope right? Which external dependencies exist, and who owns them? |
| 2. Container | Deployable/runnable units (services, apps, databases, queues) and their interactions | The core review surface: seams, protocols, data ownership, failure points |
| 3. Component | Major parts inside one container and their responsibilities | Only for containers under scrutiny — cohesion, layering, dependency direction |
| 4. Code | Classes/functions | Almost never in an architecture review — that's code review territory |

Most reviews need levels 1 and 2, plus level 3 for the one or two
containers where the risk concentrates. An author presenting only a
level-3 diagram of their favourite service, with no container view, has
hidden the seams — ask for level 2 first.

## What makes a diagram reviewable

Reject-or-fix checklist — each miss is a small finding in itself:

- **Title and scope**: what system, which level, as-is or to-be, date.
- **A key/legend**: what shapes, line styles and colours mean. C4's
  notation is minimal precisely so a legend can carry it.
- **Every arrow labelled** with purpose and protocol/direction ("reads
  customer profile — HTTPS/REST", "publishes OrderPaid — broker").
  Unlabelled arrows are where N+1 seams, sync chains and hidden
  couplings hide.
- **One abstraction level per diagram** — a Kubernetes pod, a "Payments
  team", and a C# class on the same canvas cannot be reasoned about.
- **Boundaries drawn**: system boundary, trust boundaries (route the
  security analysis of these → `secure-development`), team ownership
  where it matters (Conway seams —
  `coupling-cohesion-and-boundaries.md`).
- **The data stores and queues are on it.** Diagrams that show only
  services hide the most important couplings — shared databases and
  shared topics.

## Supplementary views (only when the question demands)

- **Deployment view** — containers mapped to infrastructure: regions,
  zones, scaling groups. Needed for availability/failure review.
- **Dynamic/sequence view** — one critical scenario's call order.
  Needed when latency budgets or ordering matter; this is where a
  six-hop synchronous chain becomes visible.
- **Data view** — ownership, flow, retention and residency of the
  significant data. Needed for consistency, privacy and lifecycle
  questions.

Don't demand every view — demand the view that answers the open
question, and no more.

## Catching diagram drift

For any existing system, treat diagrams as claims to verify, not facts:

- Cross-check the container view against deployment manifests and infra
  code (what actually runs), the dependency direction against the build
  graph or import rules, the arrows against traffic/tracing telemetry.
- Ask "when was this last updated, and by what process?" — a diagram
  maintained by hand and last touched two reorganisations ago is
  archaeology, not architecture.
- Diagrams-as-text (Structurizr DSL, Mermaid — whose C4 syntax is still
  flagged experimental, July 2026, re-verify) keep views in the repo and
  diffable, which is the only reliable anti-drift mechanism; some
  drift-proofing can be automated as fitness functions
  (`fitness-functions.md`).

Authoring and exporting the diagrams themselves →
`drawio-development`; this reference is about *judging* them.
