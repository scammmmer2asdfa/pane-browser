/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0.
 *
 * Workspace swipe handling is adapted from Zen Browser's ZenSpacesSwipe and the
 * gradient theming is inspired by ZenGradientGenerator (both MPL-2.0):
 * https://github.com/zen-browser/desktop
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
    gradient: "pane.theme.gradient",
    onboarded: "pane.onboarding.completed",
  },
  WORKSPACES_KEY: "pane.workspaces",
  ACTIVE_KEY: "pane.activeWorkspace",
  WINDOW_NAME_KEY: "pane.windowName",
  HIDDEN_SOURCE: "pane-workspace",
  colors: ["blue", "turquoise", "green", "yellow", "orange", "red", "pink", "purple"],
  DEFAULT_GRADIENT: { dots: [{ c: "#3B6FF5", x: 0.22, y: 0.18 }, { c: "#8A4FFF", x: 0.82, y: 0.78 }], opacity: 55 },
  PRESETS: [
    [{ c: "#4ADE80", x: 0.25, y: 0.25 }, { c: "#22D3EE", x: 0.8, y: 0.75 }],
    [{ c: "#8B5CF6", x: 0.2, y: 0.3 }, { c: "#EC4899", x: 0.85, y: 0.7 }],
    [{ c: "#F97316", x: 0.25, y: 0.7 }, { c: "#FBBF24", x: 0.78, y: 0.25 }],
    [{ c: "#3B82F6", x: 0.3, y: 0.2 }, { c: "#06B6D4", x: 0.75, y: 0.8 }],
    [{ c: "#F43F5E", x: 0.22, y: 0.28 }, { c: "#8B5CF6", x: 0.8, y: 0.72 }],
    [{ c: "#14B8A6", x: 0.28, y: 0.75 }, { c: "#6366F1", x: 0.76, y: 0.22 }],
    [{ c: "#E879F9", x: 0.24, y: 0.24 }, { c: "#38BDF8", x: 0.82, y: 0.74 }],
    [{ c: "#FACC15", x: 0.3, y: 0.3 }, { c: "#84CC16", x: 0.78, y: 0.76 }],
    [{ c: "#0EA5E9", x: 0.2, y: 0.8 }, { c: "#A78BFA", x: 0.8, y: 0.2 }],
    [{ c: "#64748B", x: 0.25, y: 0.25 }, { c: "#94A3B8", x: 0.8, y: 0.78 }],
  ],

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
    this.ensureBackground();
    this.applyLayout();
    this.loadState();
    this.createRail();
    this.bindEvents();
    this.switchWorkspace(this.activeId, false);
    this.applyWindowName();
    this.maybeShowSetup();
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
    this.applyGradient();
  },

  get gradient() {
    const active = this.workspaces?.find(space => space.id === this.activeId);
    if (active?.gradient?.dots) return active.gradient;
    try {
      const stored = JSON.parse(this.pref(this.PREF.gradient, ""));
      if (Array.isArray(stored?.dots)) return stored;
    } catch (_) {}
    return this.DEFAULT_GRADIENT;
  },

  set gradient(value) {
    Services.prefs.setStringPref(this.PREF.gradient, JSON.stringify(value));
    const active = this.workspaces?.find(space => space.id === this.activeId);
    if (active) {
      active.gradient = value;
      this.saveState();
    }
    this.applyGradient();
  },

  applyGradient() {
    const { dots, opacity } = this.gradient;
    const layers = dots.map(dot =>
      `radial-gradient(circle at ${(dot.x * 100).toFixed(1)}% ${(dot.y * 100).toFixed(1)}%, ${dot.c} 0%, transparent 62%)`
    );
    const root = document.documentElement;
    root.style.setProperty("--pane-gradient", layers.length ? layers.join(",") : "none");
    root.style.setProperty("--pane-gradient-opacity", String((opacity ?? 55) / 100));
  },

  // Chrome can only blur something that is painted behind it, so Pane paints the
  // gradient on a layer inside #browser rather than on the window itself.
  ensureBackground() {
    if (document.getElementById("pane-background")) return;
    const browserBox = document.getElementById("browser");
    if (!browserBox) return;
    const layer = document.createElement("div");
    layer.id = "pane-background";
    browserBox.prepend(layer);
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
    document.querySelector("sidebar-main").append(rail);
  },

  createCustomizer() {
    const panel = document.createElement("section");
    panel.id = "pane-customizer";
    panel.hidden = true;
    panel.innerHTML = `
      <header><strong>Customize Pane</strong><button id="pane-customizer-close" aria-label="Close">&#x2715;</button></header>
      <div id="pane-theme-picker"></div>
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
    panel.querySelector("#pane-theme-picker").append(this.buildGradientPicker());
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

  buildGradientPicker() {
    const picker = document.createElement("div");
    picker.className = "pane-gradient-picker";
    picker.innerHTML = `
      <div class="pane-presets"></div>
      <div class="pane-canvas"></div>
      <div class="pane-canvas-actions">
        <button data-act="add" title="Add colour">+</button>
        <button data-act="remove" title="Remove colour">&#8722;</button>
      </div>
      <label class="pane-contrast-row">Contrast<input class="pane-contrast" type="range" min="0" max="100" step="1"></label>`;

    const presets = picker.querySelector(".pane-presets");
    for (const dots of this.PRESETS) {
      const swatch = document.createElement("button");
      swatch.className = "pane-preset";
      swatch.style.background = `linear-gradient(135deg, ${dots[0].c}, ${dots[1].c})`;
      swatch.addEventListener("click", () => {
        this.gradient = { dots: dots.map(dot => ({ ...dot })), opacity: this.gradient.opacity };
        this.renderGradientPicker(picker);
      });
      presets.append(swatch);
    }

    picker.querySelector('[data-act="add"]').addEventListener("click", () => {
      const gradient = this.gradient;
      if (gradient.dots.length >= 5) return;
      gradient.dots.push({ c: this.pref(this.PREF.accent, "#3B6FF5"), x: 0.5, y: 0.5 });
      this.gradient = gradient;
      this.renderGradientPicker(picker);
    });
    picker.querySelector('[data-act="remove"]').addEventListener("click", () => {
      const gradient = this.gradient;
      if (gradient.dots.length <= 1) return;
      gradient.dots.pop();
      this.gradient = gradient;
      this.renderGradientPicker(picker);
    });
    picker.querySelector(".pane-contrast").addEventListener("input", event => {
      const gradient = this.gradient;
      gradient.opacity = Number(event.target.value);
      this.gradient = gradient;
    });

    this.renderGradientPicker(picker);
    return picker;
  },

  renderGradientPicker(picker) {
    const gradient = this.gradient;
    const canvas = picker.querySelector(".pane-canvas");
    picker.querySelector(".pane-contrast").value = gradient.opacity ?? 55;
    canvas.replaceChildren();
    gradient.dots.forEach((dot, index) => {
      const handle = document.createElement("button");
      handle.className = "pane-dot";
      handle.style.background = dot.c;
      handle.style.left = `${dot.x * 100}%`;
      handle.style.top = `${dot.y * 100}%`;
      handle.title = "Drag to move, double-click to recolour";
      handle.addEventListener("pointerdown", event => {
        event.preventDefault();
        handle.setPointerCapture(event.pointerId);
        const move = moveEvent => {
          const bounds = canvas.getBoundingClientRect();
          const x = Math.min(1, Math.max(0, (moveEvent.clientX - bounds.left) / bounds.width));
          const y = Math.min(1, Math.max(0, (moveEvent.clientY - bounds.top) / bounds.height));
          const next = this.gradient;
          next.dots[index] = { ...next.dots[index], x, y };
          this.gradient = next;
          handle.style.left = `${x * 100}%`;
          handle.style.top = `${y * 100}%`;
        };
        const stop = () => {
          handle.removeEventListener("pointermove", move);
          handle.removeEventListener("pointerup", stop);
        };
        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", stop);
      });
      handle.addEventListener("dblclick", () => {
        const value = prompt("Colour (hex)", dot.c)?.trim();
        if (!value) return;
        const next = this.gradient;
        next.dots[index] = { ...next.dots[index], c: value };
        this.gradient = next;
        this.renderGradientPicker(picker);
      });
      canvas.append(handle);
    });
  },

  maybeShowSetup() {
    if (Services.prefs.getBoolPref(this.PREF.onboarded, false)) return;
    const overlay = document.createElement("div");
    overlay.id = "pane-setup";
    overlay.innerHTML = `
      <div class="pane-setup-card">
        <ol class="pane-setup-progress"></ol>
        <section class="pane-setup-page">
          <h1>Welcome to Pane</h1>
          <p>A fast, private browser with spaces, live theming and no telemetry.</p>
        </section>
        <section class="pane-setup-page" hidden>
          <h1>Choose a layout</h1>
          <div class="pane-setup-options" id="pane-setup-layout"></div>
        </section>
        <section class="pane-setup-page" hidden>
          <h1>Pick your colours</h1>
          <div id="pane-setup-theme"></div>
        </section>
        <section class="pane-setup-page" hidden>
          <h1>Bring your data</h1>
          <p>Import bookmarks, history and passwords from another browser.</p>
          <button id="pane-setup-import">Import browser data</button>
        </section>
        <footer>
          <button id="pane-setup-back">Back</button>
          <button id="pane-setup-next" class="primary">Continue</button>
        </footer>
      </div>`;
    document.body.append(overlay);

    const pages = [...overlay.querySelectorAll(".pane-setup-page")];
    const progress = overlay.querySelector(".pane-setup-progress");
    const back = overlay.querySelector("#pane-setup-back");
    const next = overlay.querySelector("#pane-setup-next");
    for (const _ of pages) progress.append(document.createElement("li"));
    let index = 0;
    const show = page => {
      index = page;
      pages.forEach((section, i) => (section.hidden = i !== index));
      [...progress.children].forEach((dot, i) => dot.classList.toggle("active", i === index));
      back.disabled = index === 0;
      next.textContent = index === pages.length - 1 ? "Start browsing" : "Continue";
    };

    const layoutBox = overlay.querySelector("#pane-setup-layout");
    for (const [value, label] of [["sidebar", "Sidebar tabs"], ["collapsed", "Collapsed sidebar"], ["top", "Top tabs"]]) {
      const option = document.createElement("button");
      option.className = "pane-setup-option";
      option.textContent = label;
      option.classList.toggle("selected", this.pref(this.PREF.layout, "sidebar") === value);
      option.addEventListener("click", () => {
        Services.prefs.setStringPref(this.PREF.layout, value);
        this.applyLayout();
        [...layoutBox.children].forEach(child => child.classList.toggle("selected", child === option));
      });
      layoutBox.append(option);
    }
    overlay.querySelector("#pane-setup-theme").append(this.buildGradientPicker());
    overlay.querySelector("#pane-setup-import").addEventListener("click", () => {
      gBrowser.selectedTab = gBrowser.addTrustedTab("about:preferences#general-migrate");
    });
    back.addEventListener("click", () => show(Math.max(0, index - 1)));
    next.addEventListener("click", () => {
      if (index === pages.length - 1) {
        Services.prefs.setBoolPref(this.PREF.onboarded, true);
        overlay.remove();
        return;
      }
      show(index + 1);
    });
    show(0);
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
      button.title = `${space.name}\nDouble-click to edit`;
      button.innerHTML = `<span>${space.icon || space.name.slice(0, 1).toUpperCase()}</span><small>${space.name}</small>`;
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
    this.openSpaceEditor();
  },

  openSpaceEditor(editId) {
    document.getElementById("pane-space-editor")?.remove();
    const editing = this.workspaces.find(space => space.id === editId);
    const icons = ["\u{1F310}", "\u{1F4BC}", "\u{1F3E0}", "\u{1F4DA}", "\u{1F3B5}", "\u{1F6D2}", "\u{2728}", "\u{1F525}", "\u{1F331}", "\u{1F3AF}"];
    const editor = document.createElement("div");
    editor.id = "pane-space-editor";
    editor.innerHTML = `
      <h2>${editing ? "Edit Space" : "Create a Space"}</h2>
      <p>Spaces are used to organize your tabs and sessions.</p>
      <div class="pane-space-row">
        <button id="pane-space-icon" title="Change icon"></button>
        <input id="pane-space-name" placeholder="Space Name" maxlength="32">
      </div>
      <button id="pane-space-theme-toggle">Edit Theme</button>
      <div id="pane-space-theme" hidden></div>
      <div class="pane-space-spacer"></div>
      <button id="pane-space-save" class="primary">${editing ? "Save Space" : "Create Space"}</button>
      <button id="pane-space-cancel" class="ghost">Cancel</button>`;

    const sidebar = document.querySelector("sidebar-main");
    if (sidebar) {
      editor.slot = "tabstrip";
      sidebar.append(editor);
    } else {
      document.body.append(editor);
    }

    const nameField = editor.querySelector("#pane-space-name");
    const iconButton = editor.querySelector("#pane-space-icon");
    let icon = editing?.icon || icons[this.workspaces.length % icons.length];
    iconButton.textContent = icon;
    nameField.value = editing?.name || "";
    nameField.focus();

    iconButton.addEventListener("click", () => {
      icon = icons[(icons.indexOf(icon) + 1) % icons.length];
      iconButton.textContent = icon;
    });
    editor.querySelector("#pane-space-theme-toggle").addEventListener("click", () => {
      const panel = editor.querySelector("#pane-space-theme");
      if (!panel.children.length) panel.append(this.buildGradientPicker());
      panel.hidden = !panel.hidden;
    });
    editor.querySelector("#pane-space-cancel").addEventListener("click", () => editor.remove());
    const save = () => {
      const name = nameField.value.trim();
      if (!name) return nameField.focus();
      if (editing) {
        editing.name = name;
        editing.icon = icon;
        this.saveState();
        this.renderWorkspaces();
      } else {
        const space = {
          id: crypto.randomUUID(),
          name,
          icon,
          color: this.colors[this.workspaces.length % this.colors.length],
          gradient: this.gradient,
        };
        this.workspaces.push(space);
        this.saveState();
        this.renderWorkspaces();
        this.switchWorkspace(space.id);
      }
      editor.remove();
    };
    editor.querySelector("#pane-space-save").addEventListener("click", save);
    nameField.addEventListener("keydown", event => {
      if (event.key === "Enter") save();
      if (event.key === "Escape") editor.remove();
    });
  },

  renameWorkspace(id) {
    this.openSpaceEditor(id);
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
    this.applyGradient();
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
