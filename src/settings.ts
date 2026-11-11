import type { Choices, DateSource, Mode, Settings } from "./types.ts";

export const DEFAULT_SETTINGS: Settings = {
	mode: "tags",
	dateSource: "created",
	frontmatterProperty: "created",
	topTags: 10,
	groupNested: true,
	shownTags: [],
	hiddenTags: [],
	shownNotes: [],
	hiddenNotes: [],
};

export const MIN_TOP_TAGS = 1;
export const MAX_TOP_TAGS = 50;

const DATE_SOURCES: readonly string[] = ["created", "modified", "frontmatter"] satisfies DateSource[];

function dateSource(value: unknown): DateSource {
	return DATE_SOURCES.includes(value as string) ? (value as DateSource) : DEFAULT_SETTINGS.dateSource;
}

function propertyName(value: unknown): string {
	const name = typeof value === "string" ? value.trim() : "";
	return name === "" ? DEFAULT_SETTINGS.frontmatterProperty : name;
}

function topTags(value: unknown): number {
	if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_SETTINGS.topTags;
	return Math.min(MAX_TOP_TAGS, Math.max(MIN_TOP_TAGS, Math.round(value)));
}

/** A list of tags in lower case, without repeats. Anything that is not text is dropped. */
function tagList(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	const tags = value
		.filter((v): v is string => typeof v === "string" && v !== "")
		.map((v) => v.toLowerCase());
	return [...new Set(tags)];
}

/** A list of note paths, without repeats. Paths keep their case. Anything that is not text is dropped. */
function pathList(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return [...new Set(value.filter((v): v is string => typeof v === "string" && v !== ""))];
}

function mode(value: unknown): Mode {
	return value === "links" ? "links" : DEFAULT_SETTINGS.mode;
}

/** The lines switched on and off in the mode the settings are in. */
export function choicesOf(settings: Settings): Choices {
	return settings.mode === "tags"
		? { top: settings.topTags, shown: settings.shownTags, hidden: settings.hiddenTags }
		: { top: settings.topTags, shown: settings.shownNotes, hidden: settings.hiddenNotes };
}

/** The settings with new choices for the mode they are in. The other mode's choices are kept. */
export function withChoices(settings: Settings, choices: Choices): Settings {
	return settings.mode === "tags"
		? { ...settings, shownTags: choices.shown, hiddenTags: choices.hidden }
		: { ...settings, shownNotes: choices.shown, hiddenNotes: choices.hidden };
}

/** Turns saved data, which may be missing, old or hand-edited, into settings. Anything wrong becomes the default. */
export function normalizeSettings(raw: unknown): Settings {
	const saved = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
	return {
		mode: mode(saved.mode),
		dateSource: dateSource(saved.dateSource),
		frontmatterProperty: propertyName(saved.frontmatterProperty),
		topTags: topTags(saved.topTags),
		groupNested: typeof saved.groupNested === "boolean" ? saved.groupNested : DEFAULT_SETTINGS.groupNested,
		shownTags: tagList(saved.shownTags),
		hiddenTags: tagList(saved.hiddenTags),
		shownNotes: pathList(saved.shownNotes),
		hiddenNotes: pathList(saved.hiddenNotes),
	};
}
