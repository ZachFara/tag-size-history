import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, choicesOf, normalizeSettings, withChoices } from "../src/settings.ts";

test("missing or non-object saved data gives the defaults", () => {
	for (const raw of [undefined, null, "text", 7, []])
		assert.deepEqual(normalizeSettings(raw), DEFAULT_SETTINGS);
	assert.deepEqual(DEFAULT_SETTINGS, {
		mode: "tags",
		dateSource: "created",
		frontmatterProperty: "created",
		topTags: 10,
		groupNested: true,
		shownTags: [],
		hiddenTags: [],
		shownNotes: [],
		hiddenNotes: [],
	});
});

test("good saved data is kept", () => {
	const saved = {
		mode: "links",
		dateSource: "frontmatter",
		frontmatterProperty: "date",
		topTags: 25,
		groupNested: false,
		shownTags: ["a"],
		hiddenTags: ["b"],
		shownNotes: ["Folder/Note.md"],
		hiddenNotes: ["Hub.md"],
	};
	assert.deepEqual(normalizeSettings(saved), saved);
});

test("an unknown date source falls back to created", () => {
	assert.equal(normalizeSettings({ dateSource: "birthday" }).dateSource, "created");
	assert.equal(normalizeSettings({ dateSource: 3 }).dateSource, "created");
});

test("the property name is trimmed, and an empty or non-text one falls back", () => {
	assert.equal(normalizeSettings({ frontmatterProperty: "  date " }).frontmatterProperty, "date");
	assert.equal(normalizeSettings({ frontmatterProperty: "   " }).frontmatterProperty, "created");
	assert.equal(normalizeSettings({ frontmatterProperty: 5 }).frontmatterProperty, "created");
});

test("the number of tags is a whole number from 1 to 50", () => {
	assert.equal(normalizeSettings({ topTags: 0 }).topTags, 1);
	assert.equal(normalizeSettings({ topTags: -4 }).topTags, 1);
	assert.equal(normalizeSettings({ topTags: 500 }).topTags, 50);
	assert.equal(normalizeSettings({ topTags: 7.6 }).topTags, 8);
	assert.equal(normalizeSettings({ topTags: "12" }).topTags, 10);
	assert.equal(normalizeSettings({ topTags: Number.NaN }).topTags, 10);
});

test("unknown keys are dropped", () => {
	assert.deepEqual(normalizeSettings({ topTags: 3, extra: "x" }), { ...DEFAULT_SETTINGS, topTags: 3 });
});

test("tag choices are lower-cased lists of text without repeats, and anything else is dropped", () => {
	const settings = normalizeSettings({
		shownTags: ["Book", "book", 4, "", null, "film"],
		hiddenTags: "book",
	});
	assert.deepEqual(settings.shownTags, ["book", "film"]);
	assert.deepEqual(settings.hiddenTags, []);
});

test("group nested tags is on unless saved as exactly false", () => {
	assert.equal(normalizeSettings({ groupNested: false }).groupNested, false);
	assert.equal(normalizeSettings({ groupNested: "false" }).groupNested, true);
	assert.equal(normalizeSettings({ groupNested: 0 }).groupNested, true);
});

test("an unknown mode falls back to tags", () => {
	assert.equal(normalizeSettings({ mode: "links" }).mode, "links");
	assert.equal(normalizeSettings({ mode: "files" }).mode, "tags");
});

test("note choices are lists of paths that keep their case, without repeats", () => {
	const settings = normalizeSettings({ shownNotes: ["Hub.md", "Hub.md", "hub.md", 3, ""], hiddenNotes: {} });
	assert.deepEqual(settings.shownNotes, ["Hub.md", "hub.md"]);
	assert.deepEqual(settings.hiddenNotes, []);
});

test("each mode has its own choices, and changing one leaves the other alone", () => {
	const tags = { ...DEFAULT_SETTINGS, topTags: 3, shownTags: ["a"], hiddenNotes: ["Hub.md"] };
	assert.deepEqual(choicesOf(tags), { top: 3, shown: ["a"], hidden: [] });
	const links = { ...tags, mode: "links" as const };
	assert.deepEqual(choicesOf(links), { top: 3, shown: [], hidden: ["Hub.md"] });

	const changed = withChoices(links, { top: 3, shown: ["New.md"], hidden: [] });
	assert.deepEqual(changed.shownNotes, ["New.md"]);
	assert.deepEqual(changed.hiddenNotes, []);
	assert.deepEqual(changed.shownTags, ["a"]);
	assert.deepEqual(withChoices(tags, { top: 3, shown: [], hidden: ["a"] }).hiddenNotes, ["Hub.md"]);
});
