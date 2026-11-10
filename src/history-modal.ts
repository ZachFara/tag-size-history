import { Modal } from "obsidian";
import type { App } from "obsidian";
import { drawChart } from "./chart.ts";
import { buildChartOption } from "./chart-option.ts";
import { chartData, tagHistories } from "./history.ts";
import type { ChartTheme, NoteRecord, Settings } from "./types.ts";

/** Reads the chart's colours from the Obsidian theme in effect on `el`. */
function readTheme(el: HTMLElement): ChartTheme {
	const style = getComputedStyle(el);
	const value = (name: string): string => style.getPropertyValue(name).trim();
	return {
		text: value("--text-normal"),
		muted: value("--text-muted"),
		border: value("--background-modifier-border"),
		background: value("--background-primary"),
		font: value("--font-interface"),
	};
}

/** The pop-up: a line chart of how many notes carry each tag over time. */
export class TagHistoryModal extends Modal {
	private readonly notes: NoteRecord[];
	private readonly settings: Settings;
	private removeChart: (() => void) | null = null;

	constructor(app: App, notes: NoteRecord[], settings: Settings) {
		super(app);
		this.notes = notes;
		this.settings = settings;
	}

	override onOpen(): void {
		this.modalEl.addClass("tag-size-history-modal");
		const { dateSource, topTags } = this.settings;
		const histories = tagHistories(this.notes, dateSource).slice(0, topTags);
		if (histories.length === 0) {
			this.contentEl.createEl("p", {
				cls: "tag-size-history-empty",
				text: "No tagged notes yet. Add a tag to a note and open this again.",
			});
			return;
		}
		const chartEl = this.contentEl.createDiv({ cls: "tag-size-history-chart" });
		const option = buildChartOption(chartData(histories, Date.now()), readTheme(chartEl));
		this.removeChart = drawChart(chartEl, option);
	}

	override onClose(): void {
		this.removeChart?.();
		this.removeChart = null;
		this.contentEl.empty();
	}
}
