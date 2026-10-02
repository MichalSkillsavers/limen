import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readDataset } from "./dataset.ts";
import { assembleHtml, readViewer } from "./html.ts";
import { buildModel, type PictureModel } from "./picture-model.ts";

export async function readPicture(dir: string): Promise<PictureModel> {
	const dataset = await readDataset(dir);
	return buildModel({ files: dataset.files, diagnostics: dataset.diagnostics });
}

export async function buildPicture(dir: string, out: string, json?: string, tip?: string): Promise<PictureModel> {
	const model = await readPicture(dir);
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
