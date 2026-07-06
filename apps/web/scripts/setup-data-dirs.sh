#!/usr/bin/env bash
# One-time (idempotent) setup: move all runtime data to /var/lib/bevel/
# outside the deploy directory. Safe to run multiple times — only merges, never deletes.
set -euo pipefail

BEVEL_LIB="${BEVEL_LIB:-/var/lib/bevel}"
DATA_DIR="$BEVEL_LIB/data"
PROJECTS_DIR="$BEVEL_LIB/projects"
APP_ROOT="${1:-/var/www/bevel}"

echo "→ Bevel data setup"
echo "  Persistent data: $BEVEL_LIB"
echo "  App root:        $APP_ROOT"

mkdir -p "$DATA_DIR" "$PROJECTS_DIR"
chmod 755 "$BEVEL_LIB" "$DATA_DIR" "$PROJECTS_DIR"

merge_dir() {
  local src="$1"
  local dst="$2"
  local label="$3"

  if [ ! -d "$src" ]; then
    return 0
  fi

  if [ ! "$(ls -A "$src" 2>/dev/null)" ]; then
    echo "  skip $label (empty): $src"
    return 0
  fi

  echo "  merge $label: $src → $dst"
  rsync -a "$src/" "$dst/"
}

# Legacy flat layout (pre-monorepo)
merge_dir "$APP_ROOT/data" "$DATA_DIR" "json-data-legacy"
merge_dir "$APP_ROOT/public/projects" "$PROJECTS_DIR" "projects-legacy"

# Monorepo layout (inside deploy tree — migrate out)
merge_dir "$APP_ROOT/apps/web/data" "$DATA_DIR" "json-data-web"
merge_dir "$APP_ROOT/apps/web/public/projects" "$PROJECTS_DIR" "projects-web"

echo "✓ Data directories ready at $BEVEL_LIB"
echo "  JSON:   $DATA_DIR"
echo "  Media:  $PROJECTS_DIR"
