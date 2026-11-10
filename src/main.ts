import { Plugin } from "obsidian";
import { TagHistoryModal } from "./history-modal.ts";
import { DEFAULT_SETTINGS, normalizeSettings } from "./settings.ts";
import { TagHistorySettingTab } from "./settings-tab.ts";
import type { Settings } from "./types.ts";
import { readNotes } from "./vault-notes.ts";

/** Tag Size History: a pop-up chart of how many notes carry each tag over time. */
export default class TagSizeHistoryPlugin extends Plugin {
	override settings: Settings = DEFAULT_SETTINGS;

	override async onload(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
		this.addRibbonIcon("line-chart", "Tag size history", () => {
			this.openHistory();
		});
		this.addCommand({
			id: "open",
			name: "Open chart",
			callback: () => {
				this.openHistory();
			},
		});
		this.addSettingTab(
			new TagHistorySettingTab(this.app, this, {
				get: () => this.settings,
				save: async (settings) => {
					this.settings = settings;
					await this.saveData(settings);
				},
			}),
		);
	}

	private openHistory(): void {
		const notes = readNotes(this.app, this.settings.frontmatterProperty);
		new TagHistoryModal(this.app, notes, this.settings).open();
	}
}
