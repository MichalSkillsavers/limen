import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Script } from "node:vm";

type Place = { id: string; parent: Place | null; chain: Place[]; kids: Place[] };
type Overlay = { key: string; id: string; kind: string; places: { id: string; node: Place | null }[] };
type Marks = { marks: Map<string, number[]>; carriers: Map<string, number[]>; root: number };
type Parsed = { focus: Place | null; selected: Place | null; unknown: string; overlay: Overlay | null; step: number; inspect: boolean };
type Point = { x: number; y: number };
type LayoutItem = { id: string; cx: number; y: number; w: number; h: number; layer: number; band: string };
type Lane = { kind: string; edges: { id: string }[]; pts: Point[] };
type Graph = {
	visible: Place[];
	visibleIds: Set<string>;
	own: number;
	ghosts: { node: Place; band: string }[];
	bundles: { from: Place; to: Place; edges: { id: string }[]; laneList: Lane[] }[];
	layout: { width: number; height: number; items: LayoutItem[]; byId: Map<string, LayoutItem>; pairs: { sameRow: boolean; vis: Lane[] }[]; layers: LayoutItem[][] };
};
type Viewer = {
	model: { byId: Map<string, Place>; overlayByKey: Map<string, Overlay>; memberships: Map<string, Overlay[]> };
	marks: (focus: string | null, visible: string[], key: string, hidden?: string[]) => Marks;
	hash: (focus: string | null, selected: string | null, key: string | null, step?: number, inspect?: boolean) => string;
	parse: (hash: string) => Parsed;
	search: (query: string) => { id: string; kind: string }[];
	commonFocus: (key: string) => Place | null;
	graph: (focus: string | null, perRow: number, hiddenRelations?: string[], key?: string | null, step?: number, inspect?: boolean) => Graph;
	graphMarks: (graph: Graph, key: string) => Marks;
	edgePath: (points: Point[]) => { stroke: string; arrow: string };
	highlight: (
		focus: string | null,
		visible: string[],
		key: string | null,
		hover: string | null,
		bundleHover?: boolean,
		step?: number,
		passingKey?: string | null,
		passingKeyboard?: boolean,
	) => {
		blocks: Map<string, { classes: Set<string>; children: { className: string; textContent: string }[] }>;
		edge: { classes: Set<string> };
	};
};

const fixture = {
	schema: "architecture-map-model/2",
	project: { id: "sample", rootId: "sample.plant", title: "Sample", summary: "A local project.", sources: ["spec/vision.md"] },
	nodes: [
		{ id: "sample.parent", title: "Runtime", kind: "module", parent: null, sources: ["src/runtime.ts"] },
		{ id: "sample.child", title: "Conversation store", kind: "module", parent: "sample.parent", sources: ["src/store.ts"] },
		{ id: "sample.sibling", title: "Provider", kind: "module", parent: "sample.parent", sources: ["src/provider.ts"] },
		{ id: "sample.other", title: "Transport", kind: "module", parent: null, sources: ["src/transport.ts"] },
	],
	edges: [{ id: "sample.calls", from: "sample.child", to: "sample.sibling", kind: "calls" }],
	features: [
		{ id: "sample.focus", title: "Durable conversations", touches: ["sample.child"], sources: ["spec/features/durable/ticket.md"] },
		{ id: "sample.whole", title: "Runtime composition", touches: ["sample.parent"], sources: ["spec/features/runtime/ticket.md"] },
	],
	journeys: [
		{ id: "sample.focus", title: "Conversation round trip", steps: ["sample.child", "sample.other", "sample.child", "sample.plant"], sources: ["spec/journeys/round-trip.md"] },
		{ id: "sample.local", title: "Provider round trip", steps: ["sample.child", "sample.sibling", "sample.child"] },
	],
	diagnostics: [],
};

// Run the shipped script in its own closure. Only replace startup: these tests call
// the viewer's real model, navigation and highlight functions with tiny tag markers.
async function viewer(raw: unknown = fixture): Promise<Viewer> {
	const source = await readFile(new URL("../picture/viewer/viewer.js", import.meta.url), "utf8");
	const startup = /\n\tinit\(\);\n\}\)\(\);\s*$/;
	assert.match(source, startup, "viewer startup remains available for the isolated regression harness");
	const bridge = `
	M = prepare(rawFixture);
	function marker() {
		var classes = new Set();
		return {
			classes: classes, children: [],
			classList: { toggle: function (name, on) { if (on) classes.add(name); else classes.delete(name); } },
			appendChild: function (child) { this.children.push(child); },
			removeChild: function (child) { this.children = this.children.filter(function (x) { return x !== child; }); },
			querySelector: function (selector) { return this.children.find(function (x) { return x.className === selector.slice(1); }) || null; }
		};
	}
	document.createElement = marker;
	return {
		model: M,
		marks: function (focus, visible, key, hidden) {
			S.hideKind = new Set(hidden || []);
			return overlayMarks({ focus: M.byId.get(focus) || null, els: new Map(visible.map(function (id) { return [id, {}]; })) }, M.overlayByKey.get(key));
		},
		hash: function (focus, selected, key, step, inspect) {
			return hashFor(M.byId.get(focus) || null, M.byId.get(selected) || null, M.overlayByKey.get(key) || null, step == null ? -1 : step, !!inspect);
		},
		parse: function (hash) { location.hash = hash; return parseHash(); },
		search: searchNodes,
		commonFocus: function (key) { return commonOverlayFocus(M.overlayByKey.get(key)); },
		graph: function (focus, perRow, hiddenRelations, key, step, inspect) {
			S.hideKind = new Set();
			S.hideRel = new Set(hiddenRelations || []);
			S.overlay = M.overlayByKey.get(key) || null;
			S.step = step == null ? -1 : step;
			S.inspect = !!inspect;
			var level = lift(M.byId.get(focus) || null);
			level.layout = layout(level, perRow);
			route(level);
			level.els = new Map(level.layout.items.map(function (item) { return [item.id, marker()]; }));
			return level;
		},
		graphMarks: function (graph, key) { return overlayMarks(graph, M.overlayByKey.get(key)); },
		edgePath: function (points) { return { stroke: pathD(points), arrow: headD(points) }; },
		highlight: function (focus, visible, key, hover, bundleHover, step, passingKey, passingKeyboard) {
			var blocks = new Map(visible.map(function (id) { return [id, marker()]; }));
			var edge = marker(), bundle = { from: M.byId.get("sample.child"), to: M.byId.get("sample.sibling"), el: edge };
			S.hideKind = new Set();
			S.level = { focus: M.byId.get(focus) || null, els: blocks, bundles: [bundle] };
			S.overlay = M.overlayByKey.get(key) || null;
			S.ovHover = S.ovKbd = S.kbdId = S.selected = S.edgeSel = null;
			if (passingKeyboard) S.ovKbd = M.overlayByKey.get(passingKey) || null;
			else S.ovHover = M.overlayByKey.get(passingKey) || null;
			S.hoverId = hover;
			S.hoverBundle = bundleHover ? bundle : null;
			S.step = step == null ? -1 : step;
			D = { canvas: marker() };
			highlight();
			return { blocks: blocks, edge: edge };
		}
	};
})();`;
	return new Script(source.replace(startup, bridge), { filename: "picture/viewer/viewer.js" }).runInNewContext({
		rawFixture: raw,
		window: { matchMedia: () => ({ matches: true }) },
		document: {},
		location: { hash: "" },
		URLSearchParams,
	}) as Viewer;
}

function positions(map: Map<string, number[]>): [string, number[]][] {
	return Array.from(map, ([id, steps]) => [id, Array.from(steps)]);
}

test("collapsed containers remain distinct from explicitly touched places", async () => {
	const v = await viewer();
	const collapsed = v.marks(null, ["sample.parent", "sample.other"], "feature:sample.focus");
	assert.deepEqual(positions(collapsed.marks), []);
	assert.deepEqual(positions(collapsed.carriers), [["sample.parent", [1]]]);
	const open = v.marks("sample.parent", ["sample.child", "sample.sibling"], "feature:sample.focus");
	assert.deepEqual(positions(open.marks), [["sample.child", [1]]]);
	assert.deepEqual(positions(open.carriers), []);
	const whole = v.marks(null, ["sample.parent", "sample.other"], "feature:sample.whole");
	assert.deepEqual(positions(whole.marks), [["sample.parent", [1]]]);
	assert.deepEqual(positions(whole.carriers), []);
	const wholeOpen = v.marks("sample.parent", ["sample.child", "sample.sibling"], "feature:sample.whole");
	assert.deepEqual(positions(wholeOpen.marks), [], "naming a parent never implicitly touches its children");
	assert.deepEqual(positions(wholeOpen.carriers), []);
});

test("journeys preserve repeated steps and the project without inventing connected places", async () => {
	const v = await viewer();
	const journey = v.model.overlayByKey.get("journey:sample.focus");
	assert.deepEqual(
		Array.from(journey?.places ?? [], (place) => place.id),
		["sample.child", "sample.other", "sample.child", "sample.plant"],
	);
	const open = v.marks("sample.parent", ["sample.child", "sample.sibling"], "journey:sample.focus");
	assert.deepEqual(positions(open.marks), [["sample.child", [1, 3]]]);
	assert.equal(open.marks.has("sample.sibling"), false, "a connected place is not a journey step");
	assert.equal(open.root, 1);
	assert.equal(v.commonFocus("journey:sample.local")?.id, "sample.parent");
	assert.equal(v.commonFocus("journey:sample.focus"), null, "cross-project journeys open the project overview");
});

test("hidden places never acquire exact highlights or visible carrier marks", async () => {
	const v = await viewer();
	const hidden = v.marks(null, ["sample.parent", "sample.other"], "feature:sample.focus", ["module"]);
	assert.deepEqual(positions(hidden.marks), []);
	assert.deepEqual(positions(hidden.carriers), []);
});

test("place memberships are exact and repeated journey steps create one backlink", async () => {
	const v = await viewer();
	const memberships = (id: string) => Array.from(v.model.memberships.get(id) ?? [], (overlay) => overlay.key);
	assert.deepEqual(memberships("sample.child"), ["feature:sample.focus", "journey:sample.focus", "journey:sample.local"]);
	assert.deepEqual(memberships("sample.parent"), ["feature:sample.whole"], "a child's overlay never becomes an exact membership of its parent");
	assert.deepEqual(memberships("sample.other"), ["journey:sample.focus"]);
	assert.deepEqual(memberships("sample.sibling"), ["journey:sample.local"], "structural connections never create backlinks");
	assert.deepEqual(memberships("sample.plant"), ["journey:sample.focus"]);
});

test("selected feature highlights remain exact while hovering connected places and edges", async () => {
	const v = await viewer();
	for (const bundleHover of [false, true]) {
		const result = v.highlight("sample.parent", ["sample.child", "sample.sibling"], "feature:sample.focus", "sample.sibling", bundleHover);
		assert.equal(result.blocks.get("sample.child")?.classes.has("hl"), true);
		assert.equal(result.blocks.get("sample.child")?.classes.has("ov"), true);
		assert.equal(result.blocks.get("sample.sibling")?.classes.has("hl"), false);
		assert.equal(result.blocks.get("sample.sibling")?.classes.has("ov"), false);
		assert.equal(result.edge.classes.has("hl"), false);
	}
	const collapsed = v.highlight(null, ["sample.parent", "sample.other"], "feature:sample.focus", null);
	assert.equal(collapsed.blocks.get("sample.parent")?.classes.has("ov-carrier"), true);
	assert.equal(collapsed.blocks.get("sample.parent")?.classes.has("ov"), false);
	assert.equal(collapsed.blocks.get("sample.parent")?.classes.has("hl"), false);
	const cleared = v.highlight("sample.parent", ["sample.child", "sample.sibling"], null, "sample.child");
	assert.equal(cleared.blocks.get("sample.sibling")?.classes.has("hl"), true, "ordinary connection exploration resumes when the feature is cleared");
	assert.equal(cleared.edge.classes.has("hl"), true);
});

test("selected work keeps its exact highlights while another overlay receives pointer or keyboard focus", async () => {
	const v = await viewer();
	for (const keyboard of [false, true]) {
		const feature = v.highlight(null, ["sample.parent", "sample.child", "sample.other"], "feature:sample.whole", null, false, -1, "feature:sample.focus", keyboard);
		assert.equal(feature.blocks.get("sample.parent")?.classes.has("ov"), true);
		assert.equal(feature.blocks.get("sample.parent")?.classes.has("hl"), true);
		assert.equal(feature.blocks.get("sample.child")?.classes.has("ov"), false, "a different focused feature cannot replace the selected work");
		assert.equal(feature.blocks.get("sample.child")?.classes.has("hl"), false);
		const journey = v.highlight(null, ["sample.parent", "sample.child", "sample.other"], "journey:sample.focus", null, false, 2, "feature:sample.whole", keyboard);
		assert.equal(journey.blocks.get("sample.parent")?.classes.has("ov"), false);
		assert.equal(journey.blocks.get("sample.child")?.classes.has("ov"), true);
		assert.equal(journey.blocks.get("sample.other")?.classes.has("ov"), true);
		assert.equal(journey.blocks.get("sample.child")?.classes.has("ov-cur"), true);
		assert.equal(journey.blocks.get("sample.child")?.children.find((tag) => tag.className === "b-steps")?.textContent, "1 · 3");
	}
});

test("pointer and keyboard overlay previews still work when no work is selected", async () => {
	const v = await viewer();
	for (const keyboard of [false, true]) {
		const feature = v.highlight(null, ["sample.parent", "sample.child", "sample.other"], null, null, false, -1, "feature:sample.focus", keyboard);
		assert.equal(feature.blocks.get("sample.child")?.classes.has("ov"), true);
		assert.equal(feature.blocks.get("sample.child")?.classes.has("hl"), true);
		assert.equal(feature.blocks.get("sample.parent")?.classes.has("ov"), false);
		assert.equal(feature.blocks.get("sample.other")?.classes.has("ov"), false);
		const journey = v.highlight(null, ["sample.parent", "sample.child", "sample.other"], null, null, false, -1, "journey:sample.focus", keyboard);
		assert.equal(journey.blocks.get("sample.child")?.children.find((tag) => tag.className === "b-steps")?.textContent, "1 · 3");
		assert.equal(journey.blocks.get("sample.other")?.classes.has("ov"), true);
		assert.equal(journey.blocks.get("sample.child")?.classes.has("ov-cur"), false, "previewing a journey does not invent a selected step");
	}
});

test("feature and journey URLs roundtrip identity, repeated step and place inspection", async () => {
	const v = await viewer();
	for (const key of ["feature:sample.focus", "journey:sample.focus"]) {
		const step = key.startsWith("journey:") ? 2 : -1;
		const parsed = v.parse(v.hash("sample.parent", "sample.child", key, step, true));
		assert.equal(parsed.focus?.id, "sample.parent");
		assert.equal(parsed.selected?.id, "sample.child");
		assert.equal(parsed.overlay?.key, key);
		assert.equal(parsed.step, step);
		assert.equal(parsed.inspect, true);
		assert.equal(parsed.unknown, "");
	}
	const projectStep = v.parse(v.hash(null, null, "journey:sample.focus", 3));
	assert.equal(projectStep.focus, null);
	assert.equal(projectStep.selected, null);
	assert.equal(projectStep.overlay?.key, "journey:sample.focus");
	assert.equal(projectStep.step, 3);
	assert.equal(projectStep.inspect, false);
});

test("place URLs stay compatible and malformed or unknown locations fail visibly", async () => {
	const v = await viewer();
	const place = v.parse("#sample.child");
	assert.equal(place.focus?.id, "sample.parent");
	assert.equal(place.selected?.id, "sample.child");
	assert.equal(place.overlay, null);
	assert.equal(place.step, -1);
	const inside = v.parse("#sample.parent/");
	assert.equal(inside.focus?.id, "sample.parent");
	assert.equal(inside.selected?.id, "sample.parent");
	const unknown = v.parse("#sample.missing");
	assert.equal(unknown.focus, null);
	assert.equal(unknown.selected, null);
	assert.ok(unknown.unknown.includes("sample.missing"));
	assert.doesNotThrow(() => v.parse("#%E0%A4%A"));
	const badStep = v.parse("#?journey=sample.focus&step=999");
	assert.equal(badStep.step, -1, "invalid step indices cannot become current steps");
});

test("global search discovers specified work and its cited paths alongside places", async () => {
	const v = await viewer();
	assert.ok(v.search("Durable conversations").some((entry) => entry.id === "sample.focus" && entry.kind === "feature"));
	assert.ok(v.search("Conversation round trip").some((entry) => entry.id === "sample.focus" && entry.kind === "journey"));
	assert.ok(v.search("src/store.ts").some((entry) => entry.id === "sample.child"));
	assert.ok(v.search("spec/features/durable/ticket.md").some((entry) => entry.id === "sample.focus" && entry.kind === "feature"));
	assert.ok(v.search("round-trip.md").some((entry) => entry.kind === "journey"));
	assert.deepEqual(Array.from(v.search("")), []);
});

test("large datasets retain late features and all repeated journey steps", async () => {
	const overlays = Array.from({ length: 220 }, (_, index) => ({
		id: `sample.feature-${index}`,
		title: `Specified capability ${index}`,
		touches: ["sample.child"],
		sources: [`spec/features/capability-${index}/ticket.md`],
	}));
	const steps = Array.from({ length: 220 }, (_, index) => (index % 2 ? "sample.other" : "sample.child"));
	const v = await viewer({ ...fixture, features: [...fixture.features, ...overlays], journeys: [...fixture.journeys, { id: "sample.long", title: "Long journey", steps }] });
	assert.ok(v.search("Specified capability 219").some((entry) => entry.id === "sample.feature-219"));
	assert.ok(v.search("capability-219/ticket.md").some((entry) => entry.id === "sample.feature-219"));
	assert.equal(v.model.overlayByKey.get("journey:sample.long")?.places.length, 220);
	const marks = v.marks("sample.parent", ["sample.child", "sample.sibling"], "journey:sample.long");
	assert.equal(marks.marks.get("sample.child")?.at(-1), 219);
	assert.equal(Array.from(v.model.memberships.get("sample.child") ?? []).filter((overlay) => overlay.key === "journey:sample.long").length, 1);
});

test("selected work overview reveals every explicitly named descendant in the existing map", async () => {
	const v = await viewer();
	const graph = v.graph(null, 3, [], "journey:sample.focus");
	assert.deepEqual(
		Array.from(graph.visible, (place) => place.id),
		["sample.parent", "sample.child", "sample.other"],
	);
	assert.equal(graph.visibleIds.has("sample.sibling"), false, "connected siblings stay collapsed unless the journey names them");
	const marks = v.graphMarks(graph, "journey:sample.focus");
	assert.deepEqual(positions(marks.marks), [
		["sample.child", [1, 3]],
		["sample.other", [2]],
	]);
	assert.deepEqual(positions(marks.carriers), [], "a visible named descendant no longer needs a collapsed-container hint");
	assert.equal(marks.root, 1);
	assertGeometry(v, graph);
	assert.deepEqual(
		Array.from(graph.bundles, (bundle) => [bundle.from.id, bundle.to.id, Array.from(bundle.edges, (edge) => edge.id)]),
		[["sample.child", "sample.parent", ["sample.calls"]]],
	);
});

test("revealing descendants retains structural direction and exact parent versus child memberships", async () => {
	const raw = {
		...fixture,
		edges: [
			...fixture.edges,
			{ id: "sample.child-out", from: "sample.child", to: "sample.other", kind: "calls" },
			{ id: "sample.child-in", from: "sample.other", to: "sample.child", kind: "writes" },
			{ id: "sample.sibling-out", from: "sample.sibling", to: "sample.other", kind: "calls" },
			{ id: "sample.sibling-in", from: "sample.other", to: "sample.sibling", kind: "writes" },
			{ id: "sample.parent-out", from: "sample.parent", to: "sample.other", kind: "depends-on" },
		],
		features: [...fixture.features, { id: "sample.both", title: "Parent and child", touches: ["sample.parent", "sample.child"] }],
	};
	const v = await viewer(raw);
	const graph = v.graph(null, 3, [], "feature:sample.focus");
	const endpoints = new Map(Array.from(graph.bundles).flatMap((bundle) => Array.from(bundle.edges, (edge) => [edge.id, [bundle.from.id, bundle.to.id]] as const)));
	assert.deepEqual(endpoints.get("sample.calls"), ["sample.child", "sample.parent"]);
	assert.deepEqual(endpoints.get("sample.child-out"), ["sample.child", "sample.other"]);
	assert.deepEqual(endpoints.get("sample.child-in"), ["sample.other", "sample.child"]);
	assert.deepEqual(endpoints.get("sample.sibling-out"), ["sample.parent", "sample.other"]);
	assert.deepEqual(endpoints.get("sample.sibling-in"), ["sample.other", "sample.parent"]);
	assert.deepEqual(endpoints.get("sample.parent-out"), ["sample.parent", "sample.other"]);
	assert.equal(endpoints.size, raw.edges.length);
	assert.deepEqual(positions(v.graphMarks(graph, "feature:sample.focus").marks), [["sample.child", [1]]]);
	assertGeometry(v, graph);
	const both = v.graph(null, 3, [], "feature:sample.both");
	assert.deepEqual(positions(v.graphMarks(both, "feature:sample.both").marks), [
		["sample.parent", [1]],
		["sample.child", [2]],
	]);
	assert.equal(both.visible.filter((place) => place.id === "sample.child").length, 1);
});

test("clearing, inspecting and stepping restore ordinary drilldown topology", async () => {
	const v = await viewer();
	assert.equal(v.graph(null, 3, [], "journey:sample.focus").visibleIds.has("sample.child"), true);
	const cleared = v.graph(null, 3);
	assert.deepEqual(
		Array.from(cleared.visible, (place) => place.id),
		["sample.parent", "sample.other"],
	);
	const step = v.graph("sample.parent", 3, [], "journey:sample.focus", 0);
	assert.deepEqual(
		Array.from(step.visible, (place) => place.id),
		["sample.child", "sample.sibling"],
	);
	const inspected = v.graph("sample.parent", 3, [], "journey:sample.focus", -1, true);
	assert.deepEqual(
		Array.from(inspected.visible, (place) => place.id),
		["sample.child", "sample.sibling"],
	);
	assert.deepEqual(positions(v.graphMarks(cleared, "feature:sample.focus").carriers), [["sample.parent", [1]]]);
});

test("overview deep links retain their scope and keep outside places distinct from visible descendants", async () => {
	const raw = {
		...fixture,
		edges: [
			...fixture.edges,
			{ id: "sample.parent-edge", from: "sample.parent", to: "sample.child", kind: "hosts" },
			{ id: "sample.outside-edge", from: "sample.other", to: "sample.child", kind: "calls" },
		],
	};
	const v = await viewer(raw);
	const parent = v.graph("sample.parent", 3, [], "feature:sample.whole");
	assert.equal(parent.visibleIds.has("sample.parent"), false, "the focused frame never duplicates itself as a child card");
	assert.equal(parent.own, 1, "an edge owned by the open frame stays accounted for in its details");
	const cross = v.graph("sample.parent", 3, [], "journey:sample.focus");
	assert.equal(cross.visibleIds.has("sample.other"), false, "outside places retain the ordinary ghost boundary");
	assert.ok(cross.ghosts.some((ghost) => ghost.node.id === "sample.other"));
	assert.ok(
		cross.ghosts.every((ghost) => !cross.visibleIds.has(ghost.node.id)),
		"an outside ghost never duplicates a visible descendant",
	);
	assert.equal(new Set(cross.layout.items.map((item) => item.id)).size, cross.layout.items.length);
	assertGeometry(v, cross);
});

function denseFixture(nested: boolean) {
	const nodes = Array.from({ length: 6 }, (_, index) => ({ id: `sample.part-${index}`, title: `Responsibility ${index}`, kind: "module", parent: nested ? "sample.group" : null }));
	const edges = nodes.flatMap((from, index) => [
		{ id: `sample.ring-${index}`, from: from.id, to: nodes[(index + 1) % nodes.length]!.id, kind: "calls" },
		{ id: `sample.cross-${index}`, from: from.id, to: nodes[(index + 2) % nodes.length]!.id, kind: "depends-on" },
	]);
	edges.push(
		{ id: "sample.parallel", from: "sample.part-0", to: "sample.part-1", kind: "reads" },
		{ id: "sample.reverse", from: "sample.part-1", to: "sample.part-0", kind: "writes" },
	);
	if (nested) {
		nodes.push(
			{ id: "sample.group", title: "Container", kind: "module", parent: null },
			{ id: "sample.source", title: "Outside source", kind: "module", parent: null },
			{ id: "sample.sink", title: "Outside sink", kind: "module", parent: null },
		);
		edges.push(
			{ id: "sample.incoming", from: "sample.source", to: "sample.part-0", kind: "calls" },
			{ id: "sample.outgoing", from: "sample.part-5", to: "sample.sink", kind: "writes" },
		);
	}
	return { ...fixture, nodes, edges, features: [], journeys: [] };
}

function assertGeometry(v: Viewer, graph: Graph): void {
	const layout = graph.layout;
	assert.ok(Number.isFinite(layout.width) && layout.width > 0);
	assert.ok(Number.isFinite(layout.height) && layout.height > 0);
	for (const item of layout.items) {
		assert.ok([item.cx, item.y, item.w, item.h].every(Number.isFinite), `${item.id} has finite coordinates`);
		assert.ok(item.cx - item.w / 2 >= 0 && item.cx + item.w / 2 <= layout.width, `${item.id} fits horizontally`);
		assert.ok(item.y >= 0 && item.y + item.h <= layout.height, `${item.id} fits vertically`);
	}
	for (let index = 0; index < layout.items.length; index++) {
		const a = layout.items[index]!;
		for (const b of layout.items.slice(index + 1)) {
			const separated = Math.abs(a.cx - b.cx) >= (a.w + b.w) / 2 || a.y + a.h <= b.y || b.y + b.h <= a.y;
			assert.ok(separated, `${a.id} and ${b.id} do not overlap`);
		}
	}
	for (const bundle of graph.bundles) {
		const from = layout.byId.get(bundle.from.id)!;
		const to = layout.byId.get(bundle.to.id)!;
		for (const lane of bundle.laneList) {
			if (!lane.pts) continue;
			assert.ok(lane.pts.length >= 2);
			for (const point of lane.pts) {
				assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y), `${lane.kind} route remains finite`);
				assert.ok(point.x >= 0 && point.x <= layout.width && point.y >= 0 && point.y <= layout.height, `${bundle.from.id} → ${bundle.to.id} ${lane.kind} stays within the canvas`);
			}
			const start = lane.pts[0]!;
			const end = lane.pts.at(-1)!;
			for (const [point, item, direction] of [
				[start, from, "starts at its source"],
				[end, to, "ends at its target"],
			] as const) {
				assert.ok(point.x >= item.cx - item.w / 2 && point.x <= item.cx + item.w / 2);
				assert.ok(point.y === item.y || point.y === item.y + item.h, `${lane.kind} ${direction}`);
			}
			const path = v.edgePath(lane.pts);
			assert.doesNotMatch(path.stroke + path.arrow, /NaN|Infinity|undefined/);
			const tip = /^M(-?[\d.]+) (-?[\d.]+)/.exec(path.arrow);
			assert.ok(tip);
			assert.ok(Math.abs(Number(tip[1]) - end.x) <= 0.051 && Math.abs(Number(tip[2]) - end.y) <= 0.051, "arrowhead lands at the original directed target");
		}
	}
}

test("dense cyclic maps pack into readable rows while preserving every directed lane", async () => {
	const raw = denseFixture(false);
	const v = await viewer(raw);
	for (const perRow of [1, 2, 3, 6]) {
		const graph = v.graph(null, perRow);
		assertGeometry(v, graph);
		assert.equal(graph.layout.items.length, 6);
		assert.ok(graph.layout.layers.length <= 3, "six mutually dependent responsibilities do not form a six-row spine");
		assert.ok(graph.layout.height < 600, "a six-place overview fits a normal desktop viewport");
		assert.ok(
			graph.layout.pairs.some((pair) => pair.sameRow && pair.vis.length >= 2),
			"parallel and reversed lanes remain routed on shared rows",
		);
		assert.deepEqual(
			Array.from(graph.bundles)
				.flatMap((bundle) => Array.from(bundle.edges, (edge) => edge.id))
				.sort(),
			raw.edges.map((edge) => edge.id).sort(),
		);
	}
});

test("focused dense maps retain outside source and sink routes without overlapping places", async () => {
	const raw = denseFixture(true);
	const v = await viewer(raw);
	const graph = v.graph("sample.group", 3);
	assertGeometry(v, graph);
	assert.deepEqual(
		Array.from(graph.ghosts, (ghost) => [ghost.node.id, ghost.band]),
		[
			["sample.source", "top"],
			["sample.sink", "bottom"],
		],
	);
	assert.deepEqual(
		Array.from(graph.bundles)
			.flatMap((bundle) => Array.from(bundle.edges, (edge) => edge.id))
			.sort(),
		raw.edges.map((edge) => edge.id).sort(),
	);
	const filtered = v.graph("sample.group", 3, ["reads"]);
	assertGeometry(v, filtered);
	assert.ok(
		filtered.layout.pairs.every((pair) => pair.vis.every((lane) => lane.kind !== "reads")),
		"hidden relations receive no visible route",
	);
	assert.equal(filtered.bundles.flatMap((bundle) => bundle.edges).length, raw.edges.length, "filtering never discards structural evidence");
});
