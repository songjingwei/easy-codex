import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeArtifact } from "./artifacts";

let dir: string;

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "easy-codex-artifacts-"));
});

afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
});

describe("writeArtifact", () => {
    it("creates the feature directory and returns the full path", async () => {
        const path = await writeArtifact(dir, "Easy Codex", "prd.md", "# PRD");
        expect(path).toBe(join(dir, "easy-codex", "prd.md"));
        expect(await readFile(path, "utf8")).toBe("# PRD");
    });

    it("keeps CJK feature names in the directory", async () => {
        const path = await writeArtifact(dir, "七阶段工作流", "spec.md", "S");
        expect(path).toBe(join(dir, "七阶段工作流", "spec.md"));
        expect(await readFile(path, "utf8")).toBe("S");
    });
});
