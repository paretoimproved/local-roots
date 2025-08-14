#!/bin/bash

echo "🚀 LocalRoots Restart Script 🚀"

# Stop any existing processes (simple approach)
echo "📌 Step 1: Stopping running processes..."
for port in 3000 3001 3004 3005 3006
do
  pid=$(lsof -ti:$port 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "  ↪ Stopping process on port $port (PID: $pid)"
    kill $pid 2>/dev/null || echo "  ⚠️ Could not kill process $pid"
    sleep 1
  else
    echo "  ✓ Port $port is free"
  fi
done

# Clear Next.js cache
echo "📌 Step 2: Clearing build caches..."
echo "  ↪ Removing Next.js cache directory"
rm -rf apps/web/.next
echo "  ↪ Removing Turbo cache"
rm -rf .turbo

# Check for routing conflicts
echo "📌 Step 3: Checking for routing conflicts..."
if [ -f "apps/web/src/app/sign-in/page.tsx" ]; then
  echo "  ⚠️ Found conflicting route file: apps/web/src/app/sign-in/page.tsx"
  echo "  ↪ Removing conflicting file"
  rm "apps/web/src/app/sign-in/page.tsx"
  echo "  ✓ Conflict resolved"
else
  echo "  ✓ No routing conflicts detected"
fi

# Install missing dependencies
echo "📌 Step 4: Checking for missing dependencies..."
cd apps/web
if ! grep -q "@radix-ui/react-avatar" "package.json"; then
  echo "  ⚠️ Missing Radix UI Avatar dependency"
  echo "  ↪ Installing @radix-ui/react-avatar"
  pnpm add @radix-ui/react-avatar
else
  echo "  ✓ @radix-ui/react-avatar is already installed"
fi

# Start servers in separate terminals
echo "📌 Step 5: Starting servers in separate terminals..."

# Start API server
echo "  ↪ Starting API server in a new terminal"
osascript -e 'tell application "Terminal" to do script "cd \"'"$PWD"'/../api\" && pnpm dev"'

# Start Web server
echo "  ↪ Starting Web server in a new terminal"
osascript -e 'tell application "Terminal" to do script "cd \"'"$PWD"'\" && pnpm dev"'

cd ..

echo "✅ LocalRoots restart complete!"
echo ""
echo "💡 Access the application at:"
echo "   - Web: http://localhost:3000 or http://localhost:3001"
echo "   - API: http://localhost:3004"
echo ""
echo "If you encounter issues, try running these commands manually in separate terminal windows:"
echo "Terminal 1: cd /Users/brandonqueener/Cursor\ Projects/Local-Roots/apps/api && pnpm dev"
echo "Terminal 2: cd /Users/brandonqueener/Cursor\ Projects/Local-Roots/apps/web && pnpm dev" 