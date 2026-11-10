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

/** Draws the chart into `el` and keeps it sized to `el`. */
export function drawChart(el: HTMLElement, option: ChartOption): Chart {
	const chart = init(el, null, { renderer: "svg" });
	chart.setOption(option);
	const observer = new ResizeObserver(() => {
		chart.resize();
	});
	observer.observe(el);
	return {
		set: (next) => {
			chart.setOption(next, true);
		},
		remove: () => {
			observer.disconnect();
			chart.dispose();
		},
	};
}
