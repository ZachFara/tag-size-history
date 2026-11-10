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

/** What the pop-up saved, oldest first. */
const saved: Settings[] = [];
const save = (settings: Settings): Promise<void> => {
	saved.push(settings);
	return Promise.resolve();
};

function open(tagged: Tagged[], settings: Settings = DEFAULT_SETTINGS): ModalClass {
	const notes = tagged.map((n) => ({ ...n, modified: n.created, frontmatterDate: undefined }));
	const modal = new TagHistoryModal(APP, notes, settings, save);
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
	const modal = new TagHistoryModal(APP, notes, { ...DEFAULT_SETTINGS, dateSource: "frontmatter" }, save);
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

/** Three tags: big (3 notes), mid (2), small (1). */
const THREE: Tagged[] = [
	{ tags: ["#big", "#mid", "#small"], created: at(1) },
	{ tags: ["#big", "#mid"], created: at(2) },
	{ tags: ["#big"], created: at(3) },
];
const TOP_TWO: Settings = { ...DEFAULT_SETTINGS, topTags: 2 };

/** The tag panel's rows as `[tag, count, checked]`. */
function rows(modal: ModalClass): [string, string, boolean][] {
	return [...modal.contentEl.querySelectorAll(".tag-size-history-tag")].map((row) => [
		row.querySelector(".tag-size-history-name")?.textContent ?? "",
		row.querySelector(".tag-size-history-count")?.textContent ?? "",
		row.querySelector("input")?.checked ?? false,
	]);
}

function checkbox(modal: ModalClass, tag: string): HTMLInputElement {
	const row = [...modal.contentEl.querySelectorAll(".tag-size-history-tag")].find(
		(r) => r.querySelector(".tag-size-history-name")?.textContent === tag,
	);
	const box = row?.querySelector("input");
	assert.ok(box, `no checkbox for ${tag}`);
	return box;
}

test("the tag panel lists every tag with its count, largest first, with the shown ones checked", () => {
	const modal = open(THREE, TOP_TWO);
	assert.deepEqual(rows(modal), [
		["#big", "3", true],
		["#mid", "2", true],
		["#small", "1", false],
	]);
	modal.close();
});

test("checking a tag outside the largest adds its line and saves the choice", () => {
	const modal = open(THREE, TOP_TWO);
	assert.doesNotMatch(chartText(modal), /#small/);
	checkbox(modal, "#small").click();
	assert.match(chartText(modal), /#small/);
	assert.deepEqual(saved.at(-1), { ...TOP_TWO, shownTags: ["small"], hiddenTags: [] });
	assert.equal(checkbox(modal, "#small").checked, true);
	modal.close();
});

test("unchecking one of the largest tags removes its line and saves the choice", () => {
	const modal = open(THREE, TOP_TWO);
	checkbox(modal, "#big").click();
	assert.doesNotMatch(chartText(modal), /#big/);
	assert.match(chartText(modal), /#mid/);
	assert.deepEqual(saved.at(-1), { ...TOP_TWO, shownTags: [], hiddenTags: ["big"] });
	modal.close();
});

test("saved choices are applied when the pop-up opens", () => {
	const modal = open(THREE, { ...TOP_TWO, shownTags: ["small"], hiddenTags: ["big"] });
	assert.deepEqual(
		rows(modal).map(([tag, , checked]) => [tag, checked]),
		[
			["#big", false],
			["#mid", true],
			["#small", true],
		],
	);
	assert.doesNotMatch(chartText(modal), /#big/);
	modal.close();
});

test("reset goes back to the largest tags and saves that", () => {
	const modal = open(THREE, { ...TOP_TWO, shownTags: ["small"], hiddenTags: ["big"] });
	modal.contentEl.querySelector<HTMLButtonElement>(".tag-size-history-reset")?.click();
	assert.deepEqual(
		rows(modal).map(([, , checked]) => checked),
		[true, true, false],
	);
	assert.match(chartText(modal), /#big/);
	assert.doesNotMatch(chartText(modal), /#small/);
	assert.deepEqual(saved.at(-1), TOP_TWO);
	modal.close();
});

test("the filter narrows the list without changing the chart", () => {
	const modal = open(THREE, TOP_TWO);
	const search = modal.contentEl.querySelector<HTMLInputElement>(".tag-size-history-search");
	assert.ok(search);
	search.value = " MI ";
	search.dispatchEvent(new window.Event("input"));
	assert.deepEqual(
		rows(modal).map(([tag]) => tag),
		["#mid"],
	);
	assert.match(chartText(modal), /#big/);
	modal.close();
});
