import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parseFrontmatter } from "../src/picture/frontmatter.ts";
import { readViewer } from "../src/picture/html.ts";
import { renderMarkdown } from "../src/picture/markdown.ts";
import { buildPicture, readPicture } from "../src/picture/picture-build.ts";
import { buildModel, type PictureFile } from "../src/picture/picture-model.ts";
import { limen, scratchRepo } from "./scratch.ts";

const revision = "abcdef0123456789abcdef0123456789abcdef01";
const now = new Date("2026-10-02T18:00:00Z");

function record(id: string, fields: Readonly<Record<string, string>>, body = "A module. More detail."): PictureFile {
	const kind = fields.kind ?? "module";
	const values = {
		schema: "architecture-map/1",
		kind,
		id,
		project: "sample",
		title: id,
		status: "ready",
		...(["plant", "module"].includes(kind) ? { parent: "sample.plant" } : {}),
		...fields,
	};
	return {
		source: `${kind === "edge" ? "edges" : kind === "feature" ? "features" : kind === "journey" ? "journeys" : "nodes"}/${id}.md`,
		text: `---\n${Object.entries(values)
			.map(([key, value]) => `${key}: ${value}`)
			.join("\n")}\n---\n${body}\n`,
	};
}

const plant = record("sample.plant", { kind: "plant", parent: "null", title: "Sample" });
const moduleFile = (id: string, parent = "sample.plant") => record(id, { parent });
const edgeFile = (id: string, from: string, to: string) => record(id, { kind: "edge", from, to, relation: "calls" });

test("frontmatter recovers at malformed boundaries without overwriting first values", () => {
	const parsed = parseFrontmatter(
		'\uFEFF---\r\nid: first\r\ntitle: "open\r\nlist: [a, [b]]\r\nid: second\r\nsources:\r\n  - good\r\n   - misplaced\r\nlast: kept\r\n---\r\nBody\r\n',
	);
	assert.equal(parsed.ok, true);
	assert.equal(parsed.data.id, "first");
	assert.equal(parsed.data.last, "kept");
	assert.deepEqual(parsed.data.sources, ["good"]);
	assert.equal(Object.hasOwn(parsed.data, "title"), false);
	assert.equal(Object.hasOwn(parsed.data, "list"), false);
	assert.deepEqual(
		parsed.errors.map((error) => error.line),
		[3, 4, 5, 8],
	);
	assert.equal(parsed.bodyLine, 11);
	assert.equal(parsed.body, "Body\n");
	for (const text of ["no fence", "---\nid: unclosed", ""]) {
		const failed = parseFrontmatter(text);
		assert.equal(failed.ok, false);
		assert.equal(failed.errors[0]?.line, 1);
	}
});

test("frontmatter supports quoted map lists and treats prototype keys as ordinary data", () => {
	const parsed = parseFrontmatter("---\n__proto__: literal\nsources: [\"a, b\", 'it''s a path']\nitems:\n  - __proto__: item\n    title: \"A: B\"\n---\n");
	assert.deepEqual(parsed.errors, []);
	assert.deepEqual(parsed.data.sources, ["a, b", "it's a path"]);
	assert.equal(Object.getPrototypeOf(parsed.data), Object.prototype);
	assert.equal(Object.hasOwn(parsed.data, "__proto__"), true);
	assert.deepEqual(parsed.data.items, [JSON.parse('{"__proto__":"item","title":"A: B"}')]);
});

test("Markdown escapes raw HTML and rejects executable links while preserving useful formatting", () => {
	const html = renderMarkdown(
		'<img src=x onerror="alert(1)">\n\n[unsafe](javascript:alert) [data](data:text/html,evil) [safe](https://example.com)\n\n**Strong** and `code`.\n\n```html\n<script>alert(1)</script>\n```',
	);
	assert.doesNotMatch(html, /<img|<script|href=["'](?:javascript|data):/i);
	assert.match(html, /&lt;img/);
	assert.match(html, /href="https:\/\/example.com"/);
	assert.match(html, /<strong>Strong<\/strong>/);
	assert.match(html, /<code>code<\/code>/);
	assert.match(html, /&lt;script&gt;/);
});

test("parent cycles break deterministically and do not discard dependent children", () => {
	const files = [plant, moduleFile("sample.c", "sample.a"), moduleFile("sample.b", "sample.c"), moduleFile("sample.a", "sample.b"), moduleFile("sample.d", "sample.b")];
	const model = buildModel({ files, now });
	assert.deepEqual(model, buildModel({ files: [...files].reverse(), now }));
	assert.deepEqual(
		model.nodes.map((node) => [node.id, node.parent, node.depth]),
		[
			["sample.a", null, 0],
			["sample.c", "sample.a", 1],
			["sample.b", "sample.c", 2],
			["sample.d", "sample.b", 3],
		],
	);
	const cycle = model.diagnostics.find((diagnostic) => diagnostic.code === "node.parent-cycle");
	assert.equal(cycle?.level, "error");
	assert.equal(cycle?.id, "sample.a");
	assert.equal(cycle?.source, "nodes/sample.a.md");
	assert.equal(cycle?.line, 8);
	const self = buildModel({ files: [plant, moduleFile("sample.self", "sample.self")], now });
	assert.equal(self.nodes[0]?.parent, null);
	assert.equal(self.diagnostics[0]?.code, "node.parent-cycle");
});

test("missing parents are visible orphans and missing edge endpoints are never invented", () => {
	const model = buildModel({
		files: [
			plant,
			moduleFile("sample.a", "sample.missing"),
			moduleFile("sample.b"),
			edgeFile("sample.valid", "sample.a", "sample.b"),
			edgeFile("sample.dangling", "sample.a", "sample.missing"),
			edgeFile("sample.self", "sample.a", "sample.a"),
			edgeFile("sample.root", "sample.plant", "sample.a"),
		],
		now,
	});
	assert.deepEqual(
		model.nodes.map((node) => node.id),
		["sample.a", "sample.b"],
	);
	assert.equal(model.nodes[0]?.parent, null);
	assert.deepEqual(
		model.edges.map((edge) => [edge.id, edge.from, edge.to]),
		[["sample.valid", "sample.a", "sample.b"]],
	);
	assert.deepEqual(new Set(model.diagnostics.map((diagnostic) => diagnostic.code)), new Set(["node.unknown-parent", "edge.dangling", "edge.self", "edge.plant"]));
});

test("researched revision belongs to the plant and trailing owner stays metadata", () => {
	const researched = record("sample.plant", { kind: "plant", parent: "null", revision: revision.toUpperCase(), sources: "[src/a.ts]" }, "The application.\n\nowner: team");
	const child = record("sample.a", { sources: "[src/b.ts, src/c.ts]" }, "A module.\n\nowner: module-team");
	const model = buildModel({ files: [researched, child], now });
	assert.equal(model.project.revision, revision);
	assert.deepEqual(model.project.sources, ["src/a.ts"]);
	assert.equal(model.project.meta.owner, "team");
	assert.doesNotMatch(model.project.descriptionHtml, /owner:/);
	assert.deepEqual(model.nodes[0]?.sources, ["src/b.ts", "src/c.ts"]);
	assert.equal(model.nodes[0]?.meta.owner, "module-team");
	assert.equal(buildModel({ files: [plant], now }).project.revision, null);
	const invalid = buildModel({ files: [record("sample.plant", { kind: "plant", parent: "null", revision: "abc123" })], now });
	assert.equal(invalid.project.revision, null);
});

test("unknown schema retains gold diagnostics rather than silently accepting an alias", () => {
	const unknown = { ...plant, text: plant.text.replace("architecture-map/1", "architecture-map/2") };
	const model = buildModel({ files: [unknown], now });
	assert.equal(model.project.rootId, "sample.plant");
	assert.equal(model.diagnostics.find((diagnostic) => diagnostic.code === "schema.version")?.level, "warn");
});

test("discovery reads flat overlays but ignores nested files; build embeds untrusted data safely", async (context) => {
	const dir = await mkdtemp(join(tmpdir(), "limen-picture-"));
	context.after(() => rm(dir, { recursive: true, force: true }));
	for (const path of ["nodes", "edges", "features", "journeys", "nodes/nested", "edges/nested", "features/nested", "journeys/nested"]) {
		await mkdir(join(dir, path), { recursive: true });
	}
	const unsafe = record("sample.a", { title: "'</script><script>globalThis.pwned=1</script>'" }, "<script>globalThis.pwned=2</script>");
	const feature = record("sample.feature", { kind: "feature", touches: "\n  - sample.a" });
	const journey = record("sample.journey", { kind: "journey", steps: "\n  - sample.a\n  - sample.b" });
	for (const file of [plant, unsafe, moduleFile("sample.b"), edgeFile("sample.valid", "sample.a", "sample.b"), feature, journey]) {
		await writeFile(join(dir, file.source), file.text);
	}
	for (const directory of ["nodes", "edges", "features", "journeys"]) {
		await writeFile(join(dir, directory, "nested/ignored.md"), "malformed nested record");
		await writeFile(join(dir, directory, "ignored.txt"), "not Markdown");
	}
	await writeFile(join(dir, "README.md"), "not a record");
	const read = await readPicture(dir);
	assert.deepEqual(read.nodes.map((node) => node.id).sort(), ["sample.a", "sample.b"]);
	assert.deepEqual(
		read.features.map((item) => [item.id, item.touches]),
		[["sample.feature", ["sample.a"]]],
	);
	assert.deepEqual(
		read.journeys.map((item) => [item.id, item.steps]),
		[["sample.journey", ["sample.a", "sample.b"]]],
	);
	assert.equal(read.project.revision, null);
	assert.deepEqual(read.diagnostics, []);
	const out = join(dir, "output/picture.html");
	const built = await buildPicture(dir, out, undefined, revision);
	assert.equal(built.project.revision, null, "HEAD never stamps researched revision");
	const html = await readFile(out, "utf8");
	const embedded = /<script type="application\/json" id="archmap-data"[^>]*>([^]*?)<\/script>/.exec(html)?.[1];
	assert.ok(embedded);
	assert.doesNotMatch(embedded, /</);
	assert.doesNotMatch(html, /<script>globalThis\.pwned=/);
});

test("missing datasets preserve ENOENT and broken graph paths fail honestly", async (context) => {
	const dir = await mkdtemp(join(tmpdir(), "limen-picture-io-"));
	context.after(() => rm(dir, { recursive: true, force: true }));
	await assert.rejects(readPicture(join(dir, "absent")), { code: "ENOENT" });
	const empty = await readPicture(dir);
	assert.equal(empty.project.revision, null);
	assert.equal(empty.project.rootId, null);
	await writeFile(join(dir, "nodes"), "not a directory");
	await assert.rejects(readPicture(dir), { code: "ENOTDIR" });
});

test("build warns once for each cited path missing from the project root and still renders the map", async (context) => {
	const scratch = await scratchRepo();
	context.after(() => scratch.cleanup());
	const dir = join(scratch.root, ".limen/picture");
	for (const directory of ["nodes", "features"]) await mkdir(join(dir, directory), { recursive: true });
	await mkdir(join(scratch.root, "src"));
	await writeFile(join(scratch.root, "src/real.ts"), "export const real = 1;\n");
	const files = [
		record("sample.plant", { kind: "plant", parent: "null", sources: "\n  - ./src/" }),
		record("sample.a", { sources: "\n  - src/real.ts\n  - src/gone.ts" }),
		record("sample.feature", { kind: "feature", touches: "\n  - sample.a", sources: "\n  - src/feature-gone.ts" }),
	];
	for (const file of files) await writeFile(join(dir, file.source), file.text);
	const result = limen(scratch, "picture", "build", "--strict", "--json", join(dir, "model.json"));
	assert.equal(result.status, 0, result.stderr);
	assert.deepEqual(
		result.stderr.split("\n").filter((line) => /^(error|warn|info) /.test(line)),
		[
			'warn source.missing features/sample.feature.md:10: source "src/feature-gone.ts" does not exist in the project root',
			'warn source.missing nodes/sample.a.md:9: source "src/gone.ts" does not exist in the project root',
		],
	);
	assert.match(result.stdout, /^picture: 1 places, 0 edges; wrote .*map\.html\n$/);
	assert.match(await readFile(join(dir, "map.html"), "utf8"), /id="archmap-data"/);
	const model = JSON.parse(await readFile(join(dir, "model.json"), "utf8")) as { diagnostics: { code: string; id: string; line: number }[] };
	assert.deepEqual(
		model.diagnostics.map((diagnostic) => [diagnostic.code, diagnostic.id, diagnostic.line]),
		[
			["source.missing", "sample.feature", 10],
			["source.missing", "sample.a", 9],
		],
	);
});

test("missing or malformed shipped viewer assets fail rather than substitute another view", async (context) => {
	const dir = await mkdtemp(join(tmpdir(), "limen-picture-viewer-"));
	context.after(() => rm(dir, { recursive: true, force: true }));
	await assert.rejects(readViewer(dir), { code: "ENOENT" });
	await writeFile(join(dir, "template.html"), "<!-- ARCHMAP:CSS --><!-- ARCHMAP:JS -->");
	await writeFile(join(dir, "viewer.css"), "");
	await writeFile(join(dir, "viewer.js"), "");
	await assert.rejects(readViewer(dir), /DATA marker exactly once/);
	await writeFile(join(dir, "template.html"), "<!-- ARCHMAP:CSS --><!-- ARCHMAP:JS --><!-- ARCHMAP:DATA -->");
	await assert.rejects(readViewer(dir), /DATA marker before the JS marker/);
});

test("contract ids reject leading digits, underscore and empty or hyphen-led segments", () => {
	const invalid = ["1sample", "sample_under", "sample..empty", "sample.-bad"];
	const valid = ["sample", "sample-part.2nd"];
	const model = buildModel({ files: [plant, ...[...invalid, ...valid].map((id) => moduleFile(id))], now });
	assert.deepEqual(
		model.diagnostics
			.filter((diagnostic) => diagnostic.code === "node.bad-id")
			.map((diagnostic) => diagnostic.id)
			.sort(),
		invalid.sort(),
	);
});
