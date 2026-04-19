#!/bin/bash
# /dev skill - Start the development server

set -e

echo "🚀 Dev Server - Starting Expo Web Development"
echo ""

# Kill existing Expo processes
echo "🔍 Checking for existing Expo processes..."
if pgrep -f "expo start" > /dev/null; then
    echo "⚠️  Found running Expo process, killing it..."
    pkill -f "expo start" || true
    sleep 2
fi

# Check for port conflicts
echo "🔍 Checking port 8081..."
if lsof -i :8081 > /dev/null 2>&1; then
    echo "⚠️  Port 8081 is in use, freeing it..."
    lsof -i :8081 | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null || true
    sleep 1
fi

echo ""
echo "📦 Starting Expo web server on port 8081..."
echo ""

# Start Expo
npm start -- --web --port 8081 &
EXPO_PID=$!

# Wait for server to start
sleep 5

# Check if server is running
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
else
    echo "❌ Server failed to start on port 8081"
    kill $EXPO_PID 2>/dev/null || true
    exit 1
fi
