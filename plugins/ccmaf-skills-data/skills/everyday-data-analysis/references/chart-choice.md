# Chart Choice

Pick the chart from the question, not from the data's shape or the tool's
menu. A good everyday chart can be read in five seconds by someone who has
never seen the data, and its title says what they should notice.

## Question → chart

| The question is about... | Use | Avoid |
|---|---|---|
| Change over time | Line chart (bars if few periods, or totals per period) | Pie per month; 3D anything |
| Comparing categories | Horizontal bar chart, sorted, top N + Other | Unsorted bars; pie with more than 3–4 slices |
| Part of a whole, one moment | Single stacked bar or a sorted bar with % labels; pie only for 2–3 parts | Donut "dashboards" of many pies |
| Part of a whole over time | Stacked area or stacked bars with few series; or small multiples | Many stacked series nobody can read |
| Distribution (typical and spread) | Histogram; box plot for comparing groups | Bar of averages hiding the spread |
| Relationship between two measures | Scatter plot, optionally with a light trend line | Dual-axis line chart |
| This year vs last year | Two lines on the same axis, by month | Two separate charts with different scales |
| Single headline number | A big number with its comparison ("€412, up €38 on Sept 2025") | A chart for one number |
| Many groups over time | Small multiples (one small chart per group, shared axes) | One spaghetti line chart |
| Exact values matter | A table, sorted, with units | Any chart |

## Rules for honest charts

- **Bars start at zero.** A bar's length is its value; cutting the axis
  exaggerates differences. Line charts may zoom to the data range, but say
  so if a small change looks dramatic.
- **Same scale for things compared.** Small multiples share axes; two charts
  meant to be compared use the same y range.
- **No dual axes** unless the user insists; any two series can be made to
  look related by choosing the scales.
- **Time on the x axis, left to right, evenly spaced.** Missing periods are
  gaps, not squeezed out.
- **Show the incomplete period differently** (lighter, dashed) or leave it
  out and say so in a note.
- **Label directly.** Put series names at the line ends instead of a legend
  where possible; label bars with values when there are few.
- **Units everywhere.** Axis titles with units (€, kWh, km, members); no
  unexplained "Value" axis.
- **Title = finding.** "Grocery spending rose 12% year on year" beats
  "Spending by category". Put the caveat in a subtitle or footnote if it
  changes how to read the chart ("Oct 2026 = 9 days").
- **Source line.** Small text: data source, date range, and any exclusions.

## Colour and accessibility

- One highlight colour for what matters, grey for context. Colour carries
  meaning, not decoration.
- Do not rely on colour alone: use direct labels, line styles or markers so
  the chart works for colour-blind readers and in greyscale print.
- Avoid red–green as the only distinction. Prefer colour-blind-safe palettes
  (for example the Okabe–Ito set, or matplotlib's `tab10` with care).
- Text at least as large as body text; sufficient contrast with the
  background (WCAG contrast guidance applies to chart text too).
- Give every chart a text alternative: one or two sentences with the key
  numbers, in the findings note and as alt text in HTML.
  `accessibility-development` covers accessible charts and data tables in
  depth.

## matplotlib defaults worth setting

```python
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(8, 4.5), dpi=150)
ax.plot(monthly.index, monthly["Spend"], color="#1f5f8b", linewidth=2)
ax.set_title("Monthly spending, Jan 2025 – Sep 2026", loc="left")
ax.set_ylabel("Spending (€)")
ax.set_ylim(bottom=0)
ax.spines[["top", "right"]].set_visible(False)
ax.grid(axis="y", alpha=0.3)
fig.text(0.01, 0.01, "Source: card export 2026-10-11. Transfers excluded.", fontsize=8)
fig.tight_layout()
fig.savefig("work/spending-2026/charts/monthly.png")
```

Save PNG for documents and chat, SVG when it will be scaled or edited.
Always open the saved image and look at it before using it: overlapping
labels, cut-off titles and an axis that does not start where you expected
are only visible in the render.

## Checking a chart against its numbers

For every chart, before handing over:

- [ ] The largest and smallest values on the chart match the table.
- [ ] The y axis starts at zero for bars; the range is stated if zoomed.
- [ ] Every series is identifiable without colour.
- [ ] The title's claim is true and worded at the strength the data supports
      (`honest-caveats.md`).
- [ ] Partial periods and exclusions are visible or noted.
