#!/bin/bash

# Don't exit on error
set +e

echo "🧹 Cleaning up previous build artifacts..."

# Remove Next.js build artifacts
echo "🗑️  Removing Next.js build cache..."
rm -rf apps/web/.next || true
rm -rf apps/api/dist || true

# Remove Turbo cache
echo "🗑️  Removing Turbo cache..."
rm -rf .turbo || true

echo "🔍 Checking for existing processes..."
# Don't try to kill everything, just check what's running
lsof -i :3000 || true
lsof -i :3004 || true

echo "🚦 Starting servers individually..."
echo "Starting API server in background..."
cd apps/api && pnpm dev &
API_PID=$!
echo "API server started with PID: $API_PID"

echo "Starting Web server in a new terminal..."
osascript -e 'tell application "Terminal" to do script "cd \"'"$PWD"'/apps/web\" && pnpm dev"' || echo "Failed to open terminal, please start web server manually"

echo "✅ API server is starting. Web server should open in a new terminal."
echo "You can manually start the web server with: cd apps/web && pnpm dev" 