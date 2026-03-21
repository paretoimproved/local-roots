#!/usr/bin/env bash
# PreToolUse hook: block git commit on main branch.
# Exit 2 = block the tool call with a message.

# Only care about git commit commands
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

if [[ "$COMMAND" == *"git commit"* ]]; then
  BRANCH=$(git branch --show-current 2>/dev/null)
  if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
    echo "BLOCKED: You're on '$BRANCH'. Create a feature branch first: git checkout -b <branch-name>"
    exit 2
  fi
fi

exit 0
