import { test } from "node:test";
import assert from "node:assert/strict";
import {
	chartData,
	parseDate,
	shownHistories,
	startOfDay,
	tagHistories as historiesBy,
	toggleTag,
} from "../src/history.ts";
import type { NoteRecord } from "../src/types.ts";

/** Noon on a day of March 2024, local time. */
const march = (day: number, hour = 12): number => new Date(2024, 2, day, hour).getTime();
const day = (n: number): number => startOfDay(march(n));
const note = (created: number, ...tags: string[]): NoteRecord => ({
	tags,
	created,
	modified: created,
	frontmatterDate: undefined,
});
/** Most tests go by creation date. */
const tagHistories = (notes: NoteRecord[]): ReturnType<typeof historiesBy> =>
	historiesBy(notes, { dateSource: "created", groupNested: true });

test("a note counts toward its tag from the day it was created", () => {
	const [history] = tagHistories([note(march(1), "#book"), note(march(3), "#book"), note(march(3), "#book")]);
	assert.deepEqual(history, {
		tag: "book",
		total: 3,
		days: [
			[day(1), 1],
			[day(3), 3],
		],
	});
});

test("notes created at different times of one day share a point", () => {
	const [history] = tagHistories([note(march(1, 1), "#book"), note(march(1, 23), "#book")]);
	assert.deepEqual(history?.days, [[day(1), 2]]);
});

test("tags are ranked by note count, then by name", () => {
	const histories = tagHistories([
		note(march(1), "#b", "#c"),
		note(march(2), "#c", "#a"),
		note(march(3), "#c"),
	]);
	assert.deepEqual(
		histories.map((h) => [h.tag, h.total]),
		[
			["c", 3],
			["a", 1],
			["b", 1],
		],
	);
});

test("tags differing only in case are one tag, shown in the first spelling seen", () => {
	const histories = tagHistories([note(march(1), "#Book"), note(march(2), "#book"), note(march(3), "#BOOK")]);
	assert.deepEqual(
		histories.map((h) => [h.tag, h.total]),
		[["Book", 3]],
	);
});

test("a note counts once per tag, however often the tag appears", () => {
	const [history] = tagHistories([note(march(1), "#book", "#book", "#Book")]);
	assert.equal(history?.total, 1);
});

test("nested tags count toward their top-level tag", () => {
	const histories = tagHistories([
		note(march(1), "#project/alpha"),
		note(march(2), "#project/beta/one"),
		note(march(3), "#project", "#project/alpha"),
	]);
	assert.deepEqual(
		histories.map((h) => [h.tag, h.total]),
		[["project", 3]],
	);
});

test("tags without the leading # are accepted, and empty tags are ignored", () => {
	const histories = tagHistories([note(march(1), "book", "#", "")]);
	assert.deepEqual(
		histories.map((h) => h.tag),
		["book"],
	);
});

test("untagged notes add nothing", () => {
	assert.deepEqual(tagHistories([note(march(1))]), []);
});

test("chart data puts every line on the same days, ending today", () => {
	const histories = tagHistories([note(march(1), "#a"), note(march(3), "#b"), note(march(5), "#a")]);
	const data = chartData(histories, march(9));
	assert.deepEqual(data.days, [day(1), day(3), day(5), day(9)]);
	assert.deepEqual(data.lines, [
		{ tag: "a", counts: [1, 1, 2, 2] },
		{ tag: "b", counts: [0, 1, 1, 1] },
	]);
});

test("chart data does not repeat today when a note was created today", () => {
	const data = chartData(tagHistories([note(march(9, 8), "#a")]), march(9, 20));
	assert.deepEqual(data.days, [day(9)]);
	assert.deepEqual(data.lines, [{ tag: "a", counts: [1] }]);
});

test("the date source picks which date a note counts from", () => {
	const notes: NoteRecord[] = [
		{ tags: ["#a"], created: march(1), modified: march(7), frontmatterDate: "2024-03-04" },
	];
	const firstDay = (dateSource: Parameters<typeof historiesBy>[1]["dateSource"]): number | undefined =>
		historiesBy(notes, { dateSource, groupNested: true })[0]?.days[0]?.[0];
	assert.equal(firstDay("created"), day(1));
	assert.equal(firstDay("modified"), day(7));
	assert.equal(firstDay("frontmatter"), day(4));
});

test("a note with a missing or unreadable frontmatter date counts from its creation", () => {
	for (const frontmatterDate of [undefined, null, "soon", "", {}, ["2024-03-04"], true]) {
		const notes: NoteRecord[] = [{ tags: ["#a"], created: march(2), modified: march(9), frontmatterDate }];
		assert.equal(
			historiesBy(notes, { dateSource: "frontmatter", groupNested: true })[0]?.days[0]?.[0],
			day(2),
		);
	}
});

test("frontmatter dates are read from dates, date-times and millisecond numbers", () => {
	assert.equal(parseDate("2024-03-04"), new Date(2024, 2, 4).getTime());
	assert.equal(parseDate(" 2024-03-04 "), new Date(2024, 2, 4).getTime());
	assert.equal(parseDate("2024-03-04T15:30"), new Date(2024, 2, 4, 15, 30).getTime());
	assert.equal(parseDate(1709560800000), 1709560800000);
	assert.equal(parseDate(Number.POSITIVE_INFINITY), null);
	assert.equal(parseDate("not a date"), null);
});

/** Ranked a (3 notes), b (2), c (1). */
const RANKED = tagHistories([
	note(march(1), "#a", "#b", "#c"),
	note(march(2), "#a", "#b"),
	note(march(3), "#a"),
]);
const shownTags = (choices: Parameters<typeof shownHistories>[1]): string[] =>
	shownHistories(RANKED, choices).map((h) => h.tag);

test("the largest tags are shown, plus those switched on, minus those switched off", () => {
	assert.deepEqual(shownTags({ topTags: 2, shownTags: [], hiddenTags: [] }), ["a", "b"]);
	assert.deepEqual(shownTags({ topTags: 2, shownTags: ["c"], hiddenTags: [] }), ["a", "b", "c"]);
	assert.deepEqual(shownTags({ topTags: 2, shownTags: ["c"], hiddenTags: ["a"] }), ["b", "c"]);
	assert.deepEqual(shownTags({ topTags: 5, shownTags: [], hiddenTags: ["gone"] }), ["a", "b", "c"]);
});

test("switching a tag keeps only choices that differ from the largest tags", () => {
	const start = { topTags: 2, shownTags: [], hiddenTags: [] };
	const withC = toggleTag(RANKED, start, "c", true);
	assert.deepEqual(withC, { topTags: 2, shownTags: ["c"], hiddenTags: [] });
	assert.deepEqual(toggleTag(RANKED, withC, "c", false), start);

	const withoutA = toggleTag(RANKED, start, "A", false);
	assert.deepEqual(withoutA, { topTags: 2, shownTags: [], hiddenTags: ["a"] });
	assert.deepEqual(toggleTag(RANKED, withoutA, "a", true), start);

	assert.deepEqual(toggleTag(RANKED, start, "a", true), start);
});

test("with grouping off, a nested tag has its own line and also counts toward each parent", () => {
	const histories = historiesBy(
		[
			note(march(1), "#project/alpha"),
			note(march(2), "#project/beta/one"),
			note(march(3), "#project", "#project/alpha", "#Project/Alpha"),
		],
		{ dateSource: "created", groupNested: false },
	);
	assert.deepEqual(
		histories.map((h) => [h.tag, h.total]),
		[
			["project", 3],
			["project/alpha", 2],
			["project/beta", 1],
			["project/beta/one", 1],
		],
	);
});

test("stray slashes in a tag are ignored", () => {
	const histories = historiesBy([note(march(1), "#a//b/")], { dateSource: "created", groupNested: false });
	assert.deepEqual(
		histories.map((h) => h.tag),
		["a", "a/b"],
	);
});
