#!/usr/bin/env bash
# Stop hook: warn if working tree has uncommitted changes.
# Exit 0 = non-blocking, just informational output.

if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo "WARNING: Working tree has uncommitted changes. Consider committing or stashing before ending the session."
fi

exit 0
