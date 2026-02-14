#!/bin/bash
set -eu
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if command -v pnpm >/dev/null 2>&1; then
  PNPM="pnpm"
else
  PNPM="$(npm root -g)/pnpm/bin/pnpm.cjs"
fi
cd "$REPO_ROOT"
"${PNPM}" install --frozen-lockfile
