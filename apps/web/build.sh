#!/bin/bash
# Vercel build script for web app
set -e

echo "Starting custom build process..."

# Install dependencies with pnpm, but only for the web directory
cd /vercel/path0/apps/web
echo "Installing dependencies..."
pnpm install --ignore-workspace-root-check --no-frozen-lockfile

# Build the Next.js app
echo "Building Next.js app..."
pnpm run build

echo "Build completed successfully!"