#!/bin/bash
# CI Agent Auto-Activation Hook
# Based on TokenHunter role-command pattern
# Detects agent activation patterns and loads context automatically

set -e

CI_ROOT="$(pwd)/ci"
LOG_FILE="$CI_ROOT/.claude/logs/agent-activation.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

echo "🤖 CI AGENT ACTIVATION DETECTED"
echo "=================================="
log_message "Agent activation hook triggered"

# Extract agent name from command
AGENT_COMMAND="$1"
log_message "Processing command: $AGENT_COMMAND"

# Multiple patterns for agent detection
AGENT_NAME=""

# Pattern 1: @AgentName
if echo "$AGENT_COMMAND" | grep -q "@[[:alnum:]_]*"; then
    AGENT_NAME=$(echo "$AGENT_COMMAND" | grep -o "@[[:alnum:]_]*" | sed 's/@//')
    log_message "Detected @pattern: $AGENT_NAME"
fi

# Pattern 2: Agent:AgentName
if [[ -z "$AGENT_NAME" ]] && echo "$AGENT_COMMAND" | grep -q "Agent:[[:alnum:]_]*"; then
    AGENT_NAME=$(echo "$AGENT_COMMAND" | grep -o "Agent:[[:alnum:]_]*" | sed 's/Agent://')
    log_message "Detected Agent: pattern: $AGENT_NAME"
fi

# Pattern 3: [AgentName]

# Pattern 4: Simple agent name (direct match)
if [[ -z "$AGENT_NAME" ]] && echo "$AGENT_COMMAND" | grep -qE "^(Athena|Developer|Debugger|Architect|Analyst|Writer|Topologist)$"; then
    AGENT_NAME="$AGENT_COMMAND"
    log_message "Detected direct agent name: $AGENT_NAME"
fiif [[ -z "$AGENT_NAME" ]] && echo "$AGENT_COMMAND" | grep -q "\[[[:alnum:]_]*\]"; then
    AGENT_NAME=$(echo "$AGENT_COMMAND" | grep -o "\[[[:alnum:]_]*\]" | sed 's/\[\|\]//g')
    log_message "Detected [bracket] pattern: $AGENT_NAME"
fi

if [ -z "$AGENT_NAME" ]; then
    log_message "⚠️ Could not extract agent name from: $AGENT_COMMAND"
    echo "⚠️ Could not extract agent name from: $AGENT_COMMAND"
    exit 0
fi

# Normalize agent name (proper case - first letter uppercase, rest lowercase)
FIRST_CHAR=$(echo "$AGENT_NAME" | cut -c1 | tr '[:lower:]' '[:upper:]')
REST_CHARS=$(echo "$AGENT_NAME" | cut -c2- | tr '[:upper:]' '[:lower:]')
AGENT_NAME="${FIRST_CHAR}${REST_CHARS}"

echo "🎯 AGENT DETECTED: $AGENT_NAME"
echo "📋 INITIATING AUTOMATIC CONTEXT LOADING..."
log_message "Agent detected: $AGENT_NAME"

# Check if agent exists
AGENT_DIR="$CI_ROOT/AGENTS/$AGENT_NAME"
if [[ ! -d "$AGENT_DIR" ]]; then
    log_message "❌ Agent directory not found: $AGENT_DIR"
    echo "❌ Agent '$AGENT_NAME' not found in AGENTS directory"
    echo "Available agents:"
    ls "$CI_ROOT/AGENTS/" 2>/dev/null | head -5 || echo "  No agents found"
    exit 1
fi

# Create context loading instructions
CONTEXT_FILE="/tmp/ci_agent_${AGENT_NAME}_$(date +%s).md"
log_message "Creating context file: $CONTEXT_FILE"

cat > "$CONTEXT_FILE" << EOF
# 🚨 AUTOMATIC AGENT CONTEXT LOADING

## Agent: $AGENT_NAME

**CLAUDE MUST IMMEDIATELY READ THE FOLLOWING FILES BEFORE PROCEEDING:**

### 🧠 Agent Memory and Context
You must use the Read tool to read each of these files:

1. **Agent Metadata**:
   - Read: \`$CI_ROOT/AGENTS/$AGENT_NAME/metadata.json\`

2. **Agent Memory**:
   - Read: \`$CI_ROOT/AGENTS/$AGENT_NAME/memory.md\`

### 🎯 Foundational Context
3. **Project Foundation**:
   - Read: \`$CI_ROOT/CLAUDE.md\`

4. **Current Session** (if exists):
   - Read: \`$CI_ROOT/Sessions/current-session.md\`

### ⚡ Recent Activity Context
EOF

# Add recent agent sessions if they exist
if [[ -d "$AGENT_DIR/sessions" ]]; then
    echo "5. **Recent Agent Sessions**:" >> "$CONTEXT_FILE"
    find "$AGENT_DIR/sessions" -name "*.md" -mtime -7 2>/dev/null | head -3 | while read file; do
        echo "   - Read: \`$file\`" >> "$CONTEXT_FILE"
    done
    log_message "Added recent sessions to context file"
else
    log_message "No sessions directory found for $AGENT_NAME"
fi

# Add recent project activity
echo "" >> "$CONTEXT_FILE"
echo "6. **Recent Project Activity** (if exists):" >> "$CONTEXT_FILE"
if [[ -d "$CI_ROOT/Sessions" ]]; then
    find "$CI_ROOT/Sessions" -name "*.md" -mtime -3 2>/dev/null | head -2 | while read file; do
        echo "   - Read: \`$file\`" >> "$CONTEXT_FILE"
    done
fi

# Add verification section
cat >> "$CONTEXT_FILE" << EOF

### ⚠️ MANDATORY VERIFICATION
After reading ALL files above, confirm by stating:
- [ ] Agent metadata and specialization understood
- [ ] Agent memory and context loaded
- [ ] Current session context acquired (if applicable)
- [ ] Recent activity reviewed
- [ ] Ready to operate as $AGENT_NAME with full context

**DO NOT PROCEED WITH $AGENT_NAME TASKS UNTIL ALL FILES ARE READ AND VERIFIED**

### 🎯 Agent Activation Complete
Once verification is complete, you are now operating as **$AGENT_NAME** with:
- Full access to agent memory and learned patterns
- Understanding of agent specialization and capabilities
- Context of recent interactions and sessions
- Awareness of current project state

---
*This context loading was automatically triggered by Claude Code hooks*
*Agent activation pattern detected in: $AGENT_COMMAND*
*Context file generated at: $(date)*
EOF

echo ""
echo "📄 AGENT CONTEXT LOADING INSTRUCTIONS CREATED"
echo "📍 Context File: $CONTEXT_FILE"
echo ""
echo "🚨 CLAUDE: You must read the context file created above IMMEDIATELY"
echo "🚨 Use the Read tool on: $CONTEXT_FILE"
echo ""
echo "✅ Hook execution completed. Agent context loading initiated."

log_message "Agent activation hook completed successfully for $AGENT_NAME"
log_message "Context file created: $CONTEXT_FILE"