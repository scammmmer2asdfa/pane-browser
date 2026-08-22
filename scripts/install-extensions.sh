#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:?usage: install-extensions.sh PATH_TO_APP_RESOURCES}"
EXTENSIONS="$DEST/distribution/extensions"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$EXTENSIONS"

(
  cd "$ROOT/overlay/pane/extensions/pane-shell"
  zip -q -r "$WORK/pane-shell.xpi" .
)
unzip -p "$WORK/pane-shell.xpi" manifest.json | python3 -c 'import json,sys; data=json.load(sys.stdin); assert data["browser_specific_settings"]["gecko"]["id"] == "pane-shell@pane.browser"'
install -m 0644 "$WORK/pane-shell.xpi" "$EXTENSIONS/pane-shell@pane.browser.xpi"

UBLOCK_VERSION="${UBLOCK_VERSION:-1.73.0}"
UBLOCK_URL="${UBLOCK_URL:-https://addons.mozilla.org/firefox/downloads/file/4940584/ublock_origin-1.73.0.xpi}"
UBLOCK_SHA256="${UBLOCK_SHA256:-bccc51a773150af4af6e1fd62c7bfdeb7238b79ff2381b998fa9f2e38f64786a}"
echo "Downloading uBlock Origin ($UBLOCK_VERSION) from addons.mozilla.org"
curl --fail --location --retry 3 --output "$WORK/ublock-origin.xpi" "$UBLOCK_URL"
echo "$UBLOCK_SHA256  $WORK/ublock-origin.xpi" | shasum -a 256 --check
unzip -tq "$WORK/ublock-origin.xpi" >/dev/null
unzip -p "$WORK/ublock-origin.xpi" manifest.json | python3 -c 'import json,sys; data=json.load(sys.stdin); assert data["browser_specific_settings"]["gecko"]["id"] == "uBlock0@raymondhill.net"; assert data["version"] == sys.argv[1]; print("Verified uBlock Origin", data["version"])' "$UBLOCK_VERSION"
install -m 0644 "$WORK/ublock-origin.xpi" "$EXTENSIONS/uBlock0@raymondhill.net.xpi"

install -m 0644 "$ROOT/overlay/pane/distribution/policies.json" "$DEST/distribution/policies.json"
test -s "$EXTENSIONS/pane-shell@pane.browser.xpi"
test -s "$EXTENSIONS/uBlock0@raymondhill.net.xpi"
echo "Installed Pane Shell and uBlock Origin into $EXTENSIONS"
