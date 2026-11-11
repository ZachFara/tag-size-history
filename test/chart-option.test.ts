import { test } from "node:test";
import assert from "node:assert/strict";
import { buildChartOption } from "../src/chart-option.ts";
import type { ChartData, ChartTheme } from "../src/types.ts";

const NO_THEME: ChartTheme = { text: "", muted: "", border: "", background: "", font: "" };
const DATA: ChartData = {
	days: [100, 200, 300],
	lines: [
		{ tag: "book", counts: [1, 2, 5] },
		{ tag: "film", counts: [0, 1, 1] },
	],
};

test("each tag is a line of [day, count] points named with its #", () => {
	const option = buildChartOption(DATA, NO_THEME);
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
	assert.deepEqual(buildChartOption(DATA, NO_THEME).legend.data, ["#book", "#film"]);
});

test("the axes are dates against counts from zero, and the tooltip covers every line", () => {
	const option = buildChartOption(DATA, NO_THEME);
	assert.equal(option.xAxis.type, "time");
	assert.equal(option.yAxis.min, 0);
	assert.equal(option.yAxis.minInterval, 1);
	assert.equal(option.tooltip.trigger, "axis");
	assert.equal(option.title.text, "Tag size history");
	assert.ok(option.animationDuration > 1000, "the lines take over a second to draw in");
});

test("theme colours are applied, and missing ones leave the chart's defaults", () => {
	const themed = buildChartOption(DATA, {
		text: "#111",
		muted: "#777",
		border: "#ccc",
		background: "#fff",
		font: "Inter",
	});
	assert.deepEqual(themed.textStyle, { color: "#111", fontFamily: "Inter" });
	assert.equal(themed.xAxis.axisLabel.color, "#777");
	assert.equal(themed.tooltip.backgroundColor, "#fff");
	assert.deepEqual(themed.yAxis.splitLine.lineStyle, { color: "#ccc" });

	const plain = buildChartOption(DATA, NO_THEME);
	assert.deepEqual(plain.textStyle, {});
	assert.equal("backgroundColor" in plain.tooltip, false);
});
