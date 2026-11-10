# PROGRESS

## Status

Phase 1 (setup) is merged. Phase 2 is under way: T1 to T3 are done, T4 is next. The owner waived the approval stops for the first build of MIT-655.

## Tasks

One task per branch and PR, in order. Each starts at the entry point named and works down.

- [x] **T1. The pop-up opens and draws the chart.** Entry: ribbon icon and "Open chart" command. The pop-up shows one line per tag for the top 10 tags, by creation date, nested tags grouped under their top-level tag. Empty vaults get a message. Done when: `history` and `chart-option` are tested, the pop-up is tested under jsdom, and `make check` passes.
- [x] **T2. Settings tab: date source and number of tags.** Entry: settings tab. Date source (Created, Modified, Frontmatter property), Frontmatter property name, Number of tags. Saved settings are read through `normalizeSettings`. Done when: each setting changes the chart's data in tests, and bad saved data falls back to defaults in tests.
- [x] **T3. Switch tags on and off in the pop-up.** Entry: the pop-up's tag panel. Search box, a checkbox per tag with its count, Reset. Choices are saved. Done when: tests cover on, off, reset, search and saving.
- [ ] **T4. Group nested tags or show them separately.** Entry: the settings tab and the pop-up's tag panel. Done when: both modes are tested in `history`, and the switch redraws the chart in the pop-up test.
- [ ] **T5. Check in a real Obsidian, README with pictures.** Entry: `make obsidian-check`. Runs the plugin in a throwaway Obsidian with a sample vault, checks the pop-up draws, and saves README pictures. Done when: the check passes locally and the README shows a real screenshot.
- [ ] **T6. Release 0.1.0.** Bump nothing (already 0.1.0); confirm the manifest, tag only if the owner asks. Done when: the build is installed in the owner's test vault and the Linear ticket is updated.

## Open Questions

None.

## Next steps

T4.

## Learned

- The Obsidian lint rules reject a command name that contains the plugin name, so the command is "Open chart". Obsidian shows it as "Tag Size History: Open chart".
- ECharts 6 deprecates `grid.containLabel`. Use `outerBoundsMode: "same"` with `outerBoundsContain: "axisLabel"`.
- jsdom has no layout and no canvas. `test/harness.ts` gives every element a fixed size and silences jsdom's console, and ECharts estimates text widths.
- Obsidian 1.13 and later draw the settings tab from `getSettingDefinitions()` (decision 0008). `Plugin` now has its own `settings` member, so the plugin class declares `override settings`.
