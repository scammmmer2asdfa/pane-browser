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
install -m 0644 "$WORK/pane-shell.xpi" "$EXTENSIONS/pane-shell@pane.browser.xpi"

UBLOCK_VERSION="${UBLOCK_VERSION:-latest}"
UBLOCK_URL="${UBLOCK_URL:-https://addons.mozilla.org/firefox/downloads/latest/ublock-origin/latest.xpi}"
echo "Downloading uBlock Origin ($UBLOCK_VERSION) from addons.mozilla.org"
curl --fail --location --retry 3 --output "$WORK/ublock-origin.xpi" "$UBLOCK_URL"
unzip -tq "$WORK/ublock-origin.xpi" >/dev/null
install -m 0644 "$WORK/ublock-origin.xpi" "$EXTENSIONS/uBlock0@raymondhill.net.xpi"

install -m 0644 "$ROOT/overlay/pane/distribution/policies.json" "$DEST/distribution/policies.json"
echo "Installed Pane Shell and uBlock Origin into $EXTENSIONS"
