// F925 old suite, frozen at 194 lines. Delete this file when its replacement lands; never add to it.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { checkTickets, readTickets } from "../src/picture/tickets.ts";

async function fixture(t: { after: (fn: () => Promise<void>) => void }): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "picture-tickets-"));
	t.after(() => rm(root, { recursive: true, force: true }));
	return root;
}

async function addTicket(root: string, lane: string, slug: string, content: string): Promise<void> {
	const path = join(root, "spec", "features", lane, slug);
	await mkdir(path, { recursive: true });
	await writeFile(join(path, "ticket.md"), content);
}

test("a ticket with a wrong place id reports an error at its list item while retaining valid places", async (t) => {
	const root = await fixture(t);
	await addTicket(
		root,
		"active",
		"F780-live-picture",
		`---
touches:
  - plant.viewer
  - plant.misspelled
opened: 2026-10-06
---
# F780 · Live picture

## Outcome

Adam can read **one** offline page. It stays current.
`,
	);
	const { tickets, diagnostics } = await readTickets(root);
	assert.deepEqual(diagnostics, []);
	assert.equal(tickets[0]?.purpose, "Adam can read one offline page.");
	assert.deepEqual(tickets[0]?.touches, ["plant.viewer", "plant.misspelled"]);
	const [unknown] = checkTickets(tickets, new Set(["plant.viewer"]));
	assert.ok(unknown);
	assert.equal(unknown?.level, "error");
	assert.equal(unknown?.code, "ticket.unknown-touch");
	assert.equal(unknown?.source, "spec/features/active/F780-live-picture/ticket.md");
	assert.equal(unknown?.line, 4);
});

test("bad ticket fields, impossible dates, and incomplete dated flags report their own lines", async (t) => {
	const root = await fixture(t);
	await addTicket(
		root,
		"active",
		"F781-invalid",
		`---
touch: plant.viewer
touches: plant.viewer
opened: 2026-02-30
needs-adam: "First line\\nsecond line"
wrong: This is wrong.
wrong-on: 2026-10-06
---
# F781 · Invalid ticket
`,
	);
	const { tickets, diagnostics } = await readTickets(root);
	assert.equal(tickets.length, 1);
	assert.deepEqual(
		diagnostics.filter((d) => d.level === "error").map((d) => [d.code, d.line]),
		[
			["ticket.bad-field", 2],
			["ticket.bad-field", 4],
			["ticket.bad-field", 3],
			["ticket.bad-field", 5],
		],
	);
	assert.deepEqual(tickets[0]?.wrong, { problem: "This is wrong.", on: "2026-10-06" });
	assert.equal(tickets[0]?.needsAdam, null);
});

test("missing flag dates and orphan dates fail; missing front matter on active tickets is an error", async (t) => {
	const root = await fixture(t);
	await addTicket(
		root,
		"active",
		"F782-flags",
		`---
opened: 2026-10-06
needs-adam: Decide today.
wrong-on: 2026-10-05
---
# F782 · Decide today
`,
	);
	await addTicket(root, "active", "F783-legacy", "# F783 Legacy ticket\n\n## Outcome\n\nAdam sees the older ticket.\n");
	await addTicket(
		root,
		"done/2026-10",
		"F784-landed",
		`---
landed: 2026-10-06
---
# F784 · Landed ticket
`,
	);
	const { tickets, diagnostics } = await readTickets(root);
	assert.deepEqual(
		tickets.map((ticket) => ticket.id),
		["f782", "f783", "f784"],
	);
	assert.equal(tickets[1]?.title, "Legacy ticket");
	assert.equal(tickets[2]?.lane, "done");
	assert.equal(tickets[2]?.landed, "2026-10-06");
	assert.deepEqual(
		diagnostics.map((d) => [d.level, d.code, d.id, d.line]),
		[
			["error", "ticket.bad-field", "f782", 3],
			["error", "ticket.bad-field", "f782", 4],
			["warn", "ticket.no-touches", "f782", 1],
			["error", "ticket.no-front-matter", "f783", 1],
		],
	);
});

test("malformed YAML and duplicate touches fail at the source; dated flags load without inference", async (t) => {
	const root = await fixture(t);
	await addTicket(
		root,
		"active",
		"F785-duplicate",
		`---
touches:
  - plant.viewer
  - plant.viewer
opened: 2026-10-06
needs-adam: Keep the atlas?
needs-adam-on: 2026-10-05
wrong: The context is lost.
wrong-on: 2026-10-04
---
# F785 · Duplicate place
`,
	);
	await addTicket(root, "active", "F786-unclosed", "---\ntouches:\n  - plant.viewer\n");
	const { tickets, diagnostics } = await readTickets(root);
	assert.deepEqual(tickets[0]?.needsAdam, { ask: "Keep the atlas?", on: "2026-10-05" });
	assert.deepEqual(tickets[0]?.wrong, { problem: "The context is lost.", on: "2026-10-04" });
	assert.deepEqual(
		diagnostics.filter((d) => d.level === "error").map((d) => [d.id, d.code, d.line]),
		[
			["f785", "ticket.bad-field", 4],
			["f786", "ticket.bad-field", 1],
		],
	);
});

test("two folders with one feature number keep the first work item and warn with a repair on the second", async (t) => {
	const root = await fixture(t);
	await addTicket(root, "active", "F778-finish-signal", "---\nopened: 2026-10-06\n---\n# F778 · Finish signal\n");
	await addTicket(root, "active", "F778-job-done", "# F778 · Job done\n");
	await addTicket(root, "done/2026-10", "F778-older", "# F778 · Older\n");
	const { tickets, diagnostics } = await readTickets(root);
	assert.deepEqual(
		tickets.map((ticket) => ticket.path),
		["spec/features/active/F778-finish-signal/ticket.md"],
	);
	assert.deepEqual(
		diagnostics.filter((d) => d.code === "ticket.duplicate-id").map((d) => [d.level, d.source, d.line]),
		[
			["warn", "spec/features/active/F778-job-done/ticket.md", 1],
			["warn", "spec/features/done/2026-10/F778-older/ticket.md", 1],
		],
	);
	assert.ok(diagnostics.every((d) => /; fix: \S.+/.test(d.message)));
});

test("all ticket diagnostics give a source line and a concrete fix", async (t) => {
	const root = await fixture(t);
	await addTicket(root, "active", "F788-no-front-matter", "# F788 · Unlinked\n");
	await addTicket(root, "active", "F789-invalid", "---\ntouches:\n  - missing.place\nopened: 2026-02-30\nwrong-on: 2026-10-06\n---\n# F789 · Invalid\n");
	const { tickets, diagnostics: parsed } = await readTickets(root);
	const diagnostics = [...parsed, ...checkTickets(tickets, new Set(["present.place"]))];
	assert.ok(diagnostics.some((d) => d.code === "ticket.no-front-matter"));
	assert.ok(diagnostics.some((d) => d.code === "ticket.unknown-touch"));
	for (const item of diagnostics) {
		assert.match(item.code, /^ticket\./);
		assert.match(item.source ?? "", /\/ticket\.md$/);
		assert.ok(item.line !== null && item.line > 0);
		assert.match(item.message, /; fix: \S.+/);
	}
});
