#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GECKO="${GECKO_DIR:-$ROOT/gecko}"
OVERLAY="$ROOT/overlay"

[[ -f "$GECKO/mach" ]] || { echo "Gecko checkout not found at $GECKO" >&2; exit 1; }

# Start from Firefox's complete unbranded asset set, then apply Pane branding.
rm -rf "$GECKO/browser/branding/pane"
cp -R "$GECKO/browser/branding/unofficial" "$GECKO/browser/branding/pane"
cp -R "$OVERLAY/browser/branding/pane/." "$GECKO/browser/branding/pane/"

install -d "$GECKO/browser/app/profile"
install -m 0644 "$OVERLAY/pane/prefs/pane.js" "$GECKO/browser/app/profile/pane.js"

if ! grep -q 'app/profile/pane.js' "$GECKO/browser/moz.build"; then
  python3 - "$GECKO/browser/moz.build" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
text = path.read_text()
needle = '    "app/profile/firefox.js",\n'
if needle not in text:
    raise SystemExit("Could not locate firefox.js in browser/moz.build")
path.write_text(text.replace(needle, needle + '    "app/profile/pane.js",\n', 1))
PY
fi

echo "Pane overlay applied to $GECKO"
