import { test } from "node:test";
import assert from "node:assert/strict";
import { buildChartOption, lineColour, shortName } from "../src/chart-option.ts";
import type { ChartData, ChartTheme } from "../src/types.ts";

const NO_THEME: ChartTheme = { text: "", muted: "", border: "", background: "", font: "" };
const DATA: ChartData = {
	days: [100, 200, 300],
	lines: [
		{ name: "#book", rank: 0, counts: [1, 2, 5] },
		{ name: "#film", rank: 3, counts: [0, 1, 1] },
	],
};

test("each line is a series of [day, count] points under its name", () => {
	const option = buildChartOption(DATA, NO_THEME, "Tag size history");
	assert.deepEqual(
		option.series.map((s) => [s.name, s.type, s.data]),
		[
			[
				"#book",
				"line",
				[
					[100, 1],
					[200, 2],
					[300, 5],
				],
			],
			[
				"#film",
				"line",
				[
					[100, 0],
					[200, 1],
					[300, 1],
				],
			],
		],
	);
});

test("the legend lists the tags in the order given", () => {
	assert.deepEqual(buildChartOption(DATA, NO_THEME, "Tag size history").legend.data, ["#book", "#film"]);
});

test("the axes are dates against counts from zero, and the tooltip covers every line", () => {
	const option = buildChartOption(DATA, NO_THEME, "Tag size history");
	assert.equal(option.xAxis.type, "time");
	assert.equal(option.yAxis.min, 0);
	assert.equal(option.yAxis.minInterval, 1);
	assert.equal(option.tooltip.trigger, "axis");
	assert.equal(option.title.text, "Tag size history");
	assert.ok(option.animationDuration > 1000, "the lines take over a second to draw in");
});

test("theme colours are applied, and missing ones leave the chart's defaults", () => {
	const themed = buildChartOption(
		DATA,
		{ text: "#111", muted: "#777", border: "#ccc", background: "#fff", font: "Inter" },
		"Any title",
	);
	assert.deepEqual(themed.textStyle, { color: "#111", fontFamily: "Inter" });
	assert.equal(themed.xAxis.axisLabel.color, "#777");
	assert.equal(themed.tooltip.backgroundColor, "#fff");
	assert.deepEqual(themed.yAxis.splitLine.lineStyle, { color: "#ccc" });

	const plain = buildChartOption(DATA, NO_THEME, "Tag size history");
	assert.deepEqual(plain.textStyle, {});
	assert.equal("backgroundColor" in plain.tooltip, false);
});

test("a line's colour comes from its rank, so it does not change when other lines come and go", () => {
	const colours = buildChartOption(DATA, NO_THEME, "Any title").series.map((s) => s.itemStyle.color);
	assert.deepEqual(colours, [lineColour(0), lineColour(3)]);
	assert.deepEqual(
		buildChartOption(DATA, NO_THEME, "Any title").series.map((s) => s.id),
		["#book", "#film"],
		"each line has an id, so the chart can match it between redraws",
	);
	assert.notEqual(lineColour(0), lineColour(3));

	const alone: ChartData = { days: DATA.days, lines: DATA.lines.slice(1) };
	assert.equal(buildChartOption(alone, NO_THEME, "Any title").series[0]?.itemStyle.color, lineColour(3));
});

test("colours repeat after the last one rather than running out", () => {
	assert.equal(lineColour(10), lineColour(0));
	assert.match(lineColour(57), /^#[0-9a-f]{6}$/);
});

test("the legend shortens a long name and leaves a short one alone", () => {
	const long = "A note with a very long name that goes on and on";
	assert.equal(shortName("#book"), "#book");
	assert.equal(shortName(long), "A note with a very long nam…");
	assert.equal(shortName(long).length, 28);
	assert.equal(buildChartOption(DATA, NO_THEME, "Any title").legend.formatter(long), shortName(long));
});
