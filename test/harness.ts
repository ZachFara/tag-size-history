// Loads a source module with `obsidian` pointed at the stub, under jsdom, so UI code can be tested.
import { build } from "esbuild";
import { JSDOM, VirtualConsole } from "jsdom";
import { mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomHelpers } from "./obsidian-stub.ts";

let ready = false;

/** jsdom lays nothing out, so every element reports the size the chart is given in the pop-up. */
function giveElementsASize(win: Window & typeof globalThis): void {
	Object.defineProperties(win.HTMLElement.prototype, {
		clientWidth: { get: () => 900 },
		clientHeight: { get: () => 600 },
	});
}

/** Reports once when it starts observing, as a browser's does, and never again: jsdom resizes nothing. */
class ResizeObserverStub {
	private readonly report: () => void;

	constructor(report: () => void) {
		this.report = report;
	}

	observe(): void {
		this.report();
	}

	disconnect(): void {
		// nothing more will be reported
	}
}

function installDom(): void {
	if (ready) return;
	// A virtual console that forwards nothing: jsdom has no canvas and says so each time ECharts
	// asks for one to measure text. ECharts then estimates, which is enough for these tests.
	const dom = new JSDOM("<!doctype html><body></body>", {
		pretendToBeVisual: true,
		virtualConsole: new VirtualConsole(),
	});
	const win = dom.window as unknown as Window & typeof globalThis;
	Object.assign(globalThis, {
		window: win,
		document: win.document,
		getComputedStyle: win.getComputedStyle.bind(win),
		ResizeObserver: ResizeObserverStub,
	});
	installDomHelpers(win);
	giveElementsASize(win);
	ready = true;
}

/** Bundles `entry` (a path from the repo root, such as src/history-modal.ts) and returns its exports. */
export async function loadModule<T>(entry: string): Promise<T> {
	const out = join(mkdtempSync(join(tmpdir(), "tag-size-history-")), "bundle.cjs");
	await build({
		entryPoints: [entry],
		bundle: true,
		format: "cjs",
		outfile: out,
		logLevel: "silent",
		alias: { obsidian: new URL("./obsidian-stub.ts", import.meta.url).pathname },
	});
	installDom();
	return createRequire(import.meta.url)(out) as T;
}
