#!/bin/bash

echo "🚀 LocalRoots Dev Starter"

# Kill processes on required ports
for port in 3000 3001 3004 3005 3006; do
  pid=$(lsof -ti:$port 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "Freeing port $port"
    kill $pid 2>/dev/null || echo "Could not kill process on port $port"
    sleep 1
  fi
done

# Clear caches
echo "Clearing caches..."
rm -rf apps/web/.next
rm -rf .turbo

# Remove conflicting route file if it exists
if [ -f "apps/web/src/app/sign-in/page.tsx" ]; then
  echo "Removing conflicting route file"
  rm "apps/web/src/app/sign-in/page.tsx"
fi

# Start servers in separate terminals
echo "Starting servers..."

# Start API server
osascript -e 'tell application "Terminal" to do script "cd \"'$PWD'/apps/api\" && pnpm dev"'

# Start Web server 
osascript -e 'tell application "Terminal" to do script "cd \"'$PWD'/apps/web\" && pnpm dev"'

echo "✅ Started servers in separate terminals"
echo "API: http://localhost:3004"
echo "Web: http://localhost:3000 (or 3001 if 3000 is in use)" 