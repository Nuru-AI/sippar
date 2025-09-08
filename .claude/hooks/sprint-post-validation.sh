#!/bin/bash
# Claude Code Hook: Sprint Post-Validation
# Purpose: Automatically run verification after sprint completion claims
# Triggered: After responses containing sprint completion keywords

set -e

HOOK_NAME="Sprint Post-Validation"
PROJECT_ROOT="/Users/eladm/Projects/Nuru-AI/Sippar"

echo "🔍 [$HOOK_NAME] Auto-verification triggered"

# Check if sprint completion keywords are present
SPRINT_KEYWORDS=("sprint.*complete" "100%.*complete" "all.*tasks.*complete" "breakthrough.*achieved")

FOUND_SPRINT_COMPLETION=false
for pattern in "${SPRINT_KEYWORDS[@]}"; do
    if echo "$CLAUDE_RESPONSE" | grep -qiE "$pattern"; then
        FOUND_SPRINT_COMPLETION=true
        echo "📋 Detected sprint completion claim: $pattern"
        break
    fi
done

if [ "$FOUND_SPRINT_COMPLETION" = true ]; then
    echo ""
    echo "🚀 RUNNING AUTOMATIC VERIFICATION"
    echo "================================="
    
    # Change to project directory
    cd "$PROJECT_ROOT"
    
    # Run production verification
    echo "Running production verification script..."
    if ./tools/verify-production.sh; then
        echo ""
        echo "✅ VERIFICATION PASSED"
        echo "Sprint completion claims are supported by working endpoints."
    else
        echo ""
        echo "❌ VERIFICATION FAILED"
        echo "Sprint completion claims cannot be verified - endpoints not working."
        echo "REJECT THE SPRINT COMPLETION until verification passes."
        exit 1
    fi
    
    # Additional checks for sprint documentation
    if [ -d "working" ]; then
        ACTIVE_SPRINTS=$(find working -name "sprint-*" -type d 2>/dev/null | wc -l)
        if [ $ACTIVE_SPRINTS -gt 0 ]; then
            echo ""
            echo "📁 Active sprint directories found in /working/"
            echo "Consider archiving completed sprints to /archive/sprints-completed/"
        fi
    fi
    
    echo ""
    echo "🎯 Sprint validation recommendations:"
    echo "  1. ✅ Production endpoints verified working"
    echo "  2. ⚠️  Manually verify claimed transactions on Algorand network"
    echo "  3. ⚠️  Review sprint documentation for accuracy"
    echo "  4. ⚠️  Archive completed sprint if all objectives met"
    
else
    echo "No sprint completion claims detected - skipping auto-verification"
fi

echo ""
echo "✅ [$HOOK_NAME] Auto-verification complete"