import { readdir, readFile } from "node:fs/promises";
import { limenRoot } from "./git.ts";
import { resolveJobId } from "./job.ts";
export async function resolveJob(cwd: string, query: string): Promise<{ readonly id: string; readonly jobDir: string }> {
	const jobsRoot = `${limenRoot(cwd)}/.limen/jobs`;
	const entries = await readdir(jobsRoot, { withFileTypes: true }).catch((error: unknown) => {
		if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") return [];
		throw error;
	});
	const ids = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
	const labels: Record<string, string> = {};
	for (const id of ids) labels[id] = await text(`${jobsRoot}/${id}/label`);
	const id = resolveJobId(query, ids, labels);
	if (process.env.LIMEN_GROUP_ID) {
		const [group, team] = await Promise.all([text(`${jobsRoot}/${id}/group`), text(`${jobsRoot}/${id}/team`)]);
		if (group !== process.env.LIMEN_GROUP_ID || team !== process.env.LIMEN_TEAM_ID) throw new Error("group members cannot take over jobs outside their own team");
	}
	return { id, jobDir: `${jobsRoot}/${id}` };
}
function text(path: string): Promise<string> {
	return readFile(path, "utf8").then(
		(value) => value.trim(),
		() => "",
	);
}
