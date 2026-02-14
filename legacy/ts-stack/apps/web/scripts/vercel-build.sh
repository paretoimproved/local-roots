#!/bin/bash
set -eu
VITE_BUILD_TARGET=${VITE_BUILD_TARGET:-web}
VITE_BUILD_TARGET="$VITE_BUILD_TARGET" "$(dirname "$0")/../../scripts/vercel-build.sh"
