import { describe, it, expect } from "vitest";
import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { createHarness } from "./harness";

describe("createHarness", () => {
  it("returns { harness, context } backed by the background context", async () => {
    const { harness, context } = await createHarness();
    expect(harness).toBeDefined();
    expect(context).toBe(BACKGROUND_CONTEXT);
  });
});
