#!/bin/bash

# Sprint Protection Hook for Claude Code
# Protects sprint management system by validating sprint operations
# and keeping sprint-management.md updated

set -e

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
SPRINT_MGMT_DOC="$PROJECT_DIR/docs/development/sprint-management.md"
WORKING_DIR="$PROJECT_DIR/working"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[SPRINT-HOOK]${NC} $1" >&2
}

log_warn() {
    echo -e "${YELLOW}[SPRINT-HOOK WARNING]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[SPRINT-HOOK ERROR]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[SPRINT-HOOK SUCCESS]${NC} $1" >&2
}

# Function to validate sprint directory structure
validate_sprint_structure() {
    local sprint_dir="$1"
    local sprint_num=$(basename "$sprint_dir" | sed 's/sprint-//')
    
    # Check if sprint number is valid format (3 digits)
    if ! [[ "$sprint_num" =~ ^[0-9]{3}$ ]]; then
        log_error "Invalid sprint number format: $sprint_num (should be 3 digits, e.g., 009)"
        return 1
    fi
    
    # Check required subdirectories
    local required_dirs=("sprint-planning" "temp" "reports")
    for dir in "${required_dirs[@]}"; do
        if [[ ! -d "$sprint_dir/$dir" ]]; then
            log_warn "Missing required directory: $sprint_dir/$dir"
        fi
    done
    
    # Check for sprint documentation
    local sprint_doc="$sprint_dir/sprint${sprint_num}-*.md"
    if ! ls $sprint_doc >/dev/null 2>&1; then
        log_warn "Missing sprint documentation file matching pattern: sprint${sprint_num}-*.md"
    fi
    
    # Check for README.md
    if [[ ! -f "$sprint_dir/README.md" ]]; then
        log_warn "Missing README.md in sprint directory"
    fi
    
    return 0
}

# Function to get current active sprint from sprint-management.md
get_active_sprint() {
    if [[ -f "$SPRINT_MGMT_DOC" ]]; then
        grep -A1 "### \*\*Active Sprint\*\*" "$SPRINT_MGMT_DOC" | grep "Sprint [0-9][0-9][0-9]" | sed 's/.*Sprint \([0-9][0-9][0-9]\).*/\1/' | head -1
    fi
}

# Function to update sprint status in sprint-management.md
update_sprint_management() {
    local action="$1"
    local sprint_dir="$2"
    
    if [[ ! -f "$SPRINT_MGMT_DOC" ]]; then
        log_error "Sprint management document not found: $SPRINT_MGMT_DOC"
        return 1
    fi
    
    local sprint_num=$(basename "$sprint_dir" | sed 's/sprint-//')
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    log_info "Updating sprint management document for $action on Sprint $sprint_num"
    
    # Add a note about the hook action (this is a simple implementation)
    # In a production version, you might want more sophisticated updating
    echo "" >> "$SPRINT_MGMT_DOC"
    echo "<!-- Hook Update: $timestamp - $action Sprint $sprint_num -->" >> "$SPRINT_MGMT_DOC"
    
    return 0
}

# Main hook logic
main() {
    local tool_name="$1"
    local tool_args="${@:2}"
    
    log_info "Sprint protection hook triggered for tool: $tool_name"
    
    # Check if this operation involves sprint directories
    case "$tool_name" in
        "Bash")
            # Check for mkdir operations on sprint directories
            if echo "$tool_args" | grep -q "mkdir.*sprint-[0-9][0-9][0-9]"; then
                local sprint_path=$(echo "$tool_args" | grep -o '/[^[:space:]]*sprint-[0-9][0-9][0-9][^[:space:]]*' | head -1)
                if [[ -n "$sprint_path" ]]; then
                    log_info "Detected sprint directory creation: $sprint_path"
                    
                    # Extract sprint directory (remove any subdirectories)
                    local sprint_dir=$(echo "$sprint_path" | sed 's|\(/[^/]*sprint-[0-9][0-9][0-9]\).*|\1|')
                    
                    # Validate after creation (will be done in PostToolUse)
                    echo "SPRINT_DIR_CREATED=$sprint_dir" > /tmp/claude_sprint_hook_state
                fi
            fi
            ;;
        "Write")
            # Check if writing sprint documentation
            if echo "$tool_args" | grep -q "sprint-[0-9][0-9][0-9].*\.md"; then
                log_info "Detected sprint documentation write operation"
                local file_path=$(echo "$tool_args" | grep -o '/[^[:space:]]*sprint-[0-9][0-9][0-9][^[:space:]]*\.md')
                if [[ -n "$file_path" ]]; then
                    local sprint_dir=$(dirname "$file_path")
                    echo "SPRINT_DOC_WRITTEN=$sprint_dir" > /tmp/claude_sprint_hook_state
                fi
            fi
            ;;
    esac
    
    # Always allow the operation to proceed
    log_success "Sprint protection hook completed - operation allowed"
    return 0
}

# Post-tool-use validation
post_validation() {
    if [[ -f /tmp/claude_sprint_hook_state ]]; then
        source /tmp/claude_sprint_hook_state
        
        if [[ -n "$SPRINT_DIR_CREATED" ]]; then
            log_info "Validating created sprint directory: $SPRINT_DIR_CREATED"
            validate_sprint_structure "$SPRINT_DIR_CREATED"
            update_sprint_management "created" "$SPRINT_DIR_CREATED"
        fi
        
        if [[ -n "$SPRINT_DOC_WRITTEN" ]]; then
            log_info "Validating sprint documentation in: $SPRINT_DOC_WRITTEN"
            validate_sprint_structure "$SPRINT_DOC_WRITTEN"
            update_sprint_management "updated" "$SPRINT_DOC_WRITTEN"
        fi
        
        rm -f /tmp/claude_sprint_hook_state
    fi
}

# Check if this is a post-tool-use call
if [[ "$1" == "--post-validation" ]]; then
    post_validation
else
    main "$@"
fi