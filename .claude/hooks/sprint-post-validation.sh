#!/bin/bash

# Sprint Post-Validation Hook
# Runs after tool operations to validate sprint structure

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
exec "$PROJECT_DIR/.claude/hooks/sprint-protection.sh" --post-validation "$@"