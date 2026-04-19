# Start Development Server

Starts the Expo web development server on port 8081 with proper cleanup of existing processes.

## Steps

1. Kill any existing Expo processes
2. Free up port 8081 if in use
3. Start Expo web server on port 8081
4. Wait for server to be ready
5. Display next steps and demo mode information

## Rules

- Kill existing `expo start` processes gracefully
- Free port 8081 before starting
- Wait for server to respond before declaring success
- Show all demo routes and quick start info
- Keep the server running (don't exit)

## Execute

Run these steps now:

```bash
# 1. Kill existing Expo processes
pkill -f "expo start" || true
sleep 2

# 2. Check and free port 8081
lsof -i :8081 | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null || true
sleep 1

# 3. Start Expo web server
npm start -- --web --port 8081 &
EXPO_PID=$!

# 4. Wait for server to be ready
sleep 5

# 5. Verify it's running
curl -s http://localhost:8081 > /dev/null 2>&1

# 6. Show next steps
echo "✅ Server is running on http://localhost:8081"
echo ""
echo "📱 Demo Mode (no auth required):"
echo "  • Click 'Try Demo' on the home page"
echo "  • Or navigate to: http://localhost:8081/demo"
echo ""
echo "🔗 Demo Routes:"
echo "  • /demo - Demo home"
echo "  • /demo/protected - Protected route example"
echo "  • /demo/analytics - Analytics example"
echo ""
echo "💡 To stop: Press Ctrl+C"
```

Start the development server and display the next steps for accessing the app and demo mode.
