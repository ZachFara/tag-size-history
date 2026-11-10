import { init, use } from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { ChartOption } from "./chart-option.ts";

use([LineChart, GridComponent, LegendComponent, TitleComponent, TooltipComponent, SVGRenderer]);

/** Draws the chart into `el`, keeps it sized to `el`, and returns a function that removes it. */
export function drawChart(el: HTMLElement, option: ChartOption): () => void {
	const chart = init(el, null, { renderer: "svg" });
	chart.setOption(option);
	const observer = new ResizeObserver(() => {
		chart.resize();
	});
	observer.observe(el);
	return () => {
		observer.disconnect();
		chart.dispose();
	};
}
