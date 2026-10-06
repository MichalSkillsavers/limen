import * as fs from "node:fs";
import { isAbsolute, join } from "node:path";
import { sweepCoordinators } from "../integrations/coordinator-signal.ts";
import { noteKind } from "../job/view.ts";
import { installSeatSweep, showSeatNotification, uninstallSeatSweep, updateRegisteredProjects } from "../project/seat.ts";
import { HOSTED_UNCERTAINTY_MS, readHostedUncertainty } from "../runtime/hosted-uncertainty.ts";
import { confirmDeadJobs } from "../runtime/reap.ts";

const text = (path: string) => (fs.existsSync(path) ? fs.readFileSync(path, "utf8").trim() : "");
const modified = (path: string) => (fs.existsSync(path) ? fs.statSync(path).mtimeMs : 0);
const metadata = (path: string) => {
	try {
		return fs.statSync(path);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
		throw error;
	}
};

export async function sweepCommand(args: readonly string[], _cwd: string): Promise<void> {
	if (args.length === 1 && args[0] === "--install") return installSeatSweep();
	if (args.length === 1 && args[0] === "--uninstall") return uninstallSeatSweep();
	if (args.length) throw new Error("sweep accepts no arguments, --install, or --uninstall");
	const living = updateRegisteredProjects((projects) => projects.filter((project) => isAbsolute(project) && fs.existsSync(project) && fs.statSync(project).isDirectory()));
	await Promise.all(living.map(sweepProject));
}
async function sweepProject(root: string): Promise<void> {
	const jobs = join(root, ".limen", "jobs"),
		threshold = positive("LIMEN_SEAT_RING_MS", 5 * 60_000);
	await confirmDeadJobs(jobs);
	// Exit detection runs every pass: a dead coordinator pane is news now, not after the seat ring threshold.
	await sweepCoordinators(root).catch((error: unknown) => console.error(`coordinator sweep failed for ${root}: ${error instanceof Error ? error.message : String(error)}`));
	if (Date.now() - modified(join(root, ".limen", "last-sweep")) < threshold) return;
	for (const entry of fs.existsSync(jobs) ? fs.readdirSync(jobs, { withFileTypes: true }) : []) {
		if (!entry.isDirectory()) continue;
		const job = join(jobs, entry.name),
			statePath = join(job, "state"),
			state = text(statePath);
		const delivered = fs.existsSync(join(job, "notify", "delivered")) ? fs.readdirSync(join(job, "notify", "delivered")) : [];
		const advisory = state === "running",
			uncertainty = advisory && !text(join(job, "advisory")) ? readHostedUncertainty(job) : undefined,
			family = uncertainty ? "_uncertainty" : "_advisory",
			stamp = advisory ? join(job, uncertainty ? "ownership-uncertainty" : "advisory") : join(job, "finished-at");
		if (uncertainty && Date.now() - uncertainty.since < HOSTED_UNCERTAINTY_MS) continue;
		const unheard = advisory
			? !delivered.some((name) => name.startsWith(`${family}.`))
			: ["done", "failed", "stopped"].includes(state) && !delivered.some((name) => !name.startsWith("_advisory.") && !name.startsWith("_uncertainty."));
		if (!unheard) continue;
		const advisoryStamp = advisory ? metadata(stamp) : undefined;
		if (advisory && !advisoryStamp) continue;
		const since = uncertainty?.since ?? (advisoryStamp ? advisoryStamp.mtimeMs : Math.max(modified(stamp), modified(statePath)));
		if (!since || Date.now() - since < threshold) continue;
		const seat = join(job, "notify", "seat"),
			markers = fs.existsSync(seat) ? fs.readdirSync(seat) : [],
			event = uncertainty ? `_uncertainty.${since}` : advisoryStamp ? `_advisory.${since}.${advisoryStamp.birthtimeMs}` : `_terminal.${state}.${since}`;
		if (markers.some((name) => name === event || (/^\d+$/.test(name) && Number(name) >= since))) continue;
		// Claim before transport: a concurrent sweep or ambiguous failure must not replay this event.
		fs.mkdirSync(seat, { recursive: true });
		try {
			fs.writeFileSync(join(seat, event), `${new Date().toISOString()}\n`, { flag: "wx" });
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "EEXIST") continue;
			throw error;
		}
		const label = text(join(job, "label")) || entry.name;
		const title = advisory ? `limen: ${label} · ${uncertainty ? "ownership" : noteKind(text(join(job, "advisory")))}` : `limen: ${label} is ${state}`;
		if (!(await showSeatNotification(title, `job ${entry.name} · ${root}`)))
			console.error(`seat notification failed for ${entry.name}; event recorded to avoid an ambiguous retry`);
	}
}
const positive = (name: string, fallback: number) => (Number.isFinite(Number(process.env[name])) && Number(process.env[name]) > 0 ? Number(process.env[name]) : fallback);
