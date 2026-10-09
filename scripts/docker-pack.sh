#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd "$(dirname "$0")/.." && pwd)"
python3 "$project_root/scripts/docker-local-config.py"
export DOCKER_CONFIG="$project_root/.local/docker"
cd "$project_root"
docker compose -f compose.yaml -f compose.prebuilt.yaml up --build -d
