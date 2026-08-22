# Pane Browser

Pane Browser is a macOS-focused Gecko browser fork. It keeps Firefox's web platform intact, including SpiderMonkey JavaScript, WebAssembly, WebGL, WebRTC, Canvas, DevTools, WebExtensions, Reader View, Picture-in-Picture, screenshots, tab groups, split view, profiles, password generation, and macOS Keychain integration.

This repository is a lightweight product overlay. The official Firefox/Gecko source is fetched from `mozilla-firefox/firefox` during bootstrap and is intentionally not committed here.

## Build on macOS

Requirements: macOS 13 or newer, Xcode Command Line Tools, Python 3, at least 60GB free disk, and preferably 16GB RAM.

```bash
xcode-select --install
brew install python@3.11 watchman

git clone https://github.com/scammmmer2asdfa/pane-browser.git
cd pane-browser
./scripts/bootstrap-macos.sh
./scripts/build-macos.sh
./scripts/run-macos.sh
```

Create an installable disk image after building:

```bash
./scripts/package-macos.sh
```

The result is written to `artifacts/Pane-Browser-macOS-<architecture>.dmg` with a SHA-256 checksum.

## Included product features

- Pane branding and native macOS app bundle
- Full Gecko web compatibility, JavaScript, WebAssembly, WebGL, WebRTC, and Canvas
- Dashboard, minimal, and speed-dial new-tab modes
- Live native browser-chrome controls for main/background/surface/text colours, corner radius, glass blur, and tab layout
- Independently adjustable new-tab accent, background, panel, text, font, corner radius, glass blur, animation, and light/dark/system appearance
- Per-profile settings plus `.panetheme` import and export
- Per-window named workspace rail with persistent tab sets, contextual-identity isolation, renaming, and two-finger horizontal swipe switching
- Renamable browser windows persisted through session restore
- Native profiles, bookmarks, history, cookies, passwords, password generation, and macOS Keychain support
- Built-in uBlock Origin distribution package with EasyList, EasyPrivacy, and uBlock filters
- Firefox WebExtensions and Mozilla Add-ons support, including unpacked developer extensions
- Native tab groups, pinned tabs, split view, vertical side tabs, tab detaching, Reader View, PiP, and screenshots
- Pane DevTools panel with page performance metrics and settings shortcuts
- Telemetry, studies, sponsored content, crash reporting, and unsolicited service calls disabled by default
- Optional Firefox Sync, Safe Browsing, and translation controls
- Native import wizard for Chrome, Chromium, Brave, Edge, Opera, Opera GX, Vivaldi, Safari, and Firefox
- CSV password and HTML bookmark import through Firefox's native file migrators

Import copies supported data such as bookmarks, history, passwords, cookies, payment methods, and compatible extensions. It does not clone or reuse a Chromium profile directory.

## Engine-specific differences

Chrome Web Store packages and Google Sync are Chromium services and cannot run natively on Gecko. Pane uses Firefox WebExtensions/Mozilla Add-ons and optional Firefox Sync instead. Chrome-family data migration remains supported through Gecko's native migrators.

Top, left, and right tab layouts use Gecko's native toolbar/sidebar controls. Floating mode hides the workspace rail at the window edge until hover or keyboard focus. Tabs can be detached by dragging them into a new window.

Use the sun button at the bottom of the workspace rail to customize native browser chrome. Double-click a workspace to rename it, right-click to delete it, horizontally swipe the rail with two fingers to change workspaces, and double-click the window name to rename that browser window. The gear on the new-tab page opens its separate page appearance controls.

Bundled extensions are installed when a profile first starts after installing or upgrading Pane. When testing a rebuilt app against a profile that previously removed a bundled extension, use a fresh profile from `about:profiles` because Gecko preserves explicit uninstall choices.

## macOS CI

Overlay validation runs on GitHub-hosted Linux workers. Full Gecko builds use `.github/workflows/build-macos.yml` on a self-hosted Mac labeled `pane-builder`; normal hosted macOS workers do not provide enough disk for a reliable Firefox build.

Register a Mac runner under the repository's **Settings > Actions > Runners**, add the `pane-builder` label, then trigger **Build macOS** from the Actions page. Tagged releases (`v*`) also trigger a build.

## Licensing

Pane overlay code is available under MPL-2.0. Gecko and Firefox-derived files retain their upstream Mozilla Public License notices and third-party licenses. Pane does not claim Mozilla trademarks and uses separate branding.
