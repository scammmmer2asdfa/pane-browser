#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export MOZCONFIG="$ROOT/mozconfig/macos-${CONFIG:-release}.mozconfig"
exec "$ROOT/gecko/mach" run "$@"
