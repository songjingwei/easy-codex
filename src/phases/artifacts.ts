import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { slugify } from "./spec.js";

/**
 * Shared writer for phase artifacts. Every phase stores its documents under
 * `<baseDir>/<feature-slug>/<filename>`; centralising the layout keeps phase
 * modules focused on content generation.
 */
export async function writeArtifact(
    baseDir: string,
    feature: string,
    filename: string,
    content: string,
): Promise<string> {
    const dir = join(baseDir, slugify(feature));
    await mkdir(dir, { recursive: true });
    const path = join(dir, filename);
    await writeFile(path, content, "utf8");
    return path;
}
