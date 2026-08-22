/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0.
 *
 * Workspace swipe handling is adapted from Zen Browser's ZenSpacesSwipe
 * (MPL-2.0): https://github.com/zen-browser/desktop/blob/dev/src/zen/spaces/ZenSpacesSwipe.mjs
 */

var PaneChrome = {
  PREF: {
    radius: "pane.appearance.radius",
    blur: "pane.appearance.blur",
    accent: "pane.appearance.accent",
    background: "pane.appearance.background",
    surface: "pane.appearance.surface",
    text: "pane.appearance.text",
    font: "pane.appearance.font",
    animation: "pane.appearance.animation",
    appearance: "pane.appearance.mode",
    layout: "pane.tabs.position",
    side: "pane.tabs.side",
    width: "pane.tabs.width",
  },
  WORKSPACES_KEY: "pane.workspaces",
  ACTIVE_KEY: "pane.activeWorkspace",
  WINDOW_NAME_KEY: "pane.windowName",
  HIDDEN_SOURCE: "pane-workspace",
  colors: ["blue", "turquoise", "green", "yellow", "orange", "red", "pink", "purple"],

  get SessionStore() {
    return ChromeUtils.importESModule(
      "moz-src:///browser/components/sessionstore/SessionStore.sys.mjs"
    ).SessionStore;
  },

  init() {
    if (window.toolbar?.visible === false || document.getElementById("pane-workspace-rail")) {
      return;
    }
    this.applyAppearance();
    this.applyLayout();
    this.loadState();
    this.createRail();
    this.bindEvents();
    this.switchWorkspace(this.activeId, false);
    this.applyWindowName();
  },

  pref(name, fallback) {
    const type = Services.prefs.getPrefType(name);
    if (type === Services.prefs.PREF_INT) return Services.prefs.getIntPref(name);
    if (type === Services.prefs.PREF_STRING) return Services.prefs.getStringPref(name);
    return fallback;
  },

  applyAppearance() {
    const root = document.documentElement;
    root.style.setProperty("--pane-radius", `${this.pref(this.PREF.radius, 10)}px`);
    root.style.setProperty("--pane-blur", `${this.pref(this.PREF.blur, 18)}px`);
    root.style.setProperty("--pane-blur-n", String(this.pref(this.PREF.blur, 18)));
    root.style.setProperty("--pane-accent", this.pref(this.PREF.accent, "#3B6FF5"));
    root.style.setProperty("--pane-bg", this.pref(this.PREF.background, "#15171c"));
    root.style.setProperty("--pane-surface", this.pref(this.PREF.surface, "#20232a"));
    root.style.setProperty("--pane-text", this.pref(this.PREF.text, "#f2f4f8"));
    root.style.setProperty("--pane-font", this.pref(this.PREF.font, "SF Pro Text"));
    root.style.setProperty("--pane-sidebar-width", `${this.pref(this.PREF.width, 248)}px`);
    const animation = this.pref(this.PREF.animation, "minimal");
    root.style.setProperty("--pane-duration", animation === "off" ? "0ms" : animation === "full" ? "280ms" : "120ms");
    const appearance = this.pref(this.PREF.appearance, "system");
    root.style.colorScheme = appearance === "system" ? "light dark" : appearance;
    root.setAttribute("pane-appearance", appearance);
    root.toggleAttribute("pane-glass", this.pref(this.PREF.blur, 18) > 0);
  },

  applyLayout() {
    let layout = this.pref(this.PREF.layout, "sidebar");
    let side = this.pref(this.PREF.side, "left");
    const legacyLayouts = {
      multiple: ["top", side],
      single: ["sidebar", side],
      left: ["sidebar", "left"],
      right: ["sidebar", "right"],
      floating: ["collapsed", side],
    };
    if (legacyLayouts[layout]) {
      [layout, side] = legacyLayouts[layout];
      Services.prefs.setStringPref(this.PREF.layout, layout);
      Services.prefs.setStringPref(this.PREF.side, side);
    }
    Services.prefs.setBoolPref("sidebar.verticalTabs", layout !== "top");
    Services.prefs.setBoolPref("sidebar.position_start", side !== "right");
    Services.prefs.setStringPref("sidebar.visibility", layout === "collapsed" ? "expand-on-hover" : "always-show");
    document.documentElement.setAttribute("pane-layout", layout);
    document.documentElement.setAttribute("pane-side", side);
    if (document.getElementById("pane-workspace-rail")) this.placeRail();
  },

  loadState() {
    let workspaces;
    try {
      workspaces = JSON.parse(this.SessionStore.getCustomWindowValue(window, this.WORKSPACES_KEY));
    } catch (_) {}
    if (!Array.isArray(workspaces) || !workspaces.length) {
      workspaces = [{ id: crypto.randomUUID(), name: "Personal", color: "blue" }];
    }
    this.workspaces = workspaces;
    this.activeId = this.SessionStore.getCustomWindowValue(window, this.ACTIVE_KEY) || workspaces[0].id;
    if (!workspaces.some(space => space.id === this.activeId)) this.activeId = workspaces[0].id;
    for (const tab of gBrowser.tabs) {
      if (!this.SessionStore.getCustomTabValue(tab, "paneWorkspace")) {
        this.SessionStore.setCustomTabValue(tab, "paneWorkspace", this.activeId);
      }
    }
    this.saveState();
  },

  saveState() {
    this.SessionStore.setCustomWindowValue(window, this.WORKSPACES_KEY, JSON.stringify(this.workspaces));
    this.SessionStore.setCustomWindowValue(window, this.ACTIVE_KEY, this.activeId);
  },

  createRail() {
    const rail = document.createElement("aside");
    rail.id = "pane-workspace-rail";
    rail.slot = "tabstrip";
    rail.setAttribute("aria-label", "Pane workspaces");
    rail.innerHTML = `
      <div id="pane-workspace-list" role="tablist"></div>
      <div class="pane-rail-actions">
        <button id="pane-new-workspace" title="New workspace">&#x25C7;</button>
        <button id="pane-customize" title="Customize Pane">&#x263C;</button>
      </div>`;
    this.placeRail();
    this.createCustomizer();
    this.renderWorkspaces();
  },

  placeRail() {
    const rail = document.getElementById("pane-workspace-rail");
    if (!rail) return;
    if (this.pref(this.PREF.layout, "sidebar") === "top") {
      rail.removeAttribute("slot");
      document.getElementById("navigator-toolbox").append(rail);
      return;
    }
    rail.slot = "tabstrip";
    document.querySelector("sidebar-main").insertBefore(
      rail,
      document.getElementById("vertical-tabs")
    );
  },

  createCustomizer() {
    const panel = document.createElement("section");
    panel.id = "pane-customizer";
    panel.hidden = true;
    panel.innerHTML = `
      <header><strong>Customize Pane</strong><button id="pane-customizer-close" aria-label="Close">&#x2715;</button></header>
      <label>Tab layout<select id="pane-layout"><option value="top">Top tabs</option><option value="sidebar">Sidebar tabs</option><option value="collapsed">Collapsed sidebar</option></select></label>
      <label>Sidebar side<select id="pane-side"><option value="left">Left</option><option value="right">Right</option></select></label>
      <label>Sidebar width <output id="pane-width-value"></output><input id="pane-width" type="range" min="190" max="420" step="2"></label>
      <label>Roundness <output id="pane-radius-value"></output><input id="pane-radius" type="range" min="0" max="24" step="1"></label>
      <label>Blur <output id="pane-blur-value"></output><input id="pane-blur" type="range" min="0" max="50" step="1"></label>
      <label>Main color<input id="pane-accent" type="color"></label>
      <label>Background<input id="pane-background" type="color"></label>
      <label>Surface<input id="pane-surface" type="color"></label>
      <label>Text<input id="pane-text" type="color"></label>
      <label>Appearance<select id="pane-appearance"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
      <label>UI font<input id="pane-font" type="text"></label>
      <label>Animation<select id="pane-animation"><option value="off">Off</option><option value="minimal">Minimal</option><option value="full">Full</option></select></label>
      <button id="pane-rename-window">Rename window</button>`;
    document.body.append(panel);
    const values = {
      radius: this.pref(this.PREF.radius, 10), blur: this.pref(this.PREF.blur, 18), width: this.pref(this.PREF.width, 248),
      accent: this.pref(this.PREF.accent, "#3B6FF5"), background: this.pref(this.PREF.background, "#15171c"),
      surface: this.pref(this.PREF.surface, "#20232a"), text: this.pref(this.PREF.text, "#f2f4f8"),
      font: this.pref(this.PREF.font, "SF Pro Text"), animation: this.pref(this.PREF.animation, "minimal"),
      appearance: this.pref(this.PREF.appearance, "system"),
      layout: this.pref(this.PREF.layout, "sidebar"), side: this.pref(this.PREF.side, "left"),
    };
    for (const [key, value] of Object.entries(values)) document.getElementById(`pane-${key}`).value = value;
    this.updateOutputs();
  },

  bindEvents() {
    document.getElementById("pane-new-workspace").addEventListener("click", () => this.createWorkspace());
    document.getElementById("pane-customize").addEventListener("click", () => {
      const panel = document.getElementById("pane-customizer");
      panel.hidden = !panel.hidden;
    });
    document.getElementById("pane-customizer-close").addEventListener("click", () => document.getElementById("pane-customizer").hidden = true);
    document.getElementById("pane-rename-window").addEventListener("click", () => this.renameWindow());
    document.getElementById("pane-layout").addEventListener("change", event => {
      Services.prefs.setStringPref(this.PREF.layout, event.target.value);
      this.applyLayout();
    });
    document.getElementById("pane-side").addEventListener("change", event => {
      Services.prefs.setStringPref(this.PREF.side, event.target.value);
      this.applyLayout();
    });
    for (const key of ["radius", "blur", "width"]) {
      document.getElementById(`pane-${key}`).addEventListener("input", event => {
        Services.prefs.setIntPref(this.PREF[key], Number(event.target.value));
        this.applyAppearance();
        this.updateOutputs();
      });
    }
    for (const key of ["accent", "background", "surface", "text"]) {
      document.getElementById(`pane-${key}`).addEventListener("input", event => {
        Services.prefs.setStringPref(this.PREF[key], event.target.value);
        this.applyAppearance();
      });
    }
    for (const key of ["font", "animation", "appearance"]) {
      document.getElementById(`pane-${key}`).addEventListener("change", event => {
        Services.prefs.setStringPref(this.PREF[key], event.target.value.trim());
        this.applyAppearance();
      });
    }
    this.swipeDistance = 0;
    this.lastSwipeAt = 0;
    const onWheel = event => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) * 1.2) return;
      event.preventDefault();
      this.swipeDistance += event.deltaX;
      const now = Date.now();
      if (Math.abs(this.swipeDistance) >= 40 && now - this.lastSwipeAt > 300) {
        this.cycleWorkspace(this.swipeDistance > 0 ? 1 : -1);
        this.swipeDistance = 0;
        this.lastSwipeAt = now;
      }
    };
    for (const id of ["sidebar-container", "navigator-toolbox", "pane-workspace-rail"]) {
      document.getElementById(id)?.addEventListener("wheel", onWheel, { passive: false });
    }
    this.bindSwipeGestures();
    window.addEventListener("keydown", event => {
      if (!event.altKey || !(event.metaKey || event.ctrlKey)) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      this.cycleWorkspace(event.key === "ArrowRight" ? 1 : -1);
    });
    gBrowser.tabContainer.addEventListener("TabOpen", event => {
      this.SessionStore.setCustomTabValue(event.target, "paneWorkspace", this.activeId);
    });
    gBrowser.tabContainer.addEventListener("TabClose", () => setTimeout(() => this.ensureVisibleTab()));
    gBrowser.tabContainer.addEventListener("TabSelect", () => setTimeout(() => this.applyWindowName()));
    gBrowser.tabContainer.addEventListener("TabAttrModified", () => setTimeout(() => this.applyWindowName()));
  },

  // Trackpad swipes over chrome arrive as swipe gestures, never as wheel events.
  bindSwipeGestures() {
    let active = false;
    const mayStart = event => {
      if (event.direction !== event.DIRECTION_LEFT && event.direction !== event.DIRECTION_RIGHT) return;
      event.preventDefault();
      event.stopPropagation();
      event.allowedDirections |= event.DIRECTION_LEFT | event.DIRECTION_RIGHT;
    };
    const start = event => {
      active = true;
      event.preventDefault();
      event.stopPropagation();
    };
    const update = event => {
      if (!active) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const end = event => {
      if (!active) return;
      active = false;
      event.preventDefault();
      event.stopPropagation();
      const rtl = document.documentElement.matches(":-moz-locale-dir(rtl)");
      const forward = (event.direction === event.DIRECTION_RIGHT) !== rtl;
      this.cycleWorkspace(forward ? 1 : -1);
    };
    for (const id of ["navigator-toolbox", "sidebar-container"]) {
      const target = document.getElementById(id);
      if (!target) continue;
      target.addEventListener("MozSwipeGestureMayStart", mayStart, true);
      target.addEventListener("MozSwipeGestureStart", start, true);
      target.addEventListener("MozSwipeGestureUpdate", update, true);
      target.addEventListener("MozSwipeGesture", end, true);
      target.addEventListener("MozSwipeGestureEnd", () => { active = false; }, true);
    }
  },

  updateOutputs() {
    document.getElementById("pane-radius-value").value = `${this.pref(this.PREF.radius, 10)}px`;
    document.getElementById("pane-blur-value").value = `${this.pref(this.PREF.blur, 18)}px`;
    document.getElementById("pane-width-value").value = `${this.pref(this.PREF.width, 248)}px`;
  },

  renderWorkspaces() {
    const list = document.getElementById("pane-workspace-list");
    list.replaceChildren();
    for (const space of this.workspaces) {
      const button = document.createElement("button");
      button.className = "pane-workspace";
      button.dataset.id = space.id;
      button.dataset.color = space.color;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(space.id === this.activeId));
      button.title = `${space.name}\nDouble-click to rename`;
      button.innerHTML = `<span>${space.name.slice(0, 1).toUpperCase()}</span><small>${space.name}</small>`;
      button.addEventListener("click", () => this.switchWorkspace(space.id));
      button.addEventListener("dblclick", event => { event.stopPropagation(); this.renameWorkspace(space.id); });
      button.addEventListener("contextmenu", event => {
        event.preventDefault();
        this.deleteWorkspace(space.id);
      });
      list.append(button);
    }
  },

  async createWorkspace() {
    const name = prompt("Workspace name", `Workspace ${this.workspaces.length + 1}`)?.trim();
    if (!name) return;
    const index = this.workspaces.length % this.colors.length;
    const space = { id: crypto.randomUUID(), name, color: this.colors[index] };
    this.workspaces.push(space);
    this.saveState();
    this.renderWorkspaces();
    await this.switchWorkspace(space.id);
  },

  renameWorkspace(id) {
    const space = this.workspaces.find(item => item.id === id);
    const name = prompt("Rename workspace", space.name)?.trim();
    if (!name) return;
    space.name = name;
    this.saveState();
    this.renderWorkspaces();
  },

  deleteWorkspace(id) {
    if (this.workspaces.length === 1) return;
    const space = this.workspaces.find(item => item.id === id);
    if (!confirm(`Delete workspace “${space.name}” and close its tabs?`)) return;
    const fallback = this.workspaces.find(item => item.id !== id);
    if (this.activeId === id) this.switchWorkspace(fallback.id);
    for (const tab of [...gBrowser.tabs]) {
      if (!tab.pinned && this.SessionStore.getCustomTabValue(tab, "paneWorkspace") === id) {
        gBrowser.removeTab(tab, { animate: false });
      }
    }
    this.workspaces = this.workspaces.filter(item => item.id !== id);
    this.saveState();
    this.renderWorkspaces();
  },

  cycleWorkspace(direction) {
    const index = this.workspaces.findIndex(space => space.id === this.activeId);
    const next = (index + direction + this.workspaces.length) % this.workspaces.length;
    this.switchWorkspace(this.workspaces[next].id);
  },

  async switchWorkspace(id, focus = true) {
    if (!this.workspaces.some(space => space.id === id)) return;
    this.activeId = id;
    const targetTabs = gBrowser.tabs.filter(tab => tab.pinned || this.SessionStore.getCustomTabValue(tab, "paneWorkspace") === id);
    for (const tab of targetTabs) if (tab.hidden) gBrowser.showTab(tab);
    if (focus) {
      const target = targetTabs.find(tab => !tab.pinned) || targetTabs[0] || this.newWorkspaceTab();
      gBrowser.selectedTab = target;
    }
    for (const tab of gBrowser.tabs) {
      if (!tab.pinned && this.SessionStore.getCustomTabValue(tab, "paneWorkspace") !== id && !tab.selected) {
        gBrowser.hideTab(tab, this.HIDDEN_SOURCE);
      }
    }
    this.saveState();
    this.renderWorkspaces();
    this.ensureVisibleTab();
  },

  ensureVisibleTab() {
    if (gBrowser.visibleTabs.length) return;
    this.newWorkspaceTab();
  },

  newWorkspaceTab() {
    const tab = gBrowser.addTrustedTab("about:newtab");
    this.SessionStore.setCustomTabValue(tab, "paneWorkspace", this.activeId);
    gBrowser.selectedTab = tab;
    return tab;
  },

  renameWindow() {
    const current = this.SessionStore.getCustomWindowValue(window, this.WINDOW_NAME_KEY);
    const name = prompt("Window name", current || "Pane")?.trim();
    if (!name) return;
    this.SessionStore.setCustomWindowValue(window, this.WINDOW_NAME_KEY, name);
    this.applyWindowName();
  },

  applyWindowName() {
    const name = this.SessionStore.getCustomWindowValue(window, this.WINDOW_NAME_KEY) || "Pane";
    const label = document.getElementById("pane-window-name");
    if (label) label.textContent = name;
    document.documentElement.setAttribute("pane-window-name", name);
    const suffix = ` — ${name}`;
    let title = document.title;
    if (this.lastWindowSuffix && title.endsWith(this.lastWindowSuffix)) {
      title = title.slice(0, -this.lastWindowSuffix.length);
    }
    if (!title.endsWith(suffix)) document.title = `${title}${suffix}`;
    this.lastWindowSuffix = suffix;
  },
};

window.addEventListener("DOMContentLoaded", () => {
  if (gBrowserInit.delayedStartupFinished) PaneChrome.init();
  else Services.obs.addObserver(function ready(subject, topic) {
    if (subject !== window) return;
    Services.obs.removeObserver(ready, topic);
    PaneChrome.init();
  }, "browser-delayed-startup-finished");
}, { once: true });
