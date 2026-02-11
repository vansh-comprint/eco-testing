#!/bin/bash
# EcoTribe Local Development - Stop All Services

echo "Stopping EcoTribe local services..."

# Kill backend (port 8000)
if command -v powershell &>/dev/null; then
    powershell -Command "Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force -ErrorAction SilentlyContinue }" 2>/dev/null
    echo "  Backend stopped (port 8000)"
    powershell -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force -ErrorAction SilentlyContinue }" 2>/dev/null
    echo "  Frontend stopped (port 3000)"
else
    BACKEND_PIDS=$(lsof -ti :8000 2>/dev/null)
    if [ -n "$BACKEND_PIDS" ]; then
        echo "$BACKEND_PIDS" | xargs kill -9 2>/dev/null
        echo "  Backend stopped (port 8000)"
    else
        echo "  Backend not running"
    fi
    FRONTEND_PIDS=$(lsof -ti :3000 2>/dev/null)
    if [ -n "$FRONTEND_PIDS" ]; then
        echo "$FRONTEND_PIDS" | xargs kill -9 2>/dev/null
        echo "  Frontend stopped (port 3000)"
    else
        echo "  Frontend not running"
    fi
fi

# Stop Redis (optional - keep running for faster restarts)
read -p "  Stop Redis too? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker stop redis-ecotribe 2>/dev/null
    echo "  Redis stopped"
fi

echo "Done."
