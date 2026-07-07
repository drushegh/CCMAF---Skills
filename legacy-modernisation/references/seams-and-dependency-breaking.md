# Seams and Dependency-Breaking

A **seam** (Feathers) is a place where you can alter a program's
behaviour without editing in that place; every seam has an **enabling
point** where you choose which behaviour runs. Legacy code resists
testing because its dependencies are welded in — it news up its
collaborators, calls statics, reads the clock and the filesystem, and
touches the network in its constructor. Dependency-breaking is the craft
of opening the smallest seam that lets you put the change area into a
test harness, using techniques safe enough to perform *before* tests
exist.

## The core dilemma, resolved

To change safely you need tests; to add tests you must change the code.
The way out: restrict pre-test changes to a small set of **conservative,
mechanical moves** — ideally performed by tooling, not by hand. Safe
before tests exist: rename; extract method/function; extract
variable/constant; extract interface; move a declaration. In statically
typed languages, lean on the compiler and the IDE's automated refactors
— tool-executed transformations carry near-zero behavioural risk. In
dynamic languages the same refactors are hand-checked, so be stricter:
smaller moves, more re-runs of whatever tests exist. Anything cleverer
than this list waits until the net is up.

## The seam catalogue

**Sprout method / sprout class.** New behaviour needed inside untestable
code? Don't add it there. Write it as a new, fully tested unit and add
one call site in the legacy code. The old code gets one line riskier;
the new behaviour is born tested. The default move for "add a feature to
a mess".

**Wrap method / wrap class (decorator).** Behaviour needed *around* an
existing call (logging, caching, validation, migration shims): rename
the original, create a new method with the old name that wraps it, or
wrap the whole class behind its interface. Callers are untouched; the
wrapper is testable.

**Extract interface + parameterise constructor.** The workhorse pair for
a welded-in collaborator: extract an interface from the concrete
dependency, accept it via the constructor (keeping a default-argument or
overload that preserves every existing call site), and hand the test a
fake. Constructor injection is the honest form — it makes the dependency
visible at every construction site.

**Parameterise method.** Same move at method scope: the method that
grabs a global/static/new instance takes it as a parameter instead, with
a compatibility overload delegating the old signature.

**Subclass and override.** Test-only subclass overriding the one method
that touches the world (`protected virtual` seam). Quick, mildly grubby,
explicitly temporary — schedule its replacement with real injection.

**Link/import seams.** Substituting at module resolution: DI-container
registration, module-mocking (`jest.mock`, `unittest.mock.patch`),
classpath/linker substitution. Powerful, and the least honest — the
dependency stays invisible in the code's shape. Use as a bridge, flag as
temporary, and prefer making the dependency explicit when the area is
next touched. (Test doubles for code you don't own also need a contract
check against the real thing → `testing-development`.)

## The hidden-dependency checklist

Sweep the change area for these before deciding where the seam goes —
each is a weld that makes code untestable:

- **Clock** — `now()`/`today()` read directly; inject a clock.
- **Randomness** — unseeded RNG, GUID generation; inject or seed.
- **Filesystem / environment** — hardcoded paths, env reads scattered
  through logic; lift to the boundary.
- **Network / database** in constructors or static initialisers — work
  in constructors is the classic harness-killer.
- **Global / singleton state** — reads and writes to statics; the
  worst offender for test isolation and parallelism.
- **Static method calls** to heavyweight collaborators — no override
  point; wrap or parameterise.

## Choosing the move

| Situation | Move |
|---|---|
| Add new behaviour to untestable code | Sprout |
| Add behaviour around an existing call | Wrap |
| Collaborator welded in, class widely constructed | Extract interface + parameterise constructor (compat overload) |
| One method touches the world | Subclass-and-override now; real seam later |
| Third-party/static API in the way | Thin adapter you own; test against the adapter's interface |
| Everything everywhere at once | Sprout outward — build new tested units and shrink the monolith's job |

## Anti-patterns

- **Test-induced damage** — interfaces and indirection sprayed
  everywhere "for testability". Open seams where change needs them, not
  speculatively; three seams that matter beat thirty that obscure.
- **The grand pre-refactor** — restructuring for a week before the first
  test exists, on the promise it'll be testable afterwards. That's the
  bet this whole discipline exists to avoid.
- **Mocking what you don't own** without an adapter — fakes of a
  third-party API encode your guesses about it; put an adapter you own
  in between and fake that.
- **Permanent "temporary" seams** — subclass-overrides and module-mocks
  that outlive their bridge role. Track them; retire them when the area
  is properly under test.
