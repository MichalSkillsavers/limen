import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { noteHostedUncertainty, readHostedUncertainty } from "../src/runtime/hosted-uncertainty.ts";

test("one uncertainty condition survives transitions and fresh observers; child loss needs child recovery", async (context) => {
	const job = await mkdtemp(join(tmpdir(), "limen-uncertainty-"));
	context.after(() => rm(job, { recursive: true, force: true }));
	await noteHostedUncertainty(job, true, undefined, 1_000);
	await mkdir(join(job, "notify/delivered/_uncertainty.coord"), { recursive: true });
	await writeFile(join(job, "notify/delivered/_uncertainty.coord/accepted"), "1\n");
	await mkdir(join(job, "notify/unconfirmed"), { recursive: true });
	await writeFile(join(job, "notify/unconfirmed/_uncertainty"), "1\n1\n");
	await writeFile(join(job, "notify/unconfirmed/_advisory"), "1\n");
	await writeFile(join(job, "notify/unconfirmed/_completion"), "1\n");
	for (let i = 0; i < 50; i++) {
		await writeFile(join(job, "activity"), i % 2 ? "think\n" : "tool\n");
		await noteHostedUncertainty(job, true, i % 2 ? undefined : true, 10_000 + i * 1_000);
		assert.equal(readHostedUncertainty(job)?.since, 1_000);
	}
	assert.equal(await readFile(join(job, "notify/unconfirmed/_uncertainty"), "utf8"), "1\n1\n");
	await noteHostedUncertainty(job, false, undefined, 70_000);
	assert.deepEqual(readHostedUncertainty(job), { since: 1_000, root: false, child: true }, "root recovery is not child recovery");
	await noteHostedUncertainty(job, false, false, 80_000);
	assert.equal(readHostedUncertainty(job), undefined);
	await assert.rejects(readFile(join(job, "notify/delivered/_uncertainty.coord/accepted")));
	await assert.rejects(readFile(join(job, "notify/unconfirmed/_uncertainty")));
	assert.equal(await readFile(join(job, "notify/unconfirmed/_advisory"), "utf8"), "1\n");
	assert.equal(await readFile(join(job, "notify/unconfirmed/_completion"), "utf8"), "1\n");
	await noteHostedUncertainty(job, true, undefined, 90_000);
	assert.equal(readHostedUncertainty(job)?.since, 90_000, "a demonstrably recovered condition can rearm");
	await writeFile(join(job, "state"), "done\n");
	await noteHostedUncertainty(job, true, true, 100_000);
	assert.equal(readHostedUncertainty(job), undefined, "terminal state retires the condition even for a late observation");
});
