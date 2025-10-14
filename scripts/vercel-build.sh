#!/bin/sh
set -eu
cd "$(dirname "$0")"/../..
TARGET=${VITE_BUILD_TARGET:-web}
pnpm --filter "$TARGET" run build
