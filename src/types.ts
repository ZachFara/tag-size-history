/** One Markdown note, as far as the chart cares. */
export interface NoteRecord {
	/** Tags as Obsidian reports them, with or without the leading `#`. */
	tags: string[];
	/** Creation time, in milliseconds since the epoch. */
	created: number;
	/** Modification time, in milliseconds since the epoch. */
	modified: number;
	/** The raw value of the frontmatter property named in the settings. Untrusted; may be anything. */
	frontmatterDate: unknown;
}

/** Which date a note starts counting toward its tags from. */
export type DateSource = "created" | "modified" | "frontmatter";

/** What the plugin saves. Read saved data through `normalizeSettings`. */
export interface Settings {
	dateSource: DateSource;
	/** The frontmatter property read when the date source is `frontmatter`. */
	frontmatterProperty: string;
	/** How many of the largest tags the chart shows. */
	topTags: number;
	/** On: nested tags count toward their top-level tag only. Off: every nested tag has its own line. */
	groupNested: boolean;
	/** Tags switched on in the pop-up, in lower case. Shown even when outside the largest tags. */
	shownTags: string[];
	/** Tags switched off in the pop-up, in lower case. Hidden even when among the largest tags. */
	hiddenTags: string[];
}

/** The part of the settings that decides which tags have a line. */
export type TagChoices = Pick<Settings, "topTags" | "shownTags" | "hiddenTags">;

/** One tag's note count over time. */
export interface TagHistory {
	/** The tag without `#`, in the first spelling seen. */
	tag: string;
	/** How many notes have the tag now. */
	total: number;
	/** `[start of day, notes with the tag by the end of that day]`, oldest first, one entry per day that added notes. */
	days: [number, number][];
}

/** The lines of the chart on one shared list of days. */
export interface ChartData {
	/** Start of each day that has a point, oldest first. */
	days: number[];
	lines: { tag: string; counts: number[] }[];
}

/** Colours and font taken from the Obsidian theme. An empty string leaves the chart's default. */
export interface ChartTheme {
	text: string;
	muted: string;
	border: string;
	background: string;
	font: string;
}
