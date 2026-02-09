#!/bin/bash
# Stop EcoTribe services - kills by port to handle stale PIDs

echo "Stopping EcoTribe services..."

# Kill backend (port 2228)
BACKEND_PIDS=$(lsof -ti :2228 2>/dev/null)
if [ -n "$BACKEND_PIDS" ]; then
    echo "$BACKEND_PIDS" | xargs kill -9 2>/dev/null
    echo "  Backend stopped (port 2228)"
else
    echo "  Backend not running"
fi

# Kill frontend (port 1228)
FRONTEND_PIDS=$(lsof -ti :1228 2>/dev/null)
if [ -n "$FRONTEND_PIDS" ]; then
    echo "$FRONTEND_PIDS" | xargs kill -9 2>/dev/null
    echo "  Frontend stopped (port 1228)"
else
    echo "  Frontend not running"
fi

# Clean up stale PID files
rm -f .backend.pid .frontend.pid

echo "Done."
