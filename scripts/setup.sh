#!/usr/bin/env bash
set -euo pipefail

# ========================
# SCAPE — Local Development Setup
# ========================
# This script sets up your local development environment.
# Run from the repo root: ./scripts/setup.sh

echo "🚀 Setting up SCAPE development environment..."

# ---- Check prerequisites ----
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required. Install from https://docker.com"; exit 1; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Node.js 20+ required. Current: $(node -v)"
  exit 1
fi

echo "✅ Prerequisites check passed"

# ---- Copy environment files ----
if [ ! -f .env ]; then
  cp .env.example .env
  echo "📄 Created .env from .env.example"
fi

if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  echo "📄 Created server/.env from server/.env.example"
fi

if [ ! -f client/.env ]; then
  cp client/.env.example client/.env
  echo "📄 Created client/.env from client/.env.example"
fi

# ---- Install dependencies ----
echo "📦 Installing server dependencies..."
(cd server && npm install)

echo "📦 Installing client dependencies..."
(cd client && npm install)

# ---- Start infrastructure ----
echo "🐳 Starting PostgreSQL and Redis..."
docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml up -d

echo ""
echo "✅ Setup complete!"
echo ""
echo "   Start the backend:   cd server && npm run dev"
echo "   Start the frontend:  cd client && npm run dev"
echo ""
echo "   Backend:  http://localhost:3000"
echo "   Frontend: http://localhost:5173"
echo "   Health:   http://localhost:3000/health"
