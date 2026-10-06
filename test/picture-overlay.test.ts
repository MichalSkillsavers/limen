import assert from "node:assert/strict";
import test from "node:test";
import { buildModel, type PictureFile } from "../src/picture/picture-model.ts";

function record(kind: string, id: string, fields: string, body = "An explicit overlay."): PictureFile {
	const directory = kind === "feature" ? "features" : kind === "journey" ? "journeys" : kind === "edge" ? "edges" : "nodes";
	return {
		source: `${directory}/${id}.md`,
		text: `---\nschema: architecture-map/1\nkind: ${kind}\nid: ${id}\nproject: sample\ntitle: ${id}\nstatus: ready\n${fields}\n---\n${body}\n`,
	};
}

const places = [
	record("plant", "sample.plant", "parent: null"),
	record("module", "sample.a", "parent: sample.plant"),
	record("module", "sample.b", "parent: sample.plant"),
	record("module", "sample.child", "parent: sample.a"),
];

test("features light only explicit modules, not ancestors, children or connected places", () => {
	const model = buildModel({
		files: [
			...places,
			record("feature", "sample.feature", "touches:\n  - sample.a\nparent: sample.b"),
			record("edge", "sample.calls", "from: sample.a\nto: sample.b\nrelation: calls"),
		],
	});
	assert.deepEqual(model.features[0]?.touches, ["sample.a"]);
	assert.deepEqual(
		model.nodes.map((node) => [node.id, node.parent]),
		[
			["sample.a", null],
			["sample.child", "sample.a"],
			["sample.b", null],
		],
	);
	assert.deepEqual(
		model.edges.map((edge) => [edge.id, edge.from, edge.to]),
		[["sample.calls", "sample.a", "sample.b"]],
	);
	for (const field of ["parent", "children", "depth"]) assert.equal(Object.hasOwn(model.features[0]!, field), false);
	assert.deepEqual(model.diagnostics, []);
});

test("unknown touches and steps drop only bad references and never invent places or edges", () => {
	const model = buildModel({
		files: [
			...places,
			record("feature", "sample.feature", "touches:\n  - sample.a\n  - sample.missing\n  - sample.plant\n  - sample.feature\n  - sample.journey"),
			record(
				"journey",
				"sample.journey",
				"steps:\n  - sample.b\n  - sample.missing\n  - sample.a\n  - sample.feature\n  - sample.journey\n  - sample.b\n  - sample.plant\n  - sample.a",
			),
		],
	});
	assert.deepEqual(model.features[0]?.touches, ["sample.a"]);
	assert.deepEqual(model.journeys[0]?.steps, ["sample.b", "sample.a", "sample.b", "sample.plant", "sample.a"]);
	assert.deepEqual(
		model.nodes.map((node) => node.id),
		["sample.a", "sample.child", "sample.b"],
	);
	assert.deepEqual(model.edges, []);
	for (const field of ["parent", "children", "depth"]) assert.equal(Object.hasOwn(model.journeys[0]!, field), false);
	assert.equal(model.diagnostics.filter((d) => d.code === "feature.unknown-touch").length, 4);
	assert.equal(model.diagnostics.filter((d) => d.code === "journey.unknown-step").length, 3);
	assert.ok(model.diagnostics.every((d) => d.level === "warn"));
});

test("overlay endpoints are dropped rather than converted to structural edges or inferred touches", () => {
	const model = buildModel({
		files: [
			...places,
			record("feature", "sample.feature", "parent: sample.b"),
			record("journey", "sample.journey", "steps:\n  - sample.a\n  - sample.b"),
			record("edge", "sample.feature-from", "from: sample.feature\nto: sample.b\nrelation: implements"),
			record("edge", "sample.feature-to", "from: sample.a\nto: sample.feature\nrelation: implements"),
			record("edge", "sample.journey-edge", "from: sample.journey\nto: sample.b\nrelation: calls"),
		],
	});
	assert.deepEqual(model.features[0]?.touches, []);
	assert.deepEqual(model.edges, []);
	assert.deepEqual(
		model.nodes.map((node) => node.id),
		["sample.a", "sample.child", "sample.b"],
	);
	assert.deepEqual(
		model.diagnostics.map((diagnostic) => [diagnostic.level, diagnostic.code, diagnostic.id]),
		[
			["warn", "edge.feature", "sample.feature-from"],
			["warn", "edge.feature", "sample.feature-to"],
			["warn", "edge.journey", "sample.journey-edge"],
			["error", "feature.missing-field", "sample.feature"],
		],
	);
});

test("required overlay lists reject missing, scalar, empty, short and malformed values", () => {
	for (const kind of ["feature", "journey"] as const) {
		const key = kind === "feature" ? "touches" : "steps";
		const invalid = ["", `${key}: sample.a`, `${key}: null`, `${key}: []`, `${key}:\n  - 42`, `${key}:\n  - id: sample.a`, `${key}:\n  - sample_bad`];
		if (kind === "journey") invalid.push(`${key}:\n  - sample.a`);
		for (const fields of invalid) {
			const model = buildModel({ files: [...places, record(kind, `sample.${kind}`, fields)] });
			assert.ok(
				model.diagnostics.some(
					(diagnostic) => diagnostic.level === "error" && diagnostic.id === `sample.${kind}` && diagnostic.code === `${kind}.${fields ? "bad-field" : "missing-field"}`,
				),
				`${kind}: ${fields}`,
			);
			assert.deepEqual(model.edges, []);
		}
	}
	const partlyMalformed = buildModel({ files: [...places, record("journey", "sample.journey", "steps:\n  - sample.b\n  - null\n  - sample.a\n  - sample.b")] });
	assert.deepEqual(partlyMalformed.journeys[0]?.steps, ["sample.b", "sample.a", "sample.b"]);
	assert.equal(partlyMalformed.diagnostics.find((diagnostic) => diagnostic.code === "journey.bad-field")?.level, "error");
});

test("graph files with missing or misplaced kinds report errors instead of silently disappearing", () => {
	for (const kind of ["feature", "journey", "edge"] as const) {
		const file = record(kind, `sample.${kind}`, "");
		const missing = { ...file, text: file.text.replace(`kind: ${kind}\n`, "") };
		const misplaced = { ...file, text: file.text.replace(`kind: ${kind}\n`, "kind: module\n") };
		for (const invalid of [missing, misplaced]) {
			const model = buildModel({ files: [...places, invalid] });
			assert.ok(model.diagnostics.some((d) => d.level === "error" && d.id === `sample.${kind}` && d.source === file.source));
			assert.deepEqual(model.features, []);
			assert.deepEqual(model.journeys, []);
			assert.deepEqual(model.edges, []);
		}
	}
});

test("overlay prose escapes executable content and retains sources, owner and unknown metadata", () => {
	const body = "<script>alert(1)</script>\n\n[unsafe](javascript:alert) **Detail**.\n\nowner: overlay-team";
	const model = buildModel({
		files: [
			...places,
			record("feature", "sample.feature", "touches:\n  - sample.a\nsources:\n  - src/feature.ts\npriority: high", body),
			record("journey", "sample.journey", "steps:\n  - sample.a\n  - sample.b\nsources:\n  - src/journey.ts\npriority: low", body),
		],
	});
	for (const overlay of [...model.features, ...model.journeys]) {
		assert.doesNotMatch(overlay.bodyHtml, /<script|href=["']javascript:|owner:/i);
		assert.match(overlay.bodyHtml, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
		assert.match(overlay.bodyHtml, /<strong>Detail<\/strong>/);
		assert.equal(overlay.meta.owner, "overlay-team");
	}
	assert.deepEqual(model.features[0]?.sources, ["src/feature.ts"]);
	assert.equal(model.features[0]?.meta.priority, "high");
	assert.deepEqual(model.journeys[0]?.sources, ["src/journey.ts"]);
	assert.equal(model.journeys[0]?.meta.priority, "low");
	assert.deepEqual(model.diagnostics, []);
});
