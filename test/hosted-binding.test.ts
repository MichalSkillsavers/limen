// F925 old suite, frozen at 323 lines. Delete this file when its replacement lands; never add to it.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { processInfo } from "../src/runtime/contain.ts";
import { hostedEngineObservation, hostedEngineOwned, prepareHostedLaunch, readHostedBinding } from "../src/runtime/hosted-binding.ts";
import { signalOwnedProcess } from "../src/runtime/stalled-tool.ts";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
async function until(check: () => Promise<boolean>) {
	const deadline = Date.now() + 10_000;
	while (Date.now() < deadline) {
		if (await check()) return;
		await wait(25);
	}
	assert.fail("native fixture timed out");
}

test("controlled shell exec retains its OS birth and can publish the engine binding", { skip: process.platform !== "linux" }, async (context) => {
	const root = await mkdtemp(join(tmpdir(), "limen-binding-exec-"));
	context.after(() => rm(root, { recursive: true, force: true }));
	const job = join(root, ".limen/jobs/exec");
	await mkdir(join(job, "session"), { recursive: true });
	await mkdir(join(job, "herdr"));
	await writeFile(join(job, "herdr/pane"), "test:p1\n");
	const script = join(root, "engine.mjs");
	await writeFile(
		script,
		`import hosted from ${JSON.stringify(new URL("../hook/hosted.ts", import.meta.url).href)};
process.title = 'pi';
const handlers = new Map();
hosted({on:(event, fn)=>handlers.set(event, fn)});
await handlers.get('session_start')({}, {sessionManager:{getSessionDir:()=>${JSON.stringify(join(job, "session"))},getSessionId:()=> 'exec-session',getSessionFile:()=>undefined}});
setInterval(()=>{}, 1000);
`,
	);
	const herdr = join(root, "herdr");
	await writeFile(
		herdr,
		`#!/usr/bin/env node
const fs = require('node:fs');
const launch = JSON.parse(fs.readFileSync(${JSON.stringify(join(job, "engine-launch"))}, 'utf8'));
console.log(JSON.stringify({result:{process_info:{foreground_processes:[{pid:launch.parent,name:'pi',argv:['pi']}]}}}));
`,
	);
	await chmod(herdr, 0o755);
	const previous = process.env.LIMEN_HERDR;
	process.env.LIMEN_HERDR = herdr;
	context.after(() => {
		if (previous === undefined) delete process.env.LIMEN_HERDR;
		else process.env.LIMEN_HERDR = previous;
	});
	const go = join(root, "go");
	const shell = spawn("sh", ["-c", 'while [ ! -f "$1" ]; do sleep 0.05; done; exec "$2" "$3"', "fixture", go, process.execPath, script], {
		env: { ...process.env, LIMEN_JOB: "1", LIMEN_HOSTED: "1", LIMEN_JOB_ID: "exec", LIMEN_CONTEXT_ROOT: root, HERDR_PANE_ID: "test:p1", HERDR_ENV: "0" },
		stdio: "ignore",
	});
	assert.ok(shell.pid);
	const identity = await processInfo(shell.pid);
	assert.equal(identity.kind, "present");
	if (identity.kind !== "present") return;
	context.after(async () => {
		await signalOwnedProcess(shell.pid!, identity.process.born, "SIGKILL");
	});
	await prepareHostedLaunch(job, "test:p1", "pi", shell.pid);
	await writeFile(go, "go\n");
	await until(async () => Boolean(readHostedBinding(job)));
	assert.equal(readHostedBinding(job)?.born, identity.process.born);
	assert.equal(await hostedEngineOwned("test:p1", shell.pid, "pi", job), true);
});

test("title-mutated hosted Pi binds once; reload, relocation and unavailable boot stay fail-closed without false death", {
	skip: process.platform !== "linux",
}, async (context) => {
	const root = await mkdtemp(join(tmpdir(), "limen-binding-"));
	const job = join(root, ".limen/jobs/fixture");
	await mkdir(join(job, "session"), { recursive: true });
	await mkdir(join(job, "herdr"));
	await writeFile(join(job, "state"), "running\n");
	await writeFile(join(job, "herdr/pane"), "test:p1\n");
	await prepareHostedLaunch(job, "test:p1", "pi", process.pid);
	await assert.rejects(prepareHostedLaunch(job, "foreign:p1", "pi", process.pid), "launch expectation is exclusive");
	const control = join(root, "foreground");
	const herdr = join(root, "herdr");
	await writeFile(
		herdr,
		`#!/usr/bin/env node
const fs = require('node:fs');
const c = JSON.parse(fs.readFileSync(${JSON.stringify(control)}, 'utf8'));
const args = process.argv.slice(2);
if (c.missing && args[0] === 'agent' && args[1] === 'get') { console.log(JSON.stringify({error:{code:'agent_not_found',message:'agent missing'}})); process.exit(1); }
if (c.unavailable || c.degraded) process.exit(1);
if (args[0] === 'agent' && args[1] === 'list') { console.log(JSON.stringify({result:{agents:[]}})); process.exit(0); }
console.log(JSON.stringify({result: args[0] === 'agent' ? {agent: {agent_status:'working'}} : {process_info:{foreground_processes: !c.missing && c.pane === args[args.indexOf('--pane')+1] ? [{pid:c.pid,name:'pi',argv:['pi']}] : []}}}));
`,
	);
	await chmod(herdr, 0o755);
	const previous = process.env.LIMEN_HERDR;
	process.env.LIMEN_HERDR = herdr;
	context.after(async () => {
		if (previous === undefined) delete process.env.LIMEN_HERDR;
		else process.env.LIMEN_HERDR = previous;
		await rm(root, { recursive: true, force: true });
	});
	const hook = new URL("../hook/hosted.ts", import.meta.url).href;
	const worker = spawn(
		process.execPath,
		[
			"--input-type=module",
			"-e",
			`
import hosted from ${JSON.stringify(hook)};
import { readFileSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
process.title = 'pi';
const handlers = new Map();
hosted({ on: (name, fn) => handlers.set(name, fn) });
const job = ${JSON.stringify(job)};
const child = spawn('sleep', ['60']);
writeFileSync(${JSON.stringify(join(root, "child"))}, String(child.pid));
let last = '';
const timer = setInterval(async () => {
  let command; try { command = readFileSync(${JSON.stringify(join(root, "command"))}, 'utf8'); } catch { return; }
  if (command === last) return; last = command;
  if (command === 'inherited') {
    const attempt = spawnSync(process.execPath, ['--input-type=module', '-e', ${JSON.stringify(`import { registerHostedBinding } from ${JSON.stringify(new URL("../src/runtime/hosted-binding.ts", import.meta.url).href)}; const ok = await registerHostedBinding(${JSON.stringify(job)}, 'test:p1', {sessionManager:{getSessionDir:()=>${JSON.stringify(join(job, "session"))},getSessionId:()=> 'native-session',getSessionFile:()=>undefined}}); process.exit(ok ? 1 : 0);`)}]);
    if (attempt.status !== 0) throw new Error('inherited child acquired binding');
  } else if (command === 'shutdown') await handlers.get('session_shutdown')({});
  else await handlers.get('session_start')({}, {sessionManager: {
    getSessionDir: () => command === 'foreign-dir' ? ${JSON.stringify(root)} : job + '/session',
    getSessionId: () => command === 'foreign-id' ? 'other-session' : 'native-session',
    getSessionFile: () => command === 'foreign-file' ? ${JSON.stringify(join(root, "other.jsonl"))} : job + '/session/not-created-yet.jsonl'
  }});
  writeFileSync(${JSON.stringify(join(root, "ack"))}, command);
}, 20);
`,
		],
		{
			env: { ...process.env, LIMEN_JOB: "1", LIMEN_HOSTED: "1", LIMEN_JOB_ID: "fixture", LIMEN_CONTEXT_ROOT: root, HERDR_PANE_ID: "test:p1", HERDR_ENV: "0" },
			stdio: ["ignore", "ignore", "pipe"],
		},
	);
	assert.ok(worker.pid);
	let errors = "";
	worker.stderr.on("data", (data) => {
		errors += data;
	});
	const identity = await processInfo(worker.pid);
	assert.equal(identity.kind, "present");
	if (identity.kind !== "present") return;
	let childPid = 0;
	let childBorn = "";
	context.after(async () => {
		await signalOwnedProcess(worker.pid!, identity.process.born, "SIGKILL");
		if (childPid && childBorn) await signalOwnedProcess(childPid, childBorn, "SIGKILL");
	});
	const foreground = async (pane = "test:p1", pid = worker.pid, unavailable = false, missing = false, degraded = false) =>
		writeFile(control, JSON.stringify({ pane, pid, unavailable, missing, degraded }));
	await foreground();
	const command = async (value: string) => {
		await writeFile(join(root, "command"), value);
		await until(async () => (await readFile(join(root, "ack"), "utf8").catch(() => "")) === value);
		assert.equal(errors, "");
	};
	await command("inherited");
	await assert.rejects(readFile(join(job, "engine-binding")), "inherited child cannot claim an unused expectation");
	await command("foreign-dir");
	await assert.rejects(readFile(join(job, "engine-binding")), "initial foreign session cannot publish");
	await writeFile(join(job, "engine-pid"), `${worker.pid}\n`);
	await command("legacy-start");
	await assert.rejects(readFile(join(job, "engine-binding")), "PID-only records cannot be adopted even with launch context");
	await rm(join(job, "engine-pid"));
	await command("start");
	childPid = Number(await readFile(join(root, "child"), "utf8"));
	const childIdentity = await processInfo(childPid);
	assert.equal(childIdentity.kind, "present");
	if (childIdentity.kind === "present") childBorn = childIdentity.process.born;
	const binding = readHostedBinding(job);
	assert.ok(binding);
	assert.equal(binding.pid, worker.pid);
	const titled = await processInfo(worker.pid);
	assert.equal(titled.kind, "present");
	if (titled.kind === "present") assert.equal(titled.process.command, "pi");
	assert.equal(await hostedEngineOwned("test:p1", worker.pid, "pi", job), true, "argv has no session arguments");
	const original = await readFile(join(job, "engine-binding"), "utf8");
	await command("shutdown");
	assert.equal(await hostedEngineOwned("test:p1", worker.pid, "pi", job), false);
	await assert.rejects(readFile(join(job, "session-ended")), "reload shutdown is not completion");
	await command("reload");
	assert.equal(await hostedEngineOwned("test:p1", worker.pid, "pi", job), true);
	for (const value of ["foreign-id", "foreign-dir", "foreign-file"]) {
		await command(value);
		assert.equal(await hostedEngineOwned("test:p1", worker.pid, "pi", job), false, value);
		assert.equal(await readFile(join(job, "engine-binding"), "utf8"), original);
		await command(`reload-${value}`);
		assert.equal(await hostedEngineOwned("test:p1", worker.pid, "pi", job), true);
	}
	for (const [key, value] of Object.entries({
		jobDir: root,
		sessionDir: root,
		pid: process.pid,
		born: "0",
		boot: "previous-boot",
		platform: "darwin",
		pane: "foreign:p1",
		parentBorn: "0",
		launchId: "other-launch",
		sessionId: "other-session",
	})) {
		await writeFile(join(job, "engine-binding"), JSON.stringify({ ...binding, [key]: value }));
		assert.equal(await hostedEngineOwned("test:p1", worker.pid, "pi", job), false, key);
		const missing: Record<string, unknown> = { ...binding };
		delete missing[key];
		await writeFile(join(job, "engine-binding"), JSON.stringify(missing));
		assert.equal(await hostedEngineOwned("test:p1", worker.pid, "pi", job), false, `missing ${key}`);
	}
	const originalLaunch = await readFile(join(job, "engine-launch"), "utf8");
	await writeFile(join(job, "engine-launch"), JSON.stringify({ ...JSON.parse(originalLaunch), boot: "previous-boot" }));
	await writeFile(join(job, "engine-binding"), JSON.stringify({ ...binding, boot: "previous-boot" }));
	assert.ok(readHostedBinding(job), "historical boot evidence remains readable");
	assert.equal(await hostedEngineObservation("test:p1", worker.pid, "pi", job), "mismatch", "a known different boot denies ownership");
	await writeFile(join(job, "engine-launch"), originalLaunch);
	await writeFile(join(job, "engine-binding"), "{broken");
	await command("damaged-record");
	assert.equal(await readFile(join(job, "engine-binding"), "utf8"), "{broken", "reload cannot repair or replace a binding");
	await writeFile(join(job, "engine-binding"), original);
	await command("reload-again");
	await foreground("test:p1", process.pid);
	assert.equal(await hostedEngineObservation("test:p1", worker.pid, "pi", job), "mismatch");
	await foreground("test:p1", worker.pid, true);
	assert.equal(await hostedEngineObservation("test:p1", worker.pid, "pi", job), "unavailable");
	await foreground("test:p2");
	assert.equal(await hostedEngineOwned("test:p2", worker.pid, "pi", job), false, "unverified relocation cannot grant ownership");
	await writeFile(join(job, "herdr/pane"), "test:p2\n");
	assert.equal(await hostedEngineOwned("test:p2", worker.pid, "pi", job), true);
	await command("reload-after-move");
	assert.equal(await hostedEngineOwned("test:p2", worker.pid, "pi", job), true, "reload uses the verified current pane, not inherited initial place");
	assert.equal(await readFile(join(job, "engine-binding"), "utf8"), original);
	// The saved binding stays attributable to a new observer, not just this module instance.
	const observer = spawn(
		process.execPath,
		[
			"--input-type=module",
			"-e",
			`import { hostedEngineOwned } from ${JSON.stringify(new URL("../src/runtime/hosted-binding.ts", import.meta.url).href)}; process.exit(await hostedEngineOwned('test:p2', ${worker.pid}, 'pi', ${JSON.stringify(job)}) ? 0 : 1);`,
		],
		{ env: process.env, stdio: "ignore" },
	);
	assert.equal(await new Promise((resolve) => observer.on("exit", resolve)), 0);
	assert.equal(await hostedEngineOwned("test:p2", worker.pid, "omp", job), false, "unsupported adapter stays unowned");
	await writeFile(join(job, "activity"), "tool\n");
	await writeFile(join(job, "tool-calls"), "1\n");
	await writeFile(join(job, "tool-detail"), "quiet external wait\n");
	const supervisor = spawn(
		process.execPath,
		[
			"--input-type=module",
			"-e",
			`import { runHostedSupervisor } from ${JSON.stringify(new URL("../src/runtime/supervisor.ts", import.meta.url).href)}; await runHostedSupervisor();`,
		],
		{ env: { ...process.env, LIMEN_JOB_DIR: job, LIMEN_HOSTED_TARGET: "test:p2", LIMEN_HOSTED_START: "", LIMEN_TOOL_STALL_MS: "100" }, stdio: "ignore" },
	);
	assert.ok(supervisor.pid);
	const supervisorInfo = await processInfo(supervisor.pid);
	assert.equal(supervisorInfo.kind, "present");
	if (supervisorInfo.kind === "present")
		context.after(async () => {
			await signalOwnedProcess(supervisor.pid!, supervisorInfo.process.born, "SIGKILL");
		});
	await wait(7_000);
	assert.equal(await readFile(join(job, "state"), "utf8"), "running\n", "valid quiet tool survives several hosted samples beyond the configured observation window");
	assert.equal((await processInfo(worker.pid)).kind, "present");
	assert.equal((await processInfo(childPid)).kind, "present");
	await assert.rejects(readFile(join(job, "ownership-uncertainty")), "successful observation is not uncertainty or a timeout");
	assert.equal(supervisorInfo.kind, "present");
	if (supervisorInfo.kind !== "present") return;
	await signalOwnedProcess(supervisor.pid, supervisorInfo.process.born, "SIGKILL");
	await foreground("test:p2", worker.pid, false, true);
	const deniedEvidence = join(root, "boot-denied.json");
	const denied = spawn(
		process.execPath,
		[
			"--input-type=module",
			"-e",
			`
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
const read = fs.readFileSync;
fs.readFileSync = function(path, ...args) {
  if (String(path) === '/proc/sys/kernel/random/boot_id') throw Object.assign(new Error('fixture boot read denied'), {code:'EACCES'});
  return read(path, ...args);
};
syncBuiltinESMExports();
const binding = await import(${JSON.stringify(new URL("../src/runtime/hosted-binding.ts", import.meta.url).href)});
const recovery = await import(${JSON.stringify(new URL("../src/runtime/recovery.ts", import.meta.url).href)});
const saved = binding.readHostedBinding(${JSON.stringify(job)});
fs.writeFileSync(${JSON.stringify(deniedEvidence)}, JSON.stringify({pid:saved?.pid, identity:saved ? await binding.hostedIdentityObservation(saved) : 'dropped', ownership:await binding.hostedEngineObservation('test:p2', ${worker.pid}, 'pi', ${JSON.stringify(job)}), recovery:await recovery.recoveryTarget(${JSON.stringify(job)})}));
await (await import(${JSON.stringify(new URL("../src/runtime/supervisor.ts", import.meta.url).href)})).runHostedSupervisor();
`,
		],
		{ env: { ...process.env, LIMEN_JOB_DIR: job, LIMEN_HOSTED_TARGET: "test:p2", LIMEN_HOSTED_START: "" }, stdio: "ignore" },
	);
	assert.ok(denied.pid);
	const deniedIdentity = await processInfo(denied.pid);
	assert.equal(deniedIdentity.kind, "present");
	if (deniedIdentity.kind === "present")
		context.after(async () => {
			await signalOwnedProcess(denied.pid!, deniedIdentity.process.born, "SIGKILL");
		});
	await until(async () => (await readFile(deniedEvidence, "utf8").catch(() => "")).length > 0);
	await wait(5_000);
	assert.equal(await readFile(join(job, "state"), "utf8"), "running\n", "boot unavailability plus a missing Herdr agent is not proof of engine death");
	assert.deepEqual(JSON.parse(await readFile(deniedEvidence, "utf8")), { pid: worker.pid, identity: "unavailable", ownership: "unavailable", recovery: "unknown" });
	await foreground("test:p2", worker.pid, false, true, true);
	await wait(5_000);
	assert.equal(await readFile(join(job, "state"), "utf8"), "running\n", "boot and Herdr degradation must not close a healthy tab");
	assert.equal((await processInfo(worker.pid)).kind, "present");
	assert.equal(await readFile(join(job, "engine-binding"), "utf8"), original, "unavailable observation cannot adopt or replace identity");
	assert.equal(await readFile(join(job, "herdr/pane"), "utf8"), "test:p2\n");
});
