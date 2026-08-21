#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GECKO="${GECKO_DIR:-$ROOT/gecko}"
GECKO_REPO="${GECKO_REPO:-https://github.com/mozilla-firefox/firefox.git}"
GECKO_REF="${GECKO_REF:-main}"

[[ "$(uname -s)" == "Darwin" ]] || { echo "Run this bootstrap on macOS." >&2; exit 1; }
command -v git >/dev/null || { echo "Install Xcode Command Line Tools: xcode-select --install" >&2; exit 1; }
command -v python3 >/dev/null || { echo "Install Python 3: brew install python@3.11" >&2; exit 1; }

if [[ ! -d "$GECKO/.git" ]]; then
  git clone --filter=blob:none --single-branch --branch "$GECKO_REF" "$GECKO_REPO" "$GECKO"
else
  git -C "$GECKO" fetch --depth=1 origin "$GECKO_REF"
  git -C "$GECKO" checkout --detach FETCH_HEAD
fi

"$ROOT/scripts/apply-overlay.sh"
cd "$GECKO"
./mach --no-interactive bootstrap --application-choice browser

echo "Bootstrap complete. Run ./scripts/build-macos.sh"
