#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/target-app"

if [[ ! -d "$APP" ]]; then
  echo "missing $APP" >&2
  exit 1
fi

cd "$APP"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "target-app is not a git repository" >&2
  exit 1
fi

pnpm install --frozen-lockfile 2>/dev/null || pnpm install
pnpm test
pnpm build

echo "fixtures OK: $APP"
