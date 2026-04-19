#!/bin/bash
# /dev skill - Start the development server

set -e

echo "🚀 Dev Server - Starting Expo Web Development"
echo ""

# Gracefully terminate existing Expo processes
echo "🔍 Checking for existing Expo processes..."
if pgrep -f "expo start" > /dev/null; then
    echo "⚠️  Found running Expo process, sending SIGTERM..."
    pkill -TERM -f "expo start" || true
    sleep 1
    # Force kill only if still running
    if pgrep -f "expo start" > /dev/null; then
        echo "⚠️  Process didn't stop gracefully, force killing..."
        pkill -9 -f "expo start" || true
    fi
    sleep 1
fi

# Gracefully free port 8081
echo "🔍 Checking port 8081..."
if lsof -i :8081 > /dev/null 2>&1; then
    PID=$(lsof -i :8081 | grep LISTEN | awk '{print $2}' | head -1)
    if [ -n "$PID" ]; then
        echo "⚠️  Port 8081 in use (PID: $PID), sending SIGTERM..."
        kill -TERM "$PID" 2>/dev/null || true
        sleep 2
        # Force kill only if still running
        if kill -0 "$PID" 2>/dev/null; then
            echo "⚠️  Process didn't stop gracefully, force killing..."
            kill -9 "$PID" 2>/dev/null || true
        fi
    fi
    sleep 1
fi

echo ""
echo "📦 Starting Expo web server on port 8081..."
echo ""

# Start Expo
npm start -- --web --port 8081 &
EXPO_PID=$!

# Poll health endpoint with timeout
MAX_WAIT=30
WAITED=0
POLL_INTERVAL=1

echo "⏳ Waiting for server to start (max ${MAX_WAIT}s)..."
while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s http://localhost:8081 > /dev/null 2>&1; then
        echo ""
        echo "✅ Server is running!"
        echo ""
        echo "📱 Next Steps:"
        echo "  1. Open http://localhost:8081 in your browser"
        echo ""
        echo "🔐 Demo Mode (no auth required):"
        echo "  • Click 'Try Demo' on the home page"
        echo "  • Or navigate to: http://localhost:8081/demo"
        echo ""
        echo "🔗 Full Demo Routes:"
        echo "  • /demo - Demo home"
        echo "  • /demo/protected - Protected route example"
        echo "  • /demo/analytics - Analytics example"
        echo ""
        echo "💡 To stop the server: Press Ctrl+C"
        echo ""
        wait $EXPO_PID
        exit 0
    fi

    echo -n "."
    sleep $POLL_INTERVAL
    WAITED=$((WAITED + POLL_INTERVAL))
done

# Timeout reached
echo ""
echo "❌ Server failed to start within ${MAX_WAIT}s"
echo "🔍 Checking if process is still running..."
if kill -0 $EXPO_PID 2>/dev/null; then
    echo "Terminating Expo process..."
    kill -TERM $EXPO_PID 2>/dev/null || true
    sleep 1
    kill -9 $EXPO_PID 2>/dev/null || true
fi
exit 1
