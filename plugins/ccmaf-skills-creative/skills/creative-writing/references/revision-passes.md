# Revision passes

Revise from the largest unit to the smallest. Each pass has one job; doing
line edits during a structural pass wastes work on passages that may go.

## Before revising

- **Let it rest** if the writer can: distance makes problems visible.
- **Version first.** Save the current draft as a new version under the
  workspace convention owned by `office-formats`
  (`references/versioning-conventions.md`): `work/<title>/<title>_vNN.<ext>`
  with an entry in `CHANGES.md`. Never revise the only copy.
- **Agree the pass.** Ask which pass the writer wants now, or recommend
  one from the diagnosis.

## Pass 1: developmental (story)

Questions:

- What is the central question, and is it raised early and answered at the
  climax?
- Whose story is it? Is the protagonist the one making the decisive choice?
- Does each act or section escalate? Is there a midpoint turn?
- Do the subplots press on the main plot?
- Is the ending earned by what came before?

Tool: the **reverse outline**. One line per scene: POV, what happens, the
value turn, and the scene's job. Then read the outline alone. Scenes with
no turn, two scenes doing the same job, and long stretches with no
escalation become visible. This is also how discovery writers find their
structure after a first draft.

Outputs: a list of structural changes (cut, merge, move, add, re-sequence)
agreed with the writer before any prose changes.

## Pass 2: scene

For each scene: goal, conflict, turn, outcome (`scene-and-dialogue.md`).
Enter later, leave earlier, convert summary to scene where a turning point
was told, and compress scenes that only carry information.

## Pass 3: character and continuity

- Track each major character's want and arc across the reverse outline.
- Check motivations hold: would this person do this, given what the reader
  knows?
- Continuity: names, ages, eye colour, timeline, who knows what when. Build
  or update the series bible as you go; `editorial-review` does the
  systematic check later.

## Pass 4: line (paragraph and sentence)

- Rhythm: vary sentence length to match pace (short in action, longer in
  reflection), but in the writer's established range.
- Precision: concrete nouns and verbs over adjective and adverb stacks.
- Filter words in deep POV; repeated words in close proximity; clichés.
- Dialogue tags and beats.
- Read aloud, or have it read aloud by text-to-speech, to hear stumbles.

## Pass 5: polish

Typos, punctuation, formatting to the target's manuscript standard. Hand to
`editorial-review` for a proper proofread and consistency check; a writer's
own eye (and yours, after drafting) misses its own errors.

## Cutting to length

- Cut scenes before sentences: one cut scene saves more than a hundred
  trimmed phrases and costs less voice.
- Then cut sequel beats that repeat known emotion, description that does
  not characterise, and dialogue pleasantries.
- Report the word count before and after, and what was cut, in the change
  summary.

## Generated-fiction tells

Check your own drafted or edited passages for these before handing them
over. In the writer's text, flag them only if they asked for a line edit.

| Tell | Example of the pattern | Instead |
|---|---|---|
| Stock names | The same few "fantasy" or "literary" first names recurring across unrelated stories | Choose names for era, place, class and family; check they are not the generic default |
| Emotion shown, then explained | A clenched jaw, then "He was angry." | Keep the image; cut the label |
| Reflective closer | Every scene ends with a character musing on what it meant | End on the turn, an action or a line of dialogue |
| Stock sensory phrases | "the air was thick with", "a shiver ran down her spine", "eyes sparkling with mischief" | One specific, unexpected detail |
| Tidy moral ending | The last paragraph states the lesson | Let the final image or choice carry it |
| Everyone speaks the same | Articulate, balanced, complete sentences for all characters | Distinct vocabularies, evasions, interruptions |
| Hedged magic and vague stakes | "Something ancient stirred" with no consequence | Concrete rules and concrete costs |
| Over-symmetry | Three-beat lists and paired clauses in every paragraph | Vary; let some sentences be lopsided |
| Significance inflation in narration | "a moment that would change everything" | Make the moment change something on the page |
| Therapy-speak dialogue | Characters naming their feelings and boundaries fluently in any era or genre | Speech fitted to the character and setting |

Where this list overlaps with `uncanny`, uncanny owns the general catalogue;
this table is the fiction-specific subset.

## Change summary

Append to `CHANGES.md` for every version handed back:

```markdown
## v04: 2026-10-11
From: v03   By: assistant (editor mode), at the writer's request
Pass: scene
Changed: ch. 3 opening now starts at the ferry crossing (cut 600 words of
arrival); ch. 5 scenes 2 and 3 merged; ch. 7 argument converted from
summary to scene.
Not changed: voice, tense, ch. 1 and 2 (writer is happy with them).
Open: ch. 9 midpoint still lacks a reversal; three options in notes.
Words: 84,210 -> 82,950
```
