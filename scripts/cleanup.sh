#!/usr/bin/env bash
set -euo pipefail

# ========================
# SCAPE — Local Development Cleanup
# ========================

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

echo "🧹 Cleaning up SCAPE development environment..."

# Stop only SCAPE's Vite and tsx development processes.
declare -a dev_pids=()
while read -r pid command; do
  case "$command" in
    *"$REPO_ROOT/client/node_modules/.bin/vite"*|\
    *"$REPO_ROOT/client/node_modules/@esbuild/"*|\
    *"$REPO_ROOT/server/node_modules/.bin/tsx"*|\
    *"$REPO_ROOT/server/node_modules/tsx/"*)
      dev_pids+=("$pid")
      ;;
  esac
done < <(ps -axo pid=,command=)

if ((${#dev_pids[@]} > 0)); then
  echo "⏹️  Stopping development servers..."
  kill -TERM "${dev_pids[@]}" 2>/dev/null || true
  sleep 1

  for pid in "${dev_pids[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill -KILL "$pid" 2>/dev/null || true
    fi
  done
else
  echo "ℹ️  No SCAPE development servers are running."
fi

echo "🐳 Stopping containers and deleting PostgreSQL/Redis data..."
docker compose \
  -f "$REPO_ROOT/infra/docker-compose.yml" \
  -f "$REPO_ROOT/infra/docker-compose.dev.yml" \
  down --volumes --remove-orphans

echo ""
echo "✅ Cleanup complete."
echo "   Source code, .env files, and node_modules were preserved."
