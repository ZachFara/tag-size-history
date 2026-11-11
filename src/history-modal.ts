import { Modal } from "obsidian";
import type { App } from "obsidian";
import { drawChart } from "./chart.ts";
import type { Chart } from "./chart.ts";
import { buildChartOption } from "./chart-option.ts";
import type { ChartOption } from "./chart-option.ts";
import { chartData, linkHistories, shownHistories, tagHistories, toggleLine } from "./history.ts";
import { choicesOf, withChoices } from "./settings.ts";
import type { ChartTheme, History, Mode, NoteRecord, Settings } from "./types.ts";

/** The words that differ between counting tags and counting links. */
const MODES: Record<Mode, { button: string; title: string; filter: string; empty: string; prefix: string }> =
	{
		tags: {
			button: "Tags",
			title: "Tag size history",
			filter: "Filter tags",
			empty: "No tagged notes yet. Add a tag to a note and open this again.",
			prefix: "#",
		},
		links: {
			button: "Links",
			title: "Backlink history",
			filter: "Filter notes",
			empty: "No links between notes yet. Link one note to another and open this again.",
			prefix: "",
		},
	};

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

/**
 * The pop-up: a line chart over time and a panel to pick the lines. In tags mode a line is the number
 * of notes with a tag. In links mode a line is the number of notes linking to a note.
 */
export class TagHistoryModal extends Modal {
	private readonly notes: NoteRecord[];
	private settings: Settings;
	private readonly save: (settings: Settings) => Promise<void>;
	/** Every line of the current mode, largest first, named as shown. */
	private histories: History[] = [];
	private chart: Chart | null = null;
	private chartEl: HTMLElement | null = null;
	private emptyEl: HTMLElement | null = null;
	private panelEl: HTMLElement | null = null;
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
		const layout = this.contentEl.createDiv({ cls: "tag-size-history-layout" });
		const main = layout.createDiv({ cls: "tag-size-history-main" });
		this.chartEl = main.createDiv({ cls: "tag-size-history-chart" });
		this.emptyEl = main.createEl("p", { cls: "tag-size-history-empty" });
		this.panelEl = layout.createDiv({ cls: "tag-size-history-panel" });
		this.count();
		this.chart = drawChart(this.chartEl, this.chartOption(this.chartEl));
		this.drawPanel();
		this.showOrHideChart();
	}

	override onClose(): void {
		this.chart?.remove();
		this.chart = null;
		this.contentEl.empty();
	}

	/** Works out every line of the current mode from the notes. */
	private count(): void {
		const { mode, dateSource } = this.settings;
		const counted =
			mode === "tags" ? tagHistories(this.notes, this.settings) : linkHistories(this.notes, dateSource);
		this.histories = counted.map((history) => ({ ...history, name: MODES[mode].prefix + history.name }));
	}

	private chartOption(chartEl: HTMLElement): ChartOption {
		const shown = shownHistories(this.histories, choicesOf(this.settings));
		return buildChartOption(
			chartData(shown, this.histories, Date.now()),
			readTheme(chartEl),
			MODES[this.settings.mode].title,
		);
	}

	/** With nothing to count, a message takes the chart's place. */
	private showOrHideChart(): void {
		const empty = this.histories.length === 0;
		this.chartEl?.toggleClass("tag-size-history-hidden", empty);
		this.emptyEl?.toggleClass("tag-size-history-hidden", !empty);
		this.emptyEl?.setText(MODES[this.settings.mode].empty);
	}

	private drawPanel(): void {
		const panel = this.panelEl;
		if (!panel) return;
		panel.empty();
		this.filter = "";
		this.drawModeSwitch(panel);
		const search = panel.createEl("input", {
			cls: "tag-size-history-search",
			type: "search",
			placeholder: MODES[this.settings.mode].filter,
		});
		search.addEventListener("input", () => {
			this.filter = search.value.trim().toLowerCase();
			this.drawList();
		});
		const reset = panel.createEl("button", { cls: "tag-size-history-reset", text: "Reset" });
		reset.setAttribute("aria-label", "Show the largest again");
		reset.addEventListener("click", () => {
			this.apply(withChoices(this.settings, { top: this.settings.topTags, shown: [], hidden: [] }));
		});
		if (this.settings.mode === "tags") this.drawNestedSwitch(panel);
		this.listEl = panel.createDiv({ cls: "tag-size-history-list" });
		this.drawList();
	}

	/** Two buttons: count notes per tag, or notes linking to each note. */
	private drawModeSwitch(panel: HTMLElement): void {
		const row = panel.createDiv({ cls: "tag-size-history-modes" });
		for (const mode of ["tags", "links"] as const) {
			const button = row.createEl("button", { text: MODES[mode].button });
			const active = mode === this.settings.mode;
			button.toggleClass("is-active", active);
			button.setAttribute("aria-pressed", String(active));
			button.addEventListener("click", () => {
				if (mode !== this.settings.mode) this.apply({ ...this.settings, mode });
			});
		}
	}

	/** Group nested tags under their top-level tag, or give each its own line. */
	private drawNestedSwitch(panel: HTMLElement): void {
		const label = panel.createEl("label", { cls: "tag-size-history-nested" });
		const box = label.createEl("input", { type: "checkbox" });
		box.checked = this.settings.groupNested;
		label.createSpan({ text: "Group nested tags" });
		box.addEventListener("change", () => {
			this.apply({ ...this.settings, groupNested: box.checked });
		});
	}

	/** One row per line that matches the filter: a checkbox, the name and the count. */
	private drawList(): void {
		const list = this.listEl;
		if (!list) return;
		list.empty();
		const choices = choicesOf(this.settings);
		const shown = new Set(shownHistories(this.histories, choices).map((h) => h.key));
		for (const { key, name, total } of this.histories) {
			if (!name.toLowerCase().includes(this.filter)) continue;
			const row = list.createEl("label", { cls: "tag-size-history-tag" });
			// The row cuts a long name short. Hovering shows all of it.
			row.setAttribute("title", name);
			const box = row.createEl("input", { type: "checkbox" });
			box.checked = shown.has(key);
			box.addEventListener("change", () => {
				const next = toggleLine(this.histories, choicesOf(this.settings), key, box.checked);
				this.apply(withChoices(this.settings, next));
			});
			row.createSpan({ cls: "tag-size-history-name", text: name });
			row.createSpan({ cls: "tag-size-history-count", text: String(total) });
		}
	}

	/** Applies changed settings: saves them, recounts, and redraws the chart and the panel. */
	private apply(settings: Settings): void {
		const modeChanged = settings.mode !== this.settings.mode;
		this.settings = settings;
		this.save(settings).catch((error: unknown) => {
			console.error("Tag Size History could not save its settings.", error);
		});
		this.count();
		if (this.chart && this.chartEl) this.chart.set(this.chartOption(this.chartEl));
		if (modeChanged) this.drawPanel();
		else this.drawList();
		this.showOrHideChart();
	}
}
