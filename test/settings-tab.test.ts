import { test } from "node:test";
import assert from "node:assert/strict";
import type { App, Plugin, SettingDefinition } from "obsidian";
import { loadModule } from "./harness.ts";
import { DEFAULT_SETTINGS } from "../src/settings.ts";
import type { TagHistorySettingTab as TabClass } from "../src/settings-tab.ts";
import type { Settings } from "../src/types.ts";

const { TagHistorySettingTab } = await loadModule<{ TagHistorySettingTab: typeof TabClass }>(
	"src/settings-tab.ts",
);

function makeTab(start: Settings = DEFAULT_SETTINGS): {
	tab: TabClass;
	saved: Settings[];
	current: () => Settings;
} {
	let settings = start;
	const saved: Settings[] = [];
	const tab = new TagHistorySettingTab({} as App, {} as Plugin, {
		get: () => settings,
		save: (next) => {
			settings = next;
			saved.push(next);
			return Promise.resolve();
		},
	});
	return { tab, saved, current: () => settings };
}

function definition(tab: TabClass, name: string): SettingDefinition {
	const found = (tab.getSettingDefinitions() as SettingDefinition[]).find((d) => d.name === name);
	assert.ok(found, `no setting named ${name}`);
	return found;
}

test("the tab offers date source, frontmatter property and number of tags", () => {
	const { tab } = makeTab();
	const controls = (tab.getSettingDefinitions() as SettingDefinition[]).map((d) => [
		d.name,
		d.control?.type,
		d.control?.key,
	]);
	assert.deepEqual(controls, [
		["Date source", "dropdown", "dateSource"],
		["Frontmatter property", "text", "frontmatterProperty"],
		["Number of tags", "number", "topTags"],
	]);
	const source = definition(tab, "Date source").control;
	assert.deepEqual(source?.type === "dropdown" && Object.keys(source.options), [
		"created",
		"modified",
		"frontmatter",
	]);
});

test("controls show the current settings", () => {
	const { tab } = makeTab({ dateSource: "modified", frontmatterProperty: "date", topTags: 4 });
	assert.equal(tab.getControlValue("dateSource"), "modified");
	assert.equal(tab.getControlValue("frontmatterProperty"), "date");
	assert.equal(tab.getControlValue("topTags"), 4);
});

test("a change is saved", async () => {
	const { tab, saved } = makeTab();
	await tab.setControlValue("topTags", 20);
	assert.deepEqual(saved, [{ ...DEFAULT_SETTINGS, topTags: 20 }]);
});

test("a value out of range is corrected before it is saved", async () => {
	const { tab, current } = makeTab();
	await tab.setControlValue("topTags", 9999);
	assert.equal(current().topTags, 50);
	await tab.setControlValue("dateSource", "nonsense");
	assert.equal(current().dateSource, "created");
});

test("the frontmatter property shows only when the date source is a frontmatter property", async () => {
	const { tab } = makeTab();
	const visible = (): unknown => {
		const v = definition(tab, "Frontmatter property").visible;
		return typeof v === "function" ? v() : v;
	};
	assert.equal(visible(), false);
	await tab.setControlValue("dateSource", "frontmatter");
	assert.equal(visible(), true);
	assert.equal((tab as unknown as { refreshes: number }).refreshes, 1);
});
