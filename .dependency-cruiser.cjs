// Module boundaries from DESIGN.md. The check fails on any violation.
//
//   types          leaf: imports nothing
//   settings       defaults and normalizing of saved settings: imports types only
//   history        note dates, tag counting, series, ranking: imports types only
//   chart-option   builds the chart description from series: imports types only
//   chart          draws a chart description with ECharts: imports echarts, chart-option, types
//   vault-notes    reads notes and their tags from the vault: imports obsidian, types
//   history-modal  the pop-up: imports obsidian, chart, chart-option, history, settings, types
//   settings-tab   the settings tab: imports obsidian, settings, types
//   main           the only module that wires the others together
const PURE = "^src/(types|settings|history|chart-option)\\.ts$";

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
	forbidden: [
		{ name: "no-circular", severity: "error", from: {}, to: { circular: true } },
		{
			name: "pure-modules-stay-pure",
			comment: "Pure modules must not touch Obsidian, ECharts or the UI modules, not even for types.",
			severity: "error",
			from: { path: PURE },
			to: {
				path: ["^obsidian$", "^echarts", "^src/(chart|vault-notes|history-modal|settings-tab|main)\\.ts$"],
			},
		},
		{
			name: "types-imports-nothing",
			severity: "error",
			from: { path: "^src/types\\.ts$" },
			to: { path: "^src/" },
		},
		{
			name: "pure-modules-import-types-only",
			comment: "settings, history and chart-option each import types and nothing else.",
			severity: "error",
			from: { path: "^src/(settings|history|chart-option)\\.ts$" },
			to: { path: "^src/(?!types\\.ts$)" },
		},
		{
			name: "only-chart-imports-echarts",
			severity: "error",
			from: { path: "^src/", pathNot: "^src/chart\\.ts$" },
			to: { path: "^echarts" },
		},
		{
			name: "chart-does-not-know-obsidian",
			severity: "error",
			from: { path: "^src/chart\\.ts$" },
			to: { path: ["^obsidian$", "^src/(vault-notes|history-modal|settings-tab|main)\\.ts$"] },
		},
		{
			name: "ui-modules-do-not-import-each-other",
			severity: "error",
			from: { path: "^src/(vault-notes|history-modal|settings-tab)\\.ts$" },
			to: { path: "^src/(vault-notes|history-modal|settings-tab|main)\\.ts$" },
		},
		{
			name: "src-does-not-import-tests",
			severity: "error",
			from: { path: "^src/" },
			to: { path: "^test/" },
		},
		{
			name: "no-orphans",
			severity: "error",
			from: { orphan: true, path: "^src/", pathNot: "^src/main\\.ts$" },
			to: {},
		},
	],
	options: {
		tsConfig: { fileName: "tsconfig.json" },
		tsPreCompilationDeps: true,
		doNotFollow: { path: "node_modules" },
		exclude: { path: "^node_modules" },
	},
};
