import { test } from "node:test";
import assert from "node:assert/strict";
import { chartData, startOfDay, tagHistories } from "../src/history.ts";
import type { NoteRecord } from "../src/types.ts";

/** Noon on a day of March 2024, local time. */
const march = (day: number, hour = 12): number => new Date(2024, 2, day, hour).getTime();
const day = (n: number): number => startOfDay(march(n));
const note = (created: number, ...tags: string[]): NoteRecord => ({ tags, created });

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
