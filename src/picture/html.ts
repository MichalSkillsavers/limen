import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { escapeHtml } from "./markdown.ts";
import type { PictureModel } from "./picture-model.ts";

export type Viewer = { readonly template: string; readonly css: string; readonly js: string };
export const MARKERS = { css: "<!-- ARCHMAP:CSS -->", js: "<!-- ARCHMAP:JS -->", data: "<!-- ARCHMAP:DATA -->" } as const;

export async function readViewer(dir: string): Promise<Viewer> {
	const [template, css, js] = await Promise.all([
		readFile(join(dir, "template.html"), "utf8"),
		readFile(join(dir, "viewer.css"), "utf8"),
		readFile(join(dir, "viewer.js"), "utf8"),
	]);
	validateTemplate(template);
	return { template, css, js };
}

function validateTemplate(template: string): void {
	for (const [name, marker] of Object.entries(MARKERS)) {
		const count = template.split(marker).length - 1;
		if (count !== 1) throw new Error(`viewer/template.html must contain the ${name.toUpperCase()} marker exactly once (found ${count})`);
	}
	if (template.indexOf(MARKERS.data) > template.indexOf(MARKERS.js)) {
		throw new Error("viewer/template.html must place the DATA marker before the JS marker");
	}
}

// No '<' can terminate the JSON script block, even inside untrusted metadata.
export function embedJson(model: PictureModel): string {
	return JSON.stringify(model).replace(/</g, "\\u003c");
}

export function assembleHtml(model: PictureModel, viewer: Viewer, tip?: string): string {
	validateTemplate(viewer.template);
	const tipAttribute = tip === undefined ? "" : ` data-tip="${escapeHtml(tip)}"`;
	const parts: Record<string, string> = {
		[MARKERS.css]: `<style>\n${viewer.css.replace(/<\/style/gi, "<\\/style")}\n</style>`,
		[MARKERS.data]: `<script type="application/json" id="archmap-data"${tipAttribute}>${embedJson(model)}</script>`,
		[MARKERS.js]: `<script>\n${viewer.js.replace(/<\/script/gi, "<\\/script")}\n</script>`,
	};
	// Inserted text is never rescanned, and replacement strings keep literal '$'.
	return viewer.template.replace(/<!-- ARCHMAP:(?:CSS|JS|DATA) -->/g, (marker) => parts[marker]!);
}
