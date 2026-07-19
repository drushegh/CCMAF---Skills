# Examples: before / after / overcorrected

Three columns, not two. The third column is the trap: an edit that removes the original tell and installs a new one. If your output resembles column three, you have swapped costumes, not fixed the prose.

---

## 1. Throat-clearing + contrast-reframe (essay register)

**Before (slop):**
> Here's the thing: building products is hard. Not because the technology is complex. Because people are complex. Let that sink in.

**After (fixed):**
> Building products is hard, and the difficulty is rarely technical. Aligning ten people on what "done" means takes longer than writing the code.

**Overcorrected (new tell):**
> Building products is hard. Technology is manageable. People aren't.

Why the third fails: three sentences, identical shape, descending length, mic-drop ending. It's the staccato signature: detectably "edited to sound human", which is its own genre of slop. The fix keeps a normal sentence rhythm and replaces the drama with a concrete claim.

---

## 2. Significance inflation + tailing participle (professional register)

**Before (slop):**
> Northwind's solution leverages cutting-edge AI capabilities to deliver a truly transformative citizen experience, underscoring our commitment to innovation and ensuring seamless integration with the Department's existing ecosystem.

**After (fixed):**
> The solution uses Azure AI Foundry to triage inbound cases against the Department's existing categories, reducing manual routing from four days to same-day. It integrates with the current Dynamics 365 environment through the standard Dataverse API, with no changes to existing case schemas.

**Overcorrected (new tell):**
> Our AI routes cases. Fast. It plugs into your Dynamics setup. No drama.

Why the third fails: register violation. Fragments, "no drama", and second-person address are wrong for a tender regardless of how "human" they sound. The fix stays formal and wins by mechanism + number + named system.

---

## 3. Vague attribution + hedging stack (report register)

**Before (slop):**
> Studies show that organisations might potentially see significant improvements in some cases when adopting agentic workflows, and industry experts widely agree this represents a pivotal shift in the landscape.

**After (fixed):**
> In the three engagements where we deployed agentic triage (Kestrel Health, Larkfield Council, and one commercial client), first-response time fell by 40–70%. Published benchmarks are thinner: METR's 2025 task-completion data is the closest independent evidence, and it measures developer tasks, not case handling.

**Overcorrected (new tell):**
> Agentic workflows work. Everyone serious already knows this.

Why the third fails: it replaced unfalsifiable hedging with unfalsifiable swagger, a lazy extreme ("everyone") and zero evidence. Confidence is not specificity. The fix names sources, gives numbers, and hedges exactly once, where the uncertainty is real.

---

## 4. False agency + rule-of-three saturation (essay register)

**Before (slop):**
> As adoption grows, the culture shifts, the conversation moves toward outcomes, and the data tells a compelling story of transformation, innovation, and growth.

**After (fixed):**
> After the second team adopted the framework, engineers stopped debating whether to use it and started arguing about conventions, which is a better class of argument. Cycle time dropped 30% over the quarter; whether that holds is next quarter's question.

**Overcorrected (new tell):**
> People changed how they worked. The numbers went up.

Why the third fails: it names actors (good) but strips all information: "the numbers went up" is a vague declarative in plain-word clothing. Plainness without specifics is still slop.

---

## 5. Bow ending + editorial insert (any register)

**Before (slop):**
> In conclusion, it's important to note that the migration represents a significant milestone in the organisation's digital journey. Ultimately, the benefits outlined above speak to a comprehensive and holistic transformation.

**After (fixed):**
> The migration closes the last dependency on the 2016 estate. The open decision is the archive tier: Glacier-class storage saves €18k/year but adds a four-hour retrieval SLA, and Legal has not yet confirmed whether that meets discovery obligations.

**Overcorrected (new tell):**
> That's the migration. Done.

Why the third fails: performative brevity. The fix demonstrates the real move. A good ending isn't shorter, it's *loaded*: it leaves the reader with the live decision, the open risk, or the next step instead of a summary of what they just read.

---

## 6. Technical documentation (register inversion example)

**Before (slop):**
> In this comprehensive guide, we'll delve into the powerful configuration options that ensure a seamless setup experience, highlighting best practices along the way.

**After (fixed):**
> Configuration reference. Required: `API_KEY`, `TENANT_ID`. Optional settings below; defaults suit most single-tenant deployments. Multi-tenant setups: read the `ISOLATION_MODE` warning before first run.

**Overcorrected (new tell):**
> Config is simple. You'll figure it out. Here are the options.

Why the third fails: chattiness in reference material, and it discards the load-bearing warning. In this register, terse-and-complete beats terse-and-breezy; parallel structure and repetition of warnings are features, not tells.
