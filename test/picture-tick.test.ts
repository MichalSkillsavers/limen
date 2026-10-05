import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { git, limen, type Scratch, scratchRepo } from "./scratch.ts";

async function dataset(scratch: Scratch, revision: string | undefined): Promise<string> {
	const dir = join(scratch.root, ".limen/picture");
	await mkdir(join(dir, "nodes"), { recursive: true });
	await writeFile(
		join(dir, "nodes/sample.plant.md"),
		`---\nschema: architecture-map/1\nkind: plant\nid: sample.plant\nproject: sample\ntitle: Sample\nstatus: ready\nparent: null\n${revision ? `revision: ${revision}\n` : ""}---\nSample plant.\n`,
	);
	await writeFile(
		join(dir, "nodes/sample.worker.md"),
		"---\nschema: architecture-map/1\nkind: module\nid: sample.worker\nproject: sample\ntitle: Worker\nstatus: ready\nparent: sample.plant\nsources:\n  - src/worker.ts\n  - docs/\n  - spec/\n  - README.md\n---\nThe worker runs the task.\n",
	);
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

test("missing picture build and tick explain how to start without creating a job", async (context) => {
	const s = await scratchRepo();
	context.after(s.cleanup);
	const dir = join(s.root, ".limen/picture");
	for (const mode of ["build", "tick"]) {
		const result = limen(s, "picture", mode);
		assert.equal(result.status, mode === "build" ? 1 : 0);
		const output = result.stdout + result.stderr;
		assert.ok(output.includes(`no map yet in ${dir}.`), output);
		assert.match(output, /limen spawn --role picture --tab/);
		assert.match(output, /docs\/picture\.md/);
		assert.doesNotMatch(output, /ENOENT/);
		await noJob(s);
	}
});

test("picture preserves an invalid dataset directory error instead of the first-map hint", async (context) => {
	const s = await scratchRepo();
	context.after(s.cleanup);
	const dir = join(s.root, "not-a-directory");
	await writeFile(dir, "not a dataset\n");
	for (const mode of ["build", "tick"]) {
		const result = limen(s, "picture", mode, "--dir", dir);
		assert.equal(result.status, 1);
		assert.ok(result.stderr.includes(`picture directory ${dir} is not a directory`), result.stderr);
		assert.doesNotMatch(result.stderr, /no map yet/);
	}
});

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
	} finally {
		await s.cleanup();
	}
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
	} finally {
		await s.cleanup();
	}
});

test("tick counts files cited only by a feature or journey and dry run always prints its decision", async () => {
	const s = await scratchRepo();
	try {
		await code(s);
		await writeFile(join(s.root, "src/journey.ts"), "export const journey = 1;\n");
		await writeFile(join(s.root, "src/uncited.ts"), "export const uncited = 1;\n");
		git(s.root, "add", "src");
		git(s.root, "commit", "-m", "more code");
		const base = git(s.root, "rev-parse", "HEAD").trim();
		const dir = await dataset(s, base);
		await mkdir(join(dir, "features"));
		await mkdir(join(dir, "journeys"));
		await writeFile(
			join(dir, "features/sample.feature.md"),
			"---\nschema: architecture-map/1\nkind: feature\nid: sample.feature\nproject: sample\ntitle: Feature\nstatus: ready\ntouches:\n  - sample.worker\nsources:\n  - src/other.ts\n---\nThe feature.\n",
		);
		await writeFile(
			join(dir, "journeys/sample.journey.md"),
			"---\nschema: architecture-map/1\nkind: journey\nid: sample.journey\nproject: sample\ntitle: Journey\nstatus: ready\nsteps:\n  - sample.plant\n  - sample.worker\nsources:\n  - src/journey.ts\n---\nThe journey.\n",
		);
		assert.equal(limen(s, "picture", "tick", "--dry-run").stdout, `picture ${base.slice(0, 8)}: map is current; dry run\n`);
		assert.equal(limen(s, "picture", "tick").stdout, "");
		await writeFile(join(s.root, "src/uncited.ts"), "export const uncited = 2;\n");
		git(s.root, "add", "src");
		git(s.root, "commit", "-m", "uncited edit");
		const uncited = git(s.root, "rev-parse", "HEAD").trim();
		assert.equal(limen(s, "picture", "tick", "--dry-run").stdout, `picture ${base.slice(0, 8)}..${uncited.slice(0, 8)}: no relevant change; dry run\n`);
		assert.equal(limen(s, "picture", "tick").stdout, "");
		await writeFile(join(s.root, "src/other.ts"), "export const other = 2;\n");
		await writeFile(join(s.root, "src/journey.ts"), "export const journey = 2;\n");
		git(s.root, "add", "src");
		git(s.root, "commit", "-m", "overlay-cited edits");
		const result = limen(s, "picture", "tick", "--dry-run");
		assert.equal(result.status, 0, result.stderr);
		assert.match(result.stdout, /^picture [0-9a-f]{8}\.\.[0-9a-f]{8}: src\/journey\.ts, src\/other\.ts; dry run\n$/);
		await noJob(s);
	} finally {
		await s.cleanup();
	}
});

test("tick requires a known researched revision and never creates an initial job", async () => {
	const s = await scratchRepo();
	try {
		await code(s);
		await dataset(s, undefined);
		const args = ["picture", "tick", "--engine", "omp", "--provider", "unused", "--model", "unused", "--thinking", "high"];
		assert.equal(limen(s, ...args).status, 0);
		await noJob(s);
		await dataset(s, "a".repeat(40));
		assert.match(limen(s, ...args).stdout, /not a known commit/);
		await noJob(s);
	} finally {
		await s.cleanup();
	}
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
	} finally {
		await s.cleanup();
	}
});

test("tick on a watched branch skips another checkout and yields to a live tick, not a dead one", async () => {
	const s = await scratchRepo();
	try {
		const base = await code(s);
		const dir = await dataset(s, base);
		await writeFile(join(s.root, "src/worker.ts"), "export const task = 2;\n");
		git(s.root, "add", "src");
		git(s.root, "commit", "-m", "new behavior");
		assert.match(limen(s, "picture", "tick", "--branch", "trunk", "--dry-run").stdout, /skipped: .* has main checked out, not trunk/);
		await writeFile(join(dir, "tick.lock"), `${process.pid}\n`);
		assert.equal(limen(s, "picture", "tick", "--branch", "main", "--dry-run").stdout, "picture tick already running\n");
		const dead = spawnSync(process.execPath, ["-e", ""]).pid;
		await writeFile(join(dir, "tick.lock"), `${dead}\n`);
		assert.match(limen(s, "picture", "tick", "--branch", "main", "--dry-run").stdout, /src\/worker\.ts; dry run/);
		assert.deepEqual((await readdir(dir)).sort(), ["nodes"]);
	} finally {
		await s.cleanup();
	}
});
