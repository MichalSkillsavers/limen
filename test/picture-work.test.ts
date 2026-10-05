import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { limen, scratchRepo } from "./scratch.ts";

const plant = `---
schema: architecture-map/1
kind: plant
id: sample.plant
project: sample
title: Sample plant
status: ready
parent: null
---
The sample plant.
`;
const place = `---
schema: architecture-map/1
kind: module
id: sample.viewer
project: sample
title: Offline viewer
status: ready
parent: sample.plant
---
An offline viewer.
`;
const mapFeature = `---
schema: architecture-map/1
kind: feature
id: limen.feature.f013
project: sample
title: Finished work
status: ready
touches:
  - sample.viewer
---
The finished feature.
`;
const activeTicket = `---
touches:
  - sample.viewer
opened: 2026-10-05
needs-adam: Choose whether to ship the live viewer.
needs-adam-on: 2026-10-06
wrong: The old viewer has no live work.
wrong-on: 2026-10-04
---
# F780 · Live picture viewer

## Outcome

Adam reads his map and decisions in one offline page. The board remains authoritative.
`;
const doneTicket = `---
opened: 2026-10-01
landed: 2026-10-03
---
# F013 · Finished picture work

## Outcome

The viewer now shows a finished feature.
`;

test("picture build joins ticket, board and map work; repeat builds have identical bytes", async (context) => {
	const scratch = await scratchRepo();
	const picture = await mkdtemp(join(tmpdir(), "picture-work-"));
	context.after(() => Promise.all([scratch.cleanup(), rm(picture, { recursive: true, force: true })]));
	for (const path of ["nodes", "features"]) await mkdir(join(picture, path));
	await writeFile(join(picture, "nodes/sample.plant.md"), plant);
	await writeFile(join(picture, "nodes/sample.viewer.md"), place);
	await writeFile(
		join(picture, "nodes/sample.viewer.inner.md"),
		place
			.replace("id: sample.viewer", "id: sample.viewer.inner")
			.replace("title: Offline viewer", "title: Viewer internals")
			.replace("parent: sample.plant", "parent: sample.viewer"),
	);
	await writeFile(join(picture, "nodes/sample.worker.md"), place.replace("id: sample.viewer", "id: sample.worker").replace("title: Offline viewer", "title: Worker"));
	await writeFile(join(picture, "features/limen.feature.f013.md"), mapFeature);
	const activePath = "spec/features/active/F780-live-picture/ticket.md";
	const donePath = "spec/features/done/2026-10/F013-finished-picture/ticket.md";
	for (const path of [activePath, donePath, "spec/build.md"]) await mkdir(dirname(join(scratch.root, path)), { recursive: true });
	await writeFile(join(scratch.root, activePath), activeTicket);
	await writeFile(join(scratch.root, donePath), doneTicket);
	await writeFile(
		join(scratch.root, "spec/build.md"),
		"# Build\n\n## NOW\n\n- `F780-live-picture` (🟠 ACTIVE): Live picture.\n\n## PROVEN\n\n- `F013-finished-picture` (🟢 PROVEN): Finished work.\n",
	);
	const html = join(picture, "map.html");
	const json = join(picture, "map.json");
	const args = ["picture", "build", "--dir", picture, "--out", html, "--json", json, "--strict"];
	const first = limen(scratch, ...args);
	assert.equal(first.status, 0, first.stderr);
	const firstHtml = await readFile(html);
	const firstJson = await readFile(json);
	const second = limen(scratch, ...args);
	assert.equal(second.status, 0, second.stderr);
	assert.deepEqual(await readFile(html), firstHtml);
	assert.deepEqual(await readFile(json), firstJson);
	const model = JSON.parse(firstJson.toString());
	assert.equal(model.schema, "architecture-map-model/3");
	assert.equal(model.generatedAt, "2026-10-06T00:00:00Z");
	assert.deepEqual(
		model.work.map((work: { id: string }) => work.id),
		["f013", "f780"],
	);
	const live = model.work[1];
	assert.deepEqual(live.board, { section: "NOW", state: "ACTIVE", line: 5 });
	assert.deepEqual(live.touches, ["sample.viewer"]);
	assert.equal(live.touchSource, "ticket");
	assert.equal(live.purpose, "Adam reads his map and decisions in one offline page.");
	assert.equal(live.path, activePath);
	assert.equal(model.work[0].mapFeature, "limen.feature.f013");
	assert.equal(model.work[0].touchSource, "map");
	assert.deepEqual(model.work[0].touches, ["sample.viewer"]);
	assert.deepEqual(model.pins.changed, [{ work: "f013", date: "2026-10-03", text: "Finished picture work", scope: "Offline viewer" }]);
	assert.deepEqual(model.pins.wrong, [{ work: "f780", date: "2026-10-04", text: "The old viewer has no live work.", scope: "Offline viewer" }]);
	assert.deepEqual(model.pins.needs, [{ work: "f780", date: "2026-10-06", text: "Choose whether to ship the live viewer.", scope: "Offline viewer" }]);
	assert.deepEqual(
		model.days.map((day: { date: string }) => day.date),
		["2026-10-06", "2026-10-05", "2026-10-04", "2026-10-03", "2026-10-01"],
	);
	assert.deepEqual(model.days[0].items, [{ work: "f780", kind: "needs-adam", text: "Choose whether to ship the live viewer." }]);
	for (const [code, touches, problem] of [
		["F777", [], "An unmapped problem."],
		["F778", ["sample.viewer", "sample.viewer.inner"], "Two places in one module."],
		["F779", ["sample.viewer", "sample.worker"], "Two modules."],
	] as const) {
		const path = `spec/features/active/${code}-scope/ticket.md`;
		await mkdir(dirname(join(scratch.root, path)), { recursive: true });
		await writeFile(
			join(scratch.root, path),
			`---
${touches.length ? `touches:\n${touches.map((id) => `  - ${id}`).join("\n")}\n` : ""}wrong: ${problem}
wrong-on: 2026-10-06
---
# ${code} · Pin scope

## Outcome

Readers see the right scope.
`,
		);
	}
	const scoped = limen(scratch, ...args);
	assert.equal(scoped.status, 0, scoped.stderr);
	assert.deepEqual(
		JSON.parse(await readFile(json, "utf8"))
			.pins.wrong.slice(0, 3)
			.map((pin: { scope: string }) => pin.scope),
		["", "Offline viewer", "2 places in 2 modules"],
	);
	await writeFile(join(scratch.root, activePath), activeTicket.replace("sample.viewer", "sample.absent"));
	const invalid = limen(scratch, ...args);
	assert.equal(invalid.status, 1);
	assert.match(invalid.stderr, /ticket\.unknown-touch.*F780-live-picture\/ticket\.md:3.*sample\.absent/);
});
