import { commitApproval, currentCommit } from "../git";
import { ApprovalMemo, MEMOS_PATH, recordMemo } from "../memo";

/**
 * Phase 6 — accept (user acceptance, human-in-the-loop).
 *
 * The user verifies the acceptance document and reports back. Three routes
 * (User story 6):
 *  - spec mismatch     → fix inside the current scope
 *  - minor adjustment  → handled within the flow
 *  - new capability    → new requirement, restarts the workflow
 *
 * Approval records an ApprovalMemo bound to the Git commit (D7 + D8).
 */

export type AcceptanceVerdict =
    | "approved"
    | "spec-mismatch"
    | "minor-adjustment"
    | "new-capability";

export type NextAction =
    | "proceed-to-retro"
    | "fix-in-scope"
    | "adjust-in-flow"
    | "new-requirement";

export interface AcceptInput {
    feature: string;
    verdict: AcceptanceVerdict;
    feedback?: string;
    artifacts?: string[];
    cwd?: string;
    memosPath?: string;
    /** When approving, also create an `approved:accept` commit (default true). */
    makeApprovalCommit?: boolean;
}

export interface AcceptResult {
    feature: string;
    approved: boolean;
    nextAction: NextAction;
    memo?: ApprovalMemo;
    commit?: string;
}

export function routeVerdict(verdict: AcceptanceVerdict): NextAction {
    switch (verdict) {
        case "approved":
            return "proceed-to-retro";
        case "spec-mismatch":
            return "fix-in-scope";
        case "minor-adjustment":
            return "adjust-in-flow";
        case "new-capability":
            return "new-requirement";
    }
}

export async function runAccept(input: AcceptInput): Promise<AcceptResult> {
    const nextAction = routeVerdict(input.verdict);
    if (input.verdict !== "approved") {
        return { feature: input.feature, approved: false, nextAction };
    }

    const cwd = input.cwd ?? process.cwd();
    const commit =
        input.makeApprovalCommit === false
            ? await currentCommit(cwd)
            : await commitApproval("accept", cwd, `chore(accept): approve ${input.feature}`);

    const memo: ApprovalMemo = {
        phase: "accept",
        commit,
        approvedAt: new Date().toISOString(),
        artifacts: input.artifacts,
    };
    await recordMemo(memo, input.memosPath ?? MEMOS_PATH);

    return {
        feature: input.feature,
        approved: true,
        nextAction,
        memo,
        commit,
    };
}
