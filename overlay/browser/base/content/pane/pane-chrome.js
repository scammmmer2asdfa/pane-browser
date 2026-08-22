/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. */

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
  },
  WORKSPACES_KEY: "pane.workspaces",
  ACTIVE_KEY: "pane.activeWorkspace",
  WINDOW_NAME_KEY: "pane.windowName",
  HIDDEN_SOURCE: "pane-workspace",
  colors: ["blue", "turquoise", "green", "yellow", "orange", "red", "pink", "purple"],
  icons: ["circle", "briefcase", "dollar", "cart", "vacation", "gift", "food", "fruit", "pet", "tree", "chill"],

  get SessionStore() {
    return ChromeUtils.importESModule(
      "moz-src:///browser/components/sessionstore/SessionStore.sys.mjs"
    ).SessionStore;
  },

  get ContextualIdentityService() {
    return ChromeUtils.importESModule(
      "moz-src:///toolkit/components/contextualidentity/ContextualIdentityService.sys.mjs"
    ).ContextualIdentityService;
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
    root.style.setProperty("--pane-accent", this.pref(this.PREF.accent, "#3B6FF5"));
    root.style.setProperty("--pane-bg", this.pref(this.PREF.background, "#15171c"));
    root.style.setProperty("--pane-surface", this.pref(this.PREF.surface, "#20232a"));
    root.style.setProperty("--pane-text", this.pref(this.PREF.text, "#f2f4f8"));
    root.style.setProperty("--pane-font", this.pref(this.PREF.font, "SF Pro Text"));
    const animation = this.pref(this.PREF.animation, "minimal");
    root.style.setProperty("--pane-duration", animation === "off" ? "0ms" : animation === "full" ? "280ms" : "120ms");
    const appearance = this.pref(this.PREF.appearance, "system");
    root.style.colorScheme = appearance === "system" ? "light dark" : appearance;
    root.setAttribute("pane-appearance", appearance);
    root.toggleAttribute("pane-glass", this.pref(this.PREF.blur, 18) > 0);
  },

  applyLayout() {
    const layout = this.pref(this.PREF.layout, "left");
    const vertical = layout === "left" || layout === "right" || layout === "floating";
    Services.prefs.setBoolPref("sidebar.verticalTabs", vertical);
    Services.prefs.setBoolPref("sidebar.position_start", layout !== "right");
    document.documentElement.setAttribute("pane-layout", layout);
  },

  loadState() {
    let workspaces;
    try {
      workspaces = JSON.parse(this.SessionStore.getCustomWindowValue(window, this.WORKSPACES_KEY));
    } catch (_) {}
    if (!Array.isArray(workspaces) || !workspaces.length) {
      workspaces = [{ id: crypto.randomUUID(), name: "Personal", color: "blue", icon: "circle", userContextId: 0 }];
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
    rail.setAttribute("aria-label", "Pane workspaces");
    rail.innerHTML = `
      <div id="pane-window-name" title="Double-click to rename this window"></div>
      <div id="pane-workspace-list" role="tablist"></div>
      <div class="pane-rail-actions">
        <button id="pane-new-tab" title="New tab in this workspace">+</button>
        <button id="pane-new-workspace" title="New workspace">&#x25C7;</button>
        <button id="pane-customize" title="Customize Pane">&#x263C;</button>
      </div>`;
    document.body.append(rail);
    this.createCustomizer();
    this.renderWorkspaces();
  },

  createCustomizer() {
    const panel = document.createElement("section");
    panel.id = "pane-customizer";
    panel.hidden = true;
    panel.innerHTML = `
      <header><strong>Customize Pane</strong><button id="pane-customizer-close" aria-label="Close">&#x2715;</button></header>
      <label>Layout<select id="pane-layout"><option value="top">Top tabs</option><option value="left">Left tabs</option><option value="right">Right tabs</option><option value="floating">Floating sidebar</option></select></label>
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
      radius: this.pref(this.PREF.radius, 10), blur: this.pref(this.PREF.blur, 18),
      accent: this.pref(this.PREF.accent, "#3B6FF5"), background: this.pref(this.PREF.background, "#15171c"),
      surface: this.pref(this.PREF.surface, "#20232a"), text: this.pref(this.PREF.text, "#f2f4f8"),
      font: this.pref(this.PREF.font, "SF Pro Text"), animation: this.pref(this.PREF.animation, "minimal"),
      appearance: this.pref(this.PREF.appearance, "system"),
      layout: this.pref(this.PREF.layout, "left"),
    };
    for (const [key, value] of Object.entries(values)) document.getElementById(`pane-${key}`).value = value;
    this.updateOutputs();
  },

  bindEvents() {
    document.getElementById("pane-new-tab").addEventListener("click", () => this.newWorkspaceTab());
    document.getElementById("pane-new-workspace").addEventListener("click", () => this.createWorkspace());
    document.getElementById("pane-customize").addEventListener("click", () => {
      const panel = document.getElementById("pane-customizer");
      panel.hidden = !panel.hidden;
    });
    document.getElementById("pane-customizer-close").addEventListener("click", () => document.getElementById("pane-customizer").hidden = true);
    document.getElementById("pane-rename-window").addEventListener("click", () => this.renameWindow());
    document.getElementById("pane-window-name").addEventListener("dblclick", () => this.renameWindow());
    document.getElementById("pane-layout").addEventListener("change", event => {
      Services.prefs.setStringPref(this.PREF.layout, event.target.value);
      this.applyLayout();
    });
    for (const key of ["radius", "blur"]) {
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
    document.getElementById("pane-workspace-rail").addEventListener("wheel", event => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      this.swipeDistance += event.deltaX;
      const now = Date.now();
      if (Math.abs(this.swipeDistance) >= 45 && now - this.lastSwipeAt > 350) {
        this.cycleWorkspace(this.swipeDistance > 0 ? 1 : -1);
        this.swipeDistance = 0;
        this.lastSwipeAt = now;
      }
    }, { passive: false });
    document.addEventListener("command", event => {
      if (event.target?.id !== "cmd_newNavigatorTab") return;
      const space = this.workspaces.find(item => item.id === this.activeId);
      if (!space?.userContextId) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      this.newWorkspaceTab();
    }, true);
    for (const id of ["tabs-newtab-button", "new-tab-button"]) {
      document.getElementById(id)?.addEventListener("click", event => {
        const space = this.workspaces.find(item => item.id === this.activeId);
        if (!space?.userContextId) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        this.newWorkspaceTab();
      }, true);
    }
    gBrowser.tabContainer.addEventListener("TabOpen", event => {
      this.SessionStore.setCustomTabValue(event.target, "paneWorkspace", this.activeId);
    });
    gBrowser.tabContainer.addEventListener("TabClose", () => setTimeout(() => this.ensureVisibleTab()));
    gBrowser.tabContainer.addEventListener("TabSelect", () => setTimeout(() => this.applyWindowName()));
    gBrowser.tabContainer.addEventListener("TabAttrModified", () => setTimeout(() => this.applyWindowName()));
  },

  updateOutputs() {
    document.getElementById("pane-radius-value").value = `${this.pref(this.PREF.radius, 10)}px`;
    document.getElementById("pane-blur-value").value = `${this.pref(this.PREF.blur, 18)}px`;
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
    Services.prefs.setBoolPref("privacy.userContext.enabled", true);
    const index = this.workspaces.length % this.colors.length;
    const identity = this.ContextualIdentityService.create(name, this.icons[index % this.icons.length], this.colors[index]);
    const space = { id: crypto.randomUUID(), name, color: this.colors[index], icon: this.icons[index % this.icons.length], userContextId: identity.userContextId };
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
    if (space.userContextId) this.ContextualIdentityService.update(space.userContextId, name, space.icon, space.color);
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
    if (space.userContextId) this.ContextualIdentityService.remove(space.userContextId);
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
    const space = this.workspaces.find(item => item.id === this.activeId);
    const tab = gBrowser.addTrustedTab("about:newtab", { userContextId: space?.userContextId || 0 });
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
