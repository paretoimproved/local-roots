#!/bin/sh
set -eu
REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$REPO_ROOT"
pnpm install --frozen-lockfile
