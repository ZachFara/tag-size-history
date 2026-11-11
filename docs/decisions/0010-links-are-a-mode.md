# 0010. Link history is a mode of this plugin, counted by the linking note's date

## Context

The owner asked for a link counterpart to the tag chart. A total count of links over time is one rising line and says little. The useful question is which notes became hubs, and when. A separate plugin would be a near copy of this one, and Obsidian's developer policies prefer fewer, stronger plugins. The plugin's id cannot change once listed, and the owner chose to keep the name.

## Decision

Add a **Links** mode to the pop-up beside **Tags**. In links mode a line belongs to a note and counts the notes linking to it. A linking note counts once per target, from its own date, using the same date source as tags.

- `vault-notes` reads each note's path and the Markdown notes it links to from Obsidian's resolved links.
- `history` counts whatever a note "counts toward" through one tally: tags, keyed in lower case, or linked notes, keyed by path. Ranking, shown lines, toggling and chart data are shared.
- Settings gain `mode`, `shownNotes` and `hiddenNotes`. Note choices are saved by exact path, apart from tag choices. `choicesOf` and `withChoices` in `settings` map the settings to the current mode's choices and back.
- The "Number of tags" setting becomes "Number of lines" and serves both modes. Its saved key stays `topTags`, so saved settings carry over.

## Consequences

- The same limit as tags: a link added later to an old note counts from that note's date.
- A choice saved for a note that is later renamed or deleted has no effect. It is not cleaned up.
- The name "Tag Size History" undersells the plugin. The README and listing say what links mode does.
