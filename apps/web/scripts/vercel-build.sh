#!/bin/sh
set -eu
REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$REPO_ROOT"
TARGET=${VITE_BUILD_TARGET:-web}
pnpm --filter "$TARGET" run build
