import { Modal } from "obsidian";
import type { App } from "obsidian";
import { drawChart } from "./chart.ts";
import type { Chart } from "./chart.ts";
import { buildChartOption } from "./chart-option.ts";
import type { ChartOption } from "./chart-option.ts";
import { chartData, shownHistories, tagHistories, toggleTag } from "./history.ts";
import type { ChartTheme, NoteRecord, Settings, TagChoices, TagHistory } from "./types.ts";

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

/** The pop-up: a line chart of how many notes carry each tag over time, and a panel to pick the tags. */
export class TagHistoryModal extends Modal {
	private readonly notes: NoteRecord[];
	private settings: Settings;
	private readonly save: (settings: Settings) => Promise<void>;
	/** Every tag, largest first. */
	private histories: TagHistory[] = [];
	private chart: Chart | null = null;
	private chartEl: HTMLElement | null = null;
	private listEl: HTMLElement | null = null;
	private filter = "";

	constructor(
		app: App,
		notes: NoteRecord[],
		settings: Settings,
		save: (settings: Settings) => Promise<void>,
	) {
		super(app);
		this.notes = notes;
		this.settings = settings;
		this.save = save;
	}

	override onOpen(): void {
		this.modalEl.addClass("tag-size-history-modal");
		this.histories = tagHistories(this.notes, this.settings.dateSource);
		if (this.histories.length === 0) {
			this.contentEl.createEl("p", {
				cls: "tag-size-history-empty",
				text: "No tagged notes yet. Add a tag to a note and open this again.",
			});
			return;
		}
		const layout = this.contentEl.createDiv({ cls: "tag-size-history-layout" });
		this.chartEl = layout.createDiv({ cls: "tag-size-history-chart" });
		this.chart = drawChart(this.chartEl, this.chartOption(this.chartEl));
		this.drawPanel(layout.createDiv({ cls: "tag-size-history-panel" }));
	}

	override onClose(): void {
		this.chart?.remove();
		this.chart = null;
		this.contentEl.empty();
	}

	private chartOption(chartEl: HTMLElement): ChartOption {
		const shown = shownHistories(this.histories, this.settings);
		return buildChartOption(chartData(shown, Date.now()), readTheme(chartEl));
	}

	private drawPanel(panel: HTMLElement): void {
		const search = panel.createEl("input", {
			cls: "tag-size-history-search",
			type: "search",
			placeholder: "Filter tags",
		});
		search.addEventListener("input", () => {
			this.filter = search.value.trim().toLowerCase();
			this.drawList();
		});
		const reset = panel.createEl("button", { cls: "tag-size-history-reset", text: "Reset" });
		reset.setAttribute("aria-label", "Show the largest tags again");
		reset.addEventListener("click", () => {
			this.choose({ topTags: this.settings.topTags, shownTags: [], hiddenTags: [] });
		});
		this.listEl = panel.createDiv({ cls: "tag-size-history-list" });
		this.drawList();
	}

	/** One row per tag that matches the filter: a checkbox, the tag and its note count. */
	private drawList(): void {
		const list = this.listEl;
		if (!list) return;
		list.empty();
		const shown = new Set(shownHistories(this.histories, this.settings).map((h) => h.tag));
		for (const { tag, total } of this.histories) {
			if (!tag.toLowerCase().includes(this.filter)) continue;
			const row = list.createEl("label", { cls: "tag-size-history-tag" });
			const box = row.createEl("input", { type: "checkbox" });
			box.checked = shown.has(tag);
			box.addEventListener("change", () => {
				this.choose(toggleTag(this.histories, this.settings, tag, box.checked));
			});
			row.createSpan({ cls: "tag-size-history-name", text: `#${tag}` });
			row.createSpan({ cls: "tag-size-history-count", text: String(total) });
		}
	}

	/** Applies new tag choices: saves them and redraws the chart and the list. */
	private choose(choices: TagChoices): void {
		this.settings = { ...this.settings, ...choices };
		this.save(this.settings).catch((error: unknown) => {
			console.error("Tag Size History could not save its settings.", error);
		});
		if (this.chart && this.chartEl) this.chart.set(this.chartOption(this.chartEl));
		this.drawList();
	}
}
