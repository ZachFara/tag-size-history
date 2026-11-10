# 0003. History is computed from note dates, not recorded

## Context

The chart needs each tag's note count over time. Obsidian does not record when a tag was added to a note. The choices were to record counts each day from installation, to compute history from each note's date, or both. The owner chose note dates, with creation time as the default and modification time or a frontmatter property as options.

## Decision

Each time the pop-up opens, read every Markdown note's tags and date and compute the series. A note counts toward its tags from its date onward. Nothing is stored except settings.

## Consequences

- Full history shows on first use, and there is no data file to grow or corrupt.
- The chart cannot know when a tag was added to an existing note, and deleted notes are not counted. The README says so.
- Every open reads the whole metadata cache. This is in memory and is fast; if a very large vault proves slow, measure before adding a cache.
