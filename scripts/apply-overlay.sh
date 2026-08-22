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
install -d "$GECKO/browser/base/content/pane"
install -m 0644 "$OVERLAY/browser/base/content/pane/pane-chrome.js" "$GECKO/browser/base/content/pane/pane-chrome.js"
install -m 0644 "$OVERLAY/browser/base/content/pane/pane-chrome.css" "$GECKO/browser/base/content/pane/pane-chrome.css"

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

if ! grep -q 'content/browser/pane/pane-chrome.js' "$GECKO/browser/base/jar.mn"; then
  python3 - "$GECKO/browser/base/jar.mn" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
text = path.read_text()
needle = "        content/browser/browser-main.js                     (content/browser-main.js)\n"
addition = (
    "        content/browser/pane/pane-chrome.js               (content/pane/pane-chrome.js)\n"
    "        content/browser/pane/pane-chrome.css              (content/pane/pane-chrome.css)\n"
)
if needle not in text:
    raise SystemExit("Could not locate browser-main.js in browser/base/jar.mn")
path.write_text(text.replace(needle, needle + addition, 1))
PY
fi

if ! grep -q 'pane/pane-chrome.js' "$GECKO/browser/base/content/browser-main.js"; then
  python3 - "$GECKO/browser/base/content/browser-main.js" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
text = path.read_text()
needle = '  Services.scriptloader.loadSubScript("chrome://browser/content/browser-init.js", this);\n'
addition = '  Services.scriptloader.loadSubScript("chrome://browser/content/pane/pane-chrome.js", this);\n'
if needle not in text:
    raise SystemExit("Could not locate browser-init.js loader in browser-main.js")
path.write_text(text.replace(needle, needle + addition, 1))
PY
fi

if ! grep -q 'pane/pane-chrome.css' "$GECKO/browser/base/content/browser.xhtml"; then
  python3 - "$GECKO/browser/base/content/browser.xhtml" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
text = path.read_text()
needle = '  <link rel="stylesheet" href="chrome://browser/skin/" />\n'
addition = '  <link rel="stylesheet" href="chrome://browser/content/pane/pane-chrome.css" />\n'
if needle not in text:
    raise SystemExit("Could not locate browser skin stylesheet in browser.xhtml")
path.write_text(text.replace(needle, needle + addition, 1))
PY
fi

echo "Pane overlay applied to $GECKO"
