#!/bin/bash
# EcoTribe Local Development - Start All Services
# Redis (Docker) | Backend: port 8000 | Frontend: port 3000

echo "========================================="
echo "  EcoTribe Local Dev"
echo "========================================="

# --- KILL EXISTING ---
echo ""
echo "[1/4] Cleaning up existing processes..."

# Kill backend on port 8000
if command -v powershell &>/dev/null; then
    # Windows (Git Bash / WSL)
    powershell -Command "Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force -ErrorAction SilentlyContinue }" 2>/dev/null
    powershell -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force -ErrorAction SilentlyContinue }" 2>/dev/null
else
    # Linux/Mac
    lsof -ti :8000 2>/dev/null | xargs kill -9 2>/dev/null || true
    lsof -ti :3000 2>/dev/null | xargs kill -9 2>/dev/null || true
fi
echo "  Done"

# --- REDIS ---
echo ""
echo "[2/4] Starting Redis..."
if docker ps --format '{{.Names}}' | grep -q redis-ecotribe; then
    echo "  Redis already running"
elif docker ps -a --format '{{.Names}}' | grep -q redis-ecotribe; then
    docker start redis-ecotribe >/dev/null
    echo "  Redis started (existing container)"
else
    docker run -d --name redis-ecotribe -p 6379:6379 redis:7-alpine >/dev/null
    echo "  Redis started (new container)"
fi

# Verify Redis
if docker exec redis-ecotribe redis-cli ping 2>/dev/null | grep -q PONG; then
    echo "  Redis: OK (localhost:6379)"
else
    echo "  Redis: FAILED - check Docker"
fi

# --- BACKEND ---
echo ""
echo "[3/4] Starting backend on port 8000..."
cd backend
source venv/Scripts/activate 2>/dev/null || source venv/bin/activate 2>/dev/null
nohup uvicorn app.main:app --reload --port 8000 > ../backend-local.log 2>&1 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"
deactivate 2>/dev/null
cd ..

# --- FRONTEND ---
echo ""
echo "[4/4] Starting frontend on port 3000..."
cd frontend
nohup npm run dev > ../frontend-local.log 2>&1 &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"
cd ..

# Wait for startup
sleep 3

echo ""
echo "========================================="
echo "  All Services Running!"
echo "========================================="
echo "  Redis:     localhost:6379"
echo "  Backend:   http://localhost:8000"
echo "  Frontend:  http://localhost:3000"
echo "  API Docs:  http://localhost:8000/docs"
echo ""
echo "  Logs:"
echo "    tail -f backend-local.log"
echo "    tail -f frontend-local.log"
echo ""
echo "  Stop all: ./stop-local.sh"
echo "========================================="
