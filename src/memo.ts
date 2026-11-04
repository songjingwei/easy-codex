import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Phase } from "./workflow.js";

/**
 * An approval memo binds a phase approval to a specific Git commit and the
 * artifacts it governs. Persisted in `.easy-codex/memos.json` (never committed).
 */
export interface ApprovalMemo {
    phase: Phase;
    commit: string;
    approvedAt: string;
    artifacts?: string[];
}

export const MEMOS_PATH = ".easy-codex/memos.json";

export async function readMemos(path: string = MEMOS_PATH): Promise<ApprovalMemo[]> {
    try {
        const raw = await readFile(path, "utf8");
        const parsed = JSON.parse(raw) as { memos?: ApprovalMemo[] };
        return Array.isArray(parsed.memos) ? parsed.memos : [];
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw err;
    }
}

export async function recordMemo(
    memo: ApprovalMemo,
    path: string = MEMOS_PATH,
): Promise<void> {
    const memos = await readMemos(path);
    const next = memos.filter((m) => m.phase !== memo.phase);
    next.push(memo);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify({ memos: next }, null, 2), "utf8");
}

export function approvalFor(
    memos: ApprovalMemo[],
    phase: Phase,
): ApprovalMemo | undefined {
    return memos.find((m) => m.phase === phase);
}

export function isApproved(memos: ApprovalMemo[], phase: Phase): boolean {
    return approvalFor(memos, phase) !== undefined;
}

/**
 * User story 7: when artifacts change, identify approvals that are affected and
 * must be re-confirmed.
 */
export function affectedByChanges(
    memos: ApprovalMemo[],
    changedPaths: string[],
): ApprovalMemo[] {
    const changed = new Set(changedPaths);
    return memos.filter((m) => (m.artifacts ?? []).some((a) => changed.has(a)));
}
