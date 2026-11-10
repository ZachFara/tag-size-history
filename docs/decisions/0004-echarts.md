# 0004. Apache ECharts draws the chart

## Context

The ticket asks for a chart "pretty similar" to Vault Size History, which uses ECharts: a legend that toggles lines, a time axis, and a tooltip listing every line's value on the hovered date. Writing those by hand in SVG is several hundred lines of interaction code.

## Decision

Use ECharts through its tree-shakeable entry (`echarts/core` plus the line chart, grid, legend, tooltip and title components and the SVG renderer). Only `src/chart.ts` imports it. `src/chart-option.ts` builds the chart description as a plain object, with no ECharts import, so it is tested directly.

The SVG renderer is used rather than canvas: it is sharp at any zoom and it runs under jsdom, so the pop-up test draws a real chart.

## Consequences

- The bundle grows by the size of the ECharts parts used (a few hundred kilobytes), far below Vault Size History's 5 MB.
- The chart's look comes from options, with colours read from Obsidian's CSS variables when the chart is drawn.
