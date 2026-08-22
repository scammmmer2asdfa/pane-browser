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
- Per-window named spaces with persistent tab sets, renaming, trackpad swipe switching, and no container requirement
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

Pane keeps tabs and workspaces in one native sidebar. Sidebar tabs shows Gecko's vertical tab strip, Collapsed sidebar uses its expand-on-hover mode, and Top tabs returns to the horizontal tab strip. The sidebar can be placed left or right and resized from Pane's native customizer. Tabs can be detached by dragging them into a new window.

Use the sun button in the workspace strip to customize native browser chrome and choose Top tabs, Sidebar tabs, or Collapsed sidebar. Double-click a workspace to rename it, right-click to delete it, and use Rename window in the customizer to name that browser window. The gear on the new-tab page opens its separate page appearance controls.

Switch spaces by swiping two fingers horizontally over the sidebar or toolbar, or with Cmd+Alt+Left/Right. Spaces are plain tab sets: they do not create containers, and each space keeps its own tabs across restarts.

## Credits

Pane's workspace swipe handling is adapted from [Zen Browser](https://github.com/zen-browser/desktop)'s `ZenSpacesSwipe`, its gradient theming is inspired by `ZenGradientGenerator`, and `overlay/patches/allow-backdrop-transparency.patch` is rebased from Zen's `allow_backdrop_to_work_on_transparency` patch. All are used under MPL-2.0. Pane is not affiliated with or endorsed by Zen Browser or Mozilla.

Patches in `overlay/patches/` are applied to the Gecko checkout during bootstrap and build. If one stops applying after a Gecko update, rebase it against the new revision rather than skipping it.

Bundled extensions are installed when a profile first starts after installing or upgrading Pane. When testing a rebuilt app against a profile that previously removed a bundled extension, use a fresh profile from `about:profiles` because Gecko preserves explicit uninstall choices.

## macOS CI

Overlay validation runs on GitHub-hosted Linux workers. Full Gecko builds use `.github/workflows/build-macos.yml` on a self-hosted Mac labeled `pane-builder`; normal hosted macOS workers do not provide enough disk for a reliable Firefox build.

Register a Mac runner under the repository's **Settings > Actions > Runners**, add the `pane-builder` label, then trigger **Build macOS** from the Actions page. Tagged releases (`v*`) also trigger a build.

## Licensing

Pane overlay code is available under MPL-2.0. Gecko and Firefox-derived files retain their upstream Mozilla Public License notices and third-party licenses. Pane does not claim Mozilla trademarks and uses separate branding.
