import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import test from "node:test";
import { testLineCap } from "../src/commands/land.ts";
import { templateHistoryText } from "../src/project/inherit.ts";

const root = new URL("..", import.meta.url).pathname;

async function filesBelow(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	const paths = await Promise.all(
		entries
			.filter((entry) => !["node_modules", ".git", ".omp", ".pi"].includes(entry.name))
			.map(async (entry) => {
				const path = join(dir, entry.name);
				return entry.isDirectory() ? filesBelow(path) : [path];
			}),
	);
	return paths.flat();
}

test("runtime remains dependency-free and TypeScript basenames stay unambiguous", async () => {
	const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as { dependencies?: Record<string, string> };
	assert.deepEqual(pkg.dependencies, {});
	const names = (await filesBelow(root)).filter((path) => path.endsWith(".ts")).map((path) => basename(path));
	assert.equal(new Set(names).size, names.length, "TypeScript basenames must be unique");
});

// Each shipped templates/.history/<name> starts with the hash of the current templates/<name>.
test("shipped template history starts at the current template", async () => {
	for (const name of await readdir(join(root, "templates/.history"))) {
		const path = join(root, "templates/.history", name);
		if (process.env.LIMEN_WRITE_HISTORY === "1") await writeFile(path, templateHistoryText(`templates/${name}`));
		const hash = createHash("sha256")
			.update(await readFile(join(root, "templates", name)))
			.digest("hex");
		assert.equal((await readFile(path, "utf8")).split(" ")[0], hash, `regenerate ${path}: LIMEN_WRITE_HISTORY=1 node --test test/structure.test.ts`);
	}
});

// Until the F925 test reset is done, an old file waiting for its replacement starts with a marker that freezes its size.
// It does not count toward the cap and may only shrink. Every other file in test/ counts.
test("test/ stays within the line cap that spec/vision.md sets", async () => {
	const cap = testLineCap(await readFile(join(root, "spec/vision.md"), "utf8"));
	assert.ok(cap, "spec/vision.md names no cap for test/");
	let lines = 0;
	for (const path of await filesBelow(join(root, "test"))) {
		const text = await readFile(path, "utf8");
		const count = text.split("\n").length - 1;
		const frozen = Number(/^\/\/ F925 old suite, frozen at (\d+) lines\./.exec(text)?.[1]);
		if (!frozen) lines += count;
		else assert.ok(count <= frozen, `${path} is an old file waiting for its replacement; it may only shrink (${count} > ${frozen} lines)`);
	}
	assert.ok(lines <= cap, `test/ has ${lines} lines; spec/vision.md caps it at ${cap}. Remove ${lines - cap} test lines, or ask Adam to raise the cap.`);
});
