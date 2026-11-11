import { init, use } from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { ChartOption } from "./chart-option.ts";

use([LineChart, GridComponent, LegendComponent, TitleComponent, TooltipComponent, SVGRenderer]);

/** A chart on the page. */
export interface Chart {
	/** Replaces what the chart shows. */
	set: (option: ChartOption) => void;
	remove: () => void;
}

/**
 * Draws the chart into `el` and keeps it sized to `el`.
 *
 * The chart is made when `el` first has a size, which an observer reports. A pop-up's content has no
 * size at the moment it opens, and a chart made then would have to be resized at once, which cuts
 * short the lines drawing in.
 */
export function drawChart(el: HTMLElement, option: ChartOption): Chart {
	let chart: ReturnType<typeof init> | null = null;
	let current = option;
	const observer = new ResizeObserver(() => {
		if (el.clientWidth === 0 || el.clientHeight === 0) return;
		if (!chart) {
			chart = init(el, null, { renderer: "svg" });
			chart.setOption(current);
		} else if (el.clientWidth !== chart.getWidth() || el.clientHeight !== chart.getHeight()) {
			chart.resize();
		}
	});
	observer.observe(el);
	return {
		set: (next) => {
			current = next;
			chart?.setOption(next, true);
		},
		remove: () => {
			observer.disconnect();
			chart?.dispose();
		},
	};
}
