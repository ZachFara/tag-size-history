// Runs the plugin in a real Obsidian and checks the main features. Not part of `make check`,
// because CI has no Obsidian. Usage: make obsidian-check, or node scripts/obsidian-check.mjs --readme
// to also refresh the README pictures in docs/images/.
//
// The --readme run also records docs/images/demo.gif, which needs ffmpeg on the PATH.
//
// It builds the plugin, makes a throwaway vault and a throwaway Obsidian profile in a temp
// folder, starts a separate Obsidian with a debugging port, drives it, writes screenshots to
// .scratch/obsidian-check/, and closes that Obsidian again. The owner's own Obsidian and vaults
// are never touched. Set OBSIDIAN_BIN to use an Obsidian somewhere other than /Applications.
import { execFileSync, spawn } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { get } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const ID = "tag-size-history";
const BIN = process.env.OBSIDIAN_BIN ?? "/Applications/Obsidian.app/Contents/MacOS/Obsidian";
const PORT = 9400 + Math.floor(Math.random() * 400);
const OUT = join(ROOT, ".scratch", "obsidian-check");
/** With --readme, also saves cropped pictures of the plugin to docs/images/ for the README. */
const README = process.argv.includes("--readme");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DAY = 24 * 60 * 60 * 1000;

/**
 * The sample vault's tags: how many notes each gets and over which part of the last two years
 * (0 is two years ago, 1 is today). Thirteen top-level tags, so the default of ten leaves three off.
 */
const TAGS = [
	{ tag: "project/alpha", notes: 60, from: 0.0, to: 0.6 },
	{ tag: "project/beta", notes: 45, from: 0.5, to: 1.0 },
	{ tag: "book", notes: 80, from: 0.0, to: 1.0 },
	{ tag: "idea", notes: 70, from: 0.2, to: 1.0 },
	{ tag: "meeting", notes: 55, from: 0.4, to: 1.0 },
	{ tag: "person", notes: 40, from: 0.0, to: 0.9 },
	{ tag: "recipe", notes: 34, from: 0.3, to: 0.8 },
	{ tag: "travel", notes: 28, from: 0.1, to: 1.0 },
	{ tag: "health", notes: 24, from: 0.6, to: 1.0 },
	{ tag: "finance", notes: 20, from: 0.0, to: 1.0 },
	{ tag: "music", notes: 16, from: 0.7, to: 1.0 },
	{ tag: "film", notes: 6, from: 0.2, to: 0.9 },
	{ tag: "garden", notes: 4, from: 0.5, to: 0.7 },
	{ tag: "quote", notes: 2, from: 0.8, to: 0.9 },
];
const SPAN = 730 * DAY;

/** Notes that the sample notes link to. Every note of a tag links to that tag's hub, and some link Home. */
const HUBS = ["Reading list", "Projects", "People", "Ideas", "Weekly review"];
/** How many notes link to each hub, filled in as the notes are written. */
const LINKED = new Map();
/** A linked note with a name far wider than the panel. The panel must cut it short, not grow to fit it. */
const LONG_NAME =
	"A note with a very long name that goes on and on well past the width of the panel beside the chart";

/** Repeatable pseudo-random numbers, so every run draws the same chart shape. */
function random(seed) {
	let state = seed;
	return () => {
		state = (state * 1664525 + 1013904223) % 4294967296;
		return state / 4294967296;
	};
}

/**
 * Writes the sample notes. Each note's file times are set to its date: on macOS, setting a
 * modification time earlier than the creation time moves the creation time back with it, which
 * is what lets a fresh vault have a history. One extra note has an old date in its frontmatter.
 */
function writeNotes(vault) {
	const next = random(7);
	const coin = random(11);
	const start = Date.now() - SPAN;
	let count = 0;
	for (const [index, { tag, notes, from, to }] of TAGS.entries()) {
		for (let i = 0; i < notes; i++) {
			const when = new Date(start + (from + (to - from) * next()) * SPAN);
			const path = join(vault, `Note ${String(++count).padStart(3, "0")}.md`);
			const hubs = [HUBS[index % HUBS.length], ...(coin() < 0.3 ? ["Home"] : [])];
			for (const hub of hubs) LINKED.set(hub, (LINKED.get(hub) ?? 0) + 1);
			writeFileSync(
				path,
				`A sample note. See ${hubs.map((hub) => `[[${hub}]]`).join(" and ")}.\n\n#${tag}\n`,
			);
			utimesSync(path, when, when);
		}
	}
	for (const hub of [...HUBS, "Home"]) writeFileSync(join(vault, `${hub}.md`), `The ${hub} note.\n`);
	writeFileSync(join(vault, "Old book.md"), "---\ncreated: 2019-05-01\ntags: [book]\n---\nAn old one.\n");
	writeFileSync(join(vault, "Untagged.md"), `No tags here. See [[${LONG_NAME}]].\n`);
	writeFileSync(join(vault, `${LONG_NAME}.md`), "A note with a long name.\n");
	LINKED.set(LONG_NAME, 1);
}

/** A fresh vault with sample notes, and a profile that opens only it. */
function stage() {
	const base = mkdtempSync(join(tmpdir(), `${ID}-check-`));
	const vault = join(base, "vault");
	mkdirSync(join(vault, ".obsidian"), { recursive: true });
	writeNotes(vault);
	const profile = join(base, "profile");
	mkdirSync(profile);
	const vaults = { checkvault0000001: { path: vault, ts: Date.now(), open: true } };
	writeFileSync(join(profile, "obsidian.json"), JSON.stringify({ vaults }));
	return { base, profile, vault };
}

/**
 * Copies the built plugin into the vault once Obsidian is running. A vault that already has plugins
 * when it is first opened makes Obsidian ask whether to trust its author, which would block the run.
 */
function installPlugin(vault) {
	const plugin = join(vault, ".obsidian", "plugins", ID);
	mkdirSync(plugin, { recursive: true });
	for (const f of ["main.js", "manifest.json", "styles.css"]) copyFileSync(join(ROOT, f), join(plugin, f));
}

/** Reads JSON over plain HTTP from the debugging port. */
function getJson(url) {
	return new Promise((resolveJson, reject) => {
		get(url, (res) => {
			let body = "";
			res.on("data", (chunk) => (body += chunk));
			res.on("end", () => {
				try {
					resolveJson(JSON.parse(body));
				} catch (err) {
					reject(err);
				}
			});
		}).on("error", reject);
	});
}

/** A tiny client for the Chrome DevTools protocol on the throwaway Obsidian. */
async function connect() {
	for (let i = 0; i < 60; i++) {
		try {
			const targets = await getJson(`http://127.0.0.1:${String(PORT)}/json`);
			const page = targets.find((t) => t.type === "page" && t.url.startsWith("app://"));
			if (page) return open(page.webSocketDebuggerUrl);
		} catch {
			// Obsidian is still starting.
		}
		await sleep(500);
	}
	throw new Error("Obsidian did not open a debugging port.");
}

async function open(url) {
	const ws = new WebSocket(url);
	await new Promise((r) => (ws.onopen = r));
	let id = 0;
	const pending = new Map();
	ws.onmessage = (m) => {
		const d = JSON.parse(m.data);
		pending.get(d.id)?.(d);
		pending.delete(d.id);
	};
	const send = (method, params = {}) =>
		new Promise((r) => {
			pending.set(++id, r);
			ws.send(JSON.stringify({ id, method, params }));
		});
	const run = async (expression) => {
		const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
		if (r.result?.exceptionDetails)
			throw new Error(r.result.exceptionDetails.exception?.description ?? "script failed");
		return r.result?.result?.value;
	};
	const shot = async (path, clip, scale = 1) => {
		const r = await send("Page.captureScreenshot", {
			format: "png",
			...(clip ? { clip: { ...clip, scale } } : {}),
		});
		writeFileSync(path, Buffer.from(r.result.data, "base64"));
	};
	/** A fixed viewport so pictures are the same size on every machine. */
	const emulate = () =>
		send("Emulation.setDeviceMetricsOverride", {
			width: 1400,
			height: 900,
			deviceScaleFactor: 2,
			mobile: false,
		});
	/** A quick picture of the whole page. Unlike a clipped one, it does not disturb the page's size. */
	const frame = async (path) => {
		const r = await send("Page.captureScreenshot", { format: "jpeg", quality: 92 });
		writeFileSync(path, Buffer.from(r.result.data, "base64"));
	};
	return { run, shot, frame, emulate, close: () => ws.close() };
}

// Helpers every check can use, run inside Obsidian.
const PRELUDE = `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const all = (s) => [...document.querySelectorAll(s)];
const plugin = app.plugins.plugins["${ID}"];
const closeAll = async () => { app.setting.close(); all(".modal-container .modal-bg").forEach((b) => b.click());
  all(".modal-close-button").forEach((b) => b.click()); await sleep(300); };
const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
const settingNames = () => [...app.setting.activeTab.containerEl.querySelectorAll(".setting-item")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.querySelector(".setting-item-name")?.textContent);
const openChart = async () => { await closeAll(); app.commands.executeCommandById("${ID}:open"); await sleep(1500); };
const chartText = () => all(".tag-size-history-chart svg text").map((t) => t.textContent);
const lines = () => chartText().filter((t) => t.startsWith("#"));
const rows = () => all(".tag-size-history-tag").map((r) => ({ tag: r.querySelector(".tag-size-history-name").textContent,
  count: Number(r.querySelector(".tag-size-history-count").textContent), on: r.querySelector("input").checked }));
const box = (tag) => all(".tag-size-history-tag").find((r) => r.querySelector(".tag-size-history-name").textContent === tag).querySelector("input");
const clipOf = (s) => rectOf(document.querySelector(s));
const hover = async (fx, fy) => { const svg = document.querySelector(".tag-size-history-chart svg"); const r = svg.getBoundingClientRect();
  const at = { clientX: r.x + r.width * fx, clientY: r.y + r.height * fy, bubbles: true };
  svg.dispatchEvent(new MouseEvent("mousemove", at)); await sleep(600); };
const hoverNow = (fx) => { const svg = document.querySelector(".tag-size-history-chart svg"); const r = svg.getBoundingClientRect();
  svg.dispatchEvent(new MouseEvent("mousemove", { clientX: r.x + r.width * fx, clientY: r.y + r.height * 0.5, bubbles: true })); };
const defaults = async () => { const tab = app.setting.pluginTabs.find((t) => t.id === "${ID}");
  await tab.setControlValue("dateSource", "created"); await tab.setControlValue("groupNested", true); await tab.setControlValue("mode", "tags");
  for (const key of ["shownTags", "hiddenTags", "shownNotes", "hiddenNotes"]) await tab.setControlValue(key, []); };
const modeButton = (text) => all(".tag-size-history-modes button").find((b) => b.textContent === text);`;

const CHECKS = [
	{
		// The default: the ten largest tags by creation date, nested tags grouped.
		name: "chart",
		script: `await openChart(); return { title: chartText().includes("Tag size history"), lines: lines(), rows: rows(),
  width: clipOf(".tag-size-history-chart").width, open: all(".tag-size-history-modal").length };`,
		expect: (r) =>
			r.title &&
			r.lines.length === 10 &&
			r.lines[0] === "#project" &&
			r.rows.length === 13 &&
			r.rows[0].count === 105 &&
			r.rows.find((row) => row.tag === "#book").count === 81 &&
			r.rows.filter((row) => row.on).length === 10 &&
			r.width > 600 &&
			r.open === 1,
	},
	{
		// The lines draw in from the left when the pop-up opens: early on they cover less than later.
		name: "grows",
		script: `await closeAll(); app.commands.executeCommandById("${ID}:open"); await sleep(250);
const drawn = () => Math.max(0, ...all(".tag-size-history-chart svg clipPath *").map((e) => e.getBBox().width));
const early = drawn(); await sleep(2200); return { early, late: drawn() };`,
		expect: (r) => r.early > 0 && r.early < r.late,
	},
	{
		// Hovering lists every line's count on that date, as Vault Size History does.
		name: "tooltip",
		readme: "chart",
		script: `await openChart(); await hover(0.6, 0.5);
const tip = all(".tag-size-history-chart div").map((d) => d.innerText).find((t) => t.includes("#book")) ?? "";
return { tip: tip.split("\\n").filter((l) => l.startsWith("#")).length, clip: clipOf(".modal.tag-size-history-modal") };`,
		expect: (r) => r.tip === 10,
	},
	{
		// Moving the pointer along the chart moves the tooltip through the dates.
		name: "sweep",
		script: `await openChart(); const dates = [];
const tipDate = () => /\\d{4}-\\d{2}-\\d{2}/.exec(document.querySelector(".tag-size-history-chart").innerText)?.[0] ?? "";
for (const fx of [0.2, 0.4, 0.6, 0.8]) { hoverNow(fx); await sleep(400); dates.push(tipDate()); }
return { dates };`,
		expect: (r) => new Set(r.dates).size === 4 && [...r.dates].sort().join() === r.dates.join(),
	},
	{
		name: "toggle",
		script: `await openChart(); box("#film").click(); box("#book").click(); await sleep(500);
const after = { lines: lines(), shown: plugin.settings.shownTags, hidden: plugin.settings.hiddenTags };
document.querySelector(".tag-size-history-reset").click(); await sleep(500);
return { ...after, reset: lines().length, saved: (await plugin.loadData()).hiddenTags.length };`,
		expect: (r) =>
			r.lines.includes("#film") &&
			!r.lines.includes("#book") &&
			r.shown.join() === "film" &&
			r.hidden.join() === "book" &&
			r.reset === 10 &&
			r.saved === 0,
	},
	{
		// Switching a tag off removes its colour and leaves every other line's colour alone.
		name: "colours",
		script: `await openChart(); await sleep(800);
const strokes = () => [...new Set(all(".tag-size-history-chart svg path").map((p) => p.getAttribute("stroke")).filter((c) => c && c !== "none"))].sort();
const before = strokes(); box("#project").click(); await sleep(2000); const after = strokes();
document.querySelector(".tag-size-history-reset").click(); await sleep(300);
return { gone: before.filter((c) => !after.includes(c)), added: after.filter((c) => !before.includes(c)) };`,
		expect: (r) => r.gone.join() === "#5b7cf0" && r.added.length === 0,
	},
	{
		name: "nested",
		readme: "nested",
		script: `await openChart(); document.querySelector(".tag-size-history-nested input").click(); await sleep(1800); // new lines draw in over a second
const result = { rows: rows().map((r) => r.tag), lines: lines(), saved: plugin.settings.groupNested, clip: clipOf(".modal.tag-size-history-modal") };
return result;`,
		expect: (r) =>
			r.rows.includes("#project/alpha") &&
			r.rows.includes("#project") &&
			r.lines.includes("#project/beta") &&
			r.saved === false,
	},
	{
		// Links mode: one line per linked note, counting the notes that link to it.
		name: "links",
		script: `await openChart(); modeButton("Links").click(); await sleep(2000);
const result = { title: chartText().includes("Backlink history"), rows: rows(), lines: chartText().filter((t) => rows().some((r) => r.tag === t || (t.endsWith("…") && r.tag.startsWith(t.slice(0, -1))))),
  nested: all(".tag-size-history-nested").length, saved: plugin.settings.mode,
  panel: clipOf(".tag-size-history-panel").width, chart: clipOf(".tag-size-history-chart").width, clip: clipOf(".modal.tag-size-history-modal") };
await sleep(100); return result;`,
		expect: (r) => {
			const expected = [...LINKED.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
			return (
				r.title &&
				r.rows.map((row) => `${row.tag}=${String(row.count)}`).join() ===
					expected.map(([n, c]) => `${n}=${String(c)}`).join() &&
				r.lines.length === expected.length &&
				r.nested === 0 &&
				r.saved === "links" &&
				// A long note name must not widen the panel and squeeze the chart.
				r.panel === 220 &&
				r.chart > 600
			);
		},
	},
	{
		// The mode is remembered, and switching back restores the tags.
		name: "links-remembered",
		script: `await openChart(); const reopened = modeButton("Links").classList.contains("is-active");
modeButton("Tags").click(); await sleep(800);
return { reopened, tags: lines().length, nested: all(".tag-size-history-nested").length, saved: (await plugin.loadData()).mode };`,
		expect: (r) => r.reopened && r.tags === 10 && r.nested === 1 && r.saved === "tags",
	},
	{
		name: "settings",
		script: `await openChart(); document.querySelector(".tag-size-history-nested input").click(); await closeAll();
app.setting.open(); app.setting.openTabById("${ID}"); await sleep(800);
return { names: settingNames(), open: all(".tag-size-history-modal").length };`,
		expect: (r) => r.names.join() === "Date source,Number of lines,Group nested tags" && r.open === 0,
	},
	{
		// The frontmatter source: one note says 2019, so the axis reaches back that far.
		name: "frontmatter",
		script: `await closeAll(); app.setting.open(); app.setting.openTabById("${ID}"); await sleep(500);
const tab = app.setting.pluginTabs.find((t) => t.id === "${ID}");
await tab.setControlValue("dateSource", "frontmatter"); await sleep(300);
const shown = settingNames();
await openChart();
return { shown, years: chartText().filter((t) => /^20\\d\\d$/.test(t)), saved: (await plugin.loadData()).dateSource };`,
		expect: (r) =>
			r.shown.includes("Frontmatter property") && r.years.includes("2020") && r.saved === "frontmatter",
	},
];

/**
 * Joins numbered whole-page frames into a looping GIF of the area `clip`, at the speed they were taken.
 * The page is drawn at twice its size, so the crop is doubled and the result is scaled back down.
 */
function gif(frames, target, clip, fps) {
	const crop = [clip.width, clip.height, clip.x, clip.y].map((n) => String(Math.round(n * 2))).join(":");
	const filter = `crop=${crop},scale=${String(Math.round(clip.width))}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160[p];[b][p]paletteuse=dither=bayer:bayer_scale=5`;
	execFileSync(
		"ffmpeg",
		[
			...["-y", "-loglevel", "error", "-framerate", fps.toFixed(2), "-i", join(frames, "f%03d.jpg")],
			...["-vf", filter, "-loop", "0", target],
		],
		{ stdio: "inherit" },
	);
}

// A pointer drawn on the page for the recordings, so the viewer sees what is about to be pressed.
// `point` glides it to a place, `pointAt` to the middle of an element, and `press` clicks with a dip.
const POINTER = `const pointer = () => { let p = document.getElementById("tsh-demo-pointer");
  if (!p) { p = document.body.appendChild(document.createElement("div")); p.id = "tsh-demo-pointer";
    p.style.cssText = "position:fixed;left:0;top:0;z-index:99999;pointer-events:none;width:22px;height:22px;";
    const NS = "http://www.w3.org/2000/svg"; const svg = p.appendChild(document.createElementNS(NS, "svg"));
    svg.setAttribute("viewBox", "0 0 22 22"); svg.setAttribute("width", "22"); svg.setAttribute("height", "22");
    const arrow = svg.appendChild(document.createElementNS(NS, "path")); arrow.setAttribute("d", "M3 2 L3 18 L7.5 14 L10.5 20.5 L13 19.4 L10 13 L16 13 Z");
    arrow.setAttribute("fill", "#fff"); arrow.setAttribute("stroke", "#111"); arrow.setAttribute("stroke-width", "1.3"); arrow.setAttribute("stroke-linejoin", "round"); }
  return p; };
const point = (x, y, ms = 600) => { const p = pointer(); p.style.transition = "transform " + ms + "ms ease-in-out"; p.style.transform = "translate(" + (x - 3) + "px, " + (y - 2) + "px)"; };
const pointAt = (el, ms) => { const r = el.getBoundingClientRect(); point(r.x + Math.min(r.width / 2, 60), r.y + r.height / 2, ms); };
const press = async (el) => { const p = pointer(); const at = p.style.transform; p.style.transition = "transform 90ms"; p.style.transform = at + " scale(0.8)";
  await sleep(110); el.click(); p.style.transform = at; };
const sweepTo = (fx) => { const r = document.querySelector(".tag-size-history-chart svg").getBoundingClientRect(); point(r.x + r.width * fx, r.y + r.height * 0.5, 0); hoverNow(fx); };
const leaveChart = () => document.querySelector(".tag-size-history-chart svg").dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));`;

/**
 * Records the README's moving pictures and a still in the light theme. Frames are pictures of the
 * whole page, taken as fast as Obsidian gives them, and ffmpeg crops and joins them. A clipped
 * picture would be smaller, but taking one briefly changes the page's size, which redraws the chart.
 *
 * Each picture shows one thing at a time: the pointer glides to a control, presses it, and the
 * recording holds until the chart has finished redrawing and a little longer, before the next step.
 *   grow.gif: the pop-up opens and the lines draw in.
 *   demo.gif: the tooltip sweeps across the dates, then a tag is switched on, one off, and reset.
 *   links.gif: the switch to links mode, then one note switched off.
 */
async function recordDemo(cdp) {
	const images = join(ROOT, "docs", "images");
	const page = (script) => cdp.run(`(async () => { ${PRELUDE}\n${POINTER}\n${script} })()`);
	let frames;
	let count = 0;
	let clip;
	let started = 0;
	const reel = (name) => {
		frames = join(OUT, name);
		mkdirSync(frames, { recursive: true });
		count = 0;
		started = Date.now();
	};
	/** Films for this long. */
	const hold = async (ms) => {
		const end = Date.now() + ms;
		while (Date.now() < end) await cdp.frame(join(frames, `f${String(count++).padStart(3, "0")}.jpg`));
	};
	const cut = (name) => {
		gif(frames, join(images, name), clip, (count * 1000) / (Date.now() - started));
	};
	/** The lines take 1.4 seconds to redraw. Hold through that and a pause, so steps never overlap. */
	const SETTLE = 2600;
	/** Glides the pointer to what `target` finds, presses it, and holds until the chart has settled. */
	const pressAndSettle = async (target, settle = SETTLE) => {
		await page(`pointAt(${target});`);
		await hold(900);
		await page(`await press(${target});`);
		await hold(settle);
	};

	// Open once to learn where things sit, then again to film the lines drawing in from the start.
	clip = await page(`await defaults(); await openChart(); return clipOf(".modal.tag-size-history-modal");`);

	reel("grow");
	await page(`await closeAll(); app.commands.executeCommandById("${ID}:open");`);
	// The lines take 1.4 seconds to draw. Stay on the finished chart for most of the loop, so the
	// picture is not caught half drawn.
	await hold(5500);
	cut("grow.gif");

	// The chart is fully drawn by now. Sweep the tooltip across, then let it go before pressing anything.
	reel("demo");
	await page(`sweepTo(0.1);`);
	await hold(500);
	for (let i = 0; i <= 44; i++) {
		await page(`sweepTo(${String(0.1 + (0.8 * i) / 44)}); await sleep(30);`);
		await hold(1);
	}
	await hold(900);
	await page(`leaveChart(); pointAt(box("#film"), 700);`);
	await hold(1100);
	await page(`await press(box("#film"));`);
	await hold(SETTLE);
	await pressAndSettle(`box("#project")`);
	await pressAndSettle(`document.querySelector(".tag-size-history-reset")`);
	cut("demo.gif");

	reel("links");
	await pressAndSettle(`modeButton("Links")`, 3200);
	await pressAndSettle(`box("Home")`);
	cut("links.gif");
	await page(`document.getElementById("tsh-demo-pointer")?.remove();`);

	await page(`await defaults(); app.changeTheme("moonstone"); await openChart(); await hover(0.55, 0.5);`);
	await cdp.shot(join(images, "chart-light.png"), clip);
	await page(`app.changeTheme("obsidian"); await closeAll();`);
	console.log("Recorded grow.gif, demo.gif and links.gif in docs/images/");
}

async function main() {
	execFileSync("npm", ["run", "build"], { cwd: ROOT, stdio: "ignore" });
	rmSync(OUT, { recursive: true, force: true });
	mkdirSync(OUT, { recursive: true });
	if (README) mkdirSync(join(ROOT, "docs", "images"), { recursive: true });
	const { base, profile, vault } = stage();
	const app = spawn(BIN, [`--user-data-dir=${profile}`, `--remote-debugging-port=${String(PORT)}`], {
		stdio: "ignore",
	});
	let failed = 0;
	try {
		const cdp = await connect();
		await cdp.emulate();
		await sleep(2000);
		installPlugin(vault);
		const enabled = await cdp.run(`(async () => {
			await app.plugins.loadManifests();
			await app.plugins.setEnable(true);
			await app.plugins.enablePlugin("${ID}");
			// enablePlugin loads the plugin without adding it to the saved list, so check it is loaded.
			return Boolean(app.plugins.plugins["${ID}"]);
		})()`);
		if (!enabled) throw new Error("The plugin did not switch on in the throwaway Obsidian.");
		// Keep the real mouse pointer out of the recording: the window shrinks and moves to the corner
		// of the screen farthest from the pointer. The page keeps its emulated size.
		await cdp.run(`(() => { const { screen, getCurrentWindow } = window.electron.remote; const win = getCurrentWindow();
			const p = screen.getCursorScreenPoint(); const d = screen.getDisplayNearestPoint(p).workArea;
			win.setFullScreen(false); win.unmaximize(); win.setMinimumSize(300, 200); win.setSize(420, 300);
			win.setPosition(p.x < d.x + d.width / 2 ? d.x + d.width - 430 : d.x + 10, p.y < d.y + d.height / 2 ? d.y + d.height - 310 : d.y + 10);
			return win.getBounds(); })()`);
		await sleep(500);
		await cdp.emulate();
		for (const check of CHECKS) {
			const { clip, ...result } = await cdp.run(`(async () => { ${PRELUDE}\n${check.script} })()`);
			await cdp.shot(join(OUT, `${check.name}.png`));
			if (README && check.readme) await cdp.shot(join(ROOT, "docs", "images", `${check.readme}.png`), clip);
			const ok = check.expect(result);
			if (!ok) failed++;
			console.log(`${ok ? "ok  " : "FAIL"} ${check.name} ${JSON.stringify(result)}`);
		}
		if (README) await recordDemo(cdp);
		cdp.close();
	} finally {
		const exited = new Promise((r) => app.once("exit", r));
		app.kill();
		await Promise.race([exited, sleep(5000)]);
		// Obsidian can still be flushing its profile for a moment after it exits.
		rmSync(base, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
	}
	console.log(`Screenshots in ${OUT}`);
	if (failed) process.exit(1);
}

await main();
