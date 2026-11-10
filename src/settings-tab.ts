import { PluginSettingTab } from "obsidian";
import type { App, Plugin, SettingDefinitionItem } from "obsidian";
import { MAX_TOP_TAGS, MIN_TOP_TAGS, normalizeSettings } from "./settings.ts";
import type { Settings } from "./types.ts";

/** How the tab reads and saves settings. `main` supplies it. */
export interface SettingsStore {
	get: () => Settings;
	save: (settings: Settings) => Promise<void>;
}

/** The settings tab: where the dates come from and how many tags the chart starts with. */
export class TagHistorySettingTab extends PluginSettingTab {
	private readonly store: SettingsStore;

	constructor(app: App, plugin: Plugin, store: SettingsStore) {
		super(app, plugin);
		this.store = store;
	}

	override getSettingDefinitions(): SettingDefinitionItem<keyof Settings>[] {
		return [
			{
				name: "Date source",
				desc: "The date from which a note counts toward its tags.",
				control: {
					type: "dropdown",
					key: "dateSource",
					options: { created: "Created", modified: "Modified", frontmatter: "Frontmatter property" },
				},
			},
			{
				name: "Frontmatter property",
				desc: "The property that holds each note's date. A note without a date there uses its creation time.",
				visible: () => this.store.get().dateSource === "frontmatter",
				control: { type: "text", key: "frontmatterProperty", placeholder: "created" },
			},
			{
				name: "Number of tags",
				desc: "How many of the largest tags the chart shows.",
				control: { type: "number", key: "topTags", min: MIN_TOP_TAGS, max: MAX_TOP_TAGS, step: 1 },
			},
		];
	}

	override getControlValue(key: string): unknown {
		return (this.store.get() as unknown as Record<string, unknown>)[key];
	}

	/** Every change goes through `normalizeSettings`, so a value out of range never reaches the saved data. */
	override async setControlValue(key: string, value: unknown): Promise<void> {
		await this.store.save(normalizeSettings({ ...this.store.get(), [key]: value }));
		this.refreshDomState();
	}
}
