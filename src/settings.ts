import type { DateSource, Settings } from "./types.ts";

export const DEFAULT_SETTINGS: Settings = {
	dateSource: "created",
	frontmatterProperty: "created",
	topTags: 10,
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

/** Turns saved data, which may be missing, old or hand-edited, into settings. Anything wrong becomes the default. */
export function normalizeSettings(raw: unknown): Settings {
	const saved = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
	return {
		dateSource: dateSource(saved.dateSource),
		frontmatterProperty: propertyName(saved.frontmatterProperty),
		topTags: topTags(saved.topTags),
	};
}
