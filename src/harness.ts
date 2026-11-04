import { BACKGROUND_CONTEXT, type Context } from "@earendil-works/chord/context";
import { createModels } from "@earendil-works/pi-ai/models";
import { openaiProvider } from "@earendil-works/pi-ai/providers/openai";
import { createRegistry, Harness } from "@earendil-works/pi-durable";
import { NodeExecutionEnv } from "@earendil-works/pi-durable/env/node";
import { openNodeSqliteStorage } from "@earendil-works/pi-durable/storage/sqlite/node";

export const STORAGE_PATH = ".easy-codex/agent.sqlite";

export interface HarnessContext {
  harness: Harness;
  context: Context;
}

export async function createHarness(): Promise<HarnessContext> {
  const context = BACKGROUND_CONTEXT;
  const models = createModels();
  models.setProvider(openaiProvider());
  const registry = createRegistry();
  const env = ({ cwd }: { cwd?: string }) => new NodeExecutionEnv({ cwd: cwd ?? process.cwd() });
  const harness = await Harness.open(
    await openNodeSqliteStorage(STORAGE_PATH),
    { models, registry, env },
    context,
  );
  return { harness, context };
}
