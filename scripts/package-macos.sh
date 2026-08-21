#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GECKO="${GECKO_DIR:-$ROOT/gecko}"
CONFIG="${CONFIG:-release}"
export MOZCONFIG="$ROOT/mozconfig/macos-$CONFIG.mozconfig"

[[ "$(uname -s)" == "Darwin" ]] || { echo "DMG packaging requires macOS." >&2; exit 1; }
cd "$GECKO"
OBJDIR="$(./mach environment --format json | python3 -c 'import json,sys; print(json.load(sys.stdin)["topobjdir"])')"
APP="$(find "$OBJDIR/dist" -maxdepth 2 -name '*.app' -type d | head -1)"
[[ -n "$APP" ]] || { echo "No app found. Run ./scripts/build-macos.sh first." >&2; exit 1; }

ARTIFACTS="$ROOT/artifacts"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$ARTIFACTS"
cp -R "$APP" "$STAGE/Pane Browser.app"
ln -s /Applications "$STAGE/Applications"

DMG="$ARTIFACTS/Pane-Browser-macOS-$(uname -m).dmg"
rm -f "$DMG"
hdiutil create -volname "Pane Browser" -srcfolder "$STAGE" -ov -format UDZO "$DMG"
shasum -a 256 "$DMG" > "$DMG.sha256"
echo "Created $DMG"
