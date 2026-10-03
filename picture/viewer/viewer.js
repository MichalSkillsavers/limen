/* Architecture map viewer for model `architecture-map-model/2`.
   Plain browser script: no modules, no network, no dependencies.
   Reads the model from <script type="application/json" id="archmap-data"> and draws a
   drill-down block map. One level shows the children of the focused block. Edges are
   lifted to the visible level. Edges that leave the focus end at "outside" ghost blocks.
   Kind, relation and status names come from the data; the lists below only pick default
   styles, and every other value gets a generic fallback style. Features and journeys are
   an overlay list above the map: they light only the places they list, never draw a
   block or a link. */
(function () {
	"use strict";

	var SVG_NS = "http://www.w3.org/2000/svg";
	var REL_STYLES = ["depends-on", "hosts", "calls", "implements", "generates", "reads", "writes", "composes"];
	var NODE_STYLES = ["module"];
	var STATUS_STYLES = ["ready", "partial", "stub"];
	var FALLBACK_SLOTS = 6;
	var GEO = {
		blockW: 176,
		blockH: 78,
		ghostH: 60,
		gapX: 34,
		dummyW: 8,
		dummySep: 12,
		pad: 24,
		frameTop: 36,
		framePad: 18,
		arrow: 9,
		lane: 4,
		minScale: 0.6,
	};
	var LIMIT = { results: 12, tip: 8, list: 150, diagGroup: 300 };
	var ANIM_MS = 180;

	var M = null; // prepared model
	var D = {}; // DOM references
	var S = {
		focus: null,
		selected: null,
		edgeSel: null,
		unknown: "",
		hideRel: new Set(),
		hideKind: new Set(),
		level: null,
		hoverId: null,
		kbdId: null,
		hoverBundle: null,
		overlay: null, // selected feature or journey
		ovHover: null,
		ovKbd: null,
		step: -1, // current journey step in the panel
		drawerBuilt: false,
		results: [],
		active: -1,
		lastWidth: 0,
		relayoutTimer: 0,
	};
	var motion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

	// ------------------------------------------------------------------ helpers

	function $(id) {
		return document.getElementById(id);
	}
	function el(tag, cls, text) {
		var e = document.createElement(tag);
		if (cls) e.className = cls;
		if (text != null) e.textContent = String(text);
		return e;
	}
	function svgEl(tag, attrs) {
		var e = document.createElementNS(SVG_NS, tag);
		Object.keys(attrs || {}).forEach(function (k) {
			e.setAttribute(k, String(attrs[k]));
		});
		return e;
	}
	function button(cls, text, onClick) {
		var b = el("button", cls, text);
		b.type = "button";
		if (onClick) b.addEventListener("click", onClick);
		return b;
	}
	function clear(e) {
		while (e.firstChild) e.removeChild(e.firstChild);
	}
	function str(v) {
		return typeof v === "string" ? v : v == null ? "" : String(v);
	}
	function arr(v) {
		return Array.isArray(v) ? v : [];
	}
	function obj(v) {
		return v && typeof v === "object" && !Array.isArray(v) ? v : {};
	}
	function strList(v) {
		return arr(v)
			.filter(function (x) {
				return x != null && x !== "";
			})
			.map(String);
	}
	function plural(n, one, many) {
		return n + " " + (n === 1 ? one : many || one + "s");
	}
	function f(x) {
		return Math.round(x * 10) / 10;
	}
	function reduced() {
		return !!(motion && motion.matches);
	}

	// Known values first in default order, then other values A→Z.
	function presentOrder(values, defaults) {
		var set = new Set(values);
		return defaults
			.filter(function (k) {
				return set.has(k);
			})
			.concat(
				Array.from(set)
					.filter(function (k) {
						return defaults.indexOf(k) < 0;
					})
					.sort(),
			);
	}
	// Value → CSS class. Defaults get a named class; other values share fallback slots.
	function slotMap(present, defaults, prefix) {
		var map = new Map(),
			extra = 0;
		present.forEach(function (k) {
			map.set(k, defaults.indexOf(k) >= 0 ? prefix + k : prefix + "x" + (extra++ % FALLBACK_SLOTS));
		});
		return map;
	}
	function relClass(k) {
		return M.relClass.get(k) || "rk-x0";
	}
	function kindClass(k) {
		return M.kindClass.get(k) || "nk-x0";
	}
	function statusClass(s) {
		return M.statusClass.get(s) || "st-x0";
	}

	function badge(status) {
		return el("span", "badge " + statusClass(status), status || "no status");
	}
	function kindTag(kind) {
		return el("span", "tag " + kindClass(kind), kind);
	}
	function relTag(kind) {
		var t = el("span", "rel " + relClass(kind));
		t.appendChild(swatch());
		t.appendChild(el("span", "rel-name", kind));
		return t;
	}
	function swatch() {
		var s = svgEl("svg", { class: "swatch", width: 26, height: 10, viewBox: "0 0 26 10", "aria-hidden": "true" });
		s.appendChild(svgEl("path", { class: "line", d: "M1 5H18" }));
		s.appendChild(svgEl("path", { class: "head", d: "M25 5L17 1.5V8.5Z" }));
		return s;
	}
	function codeLine(cls, text) {
		var p = el("p", cls);
		p.appendChild(el("code", null, text));
		return p;
	}
	function section(box, title) {
		var s = el("section", "d-sec");
		s.appendChild(el("h3", null, title));
		box.appendChild(s);
		return s;
	}
	function sourceList(box, sources, title) {
		if (!sources.length) return;
		var ul = el("ul", "d-sources");
		sources.slice(0, LIMIT.list).forEach(function (s) {
			var li = el("li");
			li.appendChild(el("code", null, s));
			ul.appendChild(li);
		});
		if (sources.length > LIMIT.list) ul.appendChild(el("li", "more", sources.length - LIMIT.list + " more"));
		section(box, title || "Sources").appendChild(ul);
	}
	function prose(html) {
		var d = el("div", "prose");
		d.innerHTML = html; // sanitized by the generator (contract)
		return d;
	}
	// True when the description already starts with the summary sentence.
	function repeats(html, text) {
		if (!html || !text || !window.DOMParser) return false;
		var doc = new DOMParser().parseFromString(html, "text/html"); // inert document: nothing loads
		var norm = function (s) {
			return s.replace(/\s+/g, " ").trim();
		};
		return norm(doc.body.textContent || "").indexOf(norm(text)) === 0;
	}
	function projectTitle() {
		return str(M.project.title) || str(M.project.id) || "Architecture map";
	}

	function renderProjectState(tag) {
		var box = $("project-state"),
			revision = str(M.project.revision),
			tip = str(tag.getAttribute("data-tip"));
		clear(box);
		var rev = el("span", "project-revision", revision ? "Revision " : "Revision not recorded");
		if (revision) {
			rev.appendChild(el("code", null, revision.slice(0, 7)));
			rev.title = revision;
		}
		box.appendChild(rev);
		if (tip) {
			var head = el("span", "project-tip", "HEAD ");
			head.appendChild(el("code", null, tip.slice(0, 7)));
			head.title = tip;
			box.appendChild(head);
		}
		if (revision && tip && revision !== tip) box.appendChild(el("span", "behind", "Behind HEAD"));
	}

	// -------------------------------------------------------------------- model

	function prepare(raw) {
		var m = {
			project: obj(raw.project),
			generatedAt: str(raw.generatedAt),
			schema: str(raw.schema),
			nodes: [],
			byId: new Map(),
			roots: [],
			edges: [],
			edgeById: new Map(),
			diagnostics: [],
		};
		arr(raw.nodes).forEach(function (r) {
			if (!r || typeof r !== "object" || typeof r.id !== "string" || !r.id || m.byId.has(r.id)) return;
			var n = {
				id: r.id,
				title: str(r.title) || r.id,
				kind: str(r.kind) || "unknown",
				parentId: str(r.parent),
				status: str(r.status),
				summary: str(r.summary),
				sources: strList(r.sources),
				bodyHtml: str(r.bodyHtml),
				source: str(r.source),
				meta: obj(r.meta),
				index: m.nodes.length,
				parent: null,
				kids: [],
				chain: null,
				out: [],
				inc: [],
			};
			m.nodes.push(n);
			m.byId.set(n.id, n);
		});
		m.nodes.forEach(function (n) {
			var p = n.parentId ? m.byId.get(n.parentId) : null;
			n.parent = p && p !== n ? p : null;
		});
		m.nodes.forEach(function (n) {
			// break parent cycles at the closing link
			var seen = new Set(),
				cur = n;
			while (cur.parent) {
				seen.add(cur);
				if (seen.has(cur.parent)) {
					cur.parent = null;
					break;
				}
				cur = cur.parent;
			}
		});
		m.nodes.forEach(function (n) {
			(n.parent ? n.parent.kids : m.roots).push(n);
		});
		function chain(n) {
			if (!n.chain) n.chain = n.parent ? chain(n.parent).concat([n]) : [n];
			return n.chain;
		}
		m.nodes.forEach(chain);

		arr(raw.edges).forEach(function (r) {
			if (!r || typeof r !== "object") return;
			var a = m.byId.get(r.from),
				b = m.byId.get(r.to);
			if (!a || !b || a === b) return;
			var e = {
				id: str(r.id),
				from: a,
				to: b,
				kind: str(r.kind) || "unknown",
				title: str(r.title),
				status: str(r.status),
				summary: str(r.summary),
				bodyHtml: str(r.bodyHtml),
				sources: strList(r.sources),
				source: str(r.source),
				index: m.edges.length,
			};
			if (!e.id) e.id = a.id + "." + e.kind + "." + b.id;
			if (!e.title) e.title = a.title + " " + e.kind + " " + b.title;
			m.edges.push(e);
			m.edgeById.set(e.id, e);
			a.out.push(e);
			b.inc.push(e);
		});

		// Overlays: features and journeys are not places. They only name places to light.
		var rootId = str(obj(raw.project).rootId);
		m.overlayByKey = new Map();
		function overlays(list, kind, field) {
			var out = [];
			arr(list).forEach(function (r) {
				if (!r || typeof r !== "object" || typeof r.id !== "string" || !r.id) return;
				var key = kind + ":" + r.id;
				if (m.overlayByKey.has(key)) return;
				var o = {
					key: key,
					id: r.id,
					kind: kind,
					title: str(r.title) || r.id,
					status: str(r.status),
					summary: str(r.summary),
					sources: strList(r.sources),
					bodyHtml: str(r.bodyHtml),
					source: str(r.source),
					meta: obj(r.meta),
					places: [],
					missing: [],
				};
				strList(r[field]).forEach(function (pid) {
					var n = m.byId.get(pid);
					if (n) o.places.push({ id: pid, node: n });
					else if (rootId && pid === rootId) o.places.push({ id: pid, node: null });
					else o.missing.push(pid);
				});
				out.push(o);
				m.overlayByKey.set(key, o);
			});
			return out;
		}
		m.features = overlays(raw.features, "feature", "touches");
		m.journeys = overlays(raw.journeys, "journey", "steps");

		m.diagnostics = arr(raw.diagnostics)
			.filter(function (d) {
				return d && typeof d === "object";
			})
			.map(function (d) {
				return {
					level: str(d.level) || "info",
					code: str(d.code),
					message: str(d.message),
					source: str(d.source),
					id: str(d.id || d.nodeId),
					line: d.line == null ? "" : str(d.line),
				};
			});

		m.relKinds = presentOrder(
			m.edges.map(function (e) {
				return e.kind;
			}),
			REL_STYLES,
		);
		m.nodeKinds = presentOrder(
			m.nodes.map(function (n) {
				return n.kind;
			}),
			NODE_STYLES,
		);
		m.statuses = presentOrder(
			m.nodes
				.map(function (n) {
					return n.status;
				})
				.concat(
					m.edges.map(function (e) {
						return e.status;
					}),
					m.features.concat(m.journeys).map(function (o) {
						return o.status;
					}),
					[str(m.project.status)],
				)
				.filter(Boolean),
			STATUS_STYLES,
		);
		m.relClass = slotMap(m.relKinds, REL_STYLES, "rk-");
		m.kindClass = slotMap(m.nodeKinds, NODE_STYLES, "nk-");
		m.statusClass = slotMap(m.statuses, STATUS_STYLES, "st-");
		return m;
	}

	function shown(n) {
		if (!S.hideKind.size) return true;
		for (var i = 0; i < n.chain.length; i++) if (S.hideKind.has(n.chain[i].kind)) return false;
		return true;
	}
	function shownKids(n) {
		return (n ? n.kids : M.roots).filter(shown);
	}
	function within(x, n) {
		var d = n.chain.length;
		return x.chain.length >= d && x.chain[d - 1] === n;
	}

	// --------------------------------------------------------------- edge lift

	// Visible stand-in for node `n` while `fchain` (focus chain) is open.
	// Inside the focus → the focus child that contains `n`. The focus itself → null.
	// Outside → the ancestor of `n` just below the deepest common ancestor (a ghost).
	function rep(n, fchain) {
		var d = fchain.length,
			c = n.chain;
		if (!d) return { node: c[0], ghost: false };
		if (c.length > d && c[d - 1] === fchain[d - 1]) return { node: c[d], ghost: false };
		if (c.length === d && c[d - 1] === fchain[d - 1]) return null;
		var i = 0;
		while (i < c.length && i < d && c[i] === fchain[i]) i++;
		return { node: i < c.length ? c[i] : n, ghost: true };
	}

	function lift(focus) {
		var fchain = focus ? focus.chain : [];
		var visible = shownKids(focus);
		var bundles = new Map(),
			ghosts = new Map(),
			own = 0;
		M.edges.forEach(function (e) {
			if (!shown(e.from) || !shown(e.to)) return;
			var a = rep(e.from, fchain),
				b = rep(e.to, fchain);
			if (!a || !b) {
				own++;
				return;
			}
			if ((a.ghost && b.ghost) || a.node === b.node) return;
			var key = a.node.id + "\n" + b.node.id;
			var bu = bundles.get(key);
			if (!bu) {
				bu = { key: key, from: a.node, to: b.node, edges: [], lanes: new Map() };
				bundles.set(key, bu);
			}
			bu.edges.push(e);
			var lane = bu.lanes.get(e.kind);
			if (!lane) {
				lane = { kind: e.kind, edges: [], bundle: bu };
				bu.lanes.set(e.kind, lane);
			}
			lane.edges.push(e);
			if (a.ghost) ghostOf(ghosts, a.node).out++;
			if (b.ghost) ghostOf(ghosts, b.node).inc++;
		});
		var list = Array.from(bundles.values());
		list.forEach(function (bu) {
			bu.laneList = Array.from(bu.lanes.values()).sort(function (x, y) {
				return M.relKinds.indexOf(x.kind) - M.relKinds.indexOf(y.kind);
			});
		});
		var g = Array.from(ghosts.values()).sort(function (x, y) {
			return x.node.index - y.node.index;
		});
		g.forEach(function (x) {
			x.band = x.inc ? "bottom" : "top";
		});
		return { focus: focus, visible: visible, ghosts: g, bundles: list, own: own };
	}
	function ghostOf(map, node) {
		var g = map.get(node.id);
		if (!g) {
			g = { node: node, out: 0, inc: 0, band: "" };
			map.set(node.id, g);
		}
		return g;
	}

	// ------------------------------------------------------------------ layout
	// Layered layout: top ghosts | focus children (width-bounded longest-path layers) |
	// bottom ghosts. Long edges get dummy points, rows are ordered by barycenter sweeps,
	// x positions come from order-preserving least squares (pool adjacent violators).

	function layout(level, perRow) {
		var W = Math.max(2, perRow);
		var items = [],
			byId = new Map();
		function add(node, band) {
			var it = {
				id: node.id,
				node: node,
				band: band,
				dummy: false,
				w: GEO.blockW,
				h: band === "mid" ? GEO.blockH : GEO.ghostH,
				i: items.length,
				layer: -1,
				pos: 0,
				cx: 0,
				y: 0,
				up: [],
				down: [],
				ports: null,
			};
			items.push(it);
			byId.set(node.id, it);
		}
		level.ghosts.forEach(function (g) {
			if (g.band === "top") add(g.node, "top");
		});
		level.visible.forEach(function (n) {
			add(n, "mid");
		});
		level.ghosts.forEach(function (g) {
			if (g.band === "bottom") add(g.node, "bottom");
		});

		var pairMap = new Map(),
			pairs = [];
		level.bundles.forEach(function (bu) {
			var u = byId.get(bu.from.id),
				v = byId.get(bu.to.id);
			var a = u.i < v.i ? u : v,
				b = a === u ? v : u,
				key = a.id + "\n" + b.id;
			var p = pairMap.get(key);
			if (!p) {
				p = { a: a, b: b, bundles: [], upper: null, lower: null, chain: null };
				pairMap.set(key, p);
				pairs.push(p);
			}
			p.bundles.push(bu);
			bu.pair = p;
			bu.u = u;
			bu.v = v;
		});

		// Directed graph among focus children; DFS back edges are reversed.
		var mids = items.filter(function (it) {
			return it.band === "mid";
		});
		var raw = new Map(),
			succ = new Map(),
			pred = new Map();
		mids.forEach(function (it) {
			raw.set(it, []);
			succ.set(it, []);
			pred.set(it, []);
		});
		level.bundles.forEach(function (bu) {
			if (bu.u.band === "mid" && bu.v.band === "mid") raw.get(bu.u).push(bu.v);
		});
		raw.forEach(function (l) {
			l.sort(function (x, y) {
				return x.i - y.i;
			});
		});
		function link(u, v) {
			if (succ.get(u).indexOf(v) < 0) {
				succ.get(u).push(v);
				pred.get(v).push(u);
			}
		}
		var mark = new Map();
		mids.forEach(function (root) {
			if (mark.get(root)) return;
			mark.set(root, 1);
			var stack = [{ it: root, k: 0 }];
			while (stack.length) {
				var top = stack[stack.length - 1],
					next = raw.get(top.it);
				if (top.k < next.length) {
					var v = next[top.k++],
						s = mark.get(v);
					if (s === 1) link(v, top.it);
					else {
						link(top.it, v);
						if (!s) {
							mark.set(v, 1);
							stack.push({ it: v, k: 0 });
						}
					}
				} else {
					mark.set(top.it, 2);
					stack.pop();
				}
			}
		});

		// Layers. Each layer holds at most W blocks.
		var tops = items.filter(function (it) {
			return it.band === "top";
		});
		var bots = items.filter(function (it) {
			return it.band === "bottom";
		});
		var t = Math.ceil(tops.length / W);
		tops.forEach(function (it, k) {
			it.layer = Math.floor(k / W);
		});
		var count = [];
		function put(it, L) {
			while ((count[L] || 0) >= W) L++;
			it.layer = L;
			count[L] = (count[L] || 0) + 1;
		}
		var linked = new Set();
		pairs.forEach(function (p) {
			linked.add(p.a);
			linked.add(p.b);
		});
		var indeg = new Map();
		mids.forEach(function (it) {
			indeg.set(it, pred.get(it).length);
		});
		var ready = mids.filter(function (it) {
			return linked.has(it) && !indeg.get(it);
		});
		while (ready.length) {
			ready.sort(function (x, y) {
				return x.i - y.i;
			});
			var cur = ready.shift(),
				L0 = t;
			pred.get(cur).forEach(function (p) {
				if (p.layer + 1 > L0) L0 = p.layer + 1;
			});
			put(cur, L0);
			succ.get(cur).forEach(function (s) {
				indeg.set(s, indeg.get(s) - 1);
				if (!indeg.get(s)) ready.push(s);
			});
		}
		mids.forEach(function (it) {
			if (it.layer < 0) put(it, t);
		});
		var maxMid = t - 1;
		mids.forEach(function (it) {
			if (it.layer > maxMid) maxMid = it.layer;
		});
		// Bottom ghosts fill rows under the focus frame.
		bots.forEach(function (it, k) {
			it.layer = maxMid + 1 + Math.floor(k / W);
		});
		var nL = 0;
		items.forEach(function (it) {
			if (it.layer + 1 > nL) nL = it.layer + 1;
		});

		var layers = [];
		for (var L = 0; L < nL; L++) layers.push([]);
		items.forEach(function (it) {
			layers[it.layer].push(it);
		});
		var dn = 0;
		pairs.forEach(function (p) {
			var up = p.a.layer <= p.b.layer ? p.a : p.b,
				lo = up === p.a ? p.b : p.a;
			p.upper = up;
			p.lower = lo;
			var chain = [up];
			for (var k = up.layer + 1; k < lo.layer; k++) {
				var d = { id: "~" + dn++, dummy: true, band: "dummy", w: GEO.dummyW, h: 0, layer: k, pos: 0, cx: 0, y: 0, up: [], down: [], pair: p, i: up.i + 0.5 };
				layers[k].push(d);
				chain.push(d);
			}
			chain.push(lo);
			if (up.layer < lo.layer) {
				for (var j = 0; j + 1 < chain.length; j++) {
					chain[j].down.push(chain[j + 1]);
					chain[j + 1].up.push(chain[j]);
				}
			}
			p.chain = chain;
		});

		layers.forEach(function (row) {
			row.sort(function (x, y) {
				return x.i - y.i;
			});
			row.forEach(function (it, k) {
				it.pos = k;
			});
		});
		orderRows(layers);
		placeX(layers);

		// Rows (y). The focus frame gets a header above its first row.
		var hasFrame = !!level.focus;
		var y = GEO.pad,
			rowTop = [],
			rowH = [];
		for (L = 0; L < nL; L++) {
			if (hasFrame && L === t) y += GEO.frameTop;
			rowTop[L] = y;
			var h = 0;
			layers[L].forEach(function (it) {
				if (!it.dummy && it.h > h) h = it.h;
			});
			rowH[L] = h || GEO.ghostH;
			y += rowH[L];
			if (L < nL - 1) {
				if (hasFrame && L === maxMid) y += GEO.framePad;
				var segs = 0;
				layers[L].forEach(function (it) {
					segs += it.down.length;
				});
				y += 48 + Math.min(40, segs * 3);
			}
		}
		layers.forEach(function (row, k) {
			row.forEach(function (it) {
				it.y = rowTop[k];
				if (it.dummy) it.h = rowH[k];
			});
		});

		// Normalize x so the content starts at the padding.
		var all = [];
		layers.forEach(function (row) {
			row.forEach(function (it) {
				all.push(it);
			});
		});
		var minX = Infinity,
			maxX = -Infinity,
			fx0 = Infinity,
			fx1 = -Infinity;
		all.forEach(function (it) {
			var l = it.cx - it.w / 2,
				r = it.cx + it.w / 2;
			if (l < minX) minX = l;
			if (r > maxX) maxX = r;
			if (hasFrame && it.layer >= t && it.layer <= maxMid) {
				if (l < fx0) fx0 = l;
				if (r > fx1) fx1 = r;
			}
		});
		var frame = null;
		if (hasFrame && fx0 < Infinity) {
			fx0 -= GEO.framePad;
			fx1 += GEO.framePad;
			if (fx0 < minX) minX = fx0;
			if (fx1 > maxX) maxX = fx1;
		}
		var shift = GEO.pad - minX;
		all.forEach(function (it) {
			it.cx += shift;
		});
		if (hasFrame && fx0 < Infinity) {
			var fy0 = rowTop[t] - GEO.frameTop;
			frame = { x: fx0 + shift, y: fy0, w: fx1 - fx0, h: rowTop[maxMid] + rowH[maxMid] + GEO.framePad - fy0 };
		}
		return {
			items: items,
			byId: byId,
			pairs: pairs,
			layers: layers,
			frame: frame,
			width: maxX - minX + 2 * GEO.pad,
			height: y + GEO.pad,
		};
	}

	function crossings(layers) {
		var c = 0;
		for (var L = 0; L + 1 < layers.length; L++) {
			var segs = [];
			layers[L].forEach(function (it) {
				it.down.forEach(function (d) {
					segs.push(it.pos, d.pos);
				});
			});
			for (var i = 0; i < segs.length; i += 2) {
				for (var j = i + 2; j < segs.length; j += 2) {
					if ((segs[i] - segs[j]) * (segs[i + 1] - segs[j + 1]) < 0) c++;
				}
			}
		}
		return c;
	}

	function orderRows(layers) {
		var n = layers.length;
		function norm(it) {
			return (it.pos + 0.5) / layers[it.layer].length;
		}
		function sortRow(L, side) {
			var row = layers[L],
				key = new Map();
			row.forEach(function (it) {
				var ns = side < 0 ? it.up : it.down,
					b = norm(it);
				if (ns.length) {
					var s = 0;
					ns.forEach(function (m) {
						s += norm(m);
					});
					b = s / ns.length;
				}
				key.set(it, b);
			});
			row.sort(function (x, y) {
				return key.get(x) - key.get(y) || x.pos - y.pos;
			});
			row.forEach(function (it, k) {
				it.pos = k;
			});
		}
		function snap() {
			return layers.map(function (row) {
				return row.slice();
			});
		}
		var best = crossings(layers),
			bestRows = snap();
		for (var iter = 0; iter < 12 && best > 0; iter++) {
			var L;
			if (iter % 2 === 0) for (L = 1; L < n; L++) sortRow(L, -1);
			else for (L = n - 2; L >= 0; L--) sortRow(L, 1);
			var c = crossings(layers);
			if (c < best) {
				best = c;
				bestRows = snap();
			}
		}
		bestRows.forEach(function (row, L) {
			layers[L] = row;
			row.forEach(function (it, k) {
				it.pos = k;
			});
		});
	}

	function sepOf(a, b) {
		return a.dummy || b.dummy ? GEO.dummySep : GEO.gapX;
	}

	// Weighted isotonic regression: closest non-decreasing sequence to `s`.
	function pav(s, w) {
		var blocks = [];
		for (var i = 0; i < s.length; i++) {
			blocks.push({ v: s[i], wt: w[i], n: 1 });
			while (blocks.length > 1 && blocks[blocks.length - 2].v > blocks[blocks.length - 1].v) {
				var b = blocks.pop(),
					a = blocks[blocks.length - 1];
				a.v = (a.v * a.wt + b.v * b.wt) / (a.wt + b.wt);
				a.wt += b.wt;
				a.n += b.n;
			}
		}
		var out = [];
		blocks.forEach(function (b) {
			for (var k = 0; k < b.n; k++) out.push(b.v);
		});
		return out;
	}

	function placeRow(row, side) {
		var n = row.length;
		if (!n) return;
		var s = [],
			w = [],
			off = [],
			o = 0;
		for (var k = 0; k < n; k++) {
			var it = row[k];
			if (k) o += row[k - 1].w / 2 + sepOf(row[k - 1], it) + it.w / 2;
			off.push(o);
			var ns = side < 0 ? it.up : side > 0 ? it.down : it.up.concat(it.down);
			var want = it.cx,
				wt = 0.15;
			if (ns.length) {
				var sum = 0;
				ns.forEach(function (m) {
					sum += m.cx;
				});
				want = sum / ns.length;
				wt = it.dummy ? 2 : 1;
			}
			s.push(want - o);
			w.push(wt);
		}
		var y = pav(s, w);
		for (k = 0; k < n; k++) row[k].cx = y[k] + off[k];
	}

	function placeX(layers) {
		var widest = 0;
		layers.forEach(function (row) {
			var x = 0;
			row.forEach(function (it, k) {
				if (k) x += sepOf(row[k - 1], it);
				it.cx = x + it.w / 2;
				x += it.w;
			});
			row.width = x;
			if (x > widest) widest = x;
		});
		layers.forEach(function (row) {
			var off = (widest - row.width) / 2;
			row.forEach(function (it) {
				it.cx += off;
			});
		});
		var n = layers.length,
			L;
		for (var iter = 0; iter < 8; iter++) {
			if (iter % 2 === 0) for (L = 1; L < n; L++) placeRow(layers[L], -1);
			else for (L = n - 2; L >= 0; L--) placeRow(layers[L], 1);
		}
		for (L = 0; L < n; L++) placeRow(layers[L], 0);
	}

	// ------------------------------------------------------------------ routing

	// Spreads the ends that share one block border. Each port writes lane[port.key].
	function assignPorts(it, ports) {
		if (!ports.length) return;
		ports.sort(function (a, b) {
			return a.nx - b.nx || a.k - b.k;
		});
		var n = ports.length,
			usable = it.w - 28;
		var step = n > 1 ? Math.min(14, usable / (n - 1)) : 0,
			span = step * (n - 1);
		var mean = 0;
		ports.forEach(function (p) {
			mean += p.nx;
		});
		mean /= n;
		var lo = it.cx - usable / 2 + span / 2,
			hi = it.cx + usable / 2 - span / 2;
		var center = Math.max(lo, Math.min(hi, it.cx + (mean - it.cx) * 0.35));
		ports.forEach(function (p, j) {
			p.lane[p.key] = center - span / 2 + step * j;
		});
	}

	// Lanes run upper bottom → dummy chain → lower top.
	function route(level) {
		var Lo = level.layout;
		Lo.items.forEach(function (it) {
			it.ports = { top: [], bot: [] };
		});
		Lo.pairs.forEach(function (p) {
			var lanes = [];
			p.bundles.forEach(function (bu) {
				bu.laneList.forEach(function (lane) {
					if (!S.hideRel.has(lane.kind)) lanes.push(lane);
				});
			});
			p.vis = lanes;
			var below = p.chain[1],
				above = p.chain[p.chain.length - 2];
			var upList = p.upper.ports.bot,
				loList = p.lower.ports.top;
			lanes.forEach(function (lane, k) {
				lane.k = k;
				lane.n = lanes.length;
				upList.push({ lane: lane, nx: below.cx, k: k, key: "bx" });
				loList.push({ lane: lane, nx: above.cx, k: k, key: "tx" });
			});
		});
		Lo.items.forEach(function (it) {
			Object.keys(it.ports).forEach(function (side) {
				assignPorts(it, it.ports[side]);
			});
		});
		Lo.pairs.forEach(function (p) {
			var up = p.upper,
				lo = p.lower,
				y0 = up.y + up.h;
			p.vis.forEach(function (lane) {
				var off = (lane.k - (lane.n - 1) / 2) * GEO.lane;
				var pts = [{ x: lane.bx, y: y0 }];
				for (var c = 1; c < p.chain.length - 1; c++) {
					var d = p.chain[c];
					pts.push({ x: d.cx + off, y: d.y, d: d }, { x: d.cx + off, y: d.y + d.h, d: d });
				}
				pts.push({ x: lane.tx, y: lo.y });
				lane.pts = lane.bundle.from === up.node ? pts : pts.reverse();
			});
		});
	}

	function pathD(pts) {
		var n = pts.length,
			last = pts[n - 1],
			prev = pts[n - 2];
		var dir = last.y >= prev.y ? 1 : -1;
		var end = { x: last.x, y: last.y - dir * GEO.arrow };
		var d = "M" + f(pts[0].x) + " " + f(pts[0].y);
		for (var i = 1; i < n; i++) {
			var p = pts[i - 1],
				q = i === n - 1 ? end : pts[i];
			if (p.d && p.d === pts[i].d) d += "L" + f(q.x) + " " + f(q.y);
			else {
				var my = (p.y + q.y) / 2;
				d += "C" + f(p.x) + " " + f(my) + " " + f(q.x) + " " + f(my) + " " + f(q.x) + " " + f(q.y);
			}
		}
		return d;
	}
	function headD(pts) {
		var n = pts.length,
			last = pts[n - 1],
			prev = pts[n - 2];
		var dir = last.y >= prev.y ? 1 : -1,
			by = last.y - dir * GEO.arrow;
		return "M" + f(last.x) + " " + f(last.y) + "L" + f(last.x - 4.5) + " " + f(by) + "L" + f(last.x + 4.5) + " " + f(by) + "Z";
	}

	// ------------------------------------------------------------------ drawing

	function renderLevel() {
		hideTip();
		S.hoverId = null;
		S.kbdId = null;
		S.hoverBundle = null;
		var oldKey = S.edgeSel ? S.edgeSel.key : "";
		var level = lift(S.focus);
		S.level = level;
		S.edgeSel = oldKey
			? level.bundles.filter(function (b) {
					return b.key === oldKey;
				})[0] || null
			: null;
		renderHead(level);
		renderLegend();
		var vw = D.viewport.clientWidth || 960;
		S.lastWidth = vw;
		clear(D.edges);
		clear(D.blocks);
		level.els = new Map();
		if (!level.visible.length) {
			level.layout = null;
			D.sizer.style.width = "";
			D.sizer.style.height = "";
			D.canvas.style.width = "";
			D.canvas.style.height = "";
			D.canvas.style.transform = "";
			D.blocks.appendChild(el("p", "empty", S.hideKind.size ? "No blocks to show. The legend hides some block kinds." : "No blocks to show at this level."));
			return;
		}
		var per = Math.floor((vw - 2 * GEO.pad - (level.focus ? 2 * GEO.framePad : 0) + GEO.gapX) / (GEO.blockW + GEO.gapX));
		var Lo = layout(level, per);
		level.layout = Lo;
		var scale = Math.min(1, (vw - 4) / Lo.width);
		if (scale < GEO.minScale) scale = GEO.minScale;
		level.scale = scale;
		D.canvas.style.width = Lo.width + "px";
		D.canvas.style.height = Lo.height + "px";
		D.canvas.style.transform = scale < 1 ? "scale(" + scale + ")" : "";
		D.sizer.style.width = Math.ceil(Lo.width * scale) + "px";
		D.sizer.style.height = Math.ceil(Lo.height * scale) + "px";
		drawEdges();
		drawBlocks();
		updateSelection();
	}

	function drawEdges() {
		var level = S.level,
			Lo = level.layout,
			g = D.edges;
		clear(g);
		if (!Lo) return;
		g.setAttribute("width", Lo.width);
		g.setAttribute("height", Lo.height);
		g.setAttribute("viewBox", "0 0 " + f(Lo.width) + " " + f(Lo.height));
		if (Lo.frame) {
			g.appendChild(svgEl("rect", { class: "frame", x: f(Lo.frame.x), y: f(Lo.frame.y), width: f(Lo.frame.w), height: f(Lo.frame.h), rx: 12 }));
		}
		route(level);
		var all = svgEl("g", { class: "lanes" }),
			pills = svgEl("g", { class: "pills" });
		function bind(node, bu) {
			node.addEventListener("mouseenter", function (ev) {
				S.hoverBundle = bu;
				highlight();
				showTip(bu, ev);
			});
			node.addEventListener("mousemove", moveTip);
			node.addEventListener("mouseleave", function () {
				if (S.hoverBundle === bu) S.hoverBundle = null;
				highlight();
				hideTip();
			});
			node.addEventListener("click", function () {
				selectBundle(bu);
			});
		}
		level.bundles.forEach(function (bu) {
			bu.el = null;
			bu.pill = null;
			bu.vis = 0;
			var bg = svgEl("g", { class: "bundle", "data-from": bu.from.id, "data-to": bu.to.id });
			bu.laneList.forEach(function (lane) {
				lane.el = null;
				if (S.hideRel.has(lane.kind)) return;
				bu.vis += lane.edges.length;
				var d = pathD(lane.pts),
					lg = svgEl("g", { class: "lane " + relClass(lane.kind) });
				lg.appendChild(svgEl("path", { class: "hit", d: d }));
				lg.appendChild(svgEl("path", { class: "line", d: d }));
				lg.appendChild(svgEl("path", { class: "head", d: headD(lane.pts) }));
				lane.el = lg;
				bg.appendChild(lg);
			});
			if (!bu.vis) return;
			bu.el = bg;
			bind(bg, bu);
			all.appendChild(bg);
		});
		g.appendChild(all);
		// Count pills go on the middle strand of each merged bundle, in a layer above every
		// line so a neighbour's hit area never covers them.
		level.bundles.forEach(function (bu) {
			if (!bu.el || bu.vis < 2) return;
			var vis = bu.laneList.filter(function (l) {
				return l.el;
			});
			var mid = vis[Math.floor((vis.length - 1) / 2)];
			var path = mid.el.querySelector(".line"),
				len = path.getTotalLength();
			var shared =
				bu.pair.bundles.filter(function (b) {
					return b.vis;
				}).length > 1;
			var pt = path.getPointAtLength(len * (shared ? 0.38 : 0.5));
			var txt = String(bu.vis),
				w = 10 + 7 * txt.length;
			var pill = svgEl("g", { class: "count", "data-from": bu.from.id, "data-to": bu.to.id, transform: "translate(" + f(pt.x) + " " + f(pt.y) + ")" });
			pill.appendChild(svgEl("rect", { x: f(-w / 2), y: -8, width: f(w), height: 16, rx: 8 }));
			var t = svgEl("text", { x: 0, y: 4, "text-anchor": "middle" });
			t.textContent = txt;
			pill.appendChild(t);
			bind(pill, bu);
			bu.pill = pill;
			pills.appendChild(pill);
		});
		g.appendChild(pills);
		muteGhosts();
	}

	function drawBlocks() {
		var level = S.level,
			Lo = level.layout;
		clear(D.blocks);
		level.els = new Map();
		D.blocks.setAttribute("aria-label", "Blocks in " + (level.focus ? level.focus.title : projectTitle()));
		if (Lo.frame) {
			var lab = el("div", "frame-label", "Inside " + level.focus.title);
			lab.style.left = f(Lo.frame.x + 12) + "px";
			lab.style.top = f(Lo.frame.y + 8) + "px";
			lab.style.maxWidth = f(Lo.frame.w - 24) + "px";
			D.blocks.appendChild(lab);
		}
		// DOM (and Tab) order: focus children row by row, then outside ghosts.
		var rank = { mid: 0, top: 1, bottom: 2 };
		Lo.items
			.slice()
			.sort(function (a, b) {
				return rank[a.band] - rank[b.band] || a.layer - b.layer || a.cx - b.cx;
			})
			.forEach(function (it) {
				var b = blockEl(it);
				D.blocks.appendChild(b);
				level.els.set(it.id, b);
			});
		muteGhosts();
	}

	function blockEl(it) {
		var n = it.node,
			ghost = it.band !== "mid";
		var b = button("block " + kindClass(n.kind) + " " + statusClass(n.status) + (ghost ? " ghost" : ""));
		b.dataset.id = n.id;
		b.style.left = f(it.cx - it.w / 2) + "px";
		b.style.top = f(it.y) + "px";
		b.style.width = it.w + "px";
		b.style.height = it.h + "px";
		var head = el("span", "b-head");
		head.appendChild(el("span", "b-kind", ghost ? "outside" : n.kind));
		head.appendChild(badge(n.status));
		b.appendChild(head);
		b.appendChild(el("span", "b-title", n.title));
		var kids = ghost ? 0 : shownKids(n).length;
		var label = n.title + ", " + n.kind + ", " + (n.status || "no status");
		if (ghost) {
			b.appendChild(el("span", "b-foot", n.parent ? "in " + n.parent.title : n.kind));
			label = "Outside: " + n.title + (n.parent ? ", in " + n.parent.title : "") + ", " + (n.status || "no status");
		} else if (kids) {
			b.classList.add("has-kids");
			var foot = el("span", "b-foot");
			foot.appendChild(el("span", null, plural(kids, "part")));
			foot.appendChild(el("span", "b-open", "›"));
			b.appendChild(foot);
			label += ", " + plural(kids, "part") + ", opens";
		}
		b.setAttribute("aria-label", label);
		if (n.summary) b.title = n.summary;
		b.addEventListener("click", function () {
			activate(n, ghost);
		});
		b.addEventListener("mouseenter", function () {
			S.hoverId = n.id;
			highlight();
		});
		b.addEventListener("mouseleave", function () {
			if (S.hoverId === n.id) {
				S.hoverId = null;
				highlight();
			}
		});
		b.addEventListener("focus", function () {
			S.kbdId = n.id;
			highlight();
		});
		b.addEventListener("blur", function () {
			if (S.kbdId === n.id) {
				S.kbdId = null;
				highlight();
			}
		});
		return b;
	}

	function muteGhosts() {
		var level = S.level;
		if (!level || !level.els) return;
		var live = new Set();
		level.bundles.forEach(function (bu) {
			if (bu.el) {
				live.add(bu.from.id);
				live.add(bu.to.id);
			}
		});
		level.ghosts.forEach(function (g) {
			var b = level.els.get(g.node.id);
			if (b) b.classList.toggle("muted", !live.has(g.node.id));
		});
	}

	function updateSelection() {
		var level = S.level;
		if (!level || !level.els) return;
		level.els.forEach(function (b, id) {
			var on = !!S.selected && S.selected.id === id;
			b.classList.toggle("selected", on);
			if (on) b.setAttribute("aria-current", "true");
			else b.removeAttribute("aria-current");
		});
		highlight();
	}

	// Hover, keyboard focus, or selection lights one block (or one bundle) and its
	// neighbours; everything else dims. A feature or journey lights only the places it
	// lists: a passing overlay (hover, keyboard focus) wins; a mouse over the graph wins
	// over a selected overlay, whose places keep their ring.
	function highlight() {
		var level = S.level;
		if (!level || !level.els) return;
		var on = new Set(),
			lit = new Set(),
			mode = false;
		var passing = S.ovHover || S.ovKbd,
			ov = passing || S.overlay;
		var at = ov ? overlayMarks(level, ov) : null;
		var held = passing || (S.overlay && !S.hoverId && !S.hoverBundle) ? ov : null;
		var bu = held ? null : S.hoverBundle || S.edgeSel;
		var id = held ? null : S.hoverId || S.kbdId;
		if (!held && !id && !bu && S.selected && S.selected !== S.focus && level.els.has(S.selected.id)) id = S.selected.id;
		if (S.hoverBundle) id = null;
		if (held) {
			mode = true;
			at.marks.forEach(function (steps, key) {
				on.add(key);
			});
		} else if (id) {
			mode = true;
			on.add(id);
			level.bundles.forEach(function (b) {
				if (b.el && (b.from.id === id || b.to.id === id)) {
					lit.add(b);
					on.add(b.from.id);
					on.add(b.to.id);
				}
			});
		} else if (bu && bu.el) {
			mode = true;
			lit.add(bu);
			on.add(bu.from.id);
			on.add(bu.to.id);
		}
		D.canvas.classList.toggle("hl-mode", mode);
		D.canvas.classList.toggle("ov-journey", !!ov && ov.kind === "journey");
		var cur = ov && ov === S.overlay && S.step >= 0 ? S.step + 1 : 0;
		level.els.forEach(function (b, key) {
			var steps = at ? at.marks.get(key) : null;
			b.classList.toggle("hl", on.has(key));
			b.classList.toggle("ov", !!steps);
			b.classList.toggle("ov-cur", !!steps && steps.indexOf(cur) >= 0);
			stepTag(b, steps && ov.kind === "journey" ? steps.join(" · ") : "");
		});
		level.bundles.forEach(function (b) {
			if (b.el) {
				b.el.classList.toggle("hl", lit.has(b));
				b.el.classList.toggle("picked", b === S.edgeSel);
				if (b.pill) {
					b.pill.classList.toggle("hl", lit.has(b));
					b.pill.classList.toggle("picked", b === S.edgeSel);
				}
			}
		});
		overlayNote(ov, at);
	}

	function stepTag(b, text) {
		var tag = b.querySelector(".b-steps");
		if (!text) {
			if (tag) b.removeChild(tag);
			return;
		}
		if (!tag) {
			tag = el("span", "b-steps");
			b.appendChild(tag);
		}
		if (tag.textContent !== text) tag.textContent = text;
	}

	// ----------------------------------------------------------------- overlays

	// Where each listed place shows at this level: its own block, the block of a
	// collapsed ancestor, the open block (or a block above it), or nowhere. Never a
	// neighbour: overlays draw no links. `marks` maps a block id to 1-based list positions.
	function overlayMarks(level, o) {
		var fchain = level.focus ? level.focus.chain : [];
		var r = { marks: new Map(), lit: 0, around: 0, off: 0, root: 0 };
		o.places.forEach(function (p, i) {
			if (!p.node) r.root++;
			else if (!shown(p.node)) r.off++;
			else {
				var at = rep(p.node, fchain);
				if (!at || (level.focus && within(level.focus, p.node))) r.around++;
				else if (!level.els.has(at.node.id)) r.off++;
				else {
					if (!r.marks.has(at.node.id)) r.marks.set(at.node.id, []);
					r.marks.get(at.node.id).push(i + 1);
					r.lit++;
				}
			}
		});
		return r;
	}

	function overlayCount(o) {
		return o.kind === "journey" ? plural(o.places.length, "step") : plural(o.places.length, "place");
	}

	function overlayNote(o, at) {
		var box = D.ovNote;
		if (!box) return;
		var text = "Hover or select one to light the places it lists. Nothing else lights.";
		if (o) {
			var bits = [];
			if (!o.places.length) bits.push("lists no place on this map");
			else bits.push(at.lit + " of " + overlayCount(o) + " lit at this level");
			if (at && at.around) bits.push(at.around + " at the open block or above it");
			if (at && at.off) bits.push(at.off + " not shown at this level");
			if (at && at.root) bits.push(at.root + " the whole project");
			if (o.missing.length) bits.push(plural(o.missing.length, "unknown id"));
			text = (o.kind === "journey" ? "Journey " : "Feature ") + o.title + ": " + bits.join(" · ");
		}
		if (box.textContent !== text) box.textContent = text;
	}

	function renderOverlays() {
		var box = D.overlays;
		clear(box);
		D.ovItems = new Map();
		D.ovNote = null;
		box.hidden = !M.features.length && !M.journeys.length;
		if (box.hidden) return;
		[
			["Features", M.features],
			["Journeys", M.journeys],
		].forEach(function (g) {
			var grp = el("div", "lg-group ov-group");
			grp.setAttribute("role", "group");
			grp.setAttribute("aria-label", g[0]);
			grp.appendChild(el("span", "lg-label", g[0]));
			if (!g[1].length) grp.appendChild(el("span", "ov-none", "none on this map"));
			g[1].forEach(function (o) {
				var b = overlayItem(o);
				D.ovItems.set(o.key, b);
				grp.appendChild(b);
			});
			box.appendChild(grp);
		});
		D.ovNote = el("p", "ov-note");
		D.ovNote.setAttribute("aria-live", "polite");
		box.appendChild(D.ovNote);
		updateOverlays();
	}

	function overlayItem(o) {
		var b = button("ov-item ov-" + o.kind + " " + statusClass(o.status) + (o.places.length ? "" : " zero"), null, function () {
			selectOverlay(S.overlay === o ? null : o);
		});
		b.dataset.key = o.key;
		b.appendChild(el("span", "ov-name", o.title));
		b.appendChild(el("span", "lg-count", overlayCount(o)));
		if (o.status !== "ready") b.appendChild(badge(o.status));
		b.title = o.summary || o.title;
		b.setAttribute("aria-label", o.kind + " " + o.title + ", " + overlayCount(o) + ", " + (o.status || "no status"));
		b.addEventListener("mouseenter", function () {
			S.ovHover = o;
			highlight();
		});
		b.addEventListener("mouseleave", function () {
			if (S.ovHover === o) {
				S.ovHover = null;
				highlight();
			}
		});
		// Keyboard focus lights like hover; a mouse click focuses without lighting.
		b.addEventListener("focus", function () {
			if (!b.matches(":focus-visible")) return;
			S.ovKbd = o;
			highlight();
		});
		b.addEventListener("blur", function () {
			if (S.ovKbd === o) {
				S.ovKbd = null;
				highlight();
			}
		});
		return b;
	}

	function updateOverlays() {
		D.ovItems.forEach(function (b, key) {
			b.setAttribute("aria-pressed", String(!!S.overlay && S.overlay.key === key));
		});
	}

	function selectOverlay(o) {
		S.overlay = o;
		S.step = -1;
		S.edgeSel = null;
		hideTip();
		updateOverlays();
		renderPanel();
		highlight();
		if (o && D.main.classList.contains("panel-closed")) setPanel(true);
	}

	// Ordinary navigation to one place ends the overlay; drilling keeps it.
	function dropOverlay() {
		if (!S.overlay) return false;
		S.overlay = null;
		S.step = -1;
		updateOverlays();
		return true;
	}

	function goPlace(p) {
		if (p.node) navigate(p.node.parent, p.node);
		else navigate(null, null);
	}

	function goStep(i) {
		var o = S.overlay;
		if (!o || i < 0 || i >= o.places.length) return;
		S.step = i;
		goPlace(o.places[i]);
	}

	function renderOverlayPanel(box, o) {
		var journey = o.kind === "journey";
		var tags = el("div", "d-tags");
		tags.appendChild(el("span", "tag ov-tag ov-" + o.kind, o.kind));
		tags.appendChild(badge(o.status));
		box.appendChild(tags);
		box.appendChild(el("h2", "d-title", o.title));
		box.appendChild(codeLine("d-id", o.id));
		if (o.summary && !repeats(o.bodyHtml, o.summary)) box.appendChild(el("p", "d-sum", o.summary));
		var acts = el("div", "d-actions");
		if (journey && o.places.length) {
			var prev = button("d-action", "Previous step", function () {
				goStep(S.step - 1);
			});
			prev.dataset.key = "step-prev";
			prev.disabled = S.step <= 0;
			var next = button("d-action", S.step < 0 ? "First step" : "Next step", function () {
				goStep(S.step + 1);
			});
			next.dataset.key = "step-next";
			next.disabled = S.step >= o.places.length - 1;
			acts.appendChild(prev);
			acts.appendChild(next);
		}
		var close = button("d-action quiet", "Clear " + o.kind, function () {
			selectOverlay(null);
		});
		close.dataset.key = "clear";
		acts.appendChild(close);
		box.appendChild(acts);
		if (o.bodyHtml) box.appendChild(prose(o.bodyHtml));
		else if (!o.summary) box.appendChild(el("p", "d-empty", "No description."));

		var level = S.level,
			at = level && level.els ? overlayMarks(level, o) : null;
		var s = section(box, (journey ? "Steps" : "Touches") + " (" + o.places.length + ")");
		if (!o.places.length) s.appendChild(el("p", "d-empty", journey ? "Lists no step on this map." : "Lists no place on this map."));
		var list = el(journey ? "ol" : "ul", "d-parts ov-places");
		o.places.slice(0, LIMIT.list).forEach(function (p, i) {
			var li = el("li");
			var b = button("d-link", null, function () {
				if (journey) goStep(i);
				else goPlace(p);
			});
			b.dataset.key = "place:" + i;
			if (journey) b.appendChild(el("span", "ov-num", String(i + 1)));
			if (p.node) {
				b.appendChild(el("span", "kind-chip " + kindClass(p.node.kind)));
				b.appendChild(el("span", "d-link-title", p.node.title));
				b.appendChild(badge(p.node.status));
			} else {
				b.appendChild(el("span", "d-link-title", projectTitle()));
				b.appendChild(el("span", "tag", "project"));
			}
			b.title = p.id;
			if (journey && i === S.step) {
				li.className = "current";
				b.setAttribute("aria-current", "step");
			}
			li.appendChild(b);
			var where = placeWhere(level, at, p, i);
			if (where) li.appendChild(el("p", "ov-where", where));
			list.appendChild(li);
		});
		if (o.places.length > LIMIT.list) list.appendChild(el("li", "more", o.places.length - LIMIT.list + " more"));
		if (o.places.length) s.appendChild(list);
		if (o.missing.length) {
			var g = section(box, "Gaps (" + o.missing.length + ")");
			g.appendChild(el("p", "d-note", "Listed ids with no place on this map. Nothing lights for them."));
			sourceList(g, o.missing);
		}
		sourceList(box, o.sources);
		if (o.source) box.appendChild(codeLine("d-foot", o.source));
		metaList(box, o.meta);
	}

	// One plain line on where a listed place shows at the current level.
	function placeWhere(level, at, p, i) {
		if (!p.node) return "The whole project. No block lights for it.";
		if (!level || !at) return "";
		if (!shown(p.node)) return "Hidden by the legend.";
		var key = "";
		at.marks.forEach(function (steps, k) {
			if (steps.indexOf(i + 1) >= 0) key = k;
		});
		if (key === p.node.id) return "";
		if (key) return "Lit as " + M.byId.get(key).title + ", which holds it.";
		if (level.focus === p.node) return "The open block.";
		if (level.focus && within(level.focus, p.node)) return "Holds the open block.";
		return "Not shown at this level.";
	}

	// ------------------------------------------------------------------ tooltip

	function breakdown(edges) {
		var by = new Map();
		edges.forEach(function (e) {
			by.set(e.kind, (by.get(e.kind) || 0) + 1);
		});
		return M.relKinds
			.filter(function (k) {
				return by.has(k);
			})
			.map(function (k) {
				return by.get(k) + " " + k;
			})
			.join(", ");
	}
	function visibleEdges(bu) {
		var out = [];
		bu.laneList.forEach(function (l) {
			if (!S.hideRel.has(l.kind)) out = out.concat(l.edges);
		});
		return out;
	}
	function showTip(bu, ev) {
		var tip = D.tip,
			edges = visibleEdges(bu);
		clear(tip);
		tip.appendChild(el("div", "tip-head", bu.from.title + " → " + bu.to.title));
		tip.appendChild(el("div", "tip-count", plural(edges.length, "connection") + ": " + breakdown(edges)));
		var ul = el("ul", "tip-list");
		edges.slice(0, LIMIT.tip).forEach(function (e) {
			var li = el("li");
			li.appendChild(relTag(e.kind));
			li.appendChild(el("span", "tip-title", e.title));
			ul.appendChild(li);
		});
		if (edges.length > LIMIT.tip) ul.appendChild(el("li", "more", edges.length - LIMIT.tip + " more. Click the line to see all."));
		tip.appendChild(ul);
		tip.hidden = false;
		moveTip(ev);
	}
	function moveTip(ev) {
		var tip = D.tip;
		if (tip.hidden) return;
		var w = tip.offsetWidth,
			h = tip.offsetHeight;
		var x = ev.clientX + 14,
			y = ev.clientY + 14;
		if (x + w > window.innerWidth - 8) x = Math.max(8, ev.clientX - w - 14);
		if (y + h > window.innerHeight - 8) y = Math.max(8, ev.clientY - h - 14);
		tip.style.left = x + "px";
		tip.style.top = y + "px";
	}
	function hideTip() {
		if (D.tip) D.tip.hidden = true;
	}

	// -------------------------------------------------------------- level head

	function renderHead(level) {
		var box = D.head,
			f0 = level.focus;
		clear(box);
		var row = el("div", "lh-row");
		var h = el("h1", "lh-title", f0 ? f0.title : projectTitle());
		h.id = "level-title";
		row.appendChild(h);
		if (f0) {
			row.appendChild(kindTag(f0.kind));
			row.appendChild(badge(f0.status));
		} else if (str(M.project.status)) row.appendChild(badge(str(M.project.status)));
		box.appendChild(row);
		var sum = f0 ? f0.summary : str(M.project.summary);
		if (sum) box.appendChild(el("p", "lh-sum", sum));
		if (S.unknown) box.appendChild(el("p", "notice", 'No block has the id "' + S.unknown + '". The map shows the top level.'));
		var n = 0;
		level.bundles.forEach(function (bu) {
			n += bu.edges.length;
		});
		var bits = [plural(level.visible.length, "block"), plural(n, "connection")];
		if (level.ghosts.length) bits.push(level.ghosts.length + " outside");
		var stats = el("p", "lh-stats", bits.join(" · "));
		if (level.own) stats.appendChild(el("span", "lh-own", " · " + plural(level.own, "connection") + " of this block itself: see Details"));
		box.appendChild(stats);
	}

	// ------------------------------------------------------------------- legend

	function renderLegend() {
		var box = D.legend,
			level = S.level;
		var active = document.activeElement,
			keep = active && box.contains(active) ? active.dataset.key : "";
		clear(box);
		var relCount = new Map(),
			kindCount = new Map();
		if (level) {
			level.bundles.forEach(function (bu) {
				bu.edges.forEach(function (e) {
					relCount.set(e.kind, (relCount.get(e.kind) || 0) + 1);
				});
			});
			level.visible.forEach(function (n) {
				kindCount.set(n.kind, (kindCount.get(n.kind) || 0) + 1);
			});
		}
		if (M.relKinds.length) {
			var g = el("div", "lg-group");
			g.setAttribute("role", "group");
			g.setAttribute("aria-label", "Connection kinds");
			g.appendChild(el("span", "lg-label", "Connections"));
			M.relKinds.forEach(function (k) {
				var on = !S.hideRel.has(k);
				var b = button("lg-item " + relClass(k), null, function () {
					toggleRel(k);
				});
				b.dataset.key = "rel:" + k;
				b.setAttribute("aria-pressed", String(on));
				b.title = (on ? "Hide " : "Show ") + k + " connections";
				b.appendChild(swatch());
				b.appendChild(el("span", "lg-name", k));
				b.appendChild(el("span", "lg-count", String(relCount.get(k) || 0)));
				if (!relCount.get(k)) b.classList.add("zero");
				g.appendChild(b);
			});
			box.appendChild(g);
		}
		if (M.nodeKinds.length > 1) {
			var gk = el("div", "lg-group");
			gk.setAttribute("role", "group");
			gk.setAttribute("aria-label", "Block kinds");
			gk.appendChild(el("span", "lg-label", "Blocks"));
			M.nodeKinds.forEach(function (k) {
				var on = !S.hideKind.has(k);
				var b = button("lg-item lg-kind", null, function () {
					toggleKind(k);
				});
				b.dataset.key = "kind:" + k;
				b.setAttribute("aria-pressed", String(on));
				b.title = (on ? "Hide " : "Show ") + k + " blocks";
				b.appendChild(el("span", "kind-chip " + kindClass(k)));
				b.appendChild(el("span", "lg-name", k));
				b.appendChild(el("span", "lg-count", String(kindCount.get(k) || 0)));
				if (!kindCount.get(k)) b.classList.add("zero");
				gk.appendChild(b);
			});
			box.appendChild(gk);
		}
		if (M.statuses.length) {
			var gs = el("div", "lg-group lg-status");
			gs.appendChild(el("span", "lg-label", "Status"));
			M.statuses.forEach(function (s) {
				gs.appendChild(badge(s));
			});
			box.appendChild(gs);
		}
		box.appendChild(el("p", "lg-hint", "Arrows point from the user to the used part. Click a block with parts to open it. Esc goes up."));
		if (keep) {
			var again = Array.prototype.filter.call(box.querySelectorAll("button"), function (x) {
				return x.dataset.key === keep;
			})[0];
			if (again) again.focus();
		}
	}

	function toggleRel(k) {
		if (S.hideRel.has(k)) S.hideRel.delete(k);
		else S.hideRel.add(k);
		if (S.edgeSel && !visibleEdges(S.edgeSel).length) {
			S.edgeSel = null;
			renderPanel();
		}
		renderLegend();
		drawEdges();
		highlight();
	}

	function toggleKind(k) {
		if (S.hideKind.has(k)) S.hideKind.delete(k);
		else S.hideKind.add(k);
		var focus = S.focus;
		while (focus && !shown(focus)) focus = focus.parent;
		if (focus !== S.focus || (S.selected && !shown(S.selected))) {
			navigate(focus, focus);
			if (S.focus === focus) return;
		}
		renderLevel();
		renderPanel();
	}

	// --------------------------------------------------------------- navigation

	function hashFor(focus, selected) {
		if (focus && (!selected || selected === focus)) return "#" + encodeURIComponent(focus.id) + "/";
		if (selected) return "#" + encodeURIComponent(selected.id);
		return "#";
	}
	function parseHash() {
		var h = location.hash.replace(/^#/, "");
		try {
			h = decodeURIComponent(h);
		} catch (err) {
			/* keep raw */
		}
		if (!h) return { focus: null, selected: null, unknown: "" };
		var open = h.charAt(h.length - 1) === "/";
		if (open) h = h.slice(0, -1);
		var n = M.byId.get(h);
		if (!n) return { focus: null, selected: null, unknown: h };
		if (open && n.kids.length) return { focus: n, selected: n, unknown: "" };
		return { focus: n.parent, selected: n, unknown: "" };
	}
	function navigate(focus, selected) {
		S.edgeSel = null;
		var h = hashFor(focus, selected);
		if ((location.hash || "#") === h) {
			apply(focus, selected, "");
			return;
		}
		location.hash = h; // hashchange → apply
	}
	function onHash() {
		var r = parseHash();
		apply(r.focus, r.selected, r.unknown);
	}

	function centerOf(level, node) {
		if (!level || !level.layout || !node) return null;
		var it = level.layout.byId.get(node.id);
		if (!it) return null;
		return { x: it.cx * level.scale, y: (it.y + it.h / 2) * level.scale };
	}

	function apply(focus, selected, unknown) {
		var unhid = false;
		[focus, selected].forEach(function (n) {
			if (n)
				n.chain.forEach(function (c) {
					if (S.hideKind.delete(c.kind)) unhid = true;
				});
		});
		var prev = S.focus,
			prevLevel = S.level;
		var changed = unhid || !prevLevel || prev !== focus;
		var hadFocus = D.blocks.contains(document.activeElement);
		var dir = 0,
			origin = null;
		if (prevLevel && prev !== focus) {
			var pd = prev ? prev.chain.length : 0,
				nd = focus ? focus.chain.length : 0;
			dir = nd > pd ? 1 : nd < pd ? -1 : 0;
			if (dir > 0) origin = centerOf(prevLevel, focus);
		}
		S.focus = focus;
		S.selected = selected;
		S.unknown = unknown || "";
		if (changed) {
			if (prevLevel && prev !== focus) S.edgeSel = null;
			renderLevel();
			if (dir < 0 && prev && within(prev, focus || prev.chain[0])) {
				origin = centerOf(S.level, prev.chain[focus ? focus.chain.length : 0]);
			}
			if (dir) animateLevel(dir, origin);
			if (prev !== focus) {
				D.viewport.scrollTop = 0;
				D.viewport.scrollLeft = 0;
			}
		} else {
			updateSelection();
		}
		renderCrumbs();
		renderPanel();
		revealSelected(hadFocus);
	}

	function revealSelected(takeFocus) {
		var level = S.level;
		if (!level || !level.els) return;
		var b = S.selected ? level.els.get(S.selected.id) : null;
		if (b) {
			var vr = D.viewport.getBoundingClientRect(),
				br = b.getBoundingClientRect();
			if (br.top < vr.top || br.bottom > vr.bottom || br.left < vr.left || br.right > vr.right) {
				b.scrollIntoView({ block: "nearest", inline: "nearest" });
			}
		}
		if (takeFocus) {
			var target = b || D.blocks.querySelector(".block:not(.ghost)") || D.blocks.querySelector(".block");
			if (target) target.focus({ preventScroll: true });
		}
	}

	function animateLevel(dir, origin) {
		if (reduced() || !D.sizer.animate) return;
		D.sizer.style.transformOrigin = origin ? f(origin.x) + "px " + f(origin.y) + "px" : "50% 30%";
		D.sizer.animate(
			[
				{ opacity: 0, transform: "scale(" + (dir > 0 ? 0.9 : 1.08) + ")" },
				{ opacity: 1, transform: "none" },
			],
			{ duration: ANIM_MS, easing: "cubic-bezier(.2,.8,.2,1)" },
		);
	}

	// Opening a block keeps a selected overlay; picking one place ends it.
	function activate(n, ghost) {
		if (ghost) {
			dropOverlay();
			navigate(n.parent, n);
		} else if (shownKids(n).length) navigate(n, n);
		else {
			dropOverlay();
			navigate(S.focus, n);
		}
	}

	function up() {
		if (S.edgeSel) {
			S.edgeSel = null;
			renderPanel();
			highlight();
			return;
		}
		if (dropOverlay()) {
			renderPanel();
			highlight();
			return;
		}
		if (S.focus) navigate(S.focus.parent, S.focus);
		else if (S.selected) navigate(null, null);
	}

	function selectBundle(bu) {
		dropOverlay();
		S.edgeSel = bu;
		hideTip();
		renderPanel();
		highlight();
		if (!D.main.classList.contains("panel-closed")) return;
		setPanel(true);
	}

	function renderCrumbs() {
		var box = D.crumbs;
		clear(box);
		var trail = [null].concat(S.focus ? S.focus.chain : []);
		trail.forEach(function (n, i) {
			if (i) {
				var sep = el("span", "sep", "›");
				sep.setAttribute("aria-hidden", "true");
				box.appendChild(sep);
			}
			var label = n ? n.title : projectTitle(),
				cls = "crumb" + (n ? "" : " root");
			if (i === trail.length - 1) {
				var cur = el("span", cls + " current", label);
				cur.setAttribute("aria-current", "location");
				box.appendChild(cur);
			} else {
				box.appendChild(
					button(cls, label, function () {
						navigate(n, n);
					}),
				);
			}
		});
	}

	// -------------------------------------------------------------------- panel

	function renderPanel() {
		var box = D.panelBody,
			active = document.activeElement,
			keep = active && box.contains(active) ? active.dataset.key : "";
		clear(box);
		D.panel.scrollTop = 0;
		if (S.edgeSel) renderBundlePanel(box, S.edgeSel);
		else if (S.overlay) renderOverlayPanel(box, S.overlay);
		else if (S.selected) renderNodePanel(box, S.selected);
		else renderProjectPanel(box);
		if (keep) {
			// A step button that just disabled hands focus to the current step.
			var find = function (key) {
				return Array.prototype.filter.call(box.querySelectorAll("button"), function (x) {
					return x.dataset.key === key && !x.disabled;
				})[0];
			};
			var again = find(keep) || find("place:" + S.step);
			if (again) again.focus();
		}
	}

	function renderProjectPanel(box) {
		var p = M.project,
			tags = el("div", "d-tags");
		tags.appendChild(el("span", "tag", "project"));
		if (str(p.status)) tags.appendChild(badge(str(p.status)));
		box.appendChild(tags);
		box.appendChild(el("h2", "d-title", projectTitle()));
		if (str(p.id) || str(p.rootId)) box.appendChild(codeLine("d-id", str(p.rootId) || str(p.id)));
		if (str(p.summary) && !repeats(str(p.descriptionHtml), str(p.summary))) box.appendChild(el("p", "d-sum", str(p.summary)));
		if (str(p.descriptionHtml)) box.appendChild(prose(str(p.descriptionHtml)));
		var st = section(box, "Counts"),
			dl = el("dl", "d-meta");
		function row(k, v) {
			dl.appendChild(el("dt", null, k));
			dl.appendChild(el("dd", null, v));
		}
		row("Top-level blocks", String(M.roots.length));
		row("All blocks", String(M.nodes.length));
		row("Connections", String(M.edges.length));
		row("Features", String(M.features.length));
		row("Journeys", String(M.journeys.length));
		M.nodeKinds.forEach(function (k) {
			row(
				"Kind " + k,
				String(
					M.nodes.filter(function (n) {
						return n.kind === k;
					}).length,
				),
			);
		});
		M.statuses.forEach(function (s) {
			row(
				"Status " + s,
				String(
					M.nodes.filter(function (n) {
						return n.status === s;
					}).length,
				),
			);
		});
		st.appendChild(dl);
		sourceList(box, strList(p.sources));
		metaList(box, obj(p.meta));
		if (M.generatedAt) box.appendChild(el("p", "d-foot", "Generated " + M.generatedAt));
	}

	function metaList(box, meta) {
		var keys = Object.keys(meta).filter(function (k) {
			var v = meta[k];
			return v != null && typeof v !== "object";
		});
		if (!keys.length) return;
		var dl = el("dl", "d-meta");
		keys.forEach(function (k) {
			dl.appendChild(el("dt", null, k));
			dl.appendChild(el("dd", null, str(meta[k])));
		});
		section(box, "Metadata").appendChild(dl);
	}

	function renderNodePanel(box, n) {
		var tags = el("div", "d-tags");
		tags.appendChild(kindTag(n.kind));
		tags.appendChild(badge(n.status));
		box.appendChild(tags);
		box.appendChild(el("h2", "d-title", n.title));
		box.appendChild(codeLine("d-id", n.id));
		if (n.summary && !repeats(n.bodyHtml, n.summary)) box.appendChild(el("p", "d-sum", n.summary));
		var kids = shownKids(n);
		if (kids.length && S.focus !== n) {
			box.appendChild(
				button("d-action", "Open " + plural(kids.length, "part"), function () {
					navigate(n, n);
				}),
			);
		}
		if (n.bodyHtml) box.appendChild(prose(n.bodyHtml));
		else if (!n.summary) box.appendChild(el("p", "d-empty", "No description."));
		sourceList(box, n.sources);
		if (n.kids.length) {
			var ps = section(box, "Parts (" + n.kids.length + ")"),
				ul = el("ul", "d-parts");
			n.kids.slice(0, LIMIT.list).forEach(function (k) {
				var li = el("li");
				var b = button("d-link", null, function () {
					navigate(n, k);
				});
				b.appendChild(el("span", "kind-chip " + kindClass(k.kind)));
				b.appendChild(el("span", "d-link-title", k.title));
				b.appendChild(badge(k.status));
				li.appendChild(b);
				ul.appendChild(li);
			});
			ps.appendChild(ul);
		}
		var c = connections(n);
		connSection(box, "Outgoing", c.out, true, n);
		connSection(box, "Incoming", c.inc, false, n);
		if (c.inside) box.appendChild(el("p", "d-note", plural(c.inside, "connection") + " between parts of this block."));
		if (n.source) box.appendChild(codeLine("d-foot", n.source));
		metaList(box, n.meta);
	}

	// Edges that cross the border of `n`'s subtree.
	function connections(n) {
		var out = [],
			inc = [],
			inside = 0;
		M.edges.forEach(function (e) {
			var a = within(e.from, n),
				b = within(e.to, n);
			if (a && b) inside++;
			else if (a) out.push(e);
			else if (b) inc.push(e);
		});
		function sorter(dirOut) {
			return function (x, y) {
				var kx = M.relKinds.indexOf(x.kind) - M.relKinds.indexOf(y.kind);
				if (kx) return kx;
				var ox = dirOut ? x.to : x.from,
					oy = dirOut ? y.to : y.from;
				return ox.title.localeCompare(oy.title) || x.index - y.index;
			};
		}
		out.sort(sorter(true));
		inc.sort(sorter(false));
		return { out: out, inc: inc, inside: inside };
	}

	function connSection(box, title, list, dirOut, n) {
		var s = section(box, title + " (" + list.length + ")");
		if (!list.length) {
			s.appendChild(el("p", "d-empty", "None."));
			return;
		}
		var ul = el("ul", "d-conns");
		list.slice(0, LIMIT.list).forEach(function (e) {
			ul.appendChild(connItem(e, dirOut, n));
		});
		if (list.length > LIMIT.list) ul.appendChild(el("li", "more", list.length - LIMIT.list + " more"));
		s.appendChild(ul);
	}

	function connItem(e, dirOut, n) {
		var other = dirOut ? e.to : e.from,
			part = dirOut ? e.from : e.to;
		var li = el("li", "conn" + (S.hideRel.has(e.kind) ? " off" : ""));
		var row = el("div", "conn-row");
		row.appendChild(relTag(e.kind));
		var go = button("conn-go", null, function () {
			navigate(other.parent, other);
		});
		go.appendChild(el("span", "conn-arrow", dirOut ? "to" : "from"));
		go.appendChild(el("span", "conn-node", other.title));
		go.title = "Go to " + other.title + " (" + other.id + ")";
		row.appendChild(go);
		li.appendChild(row);
		var det = el("details", "conn-more");
		det.appendChild(el("summary", null, e.title));
		var filled = false;
		det.addEventListener("toggle", function () {
			if (filled || !det.open) return;
			filled = true;
			if (part !== n) det.appendChild(el("p", "conn-ends", e.from.title + " → " + e.to.title));
			edgeBody(det, e);
		});
		li.appendChild(det);
		return li;
	}

	function edgeBody(box, e) {
		var tags = el("div", "d-tags");
		if (e.status) tags.appendChild(badge(e.status));
		box.appendChild(tags);
		if (e.bodyHtml) box.appendChild(prose(e.bodyHtml));
		else if (e.summary) box.appendChild(el("p", null, e.summary));
		else box.appendChild(el("p", "d-empty", "No description."));
		sourceList(box, e.sources);
		if (e.source) box.appendChild(codeLine("d-foot", e.source));
	}

	function renderBundlePanel(box, bu) {
		var tags = el("div", "d-tags");
		tags.appendChild(el("span", "tag", "connection"));
		box.appendChild(tags);
		box.appendChild(el("h2", "d-title", bu.from.title + " → " + bu.to.title));
		var edges = bu.edges.slice().sort(function (x, y) {
			return M.relKinds.indexOf(x.kind) - M.relKinds.indexOf(y.kind) || x.index - y.index;
		});
		box.appendChild(el("p", "d-sum", plural(edges.length, "connection") + ": " + breakdown(edges)));
		var acts = el("div", "d-actions");
		acts.appendChild(
			button("d-action", "Go to " + bu.from.title, function () {
				navigate(bu.from.parent, bu.from);
			}),
		);
		acts.appendChild(
			button("d-action", "Go to " + bu.to.title, function () {
				navigate(bu.to.parent, bu.to);
			}),
		);
		acts.appendChild(
			button("d-action quiet", "Close", function () {
				S.edgeSel = null;
				renderPanel();
				highlight();
			}),
		);
		box.appendChild(acts);
		edges.slice(0, LIMIT.list).forEach(function (e) {
			var art = el("article", "d-edge" + (S.hideRel.has(e.kind) ? " off" : ""));
			var row = el("div", "conn-row");
			row.appendChild(relTag(e.kind));
			art.appendChild(row);
			art.appendChild(el("h3", "d-edge-title", e.title));
			if (e.from !== bu.from || e.to !== bu.to) art.appendChild(el("p", "conn-ends", e.from.title + " → " + e.to.title));
			edgeBody(art, e);
			box.appendChild(art);
		});
		if (edges.length > LIMIT.list) box.appendChild(el("p", "more", edges.length - LIMIT.list + " more"));
	}

	function setPanel(open) {
		D.main.classList.toggle("panel-closed", !open);
		D.panelToggle.setAttribute("aria-expanded", String(open));
	}

	// ------------------------------------------------------------------- search

	function searchNodes(q) {
		q = q.trim().toLowerCase();
		if (!q) return [];
		var terms = q.split(/\s+/),
			res = [];
		M.nodes.forEach(function (n) {
			var t = n.title.toLowerCase(),
				id = n.id.toLowerCase(),
				s = n.summary.toLowerCase(),
				score = -1;
			if (t === q || id === q) score = 0;
			else if (t.indexOf(q) === 0) score = 1;
			else if (id.indexOf(q) === 0 || id.indexOf("." + q) >= 0) score = 2;
			else if (t.indexOf(q) >= 0) score = 3;
			else if (id.indexOf(q) >= 0) score = 4;
			else if (s.indexOf(q) >= 0) score = 5;
			else {
				var hay = t + " " + id + " " + s;
				if (
					terms.every(function (w) {
						return hay.indexOf(w) >= 0;
					})
				)
					score = 6;
			}
			if (score >= 0) res.push({ n: n, score: score });
		});
		res.sort(function (a, b) {
			return a.score - b.score || a.n.chain.length - b.n.chain.length || a.n.index - b.n.index;
		});
		return res.slice(0, LIMIT.results).map(function (r) {
			return r.n;
		});
	}

	function renderResults() {
		var ul = D.results,
			input = D.search;
		clear(ul);
		var open = !!input.value.trim();
		if (!open) {
			ul.hidden = true;
			input.setAttribute("aria-expanded", "false");
			input.removeAttribute("aria-activedescendant");
			return;
		}
		if (!S.results.length) {
			ul.appendChild(el("li", "r-empty", "No match."));
		}
		S.results.forEach(function (n, i) {
			var li = el("li", "r-item" + (i === S.active ? " active" : ""));
			li.id = "sr-" + i;
			li.setAttribute("role", "option");
			li.setAttribute("aria-selected", String(i === S.active));
			var top = el("div", "r-top");
			top.appendChild(el("span", "kind-chip " + kindClass(n.kind)));
			top.appendChild(el("span", "r-title", n.title));
			top.appendChild(badge(n.status));
			li.appendChild(top);
			li.appendChild(el("div", "r-id", n.parent ? n.id + "  ·  in " + n.parent.title : n.id));
			if (n.summary) li.appendChild(el("div", "r-sum", n.summary));
			li.addEventListener("mousedown", function (ev) {
				ev.preventDefault();
				pickResult(i);
			});
			ul.appendChild(li);
		});
		ul.hidden = false;
		input.setAttribute("aria-expanded", "true");
		if (S.active >= 0) input.setAttribute("aria-activedescendant", "sr-" + S.active);
		else input.removeAttribute("aria-activedescendant");
	}

	function pickResult(i) {
		var n = S.results[i];
		if (!n) return;
		closeSearch();
		dropOverlay();
		navigate(n.parent, n);
		var b = S.level && S.level.els ? S.level.els.get(n.id) : null;
		if (b) b.focus({ preventScroll: true });
	}

	function closeSearch() {
		D.search.value = "";
		S.results = [];
		S.active = -1;
		renderResults();
		D.search.blur();
	}

	function onSearchKey(ev) {
		if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
			if (!S.results.length) return;
			ev.preventDefault();
			var n = S.results.length;
			S.active = ev.key === "ArrowDown" ? (S.active + 1) % n : (S.active - 1 + n) % n;
			renderResults();
		} else if (ev.key === "Enter") {
			ev.preventDefault();
			pickResult(S.active >= 0 ? S.active : 0);
		} else if (ev.key === "Escape") {
			ev.preventDefault();
			closeSearch();
		}
	}

	// -------------------------------------------------------------- diagnostics

	var LEVEL_RANK = { error: 0, warn: 1, warning: 1, info: 2 };
	function levelRank(l) {
		return l in LEVEL_RANK ? LEVEL_RANK[l] : 3;
	}
	function levelCounts() {
		var m = new Map();
		M.diagnostics.forEach(function (d) {
			m.set(d.level, (m.get(d.level) || 0) + 1);
		});
		return Array.from(m.entries()).sort(function (a, b) {
			return levelRank(a[0]) - levelRank(b[0]) || (a[0] < b[0] ? -1 : 1);
		});
	}
	function levelClass(l) {
		var r = levelRank(l);
		return r === 0 ? "lv-error" : r === 1 ? "lv-warn" : "lv-info";
	}

	function renderDiagButton() {
		var b = D.diagToggle,
			counts = levelCounts();
		clear(b);
		b.appendChild(el("span", null, "Diagnostics"));
		if (!counts.length) b.appendChild(el("span", "dcount lv-none", "0"));
		counts.forEach(function (c) {
			b.appendChild(el("span", "dcount " + levelClass(c[0]), String(c[1])));
		});
		b.setAttribute(
			"aria-label",
			"Diagnostics: " +
				(counts.length
					? counts
							.map(function (c) {
								return c[1] + " " + c[0];
							})
							.join(", ")
					: "none"),
		);
	}

	function buildDrawer() {
		var box = D.drawer;
		clear(box);
		var head = el("div", "dr-head");
		head.appendChild(el("h2", null, "Diagnostics"));
		var counts = levelCounts();
		head.appendChild(
			el(
				"span",
				"dr-counts",
				counts.length
					? counts
							.map(function (c) {
								return plural(c[1], c[0], c[0]);
							})
							.join(" · ")
					: "None",
			),
		);
		head.appendChild(
			button("tbtn", "Close", function () {
				setDrawer(false);
			}),
		);
		box.appendChild(head);
		var body = el("div", "dr-body");
		box.appendChild(body);
		if (!M.diagnostics.length) {
			body.appendChild(el("p", "d-empty", "The model has no diagnostics."));
			return;
		}
		var groups = new Map();
		M.diagnostics.forEach(function (d) {
			var key = d.level + "\n" + d.code;
			var g = groups.get(key);
			if (!g) {
				g = { level: d.level, code: d.code, list: [] };
				groups.set(key, g);
			}
			g.list.push(d);
		});
		Array.from(groups.values())
			.sort(function (a, b) {
				return levelRank(a.level) - levelRank(b.level) || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0);
			})
			.forEach(function (g) {
				var det = el("details", "dr-group");
				det.open = g.list.length <= 6 || levelRank(g.level) === 0;
				var sm = el("summary");
				sm.appendChild(el("span", "lv " + levelClass(g.level), g.level));
				sm.appendChild(el("code", "dr-code", g.code || "(no code)"));
				sm.appendChild(el("span", "dr-n", String(g.list.length)));
				det.appendChild(sm);
				var ul = el("ul");
				g.list.slice(0, LIMIT.diagGroup).forEach(function (d) {
					var li = el("li", "dr-item");
					li.appendChild(el("span", "dr-msg", d.message));
					var meta = el("span", "dr-meta");
					if (d.source) meta.appendChild(el("code", null, d.source + (d.line ? ":" + d.line : "")));
					var target = d.id ? M.byId.get(d.id) || (M.edgeById.get(d.id) || {}).from : null;
					if (target) {
						meta.appendChild(
							button("d-link small", "Show " + target.title, function () {
								setDrawer(false);
								dropOverlay();
								navigate(target.parent, target);
							}),
						);
					}
					var ov = d.id && !target ? M.overlayByKey.get("feature:" + d.id) || M.overlayByKey.get("journey:" + d.id) : null;
					if (ov) {
						meta.appendChild(
							button("d-link small", "Show " + ov.title, function () {
								setDrawer(false);
								selectOverlay(ov);
							}),
						);
					}
					li.appendChild(meta);
					ul.appendChild(li);
				});
				if (g.list.length > LIMIT.diagGroup) ul.appendChild(el("li", "more", g.list.length - LIMIT.diagGroup + " more"));
				det.appendChild(ul);
				body.appendChild(det);
			});
	}

	function setDrawer(open) {
		if (open && !S.drawerBuilt) {
			buildDrawer();
			S.drawerBuilt = true;
		}
		D.drawer.hidden = !open;
		D.diagToggle.setAttribute("aria-expanded", String(open));
		if (open) {
			var first = D.drawer.querySelector("button");
			if (first) first.focus();
		} else if (D.drawer.contains(document.activeElement)) {
			D.diagToggle.focus();
		}
	}

	// --------------------------------------------------------------------- init

	function onKey(ev) {
		var t = ev.target,
			tag = t && t.tagName;
		var typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable);
		if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
		if (ev.key === "/" && !typing) {
			ev.preventDefault();
			D.search.focus();
			D.search.select();
			return;
		}
		if (typing) return;
		if (ev.key === "Escape") {
			ev.preventDefault();
			if (!D.drawer.hidden) setDrawer(false);
			else up();
		} else if (ev.key === "Backspace") {
			ev.preventDefault();
			up();
		}
	}

	function scheduleRelayout() {
		clearTimeout(S.relayoutTimer);
		S.relayoutTimer = setTimeout(function () {
			var w = D.viewport.clientWidth;
			if (!M || Math.abs(w - S.lastWidth) < 8) return;
			var hadFocus = D.blocks.contains(document.activeElement);
			renderLevel();
			revealSelected(hadFocus);
			if (S.edgeSel) renderPanel();
		}, 120);
	}

	function fail(message) {
		clear(D.head);
		D.head.appendChild(el("h1", "lh-title", "Architecture map"));
		D.head.appendChild(el("p", "notice", message));
	}

	function init() {
		D = {
			main: $("main"),
			crumbs: $("crumbs"),
			search: $("search-input"),
			results: $("search-results"),
			diagToggle: $("diag-toggle"),
			panelToggle: $("panel-toggle"),
			head: $("level-head"),
			legend: $("legend"),
			viewport: $("viewport"),
			sizer: $("sizer"),
			canvas: $("canvas"),
			edges: $("edges"),
			blocks: $("blocks"),
			panel: $("panel"),
			panelBody: $("panel-body"),
			drawer: $("drawer"),
			tip: $("tip"),
			overlays: $("overlays"),
		};
		var tag = $("archmap-data"),
			raw = null;
		try {
			raw = JSON.parse(tag ? tag.textContent : "null");
		} catch (err) {
			raw = null;
		}
		if (!raw || typeof raw !== "object") {
			fail("The map data is missing or is not valid JSON.");
			return;
		}
		M = prepare(raw);
		document.title = projectTitle() + " · architecture map";
		renderProjectState(tag);

		D.search.addEventListener("input", function () {
			S.results = searchNodes(D.search.value);
			S.active = S.results.length ? 0 : -1;
			renderResults();
		});
		D.search.addEventListener("keydown", onSearchKey);
		D.search.addEventListener("blur", function () {
			setTimeout(function () {
				if (document.activeElement !== D.search) {
					D.results.hidden = true;
					D.search.setAttribute("aria-expanded", "false");
				}
			}, 0);
		});
		D.search.addEventListener("focus", function () {
			if (D.search.value.trim()) renderResults();
		});
		D.diagToggle.addEventListener("click", function () {
			setDrawer(D.drawer.hidden);
		});
		D.panelToggle.addEventListener("click", function () {
			setPanel(D.main.classList.contains("panel-closed"));
		});
		document.addEventListener("keydown", onKey);
		window.addEventListener("hashchange", onHash);
		if (window.ResizeObserver) new ResizeObserver(scheduleRelayout).observe(D.viewport);
		else window.addEventListener("resize", scheduleRelayout);

		renderDiagButton();
		renderOverlays();
		onHash();
	}

	init();
})();
