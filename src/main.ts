import { Plugin } from "obsidian";
import { TagHistoryModal } from "./history-modal.ts";
import { readNotes } from "./vault-notes.ts";

/** Tag Size History: a pop-up chart of how many notes carry each tag over time. */
export default class TagSizeHistoryPlugin extends Plugin {
	override onload(): void {
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
	}

	private openHistory(): void {
		new TagHistoryModal(this.app, readNotes(this.app)).open();
	}
}
