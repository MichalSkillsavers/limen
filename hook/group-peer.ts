import { mkdir, rm, writeFile } from "node:fs/promises";
import type { GroupIdentity } from "../src/job/group-cabinet.ts";
import { groupIdentity, runs } from "../src/job/group-cabinet.ts";
import { acceptBatch, acceptTransport, observeBatch, releaseBatch } from "../src/job/group-events.ts";
import { repoRoot } from "../src/project/git.ts";

type Content = { readonly type: string; readonly text?: string };
type Context = {
	readonly cwd: string;
	readonly agent?: { readonly kind: string };
	readonly sessionManager: { getSessionId(): string };
	readonly ui: { notify(text: string, level: string): void };
};
type Message = { readonly role?: string; readonly content?: string | readonly Content[]; readonly stopReason?: string };
type PiApi = {
	on(event: "session_start" | "session_shutdown", handler: (event: unknown, context: Context) => Promise<void>): void;
	on(event: "tool_result", handler: (event: { readonly content?: readonly Content[] }, context: Context) => Promise<{ content: Content[] } | undefined>): void;
	on(event: "tool_call", handler: (event: { readonly toolName: string }, context: Context) => { block: boolean; reason: string } | undefined): void;
	on(event: "before_subagent_spawn", handler: () => { block: boolean; reason: string } | undefined): void;
	on(event: "context", handler: (event: { readonly messages: readonly Message[] }, context: Context) => Promise<void>): void;
	on(event: "message_end", handler: (event: { readonly message: Message }, context: Context) => Promise<void>): void;
	sendMessage(
		message: { customType: string; content: string; display: boolean; attribution: "agent" },
		options: { deliverAs: "nextTurn"; triggerTurn: boolean },
	): void | Promise<void>;
};

/** Peer data stays in tool/custom messages. Never use owner steering for group delivery. */
export default function groupPeer(pi: PiApi): void {
	let leadRoot: string | undefined, leadSession: string | undefined;
	let timer: NodeJS.Timeout | undefined,
		sweeping = false;
	const observed = new Map<string, { identity: GroupIdentity; token: string }>();
	const leased = new Map<string, { identity: GroupIdentity; token: string }>();
	const seenTokens = new Set<string>();
	const identities = async (context: Context): Promise<GroupIdentity[]> => {
		if (context.agent?.kind === "sub") return [];
		const member = await groupIdentity(context.cwd);
		if (member) return [member];
		if (!leadRoot || !leadSession) return [];
		return (await runs(leadRoot)).filter((run) => !run.closed && run.lead === leadSession).map((run) => ({ run, recipient: `lead-${leadSession}` }));
	};
	pi.on("session_start", async (_event, context) => {
		if (process.env.LIMEN_JOB === "1" || context.agent?.kind === "sub") return;
		try {
			leadRoot = repoRoot(context.cwd);
		} catch {
			return;
		}
		leadSession = context.sessionManager.getSessionId();
		if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(leadSession)) return;
		process.env.PI_SESSION_ID = leadSession;
		await mkdir(`${leadRoot}/.limen/group-leads`, { recursive: true });
		await writeFile(`${leadRoot}/.limen/group-leads/${leadSession}`, `${process.pid}\n`, { flush: true });
		timer = setInterval(() => {
			if (sweeping) return;
			sweeping = true;
			void (async () => {
				for (const identity of await identities(context)) {
					if ([...leased.values()].some((entry) => entry.identity.run.id === identity.run.id)) continue;
					const batch = await acceptBatch(identity, Date.now(), "skip");
					if (!batch) continue;
					leased.set(batch.token, { identity, token: batch.token });
					try {
						await pi.sendMessage({ customType: "limen-group-progress", content: batch.text, display: true, attribution: "agent" }, { deliverAs: "nextTurn", triggerTurn: true });
						await acceptTransport(identity, batch.token);
					} catch (error) {
						await releaseBatch(identity, batch.token);
						leased.delete(batch.token);
						throw error;
					}
				}
			})()
				.catch((error: unknown) => context.ui.notify(`group delivery requires inspection: ${String(error)}`, "warning"))
				.finally(() => {
					sweeping = false;
				});
		}, 1_000);
		timer.unref();
	});
	pi.on("tool_call", (event) =>
		process.env.LIMEN_GROUP_ID && event.toolName === "task"
			? { block: true, reason: "group helpers must use the recorded limen worker allowance, not built-in subagents" }
			: undefined,
	);
	pi.on("before_subagent_spawn", () =>
		process.env.LIMEN_GROUP_ID ? { block: true, reason: "group members cannot bypass their recorded launch allowance with built-in subagents" } : undefined,
	);
	pi.on("tool_result", async (event, context) => {
		const patches = [...(event.content ?? [])];
		for (const identity of await identities(context)) {
			const batch = await acceptBatch(identity, Date.now(), "skip");
			if (!batch) continue;
			leased.set(batch.token, { identity, token: batch.token });
			patches.push({ type: "text", text: batch.text });
		}
		if (patches.length !== (event.content?.length ?? 0)) return { content: patches };
	});
	pi.on("context", async (event, context) => {
		const current = await identities(context);
		for (const message of event.messages) {
			if (message.role !== "toolResult" && message.role !== "custom") continue;
			const text = typeof message.content === "string" ? message.content : (message.content ?? []).map((part) => part.text ?? "").join("\n");
			for (const match of text.matchAll(/\[limen-group-delivery:([a-f0-9-]+)\]/g)) {
				const token = match[1];
				if (!token || seenTokens.has(token)) continue;
				for (const identity of current) {
					await observeBatch(identity, token, false);
					observed.set(`${identity.run.id}:${token}`, { identity, token });
				}
				seenTokens.add(token);
			}
		}
	});
	pi.on("message_end", async (event, context) => {
		if (event.message.role === "toolResult" || event.message.role === "custom") {
			const text = typeof event.message.content === "string" ? event.message.content : (event.message.content ?? []).map((part) => part.text ?? "").join("\n");
			for (const match of text.matchAll(/\[limen-group-delivery:([a-f0-9-]+)\]/g))
				if (match[1]) {
					for (const identity of await identities(context)) await acceptTransport(identity, match[1]);
				}
			return;
		}
		if (event.message.role !== "assistant") return;
		const failed = event.message.stopReason === "error" || event.message.stopReason === "aborted";
		for (const entry of observed.values()) {
			if (failed) await releaseBatch(entry.identity, entry.token);
			else await observeBatch(entry.identity, entry.token, true);
			leased.delete(entry.token);
		}
		observed.clear();
	});
	pi.on("session_shutdown", async () => {
		clearInterval(timer);
		for (const entry of leased.values()) await releaseBatch(entry.identity, entry.token);
		leased.clear();
		observed.clear();
		if (leadRoot && leadSession) await rm(`${leadRoot}/.limen/group-leads/${leadSession}`, { force: true });
	});
}
