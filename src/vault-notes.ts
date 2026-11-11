import { getAllTags } from "obsidian";
import type { App } from "obsidian";
import type { NoteRecord } from "./types.ts";

/**
 * Every Markdown note in the vault with its tags (inline and frontmatter), the notes it links to,
 * its file times, and the raw value of the frontmatter property `dateProperty`.
 */
export function readNotes(app: App, dateProperty: string): NoteRecord[] {
	return app.vault.getMarkdownFiles().map((file) => {
		const cache = app.metadataCache.getFileCache(file);
		const frontmatter: Record<string, unknown> | undefined = cache?.frontmatter;
		const links: Record<string, number> | undefined = app.metadataCache.resolvedLinks[file.path];
		return {
			path: file.path,
			links: Object.keys(links ?? {}).filter((target) => target.endsWith(".md")),
			tags: (cache && getAllTags(cache)) ?? [],
			created: file.stat.ctime,
			modified: file.stat.mtime,
			frontmatterDate: frontmatter?.[dateProperty],
		};
	});
}
