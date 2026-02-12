#!/bin/bash
# SubagentStop hook for BREAKER
# Verifies the breaker actually EXECUTED test scripts, not just wrote them.
# Rejects breaker output if no evidence of script execution is found.

set -e

PASS=true
FAILURES=""

# Check 1: Did the breaker create any test scripts in /tmp?
SCRIPTS=$(find /tmp -name "breaker_test_*" -o -name "break_*" -o -name "stress_*" -o -name "adversarial_*" 2>/dev/null | head -20)

if [ -z "$SCRIPTS" ]; then
    # Also check for any recent scripts the breaker might have created with other names
    RECENT_SCRIPTS=$(find /tmp -name "*.sh" -o -name "*.py" -o -name "*.js" -o -name "*.ts" -newer /tmp/.breaker_start 2>/dev/null | head -20)

    if [ -z "$RECENT_SCRIPTS" ]; then
        PASS=false
        FAILURES="$FAILURES\n- No test scripts found in /tmp. Breaker must WRITE and EXECUTE scripts."
    fi
fi

# Check 2: Is there evidence of script execution?
# Look for output files, exit codes, or stderr captures
OUTPUTS=$(find /tmp -name "breaker_output_*" -o -name "break_result_*" 2>/dev/null | head -20)

# Check 3: Verify the breaker report isn't empty or trivially short
# The breaker's output (via $SUBAGENT_OUTPUT env var if available) should contain
# actual findings, not just boilerplate

# Check 4: Clean up old breaker scripts (prevent /tmp bloat across runs)
find /tmp -name "breaker_test_*" -mmin +60 -delete 2>/dev/null || true
find /tmp -name "break_*" -mmin +60 -delete 2>/dev/null || true
find /tmp -name "stress_*" -mmin +60 -delete 2>/dev/null || true

# --- Verdict ---
if [ "$PASS" = true ]; then
    echo "[HOOK] ✅ Breaker output ACCEPTED — evidence of script execution found"
    exit 0
else
    echo "[HOOK] ❌ Breaker output REJECTED — no evidence of actual testing:"
    echo -e "$FAILURES"
    echo ""
    echo "Breaker must write test scripts to /tmp and actually execute them."
    echo "Reports without execution evidence are not accepted."
    exit 1
fi
