import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Script } from "node:vm";

type Route = { view: string; id?: string; tab?: string; ev?: number | null; via?: string; step?: number | null };
type Lighting = { lit: Iterable<string>; focus: string | null; badges: Record<string, number[]>; text: string };
type View = {
	modules: { id: string; layer: string; places: string[] }[];
	places: Record<string, unknown>;
	work: { id: string; group: string; touches: string[] }[];
	days: { id: string }[];
	pins: { kind: string; work: string; date: string }[];
};
type Viewer = {
	adapt: (model: unknown) => View;
	parse: (hash: string) => Route;
	hashOf: (route: Route) => string;
	allRoutes: () => string[];
	renderMastHtml: (route: Route) => string;
	readHtml: (route: Route) => string;
	lighting: (route: Route) => Lighting;
};

const node = (id: string, title: string, parent: string | null, children: string[] = []) => ({
	id,
	title,
	kind: "module",
	parent,
	status: "ready",
	summary: `${title} does one job.`,
	sources: [`src/${id}.ts`],
	bodyHtml: `<p>${title} body.</p>`,
	source: `nodes/${id}.md`,
	children,
	depth: parent ? 1 : 0,
	meta: {},
});
const edge = (id: string, from: string, to: string) => ({
	id,
	from,
	to,
	kind: "calls",
	title: `${from} to ${to}`,
	status: "ready",
	summary: "A call.",
	bodyHtml: "",
	sources: ["src/x.ts"],
	source: `edges/${id}.md`,
	meta: {},
});
const work = (id: string, fields: Record<string, unknown>) => ({
	id,
	code: id.toUpperCase(),
	slug: `${id}-slug`,
	title: `Title of ${id}`,
	lane: "active",
	board: null,
	purpose: `Purpose of ${id}.`,
	outcome: `Purpose of ${id}. More outcome.`,
	touches: [],
	touchSource: "ticket",
	opened: "2026-10-01",
	landed: null,
	needsAdam: null,
	wrong: null,
	path: `spec/features/active/${id.toUpperCase()}-slug/ticket.md`,
	mapFeature: null,
	...fields,
});

// Entry is the childless top module with the most outgoing cross-module edges (3);
// the floor has the most incoming ones (3). Nodes are listed floor first on purpose.
const fixture = {
	schema: "architecture-map-model/3",
	generatedAt: "2026-10-05T00:00:00.000Z",
	project: {
		id: "s",
		rootId: "s.plant",
		revision: "abc1234",
		title: "Sample plant",
		status: "ready",
		sources: ["spec/vision.md"],
		summary: "A sample plant.",
		descriptionHtml: "<p>A sample plant.</p>",
	},
	nodes: [
		node("s.core", "Core", null, ["s.core.store", "s.core.queue"]),
		node("s.core.store", "Store", "s.core"),
		node("s.core.queue", "Queue", "s.core"),
		node("s.app", "App", null, ["s.app.api", "s.app.ui"]),
		node("s.app.api", "API", "s.app"),
		node("s.app.ui", "UI", "s.app"),
		node("s.cli", "Command line", null),
	],
	edges: [
		edge("e1", "s.cli", "s.app.api"),
		edge("e2", "s.cli", "s.core.store"),
		edge("e3", "s.cli", "s.app.ui"),
		edge("e4", "s.app.api", "s.core.store"),
		edge("e5", "s.app.ui", "s.core.queue"),
		edge("e6", "s.app.ui", "s.app.api"),
	],
	features: [
		{
			id: "s.feature.f101",
			title: "Store feature",
			kind: "feature",
			status: "ready",
			summary: "Store feature.",
			sources: [],
			bodyHtml: "",
			source: "features/f101.md",
			meta: {},
			touches: ["s.core.store"],
		},
	],
	journeys: [
		{
			id: "s.journey.run",
			title: "Run a job",
			kind: "journey",
			status: "ready",
			summary: "A job runs.",
			sources: ["src/run.ts"],
			bodyHtml: "",
			source: "journeys/run.md",
			meta: {},
			steps: ["s.cli", "s.app.api", "s.core.store", "s.app.api"],
		},
	],
	diagnostics: [],
	work: [
		work("f101", {
			touches: ["s.core.store", "s.app.api"],
			board: { section: "NOW", state: "ACTIVE", line: 3 },
			needsAdam: { ask: "Ship the store now?", on: "2026-10-04" },
			mapFeature: "s.feature.f101",
		}),
		work("f102", { touches: ["s.core.queue"], wrong: { problem: "The queue drops jobs.", on: "2026-10-05" } }),
		work("f103", { lane: "done/2026-10", touches: ["s.cli"], landed: "2026-10-03", board: { section: "PROVEN", state: "PROVEN", line: 9 } }),
		work("f104", { lane: "planned", title: 'Use <b> & "quotes"', touches: [], touchSource: "none" }),
		work("f105", { lane: "done/2026-09", touches: ["s.app.ui"], landed: "2026-09-28" }),
	],
	pins: {
		changed: [
			{ work: "f103", date: "2026-10-03", text: "Title of f103", scope: "Command line" },
			{ work: "f105", date: "2026-09-28", text: "Title of f105", scope: "UI" },
		],
		wrong: [{ work: "f102", date: "2026-10-05", text: "The queue drops jobs.", scope: "Queue" }],
		needs: [{ work: "f101", date: "2026-10-04", text: "Ship the store now?", scope: "2 places" }],
	},
	days: [
		{ date: "2026-10-05", items: [{ work: "f102", kind: "wrong", text: "The queue drops jobs." }] },
		{ date: "2026-10-04", items: [{ work: "f101", kind: "needs-adam", text: "Ship the store now?" }] },
		{
			date: "2026-10-03",
			items: [
				{ work: "f103", kind: "landed", text: "Title of f103" },
				{ work: "f104", kind: "opened", text: 'Use <b> & "quotes"' },
			],
		},
	],
};

// Run the shipped script in its own closure and replace only its startup call, so the
// tests reach the real adapter, router and renderers without a browser.
async function viewer(raw: unknown = fixture): Promise<Viewer> {
	const source = await readFile(new URL("../picture/viewer/viewer.js", import.meta.url), "utf8");
	const startup = /\n\tinit\(\);\n\}\)\(\);\s*$/;
	assert.match(source, startup, "viewer startup remains available for the isolated harness");
	const bridge = `
	use(adapt(rawModel));
	return { adapt: adapt, parse: parse, hashOf: hashOf, allRoutes: allRoutes, renderMastHtml: renderMastHtml, readHtml: readHtml, lighting: lighting };
})();`;
	const none = () => null;
	const element = { textContent: "", innerHTML: "", addEventListener() {}, querySelector: none, querySelectorAll: () => [] };
	const document = { getElementById: () => element, querySelector: none, querySelectorAll: () => [], addEventListener() {}, documentElement: element, body: element };
	const location = { hash: "" };
	return new Script(source.replace(startup, bridge), { filename: "picture/viewer/viewer.js" }).runInNewContext({
		rawModel: raw,
		document,
		location,
		history: { pushState() {}, replaceState() {} },
		window: { location, addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) },
		CSS: { escape: (s: string) => s },
	}) as Viewer;
}

const BAD_WORD = /\b(undefined|null|NaN)\b/;
const sorted = (xs: Iterable<string>) => Array.from(xs).sort();
// A pin date may be shown as ISO or as "4 Oct"; either is fine, a missing date is not.
const shows = (html: string, iso: string) => {
	const d = new Date(`${iso}T00:00:00Z`);
	const short = `${d.getUTCDate()} ${d.toLocaleString("en", { month: "short", timeZone: "UTC" })}`;
	return html.includes(iso) || html.includes(short);
};

test("every reachable route round-trips through parse and hashOf", async () => {
	const v = await viewer();
	const routes = v.allRoutes();
	for (const hash of [
		"#plant/work",
		"#plant/journeys",
		"#plant/days",
		"#plant/places",
		"#work/f101",
		"#work/f104",
		"#place/s.core.store",
		"#place/s.cli",
		"#place/s.app.api/via/work/f101",
		"#module/s.core",
		"#journey/s.journey.run",
		"#journey/s.journey.run/step/4",
		"#day/2026-10-05",
	])
		assert.ok(routes.includes(hash), `allRoutes() includes ${hash}`);
	assert.ok(!routes.includes("#journey/s.journey.run/step/5"), "no step past the last one");
	assert.ok(!routes.includes("#place/s.core.queue/via/work/f101"), "a via route needs a touched place");
	assert.equal(new Set(routes).size, routes.length, "routes are unique");
	for (const hash of routes) assert.equal(v.hashOf(v.parse(hash)), hash, `${hash} round-trips`);
});

test("no route renders undefined, null, or NaN", async () => {
	const v = await viewer();
	for (const hash of v.allRoutes()) {
		const r = v.parse(hash);
		for (const [name, html] of [
			["mast", v.renderMastHtml(r)],
			["read", v.readHtml(r)],
			["lighting", v.lighting(r).text],
		] as const)
			assert.doesNotMatch(html, BAD_WORD, `${name} for ${hash}`);
	}
});

test("unknown ids and malformed hashes fall back to the work list", async () => {
	const v = await viewer();
	for (const hash of ["", "#", "#plant/bogus", "#work/f999", "#place/nowhere", "#module/s.core.store", "#journey/missing", "#day/2026-01-01", "#nonsense/a/b/c", "#%E0%A4%A"])
		assert.equal(v.hashOf(v.parse(hash)), "#plant/work", hash);
	assert.equal(v.hashOf(v.parse("#journey/s.journey.run/step/99")), "#journey/s.journey.run", "a step past the end opens the journey");
	assert.equal(v.hashOf(v.parse("#place/s.core.queue/via/work/f101")), "#place/s.core.queue", "via an item that does not touch the place drops the via");
});

test("layer segments after ~ do not change the base route", async () => {
	const v = await viewer();
	for (const base of ["#work/f101", "#place/s.app.api/via/work/f101", "#journey/s.journey.run/step/2", "#plant/days"])
		assert.deepEqual(v.parse(`${base}~work/f102~place/s.core.queue`), v.parse(base), base);
	assert.equal(v.hashOf(v.parse("~work/f102")), "#plant/work", "an empty base is the plant");
});

test("the mast shows the newest pin of each kind with its date", async () => {
	const v = await viewer();
	const pins = v.adapt(fixture).pins;
	assert.deepEqual(sorted(pins.map((p) => p.kind)), ["changed", "needs", "wrong"]);
	assert.equal(pins.find((p) => p.kind === "changed")?.work, "f103", "the newest change wins");
	const html = v.renderMastHtml(v.parse("#plant/work"));
	assert.ok(html.includes("#work/f101") && shows(html, "2026-10-04"), "Needs Adam pin links its work and shows its date");
	assert.ok(html.includes("#work/f102") && shows(html, "2026-10-05"), "Wrong pin links its work and shows its date");
	assert.ok(html.includes("#work/f103") && shows(html, "2026-10-03"), "Changed pin links its work and shows its date");
	assert.ok(!html.includes("#work/f105"), "an older change is not pinned");
});

test("the adapter groups work by its signal", async () => {
	const v = await viewer();
	const group = Object.fromEntries(v.adapt(fixture).work.map((w) => [w.id, w.group]));
	assert.equal(group.f101, "needs");
	assert.equal(group.f102, "wrong");
	assert.equal(group.f103, "done");
	assert.equal(group.f104, "planned");
});

test("the atlas puts the busiest sender on top and the busiest receiver on the floor", async () => {
	const v = await viewer();
	const modules = v.adapt(fixture).modules;
	const layer = Object.fromEntries(modules.map((m) => [m.id, m.layer]));
	assert.deepEqual(layer, { "s.core": "floor", "s.app": "mid", "s.cli": "entry" });
	assert.deepEqual(modules.find((m) => m.id === "s.cli")?.places, ["s.cli"], "a childless module is its own place");
	assert.deepEqual(sorted(modules.find((m) => m.id === "s.core")?.places ?? []), ["s.core.queue", "s.core.store"]);
});

test("a work item lights exactly the places it touches", async () => {
	const v = await viewer();
	assert.deepEqual(sorted(v.lighting(v.parse("#work/f101")).lit), ["s.app.api", "s.core.store"]);
	assert.deepEqual(sorted(v.lighting(v.parse("#place/s.app.api/via/work/f101")).lit), ["s.app.api", "s.core.store"], "a place opened under work keeps its lighting");
	assert.deepEqual(sorted(v.lighting(v.parse("#work/f104")).lit), [], "work that names no place lights nothing");
	assert.deepEqual(sorted(v.lighting(v.parse("#day/2026-10-05")).lit), ["s.core.queue"], "a day lights the places of its work");
});

test("journey badges keep repeated step numbers", async () => {
	const v = await viewer();
	const l = v.lighting(v.parse("#journey/s.journey.run/step/4"));
	assert.deepEqual(Array.from(l.badges["s.app.api"] ?? []), [2, 4]);
	assert.deepEqual(Array.from(l.badges["s.cli"] ?? []), [1]);
	assert.equal(l.focus, "s.app.api", "the open step is the focused place");
});

test("an open place lists the work that touches it, and only that work", async () => {
	const v = await viewer();
	const html = v.readHtml(v.parse("#place/s.core.store"));
	assert.ok(html.includes('href="#work/f101"'));
	assert.ok(!html.includes('href="#work/f102"'));
});

test("ticket text is escaped in the column and the mast", async () => {
	const v = await viewer();
	const html = v.readHtml(v.parse("#work/f104"));
	assert.ok(html.includes("&lt;b&gt;"), "angle brackets are escaped");
	assert.ok(!html.includes("<b> &"), "raw markup from a ticket title never reaches the page");
});
