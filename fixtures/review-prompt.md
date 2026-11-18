# Slice 1 review (read-only)

Review **Easy Codex 切片 1：样例与验证仓库** deliverables in this repo.

## Scope (read only, no edits)

- `fixtures/README.md`
- `fixtures/requirements/add-priority-label.md`
- `fixtures/scripts/verify.sh`
- `fixtures/target-app/` (including its git history)
- `docs/DEVELOPMENT_SEQUENCE.md` — section "切片 1" only

Do **not** start subagents. Do **not** modify files.

## Checklist

1. Independent Git repo inside `fixtures/target-app` with sensible initial commit.
2. Small app with **Task List** UI, localStorage key `target-app.tasks`, add/toggle tasks.
3. Requirement sample references the same app surface and is implementable as a follow-up feature (priority).
4. `fixtures/scripts/verify.sh` runs install, test, build successfully (you may run it once).
5. `fixtures/README.md` documents paths, commands, reset, and slice-1 completion checklist.
6. Gaps vs `DEVELOPMENT_SEQUENCE.md` slice 1 "完成标志".

## Output

Reply with:

- **Verdict**: pass / pass with notes / fail
- **Per-item** checklist result
- **Actionable notes** (if any)

When done, notify the parent: `hc send $HC_TERMINAL_ID` plus a one-line subject and the verdict.
