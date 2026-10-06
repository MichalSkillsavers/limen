// F925 old suite, frozen at 82 lines. Delete this file when its replacement lands; never add to it.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { ticketCommand } from "../src/commands/ticket.ts";
import { buildPicture } from "../src/picture/picture-build.ts";
import { readTickets } from "../src/picture/tickets.ts";
import { scratchRepo } from "./scratch.ts";

const PLANT = `---
schema: architecture-map/1
kind: plant
id: sample.plant
project: sample
title: Sample
status: ready
parent: null
---
A test plant.
`;
// Each test file runs in its own process; a job's plant root must not leak its real jobs into the number scan.
delete process.env.LIMEN_CONTEXT_ROOT;

test("ticket new skips a number reserved only by a limen branch or a job label", async (t) => {
	const scratch = await scratchRepo();
	t.after(scratch.cleanup);
	await mkdir(join(scratch.root, "spec", "features", "active", "F789-old"), { recursive: true });
	execFileSync("git", ["branch", "limen/2026-10-06-f790-reserved"], { cwd: scratch.root });
	const job = join(scratch.root, ".limen", "jobs", "2026-10-06-other-work-1a2b3c4d");
	await mkdir(job, { recursive: true });
	await writeFile(join(job, "label"), "picture work · F791\n");
	await ticketCommand(["new", "People see reserved numbers"], scratch.root);
	assert.ok(existsSync(join(scratch.root, "spec/features/planned/F792-people-see-reserved-numbers/ticket.md")));
});

test("ticket new allocates above numbers used in done and dropped monthly folders", async (t) => {
	const scratch = await scratchRepo();
	t.after(scratch.cleanup);
	for (const [lane, number] of [
		["active", "F800"],
		["done/2026-09", "F802"],
		["dropped/2026-08", "F801"],
	]) {
		await mkdir(join(scratch.root, "spec", "features", lane!, `${number}-old`), { recursive: true });
	}
	await ticketCommand(["new", "People can review tickets"], scratch.root);
	const path = join(scratch.root, "spec/features/planned/F803-people-can-review-tickets/ticket.md");
	const text = await readFile(path, "utf8");
	assert.match(text, /^---\nopened: \d{4}-\d{2}-\d{2}\n---\n\n# F803 · People can review tickets\n/m);
	const today = new Date();
	assert.match(text, new RegExp(`opened: ${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`));
	assert.match(text, /## Outcome[\s\S]*## Scope[\s\S]*## Out of scope[\s\S]*## Acceptance[\s\S]*## Notes/);
});

test("scaffolded active ticket has no strict picture diagnostic on a clean plant", async (t) => {
	const scratch = await scratchRepo();
	t.after(scratch.cleanup);
	const picture = join(scratch.root, ".limen", "picture");
	await mkdir(join(picture, "nodes"), { recursive: true });
	await writeFile(join(picture, "nodes", "sample.plant.md"), PLANT);
	await ticketCommand(["new", "Operators can read the picture", "--lane", "active", "--touches", "sample.plant"], scratch.root);
	const { tickets, diagnostics } = await readTickets(scratch.root);
	assert.deepEqual(diagnostics, []);
	assert.equal(tickets[0]?.code, "F001");
	assert.deepEqual(tickets[0]?.touches, ["sample.plant"]);
	const model = await buildPicture(picture, join(picture, "map.html"), undefined, undefined, scratch.root);
	assert.deepEqual(model.diagnostics, []);
});

test("ticket new refuses an unknown place before creating a ticket", async (t) => {
	const scratch = await scratchRepo();
	t.after(scratch.cleanup);
	const picture = join(scratch.root, ".limen", "picture");
	await mkdir(join(picture, "nodes"), { recursive: true });
	await writeFile(join(picture, "nodes", "sample.plant.md"), PLANT);
	await assert.rejects(ticketCommand(["new", "Operators see linked work", "--touches", "sample.unknown"], scratch.root), /unknown map place id/);
	const { tickets } = await readTickets(scratch.root);
	assert.deepEqual(tickets, []);
});
