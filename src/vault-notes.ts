import { getAllTags } from "obsidian";
import type { App } from "obsidian";
import type { NoteRecord } from "./types.ts";

/** Every Markdown note in the vault with its tags (inline and frontmatter) and creation time. */
export function readNotes(app: App): NoteRecord[] {
	return app.vault.getMarkdownFiles().map((file) => {
		const cache = app.metadataCache.getFileCache(file);
		return { tags: (cache && getAllTags(cache)) ?? [], created: file.stat.ctime };
	});
}
