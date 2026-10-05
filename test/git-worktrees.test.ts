import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import type { GitWorktree } from "../src/project/git.ts";
import { git, limenWithEnv, scratchRepo } from "./scratch.ts";

const moduleUrl = new URL("../src/project/git.ts", import.meta.url).href;
const pathGit = execFileSync("which", ["git"], { encoding: "utf8" }).trim();
const systemGit = "/usr/bin/git";

for (const change of ["disappearance", "registration"] as const) {
	test(`old-format listing refuses registry ${change} after its Git snapshot`, async (context) => {
		const scratch = await scratchRepo();
		context.after(scratch.cleanup);
		const path = join(dirname(scratch.root), `newline\nHEAD ${git(scratch.root, "rev-parse", "HEAD")}\ndetached\n\nworktree /false-owner`);
		let mutation: string;
		if (change === "disappearance") {
			git(scratch.root, "worktree", "add", "--detach", path, "HEAD");
			await writeFile(join(path, "keep.txt"), "inert worker data\n");
			const admin = git(path, "rev-parse", "--git-dir");
			assert.ok(admin.startsWith(join(scratch.root, ".git/worktrees/")));
			mutation = `rmSync(${JSON.stringify(admin)}, { recursive: true, force: true });`;
		} else {
			const registered = JSON.stringify(join(dirname(scratch.root), "new-registration"));
			mutation = `if (!existsSync(${registered})) execFileSync(${JSON.stringify(systemGit)}, ["worktree", "add", "--detach", ${registered}, "HEAD"]);`;
		}
		await writeFile(
			join(scratch.fakeBin, "git"),
			`#!${process.execPath}
const { execFileSync } = require("node:child_process");
const { existsSync, rmSync } = require("node:fs");
const args = process.argv.slice(2);
if (args.join(" ") === "worktree list --porcelain -z") {
  process.stderr.write("error: unknown switch 'z'\\n");
  process.exit(129);
}
if (args.join(" ") === "worktree list --porcelain") {
  const snapshot = execFileSync(${JSON.stringify(systemGit)}, args, { encoding: "utf8" });
  ${mutation}
  process.stdout.write(snapshot);
} else execFileSync(${JSON.stringify(systemGit)}, args, { stdio: "inherit" });
`,
			{ mode: 0o755 },
		);
		const result = listing(scratch.root, scratch.fakeBin);
		assert.notEqual(result.status, 0, "a changed registry must not validate an ambiguous or stale snapshot");
		assert.equal(result.stdout, "", "no partial or fabricated owner may escape");
		assert.match(result.stderr, /old Git .*registry changed|old Git returned ambiguous worktree output/);
		if (change === "disappearance") assert.equal(await readFile(join(path, "keep.txt"), "utf8"), "inert worker data\n");
	});
}

function listing(root: string, bin: string) {
	return spawnSync(
		process.execPath,
		[
			"--input-type=module",
			"-e",
			`import { listWorktrees, worktreeForBranch } from ${JSON.stringify(moduleUrl)};
console.log(JSON.stringify({ worktrees: listWorktrees(process.argv[1]), branch: worktreeForBranch(process.argv[1], "topic/quoted") }));`,
			root,
		],
		{ encoding: "utf8", env: { ...process.env, PATH: bin } },
	);
}

for (const [name, binary] of [
	["PATH Git", pathGit],
	["system Git", systemGit],
] as const) {
	test(`${name} preserves worktree path, branch, detached, locked and prunable identity`, async (context) => {
		const scratch = await scratchRepo();
		context.after(scratch.cleanup);
		await symlink(binary, join(scratch.fakeBin, "git"));
		const expected: GitWorktree[] = [{ path: scratch.root, branch: "main", detached: false }];
		for (const [index, suffix] of ["normal", "space path", "非ASCII-é", '"quoted"', "back\\slash", "tab\tpath", "cr\rpath"].entries()) {
			const path = join(dirname(scratch.root), suffix);
			if (index === 3) {
				git(scratch.root, "worktree", "add", "-b", "topic/quoted", path, "HEAD");
				expected.push({ path, branch: "topic/quoted", detached: false });
			} else {
				git(scratch.root, "worktree", "add", "--detach", path, "HEAD");
				expected.push({ path, detached: true });
			}
			if (index === 0) git(scratch.root, "worktree", "lock", "--reason", "keep this", path);
			if (index === 1) await rm(path, { recursive: true });
		}
		const result = listing(scratch.root, scratch.fakeBin);
		assert.equal(result.status, 0, result.stderr);
		const actual = JSON.parse(result.stdout);
		assert.deepEqual(
			actual.worktrees.sort((a: { path: string }, b: { path: string }) => a.path.localeCompare(b.path)),
			expected.sort((a, b) => a.path.localeCompare(b.path)),
		);
		assert.deepEqual(
			actual.branch,
			expected.find((worktree) => worktree.branch === "topic/quoted"),
		);
	});

	test(`${name} preserves a bare main repository when listing from a linked worktree`, async (context) => {
		const scratch = await scratchRepo();
		context.after(scratch.cleanup);
		await symlink(binary, join(scratch.fakeBin, "git"));
		const bare = join(dirname(scratch.root), "bare", ".git");
		const path = join(dirname(scratch.root), "linked");
		git(scratch.root, "clone", "--bare", scratch.root, bare);
		git(bare, "worktree", "add", "--detach", path, "HEAD");
		const result = listing(path, scratch.fakeBin);
		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(JSON.parse(result.stdout).worktrees, [
			// Git reports the parent of a common directory named .git, even when bare.
			{ path: dirname(bare), detached: false },
			{ path, detached: true },
		]);
	});

	test(`${name} lists newline paths with NUL support or fails closed before prune`, async (context) => {
		const scratch = await scratchRepo();
		context.after(scratch.cleanup);
		await symlink(binary, join(scratch.fakeBin, "git"));
		const supportsNul = spawnSync(binary, ["-C", scratch.root, "worktree", "list", "--porcelain", "-z"]).status === 0;
		// The suffix looks like a complete extra porcelain record. A line parser alone
		// could report a false owner and hide the real registered newline path.
		const path = join(dirname(scratch.root), `newline\nHEAD ${git(scratch.root, "rev-parse", "HEAD")}\ndetached\n\nworktree /false-owner`);
		git(scratch.root, "worktree", "add", "--detach", path, "HEAD");
		await writeFile(join(path, "keep.txt"), "worker data\n");
		const result = listing(scratch.root, scratch.fakeBin);
		if (supportsNul) {
			assert.equal(result.status, 0, result.stderr);
			assert.deepEqual(JSON.parse(result.stdout).worktrees, [
				{ path: scratch.root, branch: "main", detached: false },
				{ path, detached: true },
			]);
		} else {
			assert.notEqual(result.status, 0);
			assert.equal(result.stdout, "", "no partial worktree list may escape");
			assert.match(result.stderr, /old Git cannot safely list worktrees with newline paths/);
			const leftover = join(dirname(scratch.root), `.${basename(scratch.root)}-limen-worktrees`, "leftover");
			await mkdir(leftover, { recursive: true });
			await writeFile(join(leftover, "keep.txt"), "do not sweep before a safe listing\n");
			const prune = limenWithEnv(scratch, { PATH: `${scratch.fakeBin}:${dirname(process.execPath)}:/usr/bin:/bin` }, "prune");
			assert.notEqual(prune.status, 0);
			assert.match(prune.stderr, /old Git cannot safely list worktrees with newline paths/);
			assert.equal(await readFile(join(leftover, "keep.txt"), "utf8"), "do not sweep before a safe listing\n");
		}
		assert.equal(await readFile(join(path, "keep.txt"), "utf8"), "worker data\n");
	});

	test(`${name} handles a newline in the main worktree conservatively`, async (context) => {
		const scratch = await scratchRepo();
		context.after(scratch.cleanup);
		await symlink(binary, join(scratch.fakeBin, "git"));
		const supportsNul = spawnSync(binary, ["-C", scratch.root, "worktree", "list", "--porcelain", "-z"]).status === 0;
		const path = `${scratch.root}\nmain`;
		await rename(scratch.root, path);
		const result = listing(path, scratch.fakeBin);
		if (supportsNul) {
			assert.equal(result.status, 0, result.stderr);
			assert.deepEqual(JSON.parse(result.stdout).worktrees, [{ path, branch: "main", detached: false }]);
		} else {
			assert.notEqual(result.status, 0);
			assert.equal(result.stdout, "");
			assert.match(result.stderr, /old Git cannot safely list worktrees with newline paths/);
		}
	});

	test(`${name} preserves identity with multiline lock reasons`, async (context) => {
		const scratch = await scratchRepo();
		context.after(scratch.cleanup);
		await symlink(binary, join(scratch.fakeBin, "git"));
		const path = join(dirname(scratch.root), "locked");
		git(scratch.root, "worktree", "add", "--detach", path, "HEAD");
		git(scratch.root, "worktree", "lock", "--reason", "first line\nsecond line", path);
		const result = listing(scratch.root, scratch.fakeBin);
		// Unlike paths, old Git quotes multiline lock reasons in porcelain output.
		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(JSON.parse(result.stdout).worktrees, [
			{ path: scratch.root, branch: "main", detached: false },
			{ path, detached: true },
		]);
	});

	test(`${name} keeps ordinary Git errors visible`, async (context) => {
		const scratch = await scratchRepo();
		context.after(scratch.cleanup);
		await symlink(binary, join(scratch.fakeBin, "git"));
		const notRepo = join(dirname(scratch.root), "not-a-repository");
		await mkdir(notRepo);
		const result = listing(notRepo, scratch.fakeBin);
		assert.notEqual(result.status, 0);
		assert.equal(result.stdout, "");
		assert.match(result.stderr, /not a git repository/i);
	});
}
