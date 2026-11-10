import { test } from "node:test";
import assert from "node:assert/strict";
import type { App } from "obsidian";
import { loadModule } from "./harness.ts";
import type { TagHistoryModal as ModalClass } from "../src/history-modal.ts";
import type { NoteRecord } from "../src/types.ts";

const { TagHistoryModal } = await loadModule<{ TagHistoryModal: typeof ModalClass }>("src/history-modal.ts");

const APP = {} as App;
const at = (day: number): number => new Date(2024, 2, day, 12).getTime();

function open(notes: NoteRecord[]): ModalClass {
	const modal = new TagHistoryModal(APP, notes);
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
	const notes: NoteRecord[] = [];
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
