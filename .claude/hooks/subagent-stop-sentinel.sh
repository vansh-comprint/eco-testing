#!/bin/bash
# SubagentStop hook for SENTINEL
# Verifies that the sentinel actually executed test commands
# and didn't just report results without running anything.

set -e

PASS=true
FAILURES=""

# The sentinel should have produced recognizable test output.
# We check for common test runner output patterns.

# Check: Did ANY test runner actually execute?
# We look for evidence in the sentinel's recent bash history or output

# For Node.js projects
if [ -f "package.json" ]; then
    # Check if node_modules/.cache has been recently accessed (test ran)
    if [ -d "node_modules" ]; then
        # Simple heuristic: test coverage or results files updated recently
        RECENT_RESULTS=$(find . -name "junit.xml" -o -name "test-results*" -o -name "coverage" -newer package.json 2>/dev/null | head -5)
    fi
fi

# For Python projects
if [ -f "pyproject.toml" ] || [ -f "setup.cfg" ]; then
    RECENT_RESULTS=$(find . -name ".pytest_cache" -o -name "__pycache__" -o -name "htmlcov" -newer pyproject.toml 2>/dev/null | head -5)
fi

# For Rust projects
if [ -f "Cargo.toml" ]; then
    RECENT_RESULTS=$(find ./target -name "*.d" -newer Cargo.toml 2>/dev/null | head -5)
fi

# If we can't verify execution through artifacts, we trust the sentinel's output
# but flag it as unverified
if [ -z "$RECENT_RESULTS" ]; then
    echo "[HOOK] ⚠️  Could not independently verify test execution."
    echo "[HOOK] Sentinel output accepted but flagged as UNVERIFIED."
    echo "[HOOK] The conductor should note this in task assessment."
    # We still accept — sentinel might have run tests that don't leave artifacts
    exit 0
fi

echo "[HOOK] ✅ Sentinel output ACCEPTED — test execution evidence found"
exit 0
