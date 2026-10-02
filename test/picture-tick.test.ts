import assert from "node:assert/strict";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { git, limen, scratchRepo, type Scratch } from "./scratch.ts";

async function dataset(scratch: Scratch, revision: string | undefined): Promise<string> {
	const dir = join(scratch.root, ".limen/picture");
	await mkdir(join(dir, "nodes"), { recursive: true });
	await writeFile(join(dir, "nodes/sample.plant.md"), `---\nschema: architecture-map/1\nkind: plant\nid: sample.plant\nproject: sample\ntitle: Sample\nstatus: ready\nparent: null\n${revision ? `revision: ${revision}\n` : ""}---\nSample plant.\n`);
	await writeFile(join(dir, "nodes/sample.worker.md"), "---\nschema: architecture-map/1\nkind: module\nid: sample.worker\nproject: sample\ntitle: Worker\nstatus: ready\nparent: sample.plant\nsources:\n  - src/worker.ts\n  - docs/\n  - spec/\n  - README.md\n---\nThe worker runs the task.\n");
	return dir;
}
async function code(scratch: Scratch): Promise<string> {
	await mkdir(join(scratch.root, "src"));
	await writeFile(join(scratch.root, "src/worker.ts"), "export const task = 1;\n");
	await writeFile(join(scratch.root, "src/other.ts"), "export const other = 1;\n");
	git(scratch.root, "add", "src");
	git(scratch.root, "commit", "-m", "code");
	return git(scratch.root, "rev-parse", "HEAD").trim();
}
async function noJob(scratch: Scratch): Promise<void> {
	assert.deepEqual(await readdir(join(scratch.root, ".limen/jobs")).catch(() => []), []);
}

test("tick stays silent for current, uncited edits and documentation even when cited", async () => {
	const s = await scratchRepo();
	try {
		const base = await code(s);
		await dataset(s, base);
		assert.equal(limen(s, "picture", "tick").stdout, "");
		for (const dir of ["docs", "spec"]) {
			await mkdir(join(s.root, dir));
			await writeFile(join(s.root, dir, "notes.md"), "New intent.\n");
		}
		await writeFile(join(s.root, "README.md"), "Changed survey.\n");
		await writeFile(join(s.root, "src/other.ts"), "export const other = 2;\n");
		git(s.root, "add", "docs", "spec", "README.md", "src");
		git(s.root, "commit", "-m", "irrelevant changes");
		const result = limen(s, "picture", "tick", "--engine", "omp", "--provider", "unused", "--model", "unused", "--thinking", "high");
		assert.equal(result.status, 0, result.stderr);
		assert.equal(result.stdout, "");
		await noJob(s);
	} finally { await s.cleanup(); }
});

test("tick identifies cited edits and structural renames without calling a model in dry run", async () => {
	const s = await scratchRepo();
	try {
		const base = await code(s);
		const dir = await dataset(s, base);
		await writeFile(join(s.root, "src/worker.ts"), "export const task = 2;\n");
		await rename(join(s.root, "src/other.ts"), join(s.root, "src/renamed file.ts"));
		git(s.root, "add", "src");
		git(s.root, "commit", "-m", "changed shape");
		const result = limen(s, "picture", "tick", "--dry-run");
		assert.equal(result.status, 0, result.stderr);
		assert.match(result.stdout, /src\/worker\.ts/);
		assert.match(result.stdout, /src\/other\.ts/);
		assert.match(result.stdout, /src\/renamed file\.ts/);
		assert.match(result.stdout, /dry run/);
		assert.equal(await readFile(join(dir, "nodes/sample.plant.md"), "utf8").then((text) => text.includes(base)), true);
		await noJob(s);
		const missing = limen(s, "picture", "tick", "--engine", "omp");
		assert.match(missing.stdout, /supply --engine --provider --model --thinking/);
		await noJob(s);
	} finally { await s.cleanup(); }
});

test("tick requires a known researched revision and never creates an initial job", async () => {
	const s = await scratchRepo();
	try {
		await code(s);
		await dataset(s, undefined);
		const args = ["picture", "tick", "--engine", "omp", "--provider", "unused", "--model", "unused", "--thinking", "high"];
		assert.match(limen(s, ...args).stdout, /start the first picture by hand/);
		await dataset(s, "a".repeat(40));
		assert.match(limen(s, ...args).stdout, /not a known commit/);
		await noJob(s);
	} finally { await s.cleanup(); }
});

test("tick does not retry an attempted tip or overlap a live picture job", async () => {
	const s = await scratchRepo();
	try {
		const base = await code(s);
		const dir = await dataset(s, base);
		await writeFile(join(s.root, "src/worker.ts"), "export const task = 2;\n");
		git(s.root, "add", "src");
		git(s.root, "commit", "-m", "new behavior");
		const head = git(s.root, "rev-parse", "HEAD").trim();
		const record = join(s.root, ".limen/jobs/previous-picture");
		await mkdir(record, { recursive: true });
		await writeFile(join(dir, "job"), "previous-picture\n");
		await writeFile(join(record, "state"), "failed\n");
		await writeFile(join(record, "base"), `${head}\n`);
		assert.match(limen(s, "picture", "tick", "--dry-run").stdout, /already attempted/);
		await writeFile(join(record, "state"), "running\n");
		await writeFile(join(record, "started-at"), `${new Date().toISOString()}\n`);
		await rm(join(record, "base"));
		assert.match(limen(s, "picture", "tick", "--dry-run").stdout, /previous-picture running/);
		assert.deepEqual(await readdir(join(s.root, ".limen/jobs")), ["previous-picture"]);
	} finally { await s.cleanup(); }
});
