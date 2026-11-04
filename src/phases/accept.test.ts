import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { runAccept, routeVerdict } from "./accept";
import { readMemos } from "../memo";

const exec = promisify(execFile);

let dir: string;
let memosPath: string;

async function git(args: string[]): Promise<string> {
    const { stdout } = await exec("git", args, { cwd: dir });
    return stdout.trim();
}

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "easy-codex-accept-"));
    memosPath = join(dir, "memos.json");
    await git(["init", "-q"]);
    await git(["config", "user.email", "test@example.com"]);
    await git(["config", "user.name", "Test"]);
    await exec("git", ["commit", "-q", "--allow-empty", "-m", "base"], { cwd: dir });
});

afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
});

describe("routeVerdict", () => {
    it("routes approvals to retro", () => {
        expect(routeVerdict("approved")).toBe("proceed-to-retro");
    });

    it("routes spec mismatches to in-scope fixes", () => {
        expect(routeVerdict("spec-mismatch")).toBe("fix-in-scope");
    });

    it("routes minor adjustments into the flow", () => {
        expect(routeVerdict("minor-adjustment")).toBe("adjust-in-flow");
    });

    it("routes new capabilities to a new requirement", () => {
        expect(routeVerdict("new-capability")).toBe("new-requirement");
    });
});

describe("runAccept", () => {
    it("records a memo bound to the approval commit when approved", async () => {
        const result = await runAccept({
            feature: "Easy Codex",
            verdict: "approved",
            artifacts: ["acceptance/easy-codex/acceptance.md"],
            cwd: dir,
            memosPath,
        });
        expect(result.approved).toBe(true);
        expect(result.nextAction).toBe("proceed-to-retro");
        expect(result.commit).toMatch(/^[0-9a-f]{40}$/);

        const memos = await readMemos(memosPath);
        expect(memos).toHaveLength(1);
        expect(memos[0].phase).toBe("accept");
        expect(memos[0].commit).toBe(result.commit);
    });

    it("does not record a memo when not approved", async () => {
        const result = await runAccept({
            feature: "Easy Codex",
            verdict: "spec-mismatch",
            feedback: "验收第 2 步与 Spec 不符",
            cwd: dir,
            memosPath,
        });
        expect(result.approved).toBe(false);
        expect(result.nextAction).toBe("fix-in-scope");
        expect(result.memo).toBeUndefined();
        expect(await readMemos(memosPath)).toEqual([]);
    });

    it("binds the memo to the current commit when approval commit is disabled", async () => {
        const head = await git(["rev-parse", "HEAD"]);
        const result = await runAccept({
            feature: "Easy Codex",
            verdict: "approved",
            cwd: dir,
            memosPath,
            makeApprovalCommit: false,
        });
        expect(result.commit).toBe(head);
        const memos = await readMemos(memosPath);
        expect(memos[0].commit).toBe(head);
    });

    it("creates an approved:accept commit when approving", async () => {
        const result = await runAccept({
            feature: "Easy Codex",
            verdict: "approved",
            cwd: dir,
            memosPath,
        });
        const message = await git(["log", "-1", "--format=%B"]);
        expect(message).toContain("approved:accept");
        expect(result.commit).toBe(await git(["rev-parse", "HEAD"]));
    });
});
