import type { ChartData, ChartTheme } from "./types.ts";

interface TextStyle {
	color?: string;
	fontFamily?: string;
	fontSize?: number;
	fontWeight?: number;
}

interface LineSeries {
	/** Lets the chart tell which line is which between redraws, so only lines that changed move. */
	id: string;
	name: string;
	type: "line";
	showSymbol: boolean;
	symbolSize: number;
	lineStyle: { width: number };
	itemStyle: { color: string };
	/** `[start of day, note count]` */
	data: [number, number][];
}

/** The chart, described as the plain object ECharts takes. Built here so it can be tested without ECharts. */
export interface ChartOption {
	[key: string]: unknown;
	backgroundColor: "transparent";
	/** How long the lines take to draw in, in milliseconds. */
	animationDuration: number;
	textStyle: TextStyle;
	title: { text: string; left: number; top: number; textStyle: TextStyle };
	legend: { type: "scroll"; top: number; left: number; right: number; data: string[]; textStyle: TextStyle };
	tooltip: {
		trigger: "axis";
		order: "valueDesc";
		backgroundColor?: string;
		borderColor?: string;
		textStyle: TextStyle;
	};
	grid: {
		left: number;
		right: number;
		top: number;
		bottom: number;
		/** Together these keep the axis labels inside the margins. */
		outerBoundsMode: "same";
		outerBoundsContain: "axisLabel";
	};
	xAxis: { type: "time"; axisLabel: TextStyle & { hideOverlap: true }; splitLine: { show: false } };
	yAxis: {
		type: "value";
		min: 0;
		minInterval: 1;
		axisLabel: TextStyle;
		splitLine: { lineStyle: { color?: string } };
	};
	series: LineSeries[];
}

/** Line colours that read on dark and light backgrounds. Lines past the last colour start again. */
const PALETTE = [
	"#5b7cf0",
	"#b6d634",
	"#ff994d",
	"#0ca8df",
	"#ffd10a",
	"#fb628b",
	"#9a7fe0",
	"#3fbe95",
	"#e0745c",
	"#8fa3b8",
];

/** A line's colour comes from its rank, not its place among the shown lines, so it never changes. */
export function lineColour(rank: number): string {
	return PALETTE[rank % PALETTE.length] ?? "#5b7cf0";
}

/** Leaves a key out when the theme has no value for it, so ECharts keeps its default. */
function colour(value: string): { color?: string } {
	return value === "" ? {} : { color: value };
}

function series(data: ChartData): LineSeries[] {
	return data.lines.map((line) => ({
		id: line.name,
		name: line.name,
		type: "line",
		showSymbol: false,
		symbolSize: 6,
		lineStyle: { width: 2 },
		itemStyle: { color: lineColour(line.rank) },
		data: data.days.map((day, i): [number, number] => [day, line.counts[i] ?? 0]),
	}));
}

/** One line per tag or note over a date axis, with a legend and a tooltip listing every line on the hovered date. */
export function buildChartOption(data: ChartData, theme: ChartTheme, title: string): ChartOption {
	const text = colour(theme.text);
	const muted = colour(theme.muted);
	return {
		backgroundColor: "transparent",
		animationDuration: 1400,
		textStyle: { ...text, ...(theme.font === "" ? {} : { fontFamily: theme.font }) },
		title: { text: title, left: 8, top: 4, textStyle: { ...text, fontSize: 16, fontWeight: 600 } },
		legend: {
			type: "scroll",
			top: 34,
			left: 8,
			right: 16,
			data: data.lines.map((line) => line.name),
			textStyle: text,
		},
		tooltip: {
			trigger: "axis",
			order: "valueDesc",
			...(theme.background === "" ? {} : { backgroundColor: theme.background }),
			...(theme.border === "" ? {} : { borderColor: theme.border }),
			textStyle: text,
		},
		grid: {
			left: 16,
			right: 28,
			top: 72,
			bottom: 12,
			outerBoundsMode: "same",
			outerBoundsContain: "axisLabel",
		},
		xAxis: { type: "time", axisLabel: { ...muted, hideOverlap: true }, splitLine: { show: false } },
		yAxis: {
			type: "value",
			min: 0,
			minInterval: 1,
			axisLabel: muted,
			splitLine: { lineStyle: colour(theme.border) },
		},
		series: series(data),
	};
}
