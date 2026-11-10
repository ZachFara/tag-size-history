# PROGRESS

## Status

The first build of MIT-655 is complete: T1 to T6 are done and version 0.1.0 is on `main`. The owner waived the approval stops for that build only; later sessions follow the rules as written, including stopping for approval.

## Tasks

One task per branch and PR, in order. Each starts at the entry point named and works down.

- [x] **T1. The pop-up opens and draws the chart.** Entry: ribbon icon and "Open chart" command. The pop-up shows one line per tag for the top 10 tags, by creation date, nested tags grouped under their top-level tag. Empty vaults get a message. Done when: `history` and `chart-option` are tested, the pop-up is tested under jsdom, and `make check` passes.
- [x] **T2. Settings tab: date source and number of tags.** Entry: settings tab. Date source (Created, Modified, Frontmatter property), Frontmatter property name, Number of tags. Saved settings are read through `normalizeSettings`. Done when: each setting changes the chart's data in tests, and bad saved data falls back to defaults in tests.
- [x] **T3. Switch tags on and off in the pop-up.** Entry: the pop-up's tag panel. Search box, a checkbox per tag with its count, Reset. Choices are saved. Done when: tests cover on, off, reset, search and saving.
- [x] **T4. Group nested tags or show them separately.** Entry: the settings tab and the pop-up's tag panel. Done when: both modes are tested in `history`, and the switch redraws the chart in the pop-up test.
- [x] **T5. Check in a real Obsidian, README with pictures.** Entry: `make obsidian-check`. Runs the plugin in a throwaway Obsidian with a sample vault, checks the pop-up draws, and saves README pictures. Done when: the check passes locally and the README shows a real screenshot.
- [x] **T6. Hand over 0.1.0.** The build is copied into the owner's test vault with `scripts/deploy.sh`, and the Linear ticket has a summary. No tag is pushed; tagging is publishing and waits for the owner.

## Ideas not asked for

Listed so they are not lost. None is planned.

- Record counts day by day, so tags added to old notes and deleted notes show correctly (decision 0003 explains why this was left out).
- Keep the pop-up in sync while it is open.
- A picture of the settings tab in the README. Obsidian 1.15 does not draw settings in the main window's page, so the check cannot photograph it yet.
- Try the plugin on mobile. `isDesktopOnly` is false and the layout has a narrow-screen rule, but it has not been run on a phone.

## Open Questions

None.

## Next steps

Nothing is queued. To publish, the owner asks for a tag (see Releasing in AGENTS.md).

## Learned

- The Obsidian lint rules reject a command name that contains the plugin name, so the command is "Open chart". Obsidian shows it as "Tag Size History: Open chart".
- ECharts 6 deprecates `grid.containLabel`. Use `outerBoundsMode: "same"` with `outerBoundsContain: "axisLabel"`.
- jsdom has no layout and no canvas. `test/harness.ts` gives every element a fixed size and silences jsdom's console, and ECharts estimates text widths.
- Obsidian 1.13 and later draw the settings tab from `getSettingDefinitions()` (decision 0008). `Plugin` now has its own `settings` member, so the plugin class declares `override settings`.
- The first run in a real Obsidian showed that hovering one line dimmed all the others (`emphasis.focus`), and that the legend beside the title ran out of room. Both are fixed: no dimming, and the legend has its own row.
