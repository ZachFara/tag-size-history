# PROGRESS

## Status

Phase 1 (setup) is in review. No feature code yet. The owner waived the approval stops for the first build of MIT-655, so Phase 2 starts as soon as the setup PR merges.

## Tasks

One task per branch and PR, in order. Each starts at the entry point named and works down.

- [ ] **T1. The pop-up opens and draws the chart.** Entry: ribbon icon and "Open tag size history" command. The pop-up shows one line per tag for the top 10 tags, by creation date, nested tags grouped under their top-level tag. Empty vaults get a message. Done when: `history` and `chart-option` are tested, the pop-up is tested under jsdom, and `make check` passes.
- [ ] **T2. Settings tab: date source and number of tags.** Entry: settings tab. Date source (Created, Modified, Frontmatter property), Frontmatter property name, Number of tags. Saved settings are read through `normalizeSettings`. Done when: each setting changes the chart's data in tests, and bad saved data falls back to defaults in tests.
- [ ] **T3. Switch tags on and off in the pop-up.** Entry: the pop-up's tag panel. Search box, a checkbox per tag with its count, Reset. Choices are saved. Done when: tests cover on, off, reset, search and saving.
- [ ] **T4. Group nested tags or show them separately.** Entry: the settings tab and the pop-up's tag panel. Done when: both modes are tested in `history`, and the switch redraws the chart in the pop-up test.
- [ ] **T5. Check in a real Obsidian, README with pictures.** Entry: `make obsidian-check`. Runs the plugin in a throwaway Obsidian with a sample vault, checks the pop-up draws, and saves README pictures. Done when: the check passes locally and the README shows a real screenshot.
- [ ] **T6. Release 0.1.0.** Bump nothing (already 0.1.0); confirm the manifest, tag only if the owner asks. Done when: the build is installed in the owner's test vault and the Linear ticket is updated.

## Open Questions

None.

## Next steps

Merge the setup PR, then T1.

## Learned

Nothing yet beyond the gotchas in AGENTS.md.
