#!/bin/bash
# SubagentStop hook for BUILDER
# Runs automatically when builder agent completes.
# Rejects builder output if tests, type checks, or linting fail.
# This is MECHANICAL enforcement — no LLM judgment involved.

set -e

PASS=true
FAILURES=""

# --- Detect project type and tools ---

# Node.js / TypeScript
if [ -f "package.json" ]; then
    # Run tests
    if grep -q '"test"' package.json 2>/dev/null; then
        echo "[HOOK] Running npm test..."
        if ! npm test --silent 2>&1 | tail -20; then
            PASS=false
            FAILURES="$FAILURES\n- npm test FAILED"
        fi
    fi

    # Type check
    if [ -f "tsconfig.json" ]; then
        echo "[HOOK] Running tsc --noEmit..."
        if ! npx tsc --noEmit 2>&1 | tail -10; then
            PASS=false
            FAILURES="$FAILURES\n- TypeScript type check FAILED"
        fi
    fi

    # Lint
    if [ -f ".eslintrc" ] || [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ] || [ -f "eslint.config.js" ] || [ -f "eslint.config.mjs" ]; then
        echo "[HOOK] Running eslint..."
        if ! npx eslint . --quiet 2>&1 | tail -10; then
            PASS=false
            FAILURES="$FAILURES\n- ESLint FAILED"
        fi
    fi
fi

# Python
if [ -f "pyproject.toml" ] || [ -f "setup.cfg" ] || [ -f "setup.py" ]; then
    # Run tests
    if [ -f "pytest.ini" ] || [ -f "pyproject.toml" ] || [ -d "tests" ] || [ -d "test" ]; then
        echo "[HOOK] Running pytest..."
        if ! python -m pytest --quiet --tb=short 2>&1 | tail -20; then
            PASS=false
            FAILURES="$FAILURES\n- pytest FAILED"
        fi
    fi

    # Type check
    if [ -f "mypy.ini" ] || grep -q "mypy" pyproject.toml 2>/dev/null; then
        echo "[HOOK] Running mypy..."
        if ! python -m mypy . --ignore-missing-imports 2>&1 | tail -10; then
            PASS=false
            FAILURES="$FAILURES\n- mypy type check FAILED"
        fi
    fi
fi

# Rust
if [ -f "Cargo.toml" ]; then
    echo "[HOOK] Running cargo test..."
    if ! cargo test --quiet 2>&1 | tail -20; then
        PASS=false
        FAILURES="$FAILURES\n- cargo test FAILED"
    fi

    echo "[HOOK] Running cargo clippy..."
    if ! cargo clippy --quiet -- -D warnings 2>&1 | tail -10; then
        PASS=false
        FAILURES="$FAILURES\n- cargo clippy FAILED"
    fi
fi

# Go
if [ -f "go.mod" ]; then
    echo "[HOOK] Running go test..."
    if ! go test ./... 2>&1 | tail -20; then
        PASS=false
        FAILURES="$FAILURES\n- go test FAILED"
    fi

    echo "[HOOK] Running go vet..."
    if ! go vet ./... 2>&1 | tail -10; then
        PASS=false
        FAILURES="$FAILURES\n- go vet FAILED"
    fi
fi

# --- Verdict ---
if [ "$PASS" = true ]; then
    echo "[HOOK] ✅ Builder output ACCEPTED — all checks passed"
    exit 0
else
    echo "[HOOK] ❌ Builder output REJECTED — failures detected:"
    echo -e "$FAILURES"
    echo ""
    echo "Builder must fix these issues before output is accepted."
    exit 1
fi
