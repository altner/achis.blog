#!/usr/bin/env bash
# Builds the site locally and pushes only the static output to the
# `gh-pages` branch on origin (GitHub). The `main` branch / source code
# is never touched or pushed by this script.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKTREE_DIR="$REPO_ROOT/.pages-worktree"

cd "$REPO_ROOT"

echo "==> Building site"
npm run build

echo "==> Preparing gh-pages worktree"
git fetch origin gh-pages 2>/dev/null || true

if [ -d "$WORKTREE_DIR" ]; then
  git -C "$WORKTREE_DIR" fetch origin gh-pages 2>/dev/null || true
  if git -C "$WORKTREE_DIR" show-ref --verify --quiet refs/remotes/origin/gh-pages; then
    git -C "$WORKTREE_DIR" checkout gh-pages
    git -C "$WORKTREE_DIR" reset --hard origin/gh-pages
  fi
else
  if git show-ref --verify --quiet refs/remotes/origin/gh-pages; then
    git worktree add -B gh-pages "$WORKTREE_DIR" origin/gh-pages
  else
    git worktree add --detach "$WORKTREE_DIR"
    git -C "$WORKTREE_DIR" checkout --orphan gh-pages
    git -C "$WORKTREE_DIR" rm -rf . >/dev/null 2>&1 || true
  fi
fi

echo "==> Syncing build output into gh-pages branch"
find "$WORKTREE_DIR" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -R dist/. "$WORKTREE_DIR"/

cd "$WORKTREE_DIR"
git add -A

if git diff --cached --quiet 2>/dev/null && [ -n "$(git log -1 2>/dev/null)" ]; then
  echo "==> No changes, nothing to deploy"
  exit 0
fi

git commit -m "Deploy build"
git push origin gh-pages
echo "==> Deployed"
