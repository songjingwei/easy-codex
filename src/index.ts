import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { createHarness } from "./harness";
import { INITIAL_WORKFLOW_STATE } from "./workflow";

async function main() {
    const { harness } = await createHarness();
    const root = await harness.root(BACKGROUND_CONTEXT);

    console.log("easy-codex harness initialized.");
    console.log("Workflow state:", JSON.stringify(INITIAL_WORKFLOW_STATE, null, 2));

    // TODO: connect CLI/Web入口，进入 clarify 阶段
    // root.submit({ type: "input", content: userRequirement }, context);
}

main().catch((err) => {
    console.error("easy-codex failed:", err);
    process.exit(1);
});
