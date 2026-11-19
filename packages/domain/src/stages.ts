import type { ActiveStage, WorkflowStage } from "./types";
import { STAGE_ORDER } from "./types";

export function nextStage(stage: ActiveStage): ActiveStage | "completed" {
  const index = STAGE_ORDER.indexOf(stage);
  if (index < 0 || index >= STAGE_ORDER.length - 1) {
    return "completed";
  }
  return STAGE_ORDER[index + 1]!;
}

export function isActiveStage(stage: WorkflowStage): stage is ActiveStage {
  return stage !== "completed";
}

export function stageIndex(stage: WorkflowStage): number {
  if (stage === "completed") {
    return STAGE_ORDER.length;
  }
  return STAGE_ORDER.indexOf(stage);
}
