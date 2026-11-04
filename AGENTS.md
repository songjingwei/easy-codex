# easy-codex Agent Skills

From one requirement to a reviewed and accepted feature. easy-codex builds a development Agent based on [Pi Durable](https://earendil.com/posts/pi-durable/), stringing requirement clarification, product specs, UI/UX design, technical planning, implementation, acceptance, and retrospective into a recoverable, human-in-the-loop workflow.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues in `songjingwei/easy-codex`, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), plus wayfinder labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: root `GLOSSARY.md` + `docs/adr/`. See `docs/agents/domain.md`.

## Working agreements

- Seven-phase workflow: clarify → spec → design → tickets → implement → accept → retro (`src/workflow.ts`).
- Phase artifacts land in the repo (`specs/`, `tickets/`, `acceptance/`) and are bound to Git versions; approval is recorded per phase (`approved:<phase>` commit markers + `.easy-codex/memos.json`).
- Run state lives in `.easy-codex/` (never committed): `agent.sqlite` (durable session), `workflow.json` (phase checkpoint), `memos.json` (approval memos).
- Gates: `pnpm run build` (tsc build) and `pnpm test` (Vitest).
