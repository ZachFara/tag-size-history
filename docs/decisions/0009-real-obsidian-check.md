# 0009. A check in a real, throwaway Obsidian

## Context

The tests use a stub of Obsidian (decision 0005). They cannot show whether the pop-up opens from the command, whether Obsidian draws the declarative settings, how the chart looks in the theme, or whether reading tags and file times from a real vault works.

## Decision

`scripts/obsidian-check.mjs` builds the plugin, makes a temp vault of sample notes and a temp Obsidian profile, starts a separate Obsidian with a debugging port, and drives it over the Chrome DevTools protocol. Each check returns facts read from the page and is compared with what is expected. The sample notes get their file times set into the past, which on macOS also moves their creation times, so a fresh vault has two years of history. With `--readme` it saves pictures of the pop-up to `docs/images/`, including one in the light theme, and records `grow.gif` and `demo.gif`: it takes whole-page frames while it drives the pop-up, and ffmpeg crops and joins them at the speed they were taken. The layout check allows PNG and GIF files there.

It runs with `make obsidian-check`. It is not part of `make check`, because CI has no Obsidian.

## Consequences

- The owner's Obsidian, profile and vaults are never touched.
- README pictures are reproducible and show real Obsidian.
- It needs macOS and an installed Obsidian, and it is run by hand. A change to user-facing behaviour should add a check there.
