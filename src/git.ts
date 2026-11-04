import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Phase } from "./workflow.js";

const exec = promisify(execFile);

/**
 * D8: approvals bind to a concrete Git commit. The identifier is the commit
 * marker `approved:<phase>` (Git tag names cannot contain `:`).
 */
export function approvalMarker(phase: Phase): string {
    return `approved:${phase}`;
}

/** Resolve the current HEAD commit SHA. */
export async function currentCommit(cwd: string = process.cwd()): Promise<string> {
    const { stdout } = await exec("git", ["rev-parse", "HEAD"], { cwd });
    return stdout.trim();
}

async function commitMessage(rev: string, cwd: string): Promise<string> {
    const { stdout } = await exec("git", ["log", "-1", "--format=%B", rev], { cwd });
    return stdout;
}

/** True when the commit carries the `approved:<phase>` marker. */
export async function commitHasApproval(
    rev: string,
    phase: Phase,
    cwd: string = process.cwd(),
): Promise<boolean> {
    const message = await commitMessage(rev, cwd);
    return message
        .split("\n")
        .map((line) => line.trim())
        .includes(approvalMarker(phase));
}

/** Append the `approved:<phase>` marker to a commit message. */
export function withApprovalMarker(message: string, phase: Phase): string {
    return `${message.trimEnd()}\n\n${approvalMarker(phase)}`;
}

/** Create an (allow-empty) approval commit on HEAD and return its SHA. */
export async function commitApproval(
    phase: Phase,
    cwd: string = process.cwd(),
    message: string = `chore: approve ${phase}`,
): Promise<string> {
    await exec(
        "git",
        ["commit", "--allow-empty", "-m", withApprovalMarker(message, phase)],
        { cwd },
    );
    return currentCommit(cwd);
}
