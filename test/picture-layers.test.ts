import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Script } from "node:vm";

// Runs picture/viewer/layers.js against a small fake DOM and a fake session history, so the URL and history rules
// of the stacked layers can be checked without a browser.

type Layer = { kind: string; id: string };
type Layers = {
	init: (options: { model: unknown }) => void;
	open: (kind: string, id: string) => boolean;
	close: () => void;
	jump: (depth: number) => void;
	split: (hash: string) => { base: string; layers: Layer[] };
	depth: () => number;
};
type Listener = (event: unknown) => void;

class FakeElement {
	children: FakeElement[] = [];
	parent: FakeElement | null = null;
	dataset: Record<string, string> = {};
	style = { setProperty: () => {} };
	classes = new Set<string>();
	classList = {
		add: (name: string) => this.classes.add(name),
		remove: (name: string) => this.classes.delete(name),
		toggle: (name: string, on: boolean) => (on ? this.classes.add(name) : this.classes.delete(name)),
		contains: (name: string) => this.classes.has(name),
	};
	inert = false;
	hidden = false;
	className = "";
	textContent = "";
	scrollLeft = 0;
	scrollWidth = 0;
	isConnected = true;
	private html = "";
	private parts = new Map<string, FakeElement>();
	readonly doc: { activeElement: FakeElement | null };
	constructor(doc: { activeElement: FakeElement | null }) {
		this.doc = doc;
	}
	set innerHTML(value: string) {
		this.html = value;
		this.parts.clear();
	}
	get innerHTML() {
		return this.html;
	}
	get lastElementChild(): FakeElement | null {
		return this.children.at(-1) ?? null;
	}
	querySelector(selector: string) {
		if (!this.parts.has(selector)) this.parts.set(selector, new FakeElement(this.doc));
		return this.parts.get(selector);
	}
	querySelectorAll() {
		return [];
	}
	append(child: FakeElement) {
		child.parent = this;
		this.children.push(child);
	}
	remove() {
		if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this);
	}
	closest() {
		return null;
	}
	contains() {
		return false;
	}
	setAttribute() {}
	addEventListener() {}
	focus() {
		this.doc.activeElement = this;
	}
}

class FakeHistory {
	entries: { state: unknown; url: string }[];
	at = 0;
	scrollRestoration = "auto";
	readonly fire: (type: string) => void;
	constructor(url: string, state: unknown, fire: (type: string) => void) {
		this.entries = [{ state, url }];
		this.fire = fire;
	}
	get length() {
		return this.entries.length;
	}
	get state() {
		return structuredClone(this.entries[this.at]?.state ?? null);
	}
	get hash() {
		return this.entries[this.at]?.url ?? "";
	}
	pushState(state: unknown, _title: string, url: string) {
		this.entries.splice(this.at + 1);
		this.entries.push({ state: structuredClone(state), url });
		this.at++;
	}
	replaceState(state: unknown, _title: string, url: string) {
		this.entries[this.at] = { state: structuredClone(state), url };
	}
	go(delta: number) {
		const from = this.hash;
		this.at = Math.max(0, Math.min(this.entries.length - 1, this.at + delta));
		this.fire("popstate");
		if (this.hash !== from) this.fire("hashchange");
	}
}

const model = {
	schema: "architecture-map-model/3",
	generatedAt: "2026-10-06T00:00:00Z",
	nodes: [
		{ id: "plant.core", title: "Core", parent: null, children: ["plant.store", "plant.odd~id"] },
		{ id: "plant.store", title: "Store", parent: "plant.core", children: [] },
		{ id: "plant.odd~id", title: "Odd id", parent: "plant.core", children: [] },
		{ id: "plant.solo", title: "Solo", parent: null, children: [] },
	],
	edges: [{ id: "e1", from: "plant.store", to: "plant.solo", kind: "depends-on", title: "Reads settings" }],
	features: [],
	journeys: [],
	work: [
		{ id: "f001", code: "F001", title: "First", lane: "active", board: null, touches: ["plant.store"], touchSource: "ticket", needsAdam: null, wrong: null },
		{ id: "f002", code: "F002", title: "Second", lane: "done", board: null, touches: [], touchSource: "none", needsAdam: null, wrong: null },
		{ id: "f003", code: "F003", title: "Third", lane: "active", board: null, touches: [], touchSource: "none", needsAdam: null, wrong: null },
		{ id: "f004", code: "F004", title: "Fourth", lane: "active", board: null, touches: [], touchSource: "none", needsAdam: null, wrong: null },
	],
	pins: { changed: [], wrong: [], needs: [] },
	days: [{ date: "2026-10-05", items: [{ work: "f001", kind: "opened", text: "First" }] }],
};

const source = await readFile(new URL("../picture/viewer/layers.js", import.meta.url), "utf8");

// Loads layers.js on a page whose URL is `hash` and whose current history entry carries `state`.
function page(hash: string, state: unknown = null) {
	const listeners = new Map<string, Listener[]>();
	const on = (type: string, fn: Listener) => listeners.set(type, [...(listeners.get(type) ?? []), fn]);
	const fire = (type: string, event: unknown = {}) => {
		for (const fn of listeners.get(type) ?? []) fn(event);
	};
	const doc = {
		activeElement: null as FakeElement | null,
		createElement: () => new FakeElement(doc),
		querySelector: () => null,
		addEventListener: on,
		body: null as unknown as FakeElement,
		documentElement: null as unknown as FakeElement,
	};
	doc.body = new FakeElement(doc);
	doc.documentElement = new FakeElement(doc);
	const history = new FakeHistory(hash, state, (type) => fire(type));
	const context: Record<string, unknown> = {
		document: doc,
		history,
		location: {
			get hash() {
				return history.hash;
			},
		},
		CSS: { escape: (s: string) => s },
		Element: FakeElement,
		addEventListener: on,
		innerWidth: 1440,
		scrollY: 0,
		scrollTo: () => {},
	};
	context.window = context;
	new Script(source, { filename: "picture/viewer/layers.js" }).runInNewContext(context);
	const layers = context.PictureLayers as Layers;
	layers.init({ model });
	const key = (k: string, shiftKey = false) => fire("keydown", { key: k, shiftKey, altKey: false, ctrlKey: false, metaKey: false, stopPropagation() {}, preventDefault() {} });
	return { layers, history, key };
}

test("split reads the page route and the layer stack, and drops what it cannot read", () => {
	const { layers } = page("#plant");
	const plain = (hash: string) => JSON.parse(JSON.stringify(layers.split(hash)));
	assert.deepEqual(plain("#work/f001~place/plant.odd%7Eid~day/2026-10-05"), {
		base: "#work/f001",
		layers: [
			{ kind: "place", id: "plant.odd~id" },
			{ kind: "day", id: "2026-10-05" },
		],
	});
	assert.deepEqual(plain(""), { base: "#plant", layers: [] });
	assert.deepEqual(plain("#~work/f001"), { base: "#plant", layers: [{ kind: "work", id: "f001" }] });
	assert.deepEqual(plain("#plant~bogus/x~work~work/~place/%E0%A4%A~module/plant.core"), { base: "#plant", layers: [{ kind: "module", id: "plant.core" }] });
});

test("an id with ~ survives the URL round trip", () => {
	const { layers, history } = page("#plant/work");
	assert.equal(layers.open("place", "plant.odd~id"), true);
	assert.equal(history.hash, "#plant/work~place/plant.odd%7Eid");
	assert.deepEqual(JSON.parse(JSON.stringify(layers.split(history.hash).layers)), [{ kind: "place", id: "plant.odd~id" }]);
});

test("each open adds one history entry; Esc goes back exactly one", () => {
	const { layers, history, key } = page("#plant/work");
	assert.equal(layers.open("work", "f001"), true);
	assert.equal(layers.open("place", "plant.store"), true);
	assert.equal(layers.open("module", "plant.core"), true);
	assert.equal(history.length, 4);
	assert.equal(history.hash, "#plant/work~work/f001~place/plant.store~module/plant.core");
	key("Escape");
	assert.equal(layers.depth(), 2);
	assert.equal(history.at, 2);
	assert.equal(history.hash, "#plant/work~work/f001~place/plant.store");
	assert.equal(history.length, 4, "Forward still reopens the closed layer");
	assert.equal(layers.open("nothing", "x"), false);
	assert.equal(layers.open("work", "f999"), false);
	assert.equal(history.length, 4, "an unknown item adds no entry");
});

test("opening an item already in the stack goes back to its depth", () => {
	const { layers, history } = page("#plant");
	layers.open("work", "f001");
	layers.open("place", "plant.store");
	layers.open("module", "plant.core");
	layers.open("work", "f001");
	assert.equal(layers.depth(), 1);
	assert.equal(history.hash, "#plant~work/f001");
	layers.jump(0);
	assert.equal(layers.depth(), 0);
	assert.equal(history.hash, "#plant");
});

test("the context switch replaces the top entry, follows the lane newest first, and Back still closes the layer", () => {
	const { layers, history, key } = page("#plant/work");
	layers.open("work", "f004");
	const length = history.length;
	key("ArrowRight");
	assert.equal(history.hash, "#plant/work~work/f003", "F004 then F003: same lane, newest ticket first");
	key("ArrowRight");
	assert.equal(history.hash, "#plant/work~work/f001", "F002 is done, so the active lane skips it");
	key("ArrowRight");
	assert.equal(history.hash, "#plant/work~work/f001", "the last item stays put");
	key("ArrowLeft");
	assert.equal(history.hash, "#plant/work~work/f003");
	assert.equal(history.length, length);
	assert.equal(layers.depth(), 1);
	history.go(-1);
	assert.equal(layers.depth(), 0);
	assert.equal(history.hash, "#plant/work");
});

test("a shared link with three layers rebuilds four entries so Back closes them one by one", () => {
	const { layers, history } = page("#plant~work/f001~place/plant.store~day/2026-10-05");
	assert.equal(layers.depth(), 3);
	assert.equal(history.length, 4);
	assert.deepEqual(
		history.entries.map((entry) => entry.url),
		["#plant", "#plant~work/f001", "#plant~work/f001~place/plant.store", "#plant~work/f001~place/plant.store~day/2026-10-05"],
	);
	for (const depth of [2, 1, 0]) {
		history.go(-1);
		assert.equal(layers.depth(), depth);
	}
	assert.equal(history.hash, "#plant");
});

test("a reload of a layered entry keeps the history it already has", () => {
	const { layers, history } = page("#plant~work/f001~place/plant.store", { pictureLayers: 2, pageY: 0 });
	assert.equal(layers.depth(), 2);
	assert.equal(history.length, 1);
});

test("dead and unknown segments are dropped and the URL is corrected", () => {
	const { layers, history } = page("#plant~work/f999~bogus/1~place/plant.store~place/plant.store");
	assert.equal(layers.depth(), 1);
	assert.equal(history.hash, "#plant~place/plant.store");
	const reloaded = page("#plant~work/f999", { pictureLayers: 1, pageY: 0 });
	assert.equal(reloaded.layers.depth(), 0);
	assert.equal(reloaded.history.hash, "#plant");
});
