import { BACKGROUND_CONTEXT, type Context } from "@earendil-works/chord/context";
import type { Api, Model, Models, ThinkingLevel } from "@earendil-works/pi-ai";
import { createModels } from "@earendil-works/pi-ai/models";
import { openaiProvider } from "@earendil-works/pi-ai/providers/openai";
import { createRegistry, Harness } from "@earendil-works/pi-durable";
import { NodeExecutionEnv } from "@earendil-works/pi-durable/env/node";
import { openNodeSqliteStorage } from "@earendil-works/pi-durable/storage/sqlite/node";

export const STORAGE_PATH = ".easy-codex/agent.sqlite";

/** Spec default (D1): OpenAI primary, `gpt-5-mini` at medium reasoning. */
export const DEFAULT_MODEL_ID = "gpt-5-mini";
export const DEFAULT_REASONING: ThinkingLevel = "medium";

export function selectDefaultModel(models: Models): Model<Api> | undefined {
  return models.getModel("openai", DEFAULT_MODEL_ID);
}

export function defaultRequestOptions(): { reasoning: ThinkingLevel } {
  return { reasoning: DEFAULT_REASONING };
}

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
