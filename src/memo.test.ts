import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
    ApprovalMemo,
    readMemos,
    recordMemo,
    approvalFor,
    isApproved,
    affectedByChanges,
} from "./memo";

let dir: string;
let path: string;

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "easy-codex-memo-"));
    path = join(dir, "memos.json");
});

afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
});

const sample = (phase: ApprovalMemo["phase"], commit = "abc123"): ApprovalMemo => ({
    phase,
    commit,
    approvedAt: "2026-01-01T00:00:00.000Z",
    artifacts: [`specs/${phase}/spec.md`],
});

describe("memo store", () => {
    it("reads an empty list when the store does not exist", async () => {
        expect(await readMemos(path)).toEqual([]);
    });

    it("records and reads back a memo", async () => {
        await recordMemo(sample("clarify"), path);
        const memos = await readMemos(path);
        expect(memos).toHaveLength(1);
        expect(memos[0].phase).toBe("clarify");
        expect(memos[0].commit).toBe("abc123");
    });

    it("upserts a memo for the same phase", async () => {
        await recordMemo(sample("spec", "c1"), path);
        await recordMemo(sample("spec", "c2"), path);
        const memos = await readMemos(path);
        expect(memos).toHaveLength(1);
        expect(memos[0].commit).toBe("c2");
    });

    it("keeps memos for different phases", async () => {
        await recordMemo(sample("spec"), path);
        await recordMemo(sample("design"), path);
        expect((await readMemos(path)).map((m) => m.phase).sort()).toEqual([
            "design",
            "spec",
        ]);
    });

    it("creates parent directories when recording", async () => {
        const nested = join(dir, "nested", "deep", "memos.json");
        await recordMemo(sample("tickets"), nested);
        expect((await readMemos(nested)).map((m) => m.phase)).toEqual(["tickets"]);
    });

    it("is idempotent on read of malformed payloads", async () => {
        await mkdir(dir, { recursive: true });
        await writeFile(path, JSON.stringify({ wrong: true }), "utf8");
        expect(await readMemos(path)).toEqual([]);
    });
});

describe("approval queries", () => {
    it("approvalFor finds the memo for a phase", async () => {
        await recordMemo(sample("implement"), path);
        const memos = await readMemos(path);
        expect(approvalFor(memos, "implement")?.phase).toBe("implement");
        expect(approvalFor(memos, "retro")).toBeUndefined();
    });

    it("isApproved reflects recorded approvals", async () => {
        const memos = [sample("accept")];
        expect(isApproved(memos, "accept")).toBe(true);
        expect(isApproved(memos, "design")).toBe(false);
    });
});

describe("affectedByChanges", () => {
    it("returns approvals whose artifacts changed", () => {
        const memos = [sample("spec"), sample("design")];
        const affected = affectedByChanges(memos, ["specs/spec/spec.md"]);
        expect(affected.map((m) => m.phase)).toEqual(["spec"]);
    });

    it("returns nothing when unrelated paths changed", () => {
        const memos = [sample("spec")];
        expect(affectedByChanges(memos, ["src/index.ts"])).toEqual([]);
    });

    it("handles memos without artifacts", () => {
        const memos: ApprovalMemo[] = [
            { phase: "retro", commit: "x", approvedAt: "2026-01-01T00:00:00.000Z" },
        ];
        expect(affectedByChanges(memos, ["anything"])).toEqual([]);
    });
});
