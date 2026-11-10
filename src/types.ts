/** One Markdown note, as far as the chart cares. */
export interface NoteRecord {
	/** Tags as Obsidian reports them, with or without the leading `#`. */
	tags: string[];
	/** Creation time, in milliseconds since the epoch. */
	created: number;
}

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
