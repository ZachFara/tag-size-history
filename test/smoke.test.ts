import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

interface Versioned {
	version: string;
}

function readJson(path: string): unknown {
	return JSON.parse(readFileSync(path, "utf8"));
}

test("manifest, package and versions agree on the version", () => {
	const manifest = readJson("manifest.json") as Versioned & { id: string; minAppVersion: string };
	const pkg = readJson("package.json") as Versioned & { name: string };
	const versions = readJson("versions.json") as Record<string, string>;

	assert.equal(manifest.id, pkg.name);
	assert.equal(manifest.version, pkg.version);
	assert.equal(versions[manifest.version], manifest.minAppVersion);
});
