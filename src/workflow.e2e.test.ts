import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { runClarify, applyClarifyAnswers } from "./phases/clarify";
import { runSpec, writeSpec } from "./phases/spec";
import { runDesign, writeDesign } from "./phases/design";
import { runTickets, writeTickets } from "./phases/tickets";
import { runImplement, writeAcceptance, TestRunner } from "./phases/implement";
import { runAccept } from "./phases/accept";
import { runRetro, writeRetro } from "./phases/retro";
import { readMemos } from "./memo";
import { commitHasApproval, currentCommit } from "./git";
import { loadState, saveState } from "./state";
import {
    INITIAL_WORKFLOW_STATE,
    PHASE_ORDER,
    WorkflowState,
    advancePhase,
    nextPhase,
    recordApproval,
} from "./workflow";

const exec = promisify(execFile);

const passingRunner: TestRunner = async () => ({
    command: "vitest run",
    passed: true,
});

let dir: string;

async function git(args: string[]): Promise<string> {
    const { stdout } = await exec("git", args, { cwd: dir });
    return stdout.trim();
}

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "easy-codex-e2e-"));
    await git(["init", "-q"]);
    await git(["config", "user.email", "test@example.com"]);
    await git(["config", "user.name", "Test"]);
    await exec("git", ["commit", "-q", "--allow-empty", "-m", "base"], { cwd: dir });
});

afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
});

describe("seven-phase workflow (end to end)", () => {
    it("walks clarify → spec → design → tickets → implement → accept → retro", async () => {
        // ---- state: start at clarify, persist, resume ----
        let state: WorkflowState = { ...INITIAL_WORKFLOW_STATE, approvedAt: {} };
        const statePath = join(dir, "workflow.json");
        await saveState(state, statePath);
        state = await loadState(statePath);
        expect(state.currentPhase).toBe("clarify");

        // ---- phase 1: clarify (grill-with-docs) ----
        let clarify = runClarify({
            requirement: "做一个可恢复的开发 Agent，范围包含七阶段状态机，非目标不做多租户",
            docs: [{ path: "AGENTS.md", content: "recoverable workflow agent" }],
        });
        clarify = applyClarifyAnswers(clarify, {
            scenarios: ["开发者输入一句需求", "开发者确认产物版本"],
        });
        expect(clarify.openQuestions).not.toContain("目标使用场景有哪些？");

        state = advancePhase(recordApproval(state, "clarify"), nextPhase("clarify")!);
        expect(state.currentPhase).toBe("spec");

        // ---- phase 2: spec (to-spec) ----
        const spec = runSpec({ feature: "Easy Codex", clarify });
        const specFiles = await writeSpec(spec, join(dir, "specs"));
        expect(await readFile(specFiles.prdPath, "utf8")).toContain("Problem Statement");
        expect(await readFile(specFiles.specPath, "utf8")).toContain("Acceptance criteria");

        state = advancePhase(recordApproval(state, "spec"), nextPhase("spec")!);
        expect(state.currentPhase).toBe("design");

        // ---- phase 3: design (impeccable gate) ----
        const design = runDesign({ feature: "Easy Codex", spec, uiChange: true });
        expect(design.impeccableRequired).toBe(true);
        const designFile = await writeDesign(design, join(dir, "specs"));
        await access(designFile.designPath);

        state = advancePhase(recordApproval(state, "design"), nextPhase("design")!);
        expect(state.currentPhase).toBe("tickets");

        // ---- phase 4: tickets (to-tickets) ----
        const ticketsResult = runTickets({ feature: "Easy Codex", spec, design });
        const ticketFiles = await writeTickets(ticketsResult, join(dir, "tickets"));
        expect(ticketFiles.length).toBe(ticketsResult.tickets.length);
        expect(ticketsResult.tickets[1].dependsOn).toEqual(["01"]);

        state = advancePhase(recordApproval(state, "tickets"), nextPhase("tickets")!);
        expect(state.currentPhase).toBe("implement");

        // ---- phase 5: implement (tests + review + acceptance doc) ----
        const implemented = await runImplement({
            feature: "Easy Codex",
            tickets: ticketsResult.tickets,
            cwd: dir,
            runner: passingRunner,
        });
        expect(implemented.tests.passed).toBe(true);
        const acceptanceFile = await writeAcceptance(implemented, join(dir, "acceptance"));
        expect(await readFile(acceptanceFile.acceptancePath, "utf8")).toContain(
            "## 操作步骤与预期结果",
        );

        state = advancePhase(recordApproval(state, "implement"), nextPhase("implement")!);
        expect(state.currentPhase).toBe("accept");

        // ---- phase 6: accept (human verdict + memo + git marker) ----
        const memoPath = join(dir, "memos.json");
        const accepted = await runAccept({
            feature: "Easy Codex",
            verdict: "approved",
            artifacts: [acceptanceFile.acceptancePath],
            cwd: dir,
            memosPath: memoPath,
        });
        expect(accepted.approved).toBe(true);
        expect(accepted.nextAction).toBe("proceed-to-retro");

        const memos = await readMemos(memoPath);
        expect(memos).toHaveLength(1);
        expect(memos[0].phase).toBe("accept");
        expect(memos[0].commit).toBe(await currentCommit(dir));
        expect(await commitHasApproval(accepted.commit!, "accept", dir)).toBe(true);

        state = advancePhase(recordApproval(state, "accept"), nextPhase("accept")!);
        expect(state.currentPhase).toBe("retro");

        // ---- phase 7: retro (review + retro) ----
        const retro = runRetro({
            feature: "Easy Codex",
            implement: implemented,
            retroNotes: ["保持七阶段产物"],
        });
        const retroFiles = await writeRetro(retro, join(dir, "specs"));
        expect(await readFile(retroFiles.reviewPath, "utf8")).toContain("Ticket 01");
        expect(await readFile(retroFiles.retroPath, "utf8")).toContain("保持七阶段产物");

        state = recordApproval(state, "retro");
        await saveState(state, statePath);

        // ---- final: resumable checkpoint has every approval ----
        const resumed = await loadState(statePath);
        expect(resumed.currentPhase).toBe("retro");
        expect(Object.keys(resumed.approvedAt ?? {}).sort()).toEqual(
            [...PHASE_ORDER].sort(),
        );
    });

    it("routes non-approved acceptance without recording a memo", async () => {
        const memoPath = join(dir, "memos.json");
        const result = await runAccept({
            feature: "Easy Codex",
            verdict: "new-capability",
            cwd: dir,
            memosPath: memoPath,
        });
        expect(result.nextAction).toBe("new-requirement");
        expect(await readMemos(memoPath)).toEqual([]);
        expect((await currentCommit(dir)).length).toBe(40);
    });
});
