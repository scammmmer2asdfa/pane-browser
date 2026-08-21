const DEFAULT_THEME = {
  name: "Pane", accent: "#3B6FF5", background: "#F6F7F9", surface: "#FFFFFF",
  text: "#111318", muted: "#6B7280", radius: 10, blur: 18,
  fontFamily: "SF Pro Text, Helvetica Neue, sans-serif", animation: "minimal", appearance: "system"
};
const fields = {
  appearance: document.querySelector("#appearance"), accent: document.querySelector("#accent"),
  fontFamily: document.querySelector("#font"), radius: document.querySelector("#radius"),
  blur: document.querySelector("#blur"), animation: document.querySelector("#animation")
};
const status = document.querySelector("#status");

function setStatus(message) {
  status.textContent = message;
  setTimeout(() => { if (status.textContent === message) status.textContent = ""; }, 3500);
}

function renderTheme(theme) {
  fields.appearance.value = theme.appearance;
  fields.accent.value = theme.accent;
  fields.fontFamily.value = theme.fontFamily;
  fields.radius.value = theme.radius;
  fields.blur.value = theme.blur;
  fields.animation.value = theme.animation;
  document.querySelector("#radius-value").textContent = `${theme.radius}px`;
  document.querySelector("#blur-value").textContent = `${theme.blur}px`;
}

async function saveTheme() {
  const stored = await browser.storage.local.get("theme");
  const theme = {
    ...DEFAULT_THEME, ...(stored.theme || {}),
    appearance: fields.appearance.value, accent: fields.accent.value,
    fontFamily: fields.fontFamily.value.trim() || DEFAULT_THEME.fontFamily,
    radius: Number(fields.radius.value), blur: Number(fields.blur.value),
    animation: fields.animation.value
  };
  await browser.storage.local.set({ theme });
  renderTheme(theme);
  setStatus("Theme saved");
}

async function geocodeLocation(name) {
  if (!name.trim()) return null;
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
  const data = await fetch(url).then(response => response.json());
  const result = data.results?.[0];
  if (!result) throw new Error("Location not found");
  return { name: [result.name, result.admin1].filter(Boolean).join(", "), latitude: result.latitude, longitude: result.longitude };
}

async function load() {
  const stored = await browser.storage.local.get(["theme", "newTabMode", "tabPosition", "weatherLocation"]);
  renderTheme({ ...DEFAULT_THEME, ...(stored.theme || {}) });
  document.querySelector("#new-tab-mode").value = stored.newTabMode || "dashboard";
  document.querySelector("#tab-position").value = stored.tabPosition || "top";
  document.querySelector("#weather-location").value = stored.weatherLocation?.name || "";
}

for (const element of Object.values(fields)) element.addEventListener("change", saveTheme);
for (const id of ["radius", "blur"]) fields[id].addEventListener("input", () => {
  document.querySelector(`#${id}-value`).textContent = `${fields[id].value}px`;
});
document.querySelector("#new-tab-mode").addEventListener("change", event => browser.storage.local.set({ newTabMode: event.target.value }));
document.querySelector("#tab-position").addEventListener("change", event => {
  browser.storage.local.set({ tabPosition: event.target.value });
  setStatus("Tab layout saved; apply it from Pane's tab toolbar menu");
});
document.querySelector("#weather-location").addEventListener("change", async event => {
  try {
    const weatherLocation = await geocodeLocation(event.target.value);
    await browser.storage.local.set({ weatherLocation });
    event.target.value = weatherLocation?.name || "";
    setStatus("Weather location saved");
  } catch (error) { setStatus(error.message); }
});
document.querySelector("#export-theme").addEventListener("click", async () => {
  const { theme } = await browser.storage.local.get("theme");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([JSON.stringify({ ...DEFAULT_THEME, ...(theme || {}) }, null, 2)], { type: "application/json" }));
  link.download = "pane-theme.panetheme";
  link.click();
  URL.revokeObjectURL(link.href);
});
document.querySelector("#import-theme").addEventListener("click", () => document.querySelector("#theme-file").click());
document.querySelector("#theme-file").addEventListener("change", async event => {
  try {
    const theme = { ...DEFAULT_THEME, ...JSON.parse(await event.target.files[0].text()) };
    await browser.storage.local.set({ theme });
    renderTheme(theme);
    setStatus("Theme imported");
  } catch { setStatus("That .panetheme file is not valid"); }
});
document.querySelector("#import-data").addEventListener("click", () => browser.tabs.create({ url: "about:preferences#general-migrate" }));
document.querySelector("#profiles").addEventListener("click", () => browser.tabs.create({ url: "about:profiles" }));
document.querySelector("#extensions").addEventListener("click", () => browser.tabs.create({ url: "about:addons" }));
load();
