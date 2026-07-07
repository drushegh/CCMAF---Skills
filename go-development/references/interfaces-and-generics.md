# Interfaces, Composition and Generics

## Interface design

- **Define interfaces where they are consumed**, not next to the
  implementation. The package that *needs* "something that stores users"
  declares the two methods it calls; the concrete `PostgresStore`
  elsewhere satisfies it implicitly. This keeps interfaces minimal and
  breaks dependency cycles.
- **Small is idiomatic**: `io.Reader` and `io.Writer` (one method each)
  compose into everything. An interface past 3–4 methods is usually two
  interfaces, or a concrete type in disguise.
- **Accept interfaces, return structs.** Callers of your constructor get
  the concrete type and its full API; *their* code narrows it to the
  interface they need.
- **Interface pollution** is the top review finding: an interface with
  exactly one implementation, created "for mockability", is indirection
  with no seam. Add the interface when the second implementation — or a
  genuine test boundary like a network — actually exists.
- Compile-time satisfaction check, next to the implementation:

```go
var _ http.Handler = (*Server)(nil)
```

## The typed-nil trap

An interface value is nil only when *both* its type and value are nil.
Returning a nil concrete pointer through an `error` (or any interface)
return produces a non-nil interface:

```go
func parse(s string) *ParseError {
    return nil
}

func run() error {
    var err error = parse("ok")   // err holds (*ParseError)(nil)
    return err                    // != nil — every caller takes the error path
}
```

Rule: functions returning `error` return **literal `nil`** on success, and
never funnel a typed pointer through an interface-typed variable on the
way out.

## Method sets and embedding

- Methods with **value receivers** are in the method set of both `T` and
  `*T`; **pointer receivers** only in `*T`'s. Consequence: a value `T`
  stored in an interface does not satisfy interfaces needing pointer
  methods — pass `&t`.
- **Struct embedding** is composition, not inheritance: the outer type
  gets promoted methods, but there is no overriding and no
  polymorphic dispatch back into the outer type. Embed to *borrow
  behaviour* (`sync.Mutex`, a base client); prefer a named field when the
  relationship should be visible in the API.
- **Interface embedding** composes contracts: `io.ReadWriter` is
  `Reader` + `Writer`. Build capability sets this way rather than
  redeclaring methods.

## Generics — when and when not

Since Go 1.18; use them for what interfaces cannot express, not as a
default.

| Reach for generics | Stay concrete / use an interface |
|---|---|
| Data structures (typed cache, set, tree) | One instantiation exists or is plausible |
| Algorithms over slices/maps of any element | Behaviour varies by *method*, not element type — that's an interface |
| Removing `any` + type assertions / reflection | "Might need it generic later" |
| Constraining two parameters to the *same* type | Signatures that just get longer, not safer |

Check `slices`, `maps` and `cmp` (stdlib, 1.21+) before writing your own —
`slices.Contains`, `slices.SortFunc`, `maps.Keys` cover most needs.

```go
type Number interface {
    ~int | ~int64 | ~float64      // ~ includes named types with these underlying types
}

func Sum[N Number](xs []N) N {
    var total N
    for _, x := range xs {
        total += x
    }
    return total
}
```

Constraint notes: `comparable` for map keys; `cmp.Ordered` for anything
sortable; constraint interfaces can mix method requirements and type
unions. Limits to remember: methods cannot introduce their own type
parameters, and type inference works at call sites but not everywhere —
if an instantiation reads badly, name the type argument explicitly.
Generic *type aliases* need Go 1.24+.

The pragmatic test: generics remove repetition of *identical logic over
different types*; interfaces model *different behaviour behind one
contract*. If you're switching on the type parameter inside the function,
you wanted an interface (or two functions).
