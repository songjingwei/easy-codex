import { describe, it, expect } from "vitest";
import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import type { Models } from "@earendil-works/pi-ai";
import {
  createHarness,
  DEFAULT_MODEL_ID,
  DEFAULT_REASONING,
  selectDefaultModel,
  defaultRequestOptions,
} from "./harness";

describe("createHarness", () => {
  it("returns { harness, context } backed by the background context", async () => {
    const { harness, context } = await createHarness();
    expect(harness).toBeDefined();
    expect(context).toBe(BACKGROUND_CONTEXT);
  });
});

describe("LLM defaults (D1)", () => {
  it("targets gpt-5-mini at medium reasoning", () => {
    expect(DEFAULT_MODEL_ID).toBe("gpt-5-mini");
    expect(DEFAULT_REASONING).toBe("medium");
  });

  it("selects the default model from the openai provider", () => {
    const fake = { provider: "openai", id: DEFAULT_MODEL_ID };
    const models = {
      getModel: (provider: string, id: string) =>
        provider === "openai" && id === DEFAULT_MODEL_ID ? fake : undefined,
    } as unknown as Models;
    expect(selectDefaultModel(models)).toBe(fake);
  });

  it("selects nothing when the default model is unavailable", () => {
    const models = { getModel: () => undefined } as unknown as Models;
    expect(selectDefaultModel(models)).toBeUndefined();
  });

  it("returns the default request options", () => {
    expect(defaultRequestOptions()).toEqual({ reasoning: "medium" });
  });
});
