import type { ChartData, Choices, DateSource, History, NoteRecord } from "./types.ts";

/** The start of the local calendar day that `ms` falls in. */
export function startOfDay(ms: number): number {
	const d = new Date(ms);
	return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Reads a date out of a frontmatter value, which may be anything. Accepts a number of milliseconds,
 * a `YYYY-MM-DD` date (taken as local) or any text JavaScript can parse as a date. Null otherwise.
 */
export function parseDate(value: unknown): number | null {
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (typeof value !== "string") return null;
	const text = value.trim();
	const parts = DATE_ONLY.exec(text);
	const ms = parts
		? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])).getTime()
		: Date.parse(text);
	return Number.isNaN(ms) ? null : ms;
}

/** The date a note starts counting from. A missing or unreadable frontmatter date falls back to creation. */
function noteDate(note: NoteRecord, source: DateSource): number {
	if (source === "modified") return note.modified;
	if (source === "frontmatter") return parseDate(note.frontmatterDate) ?? note.created;
	return note.created;
}

/**
 * The tags a note's tag counts toward, without `#`.
 * Grouped: `#Project/Alpha` counts toward `Project` only.
 * Not grouped: it counts toward `Project/Alpha` and toward `Project`, as in Obsidian's tag pane.
 */
function countedTags(raw: string, groupNested: boolean): string[] {
	const parts = (raw.startsWith("#") ? raw.slice(1) : raw).split("/").filter((part) => part !== "");
	const paths = parts.map((_, i) => parts.slice(0, i + 1).join("/"));
	return groupNested ? paths.slice(0, 1) : paths;
}

/** How notes are turned into tag counts. */
export interface CountOptions {
	dateSource: DateSource;
	groupNested: boolean;
}

interface Tally {
	key: string;
	name: string;
	/** Notes added per day. */
	added: Map<number, number>;
}

/** The tags one note counts toward, keyed in lower case so each counts once, with the spelling to show. */
function noteTags(note: NoteRecord, groupNested: boolean): Map<string, string> {
	const tags = new Map<string, string>();
	for (const raw of note.tags) {
		for (const tag of countedTags(raw, groupNested)) {
			if (!tags.has(tag.toLowerCase())) tags.set(tag.toLowerCase(), tag);
		}
	}
	return tags;
}

/** The notes one note links to, each once, leaving out a link to itself. */
function noteLinks(note: NoteRecord): Map<string, string> {
	const links = new Map<string, string>();
	for (const target of note.links) if (target !== note.path) links.set(target, target);
	return links;
}

/** Counts each note, on its day, toward everything `subjects` says it counts toward. */
function tally(
	notes: NoteRecord[],
	dateSource: DateSource,
	subjects: (note: NoteRecord) => Map<string, string>,
): Tally[] {
	const tallies = new Map<string, Tally>();
	for (const note of notes) {
		const day = startOfDay(noteDate(note, dateSource));
		for (const [key, name] of subjects(note)) {
			const entry = tallies.get(key) ?? { key, name, added: new Map<number, number>() };
			entry.added.set(day, (entry.added.get(day) ?? 0) + 1);
			tallies.set(key, entry);
		}
	}
	return [...tallies.values()];
}

function toHistory({ key, name, added }: Tally): History {
	let total = 0;
	const days = [...added.entries()]
		.sort(([a], [b]) => a - b)
		.map(([day, count]): [number, number] => {
			total += count;
			return [day, total];
		});
	return { key, name, total, days };
}

/** Largest first, then by name. */
function ranked(histories: History[]): History[] {
	return histories.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

/**
 * Each tag's note count over time, largest tag first and then by name.
 * A note counts toward a tag from its date. Tags differing only in case are one tag.
 */
export function tagHistories(notes: NoteRecord[], options: CountOptions): History[] {
	return ranked(
		tally(notes, options.dateSource, (note) => noteTags(note, options.groupNested)).map(toHistory),
	);
}

/** `Folder/Note.md` becomes `Note`. */
function noteName(path: string): string {
	const file = path.slice(path.lastIndexOf("/") + 1);
	return file.endsWith(".md") ? file.slice(0, -3) : file;
}

/**
 * For each note that is linked to, the number of notes linking to it over time, most-linked first.
 * A linking note counts from its own date, and once however many links it has to the same note.
 * Notes are shown by name, or by path when two linked notes share a name.
 */
export function linkHistories(notes: NoteRecord[], dateSource: DateSource): History[] {
	const histories = tally(notes, dateSource, noteLinks).map(toHistory);
	const uses = new Map<string, number>();
	for (const { key } of histories) uses.set(noteName(key), (uses.get(noteName(key)) ?? 0) + 1);
	const named = histories.map((history) => {
		const name = noteName(history.key);
		return { ...history, name: uses.get(name) === 1 ? name : history.key.replace(/\.md$/, "") };
	});
	return ranked(named);
}

/**
 * The lines that are shown: the largest `top` of the ranked `histories`, plus those switched on,
 * minus those switched off.
 */
export function shownHistories(histories: History[], choices: Choices): History[] {
	const on = new Set(choices.shown);
	const off = new Set(choices.hidden);
	return histories.filter(({ key }, rank) => (rank < choices.top || on.has(key)) && !off.has(key));
}

/** The choices after switching one line on or off. Only a choice that differs from the largest is kept. */
export function toggleLine(histories: History[], choices: Choices, key: string, on: boolean): Choices {
	const inTop = histories.slice(0, choices.top).some((h) => h.key === key);
	const shown = choices.shown.filter((k) => k !== key);
	const hidden = choices.hidden.filter((k) => k !== key);
	if (on && !inTop) shown.push(key);
	if (!on && inTop) hidden.push(key);
	return { top: choices.top, shown, hidden };
}

/** A line's count on each of `days`, carrying the last count forward. Zero before its first note. */
function countsOn(history: History, days: number[]): number[] {
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

/**
 * Puts the `shown` lines on one shared list of days, ending today, so every line has a point on every day.
 * `all` is every line, largest first; a line's place in it is its rank.
 */
export function chartData(shown: History[], all: History[], now: number): ChartData {
	const days = new Set<number>([startOfDay(now)]);
	for (const history of shown) for (const [day] of history.days) days.add(day);
	const sorted = [...days].sort((a, b) => a - b);
	const ranks = new Map(all.map((history, rank) => [history.key, rank]));
	return {
		days: sorted,
		lines: shown.map((h) => ({ name: h.name, rank: ranks.get(h.key) ?? 0, counts: countsOn(h, sorted) })),
	};
}
