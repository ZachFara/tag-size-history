# Tag Size History: design

Source: Linear MIT-655, "Make a simple plugin called tag size history which shows the amount of notes with your tags over time the same as vault size history", plus the owner's answers on 2026-11-10. This file is the source of truth for what to build.

## Purpose

An Obsidian plugin that shows how many notes carry each tag, over time, as a line chart with one line per tag. It should look and feel like the Vault Size History plugin's chart: a pop-up with a title, a legend, a date axis, a count axis, and a hover tooltip that lists every line's value on that date.

## What the owner decided

| Question | Answer |
| --- | --- |
| Where does history come from? | The note's creation time by default. A setting switches it to the note's modification time or to a date in a frontmatter property. |
| Which tags are shown? | The top N tags by note count. N is a setting. Any tag can be switched on or off in the pop-up. |
| Nested tags | An option switches between grouping nested tags under their top-level tag and showing each nested tag as its own line. |
| Where does the chart open? | A pop-up window, like Vault Size History. |
| Repo | Public, `ZachFara/tag-size-history`. |

## How the history is worked out

Nothing is recorded over time. The chart is computed from the vault as it is now, each time the pop-up opens.

1. Every Markdown note has a set of tags (inline and frontmatter, as Obsidian's metadata cache reports them) and one date.
2. The date depends on the **Date source** setting:
   - **Created** (default): the file's creation time.
   - **Modified**: the file's modification time.
   - **Frontmatter property**: the value of a named property (default `created`). A note whose property is missing or is not a date falls back to its creation time.
3. A note counts toward each of its tags from its date onward. A tag's line on a given day is the number of notes with that tag whose date is on or before that day.
4. Days are local calendar days.

Known limits, stated in the README: the chart cannot know when a tag was added to an existing note, and deleted notes are not counted.

### Tags

- Tags are compared without regard to case, as Obsidian does. The first spelling seen is the one displayed.
- A note counts once per tag, however many times the tag appears in it.
- **Group nested tags** on (default): `#project/alpha` and `#project/beta` both count toward one line, `project`. Only top-level tags have lines.
- **Group nested tags** off: every tag has its own line. A note tagged `#project/alpha` counts toward `project/alpha` and also toward `project`, as in Obsidian's tag pane.

### Which lines are shown

- Tags are ranked by their current note count, largest first, then by name.
- The first N are shown, where N is the **Number of tags** setting (default 10).
- In the pop-up, any tag can be switched on or off. These choices are saved and applied on top of the top N: a tag switched on stays on even when it is outside the top N, and a tag switched off stays off even when it is inside.
- **Reset** in the pop-up clears the saved choices, so the chart goes back to the top N.

## Entry points

Nothing is built that none of these reach.

1. **Ribbon icon** "Tag size history": opens the pop-up.
2. **Command** "Open chart" (shown by Obsidian as "Tag Size History: Open chart"): opens the pop-up.
3. **Settings tab**: Date source, Frontmatter property (shown when the source is a frontmatter property), Number of tags, Group nested tags.

## The pop-up

A wide modal with two parts.

- **Chart**: title "Tag size history", a legend of the shown tags, a date axis, a count axis starting at zero, and one line per shown tag. Hovering shows a tooltip with the date and each shown tag's count, as in Vault Size History. Colours and text follow the Obsidian theme, light or dark.
- **Tag panel**: a search box, the **Group nested tags** switch, a **Reset** button, and a list of every tag with its note count and a checkbox. Checking a tag adds its line, unchecking removes it. The list is ordered by note count.

When the vault has no tagged notes, the pop-up says so instead of drawing an empty chart.

The pop-up reads the vault when it opens. It is not kept in sync while open; reopening it shows the current state.

## Settings

Saved in the plugin's `data.json`. Saved data is untrusted: it is read through one normalizing function that replaces anything missing or wrong with the default.

| Setting | Values | Default |
| --- | --- | --- |
| Date source | Created, Modified, Frontmatter property | Created |
| Frontmatter property | text | `created` |
| Number of tags | whole number, 1 to 50 | 10 |
| Group nested tags | on, off | on |
| Tags switched on | list of tags | empty |
| Tags switched off | list of tags | empty |

## Modules

Nine modules in `src/`. `make check` enforces these imports.

```
types          leaf, imports nothing
settings       defaults and normalizing of saved settings; imports types
history        note dates, tag counting, series, ranking, shown tags; imports types
chart-option   builds the chart description (a plain object) from series; imports types
chart          draws a chart description with ECharts; imports echarts, chart-option, types
vault-notes    reads notes and their tags from the vault; imports obsidian, types
history-modal  the pop-up; imports obsidian, chart, chart-option, history, settings, types
settings-tab   the settings tab; imports obsidian, settings, types
main           the plugin; the only module that wires the others together
```

- `types`, `settings`, `history` and `chart-option` never import `obsidian` or `echarts`, so they are tested directly.
- Only `chart` imports `echarts`.
- `vault-notes`, `history-modal` and `settings-tab` never import each other or `main`. `main` passes them what they need.

## Out of scope

- Recording counts day by day.
- Counting deleted notes.
- A chart embedded in a note or shown in a sidebar tab.
- Exporting the data.
