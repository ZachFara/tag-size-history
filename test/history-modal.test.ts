import { test } from "node:test";
import assert from "node:assert/strict";
import type { App } from "obsidian";
import { loadModule } from "./harness.ts";
import type { TagHistoryModal as ModalClass } from "../src/history-modal.ts";
import { DEFAULT_SETTINGS } from "../src/settings.ts";
import type { NoteRecord, Settings } from "../src/types.ts";

const { TagHistoryModal } = await loadModule<{ TagHistoryModal: typeof ModalClass }>("src/history-modal.ts");

const APP = {} as App;
const at = (day: number): number => new Date(2024, 2, day, 12).getTime();

type Tagged = Pick<NoteRecord, "tags" | "created">;

function open(tagged: Tagged[], settings: Settings = DEFAULT_SETTINGS): ModalClass {
	const notes = tagged.map((n) => ({ ...n, modified: n.created, frontmatterDate: undefined }));
	const modal = new TagHistoryModal(APP, notes, settings);
	modal.open();
	return modal;
}

/** The text ECharts drew: title, legend and axis labels. */
function chartText(modal: ModalClass): string {
	return [...modal.contentEl.querySelectorAll("svg text")].map((t) => t.textContent).join(" | ");
}

test("the pop-up draws a chart with a line and a legend entry per tag", () => {
	const modal = open([
		{ tags: ["#book"], created: at(1) },
		{ tags: ["#book", "#film"], created: at(5) },
	]);
	const text = chartText(modal);
	assert.match(text, /Tag size history/);
	assert.match(text, /#book/);
	assert.match(text, /#film/);
	assert.ok(modal.modalEl.classList.contains("tag-size-history-modal"));
	modal.close();
});

test("the pop-up shows only the ten largest tags", () => {
	const notes: Tagged[] = [];
	for (let i = 1; i <= 12; i++) {
		// tag1 has one note, tag12 has twelve
		for (let n = 0; n < i; n++) notes.push({ tags: [`#tag${String(i)}`], created: at(n + 1) });
	}
	const modal = open(notes);
	const text = chartText(modal);
	assert.match(text, /#tag12\b/);
	assert.match(text, /#tag3\b/);
	assert.doesNotMatch(text, /#tag2\b/);
	assert.doesNotMatch(text, /#tag1\b/);
	modal.close();
});

test("the number of tags setting limits the lines", () => {
	const notes: Tagged[] = [
		{ tags: ["#big"], created: at(1) },
		{ tags: ["#big", "#small"], created: at(2) },
	];
	const modal = open(notes, { ...DEFAULT_SETTINGS, topTags: 1 });
	assert.match(chartText(modal), /#big/);
	assert.doesNotMatch(chartText(modal), /#small/);
	modal.close();
});

test("the date source setting moves the start of the line", () => {
	const notes = [{ tags: ["#a"], created: at(1), modified: at(1), frontmatterDate: "2021-06-01" }];
	const modal = new TagHistoryModal(APP, notes, { ...DEFAULT_SETTINGS, dateSource: "frontmatter" });
	modal.open();
	assert.match(chartText(modal), /2021|2022|2023/);
	modal.close();
});

test("a vault with no tagged notes gets a message, not an empty chart", () => {
	const modal = open([{ tags: [], created: at(1) }]);
	assert.equal(modal.contentEl.querySelector("svg"), null);
	assert.match(modal.contentEl.textContent, /No tagged notes yet/);
	modal.close();
});

test("closing the pop-up removes the chart", () => {
	const modal = open([{ tags: ["#book"], created: at(1) }]);
	modal.close();
	assert.equal(modal.contentEl.childElementCount, 0);
});
