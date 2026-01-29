#!/bin/bash
# Stop EcoTribe services

echo "Stopping EcoTribe services..."

if [ -f .backend.pid ]; then
    BACKEND_PID=$(cat .backend.pid)
    kill $BACKEND_PID 2>/dev/null && echo "  Backend stopped (PID: $BACKEND_PID)" || echo "  Backend not running"
    rm .backend.pid
fi

if [ -f .frontend.pid ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    kill $FRONTEND_PID 2>/dev/null && echo "  Frontend stopped (PID: $FRONTEND_PID)" || echo "  Frontend not running"
    rm .frontend.pid
fi

echo "Done."
