import type { ChartData, NoteRecord, TagHistory } from "./types.ts";

/** The start of the local calendar day that `ms` falls in. */
export function startOfDay(ms: number): number {
	const d = new Date(ms);
	return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** `#Project/Alpha` becomes `Project`: no `#`, top-level part only. Empty when there is nothing left. */
function topLevelTag(raw: string): string {
	const tag = raw.startsWith("#") ? raw.slice(1) : raw;
	return tag.split("/")[0] ?? "";
}

interface Tally {
	tag: string;
	/** Notes added per day. */
	added: Map<number, number>;
}

function tally(notes: NoteRecord[]): Map<string, Tally> {
	const tallies = new Map<string, Tally>();
	for (const note of notes) {
		const day = startOfDay(note.created);
		const seen = new Set<string>();
		for (const raw of note.tags) {
			const tag = topLevelTag(raw);
			const key = tag.toLowerCase();
			if (tag === "" || seen.has(key)) continue;
			seen.add(key);
			const entry = tallies.get(key) ?? { tag, added: new Map<number, number>() };
			entry.added.set(day, (entry.added.get(day) ?? 0) + 1);
			tallies.set(key, entry);
		}
	}
	return tallies;
}

function toHistory({ tag, added }: Tally): TagHistory {
	let total = 0;
	const days = [...added.entries()]
		.sort(([a], [b]) => a - b)
		.map(([day, count]): [number, number] => {
			total += count;
			return [day, total];
		});
	return { tag, total, days };
}

/**
 * Each tag's note count over time, largest tag first and then by name.
 * A note counts toward a tag from the day it was created. Tags differing only in case are one tag.
 */
export function tagHistories(notes: NoteRecord[]): TagHistory[] {
	return [...tally(notes).values()]
		.map(toHistory)
		.sort((a, b) => b.total - a.total || a.tag.localeCompare(b.tag));
}

/** A tag's count on each of `days`, carrying the last count forward. Zero before its first note. */
function countsOn(history: TagHistory, days: number[]): number[] {
	let next = 0;
	let count = 0;
	return days.map((day) => {
		for (let entry = history.days[next]; entry && entry[0] <= day; entry = history.days[next]) {
			count = entry[1];
			next += 1;
		}
		return count;
	});
}

/** Puts the given tags on one shared list of days, ending today, so every line has a point on every day. */
export function chartData(histories: TagHistory[], now: number): ChartData {
	const all = new Set<number>([startOfDay(now)]);
	for (const history of histories) for (const [day] of history.days) all.add(day);
	const days = [...all].sort((a, b) => a - b);
	return { days, lines: histories.map((h) => ({ tag: h.tag, counts: countsOn(h, days) })) };
}
