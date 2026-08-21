const DEFAULT_THEME = {
  accent: "#3B6FF5", background: "#F6F7F9", surface: "#FFFFFF",
  text: "#111318", muted: "#6B7280", radius: 10, blur: 18,
  fontFamily: "SF Pro Text, Helvetica Neue, sans-serif", animation: "minimal",
  appearance: "system"
};
const DARK = { background: "#101216", surface: "#181B21", text: "#E8EAF0", muted: "#9AA3B2" };
const WEATHER = { 0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Icy fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Rain showers", 81: "Rain showers", 82: "Heavy showers", 95: "Thunderstorm" };

function applyTheme(input) {
  const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = input.appearance === "dark" || (input.appearance === "system" && prefersDark);
  const theme = { ...DEFAULT_THEME, ...input, ...(dark ? DARK : {}) };
  const root = document.documentElement.style;
  for (const [name, value] of Object.entries({
    accent: theme.accent, bg: theme.background, surface: theme.surface,
    text: theme.text, muted: theme.muted, radius: `${theme.radius}px`,
    blur: `${theme.blur}px`, font: theme.fontFamily,
    duration: theme.animation === "off" ? "0ms" : theme.animation === "full" ? "280ms" : "120ms"
  })) root.setProperty(`--pane-${name}`, value);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

function siteLink(site) {
  const link = document.createElement("a");
  link.className = "site";
  link.href = site.url;
  const icon = document.createElement("strong");
  icon.textContent = (site.title || new URL(site.url).hostname).charAt(0).toUpperCase();
  icon.style.color = "var(--pane-accent)";
  icon.style.fontSize = "24px";
  const title = document.createElement("span");
  title.textContent = site.title || new URL(site.url).hostname;
  link.append(icon, title);
  return link;
}

async function loadSites(mode, quickLaunch) {
  const container = document.querySelector(mode === "speedDial" ? "#top-sites" : "#quick-launch");
  const sites = mode === "speedDial" ? await browser.topSites.get({ includeFavicon: true, limit: 18 }) : quickLaunch;
  for (const site of sites) container.append(siteLink(site));
}

async function loadBookmarks() {
  const items = await browser.bookmarks.getRecent(6);
  const container = document.querySelector("#bookmarks");
  for (const item of items.filter(item => item.url)) {
    const link = document.createElement("a");
    link.href = item.url;
    link.textContent = item.title || new URL(item.url).hostname;
    container.append(link);
  }
}

async function loadWeather(location) {
  if (!location?.latitude) return;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`;
    const data = await fetch(url).then(response => response.json());
    document.querySelector("#weather").textContent = `${location.name} · ${Math.round(data.current.temperature_2m)}° · ${WEATHER[data.current.weather_code] || "Current conditions"}`;
  } catch { document.querySelector("#weather").textContent = "Weather unavailable"; }
}

function tick() {
  const now = new Date();
  document.querySelector("#clock").textContent = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  document.querySelector("#date").textContent = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

function looksLikeURL(value) {
  return /^(https?:\/\/|file:\/\/)/i.test(value) || (/^[^\s]+\.[a-z]{2,}(\/.*)?$/i.test(value) && !value.includes(" "));
}

async function start() {
  const defaults = [{ title: "Wikipedia", url: "https://wikipedia.org" }, { title: "GitHub", url: "https://github.com" }];
  const stored = await browser.storage.local.get(["theme", "newTabMode", "quickLaunch", "weatherLocation"]);
  applyTheme(stored.theme || DEFAULT_THEME);
  const mode = stored.newTabMode || "dashboard";
  if (mode !== "minimal") document.querySelector(mode === "speedDial" ? "#speed-dial" : "#dashboard").classList.remove("hidden");
  if (mode === "dashboard") {
    tick(); setInterval(tick, 1000);
    await Promise.all([loadBookmarks(), loadWeather(stored.weatherLocation), loadSites(mode, stored.quickLaunch || defaults)]);
  } else if (mode === "speedDial") await loadSites(mode, []);
}

document.querySelector("#settings").addEventListener("click", () => browser.runtime.openOptionsPage());
document.querySelector("#search-form").addEventListener("submit", async event => {
  event.preventDefault();
  const value = document.querySelector("#search").value.trim();
  if (!value) return;
  if (looksLikeURL(value)) location.href = /^(https?|file):/i.test(value) ? value : `https://${value}`;
  else await browser.search.search({ query: value });
});
start();
