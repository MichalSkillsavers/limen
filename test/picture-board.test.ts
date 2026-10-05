import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readBoard } from "../src/picture/board.ts";

async function withBoard(text: string | null, check: (root: string) => Promise<void>): Promise<void> {
	const root = await mkdtemp(join(tmpdir(), "limen-board-"));
	try {
		if (text !== null) {
			await mkdir(join(root, "spec"));
			await writeFile(join(root, "spec", "build.md"), text);
		}
		await check(root);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
}

test("board reader keeps the source state and line from every supported section", async () => {
	await withBoard(
		[
			"# Build",
			"## TRACK",
			"- `F100-tracked` (🟠 ACTIVE): not a feature section",
			"## NOW",
			"- `F101-current-work` (🟠 ACTIVE): current",
			"## NEXT",
			"- `F102-queued-work` (🟡 PLANNED): queued",
			"## PARKED",
			"- `F103-paused-work` (🔴 PLANNED): paused",
			"## DROPPED",
			"- `F104-cut-work` (⚪ DROPPED): cut",
			"## PROVEN",
			"- `F105-shipped-work` (🟢 PROVEN): shipped",
		].join("\n"),
		async (root) => {
			const expected = new Map([
				["f101", { section: "NOW", state: "ACTIVE", line: 5 }],
				["f102", { section: "NEXT", state: "PLANNED", line: 7 }],
				["f103", { section: "PARKED", state: "PLANNED", line: 9 }],
				["f104", { section: "DROPPED", state: "DROPPED", line: 11 }],
				["f105", { section: "PROVEN", state: "PROVEN", line: 13 }],
			]);
			assert.deepEqual(await readBoard(root), expected);
			assert.deepEqual(await readBoard(root), expected);
		},
	);
});

test("board reader ignores missing board and malformed or misplaced feature lines", async () => {
	await withBoard(null, async (root) => assert.deepEqual(await readBoard(root), new Map()));
	await withBoard(
		[
			"## NOW",
			"- `F200-valid-work` (🟠 ACTIVE): valid",
			"- F201-unquoted (🟠 ACTIVE): invalid",
			"- `F202-no-status` (ACTIVE): invalid",
			"- `F203-no-emoji` (X ACTIVE): invalid",
			"- `F204-no-slug` (🟠 ACTIVE): invalid",
			"- `F205-lower-state` (🟠 active): invalid",
			"## OTHER",
			"- `F206-other-section` (🟠 ACTIVE): ignored",
			"### Subheading",
			"- `F207-subsection` (🟠 ACTIVE): ignored",
			"## PROVEN",
			"- `F208-last-work` (🟢 PROVEN): valid",
		].join("\n"),
		async (root) => {
			assert.deepEqual(await readBoard(root), new Map([
				["f200", { section: "NOW", state: "ACTIVE", line: 2 }],
				["f208", { section: "PROVEN", state: "PROVEN", line: 13 }],
			]));
		},
	);
});
