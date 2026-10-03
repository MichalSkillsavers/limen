import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readDataset } from "./dataset.ts";
import { assembleHtml, readViewer } from "./html.ts";
import { buildModel, type PictureModel } from "./picture-model.ts";

/** With `root`, every cited source is checked against the project root and a missing path warns. */
export async function readPicture(dir: string, root?: string): Promise<PictureModel> {
	const dataset = await readDataset(dir);
	return buildModel({ files: dataset.files, diagnostics: dataset.diagnostics, exists: root === undefined ? undefined : (path) => existsSync(join(root, path)) });
}

export async function buildPicture(dir: string, out: string, json?: string, tip?: string, root?: string): Promise<PictureModel> {
	const model = await readPicture(dir, root);
	const viewer = await readViewer(fileURLToPath(new URL("../../picture/viewer/", import.meta.url)));
	await writeAtomic(out, assembleHtml(model, viewer, tip));
	if (json !== undefined) await writeAtomic(json, `${JSON.stringify(model, null, 2)}\n`);
	return model;
}

async function writeAtomic(file: string, text: string): Promise<void> {
	await mkdir(dirname(file), { recursive: true });
	const tmp = `${file}.tmp-${process.pid}-${randomUUID()}`;
	try {
		await writeFile(tmp, text, { flag: "wx" });
		await rename(tmp, file);
	} catch (error) {
		await rm(tmp, { force: true });
		throw error;
	}
}
