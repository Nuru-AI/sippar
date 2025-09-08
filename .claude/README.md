# Claude Code Configuration for Sippar

**Project**: Sippar Algorand Chain Fusion Bridge  
**Created**: September 5, 2025  
**Purpose**: Sprint management system protection and automation

---

## 🔧 **Hook Configuration**

### **Sprint Protection System**
This project uses Claude Code hooks to protect and maintain the sprint management system automatically.

#### **Active Hooks**

1. **PreToolUse Hook** (`sprint-protection.sh`)
   - **Triggers**: Before `Bash` and `Write` tool operations
   - **Purpose**: Detect sprint directory creation and documentation writes
   - **Actions**: Validate sprint number format, log operations

2. **PostToolUse Hook** (`sprint-post-validation.sh`) 
   - **Triggers**: After `Bash` and `Write` tool operations
   - **Purpose**: Validate sprint structure and update management docs
   - **Actions**: Check directory structure, update sprint-management.md

### **Protected Sprint System**

#### **Sprint Directory Convention**
- **Format**: `/working/sprint-XXX/` (3-digit numbers, e.g., sprint-009)
- **Required Structure**:
  ```
  /working/sprint-XXX/
  ├── sprint-XXX-[name].md    # Main sprint documentation
  ├── README.md               # Directory overview
  ├── sprint-planning/        # Planning documents
  ├── temp/                   # Temporary files
  └── reports/                # Completion reports
  ```

#### **Automatic Validations**
- ✅ **Sprint Number Format**: Ensures 3-digit format (001-999)
- ✅ **Directory Structure**: Validates required subdirectories exist
- ✅ **Documentation**: Checks for main sprint doc and README
- ✅ **Management Doc Updates**: Automatically logs sprint operations

#### **Management Document Protection**
- **Target**: `/docs/development/sprint-management.md`
- **Auto-Updates**: Hook automatically appends operation logs
- **Timestamp Tracking**: All sprint operations are timestamped
- **Cross-Validation**: Ensures consistency between working directories and management doc

---

## 🔍 **Hook Operation Details**

### **Detection Patterns**
The hooks detect sprint-related operations by monitoring:
- **Directory Creation**: `mkdir` commands with `sprint-[0-9][0-9][0-9]` pattern
- **File Writes**: Write operations to files matching `sprint-[0-9][0-9][0-9]*.md`
- **Sprint Management**: Any modifications to sprint-management.md

### **Validation Logic**
1. **Pre-Tool**: Logs operation intent and validates format
2. **Post-Tool**: Confirms structure compliance and updates tracking
3. **State Management**: Uses temporary files to track operations across hook calls
4. **Error Handling**: Provides colored output for different message types

### **Output Format**
- **🔵 Info**: Normal operation logging
- **🟡 Warning**: Non-critical validation issues  
- **🔴 Error**: Blocking validation failures
- **🟢 Success**: Successful operation completion

---

## 🚀 **Usage Examples**

### **Creating New Sprint** (Protected by Hooks)
When Claude creates a new sprint directory:
```bash
mkdir -p /working/sprint-011/{sprint-planning,temp,reports}
```
**Hook Actions**:
1. Validates sprint number format (011)
2. Logs directory creation operation
3. Validates required subdirectory structure
4. Updates sprint-management.md with timestamp

### **Writing Sprint Documentation** (Protected by Hooks)  
When Claude writes sprint documentation:
```bash
# Writing to /working/sprint-011/sprint011-feature-name.md
```
**Hook Actions**:
1. Detects sprint doc write operation
2. Validates sprint directory structure
3. Ensures proper file naming convention
4. Updates management tracking

### **Manual Testing**
You can test the hooks manually:
```bash
# Test sprint protection directly
./.claude/hooks/sprint-protection.sh Bash "mkdir -p /working/sprint-999"

# Test post-validation
./.claude/hooks/sprint-post-validation.sh
```

---

## 📚 **Integration with Project**

### **Sprint Management System**
- **Main Documentation**: `/docs/development/sprint-management.md`
- **Active Sprints**: `/working/sprint-XXX/` directories  
- **Completed Sprints**: `/archive/sprints-completed/` when finished
- **Legacy Sprints**: `/archive/sprints-legacy/` (pre-hook system)

### **Cross-References**
- **Project Overview**: `/CLAUDE.md` - Main project documentation
- **Strategic Context**: `/docs/research/` - Strategic research documentation
- **Future Roadmap**: `/docs/roadmap/` - Development opportunities

---

## 🔐 **Security & Reliability**

### **Hook Safety**
- **Non-Blocking**: Hooks never prevent operations, only validate and log
- **Error Tolerance**: Continues operation even if validation fails
- **State Isolation**: Uses temporary files to avoid conflicts
- **Minimal Dependencies**: Only uses standard bash utilities

### **Maintenance**
- **Self-Documenting**: Hooks provide detailed logging
- **Version Control**: All hook scripts are tracked in git
- **Configurable**: Settings can be modified in `.claude/settings.json`
- **Extensible**: Easy to add new validation rules or actions

---

**Last Updated**: September 5, 2025  
**Hook Version**: 1.0.0  
**Status**: ✅ Active and Monitoring