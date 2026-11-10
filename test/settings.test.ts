import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/settings.ts";

test("missing or non-object saved data gives the defaults", () => {
	for (const raw of [undefined, null, "text", 7, []])
		assert.deepEqual(normalizeSettings(raw), DEFAULT_SETTINGS);
	assert.deepEqual(DEFAULT_SETTINGS, {
		dateSource: "created",
		frontmatterProperty: "created",
		topTags: 10,
		groupNested: true,
		shownTags: [],
		hiddenTags: [],
	});
});

test("good saved data is kept", () => {
	const saved = {
		dateSource: "frontmatter",
		frontmatterProperty: "date",
		topTags: 25,
		groupNested: false,
		shownTags: ["a"],
		hiddenTags: ["b"],
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
