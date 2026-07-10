#!/usr/bin/env bash
# Canonical way to start the backend dev server.
#
# Always run this instead of typing the uvicorn command by hand — a hand-typed
# invocation without --reload was the direct cause of a real data-loss
# incident (a running server kept serving pre-per-month-delete code for
# hours, hard-deleting habit docs on every "delete" click, because nothing
# picked up the day's file changes). This script fixes both cwd sensitivity
# (module resolution needs repo root; GOOGLE_APPLICATION_CREDENTIALS in .env
# is resolved relative to backend/ regardless, see firebase.py) and always
# includes --reload.
set -euo pipefail
cd "$(dirname "$0")/.."
exec uv run --python 3.12 --with-requirements backend/requirements.txt \
  uvicorn backend.main:app --port 8000 --reload
