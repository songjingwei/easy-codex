import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
    approvalMarker,
    currentCommit,
    commitHasApproval,
    withApprovalMarker,
    commitApproval,
} from "./git";

const exec = promisify(execFile);

let dir: string;

async function git(args: string[]): Promise<string> {
    const { stdout } = await exec("git", args, { cwd: dir });
    return stdout.trim();
}

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "easy-codex-git-"));
    await git(["init", "-q"]);
    await git(["config", "user.email", "test@example.com"]);
    await git(["config", "user.name", "Test"]);
    await writeFile(join(dir, "file.txt"), "hello", "utf8");
    await git(["add", "."]);
    await git(["commit", "-q", "-m", "initial"]);
});

afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
});

describe("git commit identification", () => {
    it("currentCommit returns the HEAD SHA", async () => {
        const head = await currentCommit(dir);
        expect(head).toMatch(/^[0-9a-f]{40}$/);
        expect(await git(["rev-parse", "HEAD"])).toBe(head);
    });

    it("commitHasApproval is false without a marker", async () => {
        const head = await currentCommit(dir);
        expect(await commitHasApproval(head, "clarify", dir)).toBe(false);
    });

    it("withApprovalMarker appends the approved:<phase> marker", () => {
        expect(withApprovalMarker("feat: x", "spec")).toBe(
            "feat: x\n\napproved:spec",
        );
    });

    it("approvalMarker is the approved:<phase> string", () => {
        expect(approvalMarker("accept")).toBe("approved:accept");
    });

    it("commitApproval creates a commit carrying the marker", async () => {
        const sha = await commitApproval("clarify", dir);
        expect(sha).toMatch(/^[0-9a-f]{40}$/);
        expect(await commitHasApproval(sha, "clarify", dir)).toBe(true);
    });

    it("approval markers are phase-specific", async () => {
        const sha = await commitApproval("spec", dir);
        expect(await commitHasApproval(sha, "spec", dir)).toBe(true);
        expect(await commitHasApproval(sha, "design", dir)).toBe(false);
    });

    it("commitApproval also works with staged changes", async () => {
        await writeFile(join(dir, "file.txt"), "changed", "utf8");
        await git(["add", "."]);
        const sha = await commitApproval("implement", dir);
        const message = await git(["log", "-1", "--format=%B", sha]);
        expect(message).toContain("approved:implement");
        expect(await git(["show", "--name-only", "--format=", sha])).toContain(
            "file.txt",
        );
    });
});
