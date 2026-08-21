#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GECKO="${GECKO_DIR:-$ROOT/gecko}"
CONFIG="${CONFIG:-release}"
MOZCONFIG_FILE="$ROOT/mozconfig/macos-$CONFIG.mozconfig"

[[ "$(uname -s)" == "Darwin" ]] || { echo "Pane's macOS build must run on macOS." >&2; exit 1; }
[[ -x "$GECKO/mach" ]] || { echo "Run ./scripts/bootstrap-macos.sh first." >&2; exit 1; }
[[ -f "$MOZCONFIG_FILE" ]] || { echo "Unknown CONFIG=$CONFIG" >&2; exit 1; }

"$ROOT/scripts/apply-overlay.sh"
export MOZCONFIG="$MOZCONFIG_FILE"
cd "$GECKO"
./mach build
./mach package

OBJDIR="$(./mach environment --format json | python3 -c 'import json,sys; print(json.load(sys.stdin)["topobjdir"])')"
APP="$OBJDIR/dist/Pane.app"
if [[ ! -d "$APP" ]]; then
  APP="$(find "$OBJDIR/dist" -maxdepth 2 -name '*.app' -type d | head -1)"
fi
[[ -n "$APP" && -d "$APP" ]] || { echo "Built app bundle not found under $OBJDIR/dist" >&2; exit 1; }

"$ROOT/scripts/install-extensions.sh" "$APP/Contents/Resources"

if [[ -n "${MACOS_SIGN_IDENTITY:-}" ]]; then
  codesign --force --deep --options runtime --timestamp --sign "$MACOS_SIGN_IDENTITY" "$APP"
else
  codesign --force --deep --sign - "$APP"
fi

echo "Built $APP"
