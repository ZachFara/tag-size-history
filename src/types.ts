/** One Markdown note, as far as the chart cares. */
export interface NoteRecord {
	/** The note's path in the vault, such as `Folder/Note.md`. */
	path: string;
	/** Paths of the notes this note links to. */
	links: string[];
	/** Tags as Obsidian reports them, with or without the leading `#`. */
	tags: string[];
	/** Creation time, in milliseconds since the epoch. */
	created: number;
	/** Modification time, in milliseconds since the epoch. */
	modified: number;
	/** The raw value of the frontmatter property named in the settings. Untrusted; may be anything. */
	frontmatterDate: unknown;
}

/** What the chart counts: notes per tag, or notes linking to each note. */
export type Mode = "tags" | "links";

/** Which date a note starts counting from. */
export type DateSource = "created" | "modified" | "frontmatter";

/** What the plugin saves. Read saved data through `normalizeSettings`. */
export interface Settings {
	mode: Mode;
	dateSource: DateSource;
	/** The frontmatter property read when the date source is `frontmatter`. */
	frontmatterProperty: string;
	/** How many of the largest tags, or most-linked notes, the chart shows. */
	topTags: number;
	/** On: nested tags count toward their top-level tag only. Off: every nested tag has its own line. */
	groupNested: boolean;
	/** Tags switched on in the pop-up, in lower case. Shown even when outside the largest tags. */
	shownTags: string[];
	/** Tags switched off in the pop-up, in lower case. Hidden even when among the largest tags. */
	hiddenTags: string[];
	/** Notes switched on in the pop-up's links mode, by path. */
	shownNotes: string[];
	/** Notes switched off in the pop-up's links mode, by path. */
	hiddenNotes: string[];
}

/** Which lines have been switched on or off, on top of the largest `top`. */
export interface Choices {
	top: number;
	shown: string[];
	hidden: string[];
}

/** One line of the chart: a tag's note count over time, or the count of notes linking to a note. */
export interface History {
	/** What saved choices refer to: the tag in lower case, or the note's path. */
	key: string;
	/** What to show: the tag without `#` in the first spelling seen, or the note's name. */
	name: string;
	/** The count now. */
	total: number;
	/** `[start of day, count by the end of that day]`, oldest first, one entry per day that added to it. */
	days: [number, number][];
}

/** The lines of the chart on one shared list of days. */
export interface ChartData {
	/** Start of each day that has a point, oldest first. */
	days: number[];
	lines: { name: string; counts: number[] }[];
}

/** Colours and font taken from the Obsidian theme. An empty string leaves the chart's default. */
export interface ChartTheme {
	text: string;
	muted: string;
	border: string;
	background: string;
	font: string;
}
