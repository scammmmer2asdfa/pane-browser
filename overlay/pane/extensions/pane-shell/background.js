const DEFAULT_THEME = {
  name: "Pane",
  accent: "#3B6FF5",
  background: "#F6F7F9",
  surface: "#FFFFFF",
  text: "#111318",
  muted: "#6B7280",
  radius: 10,
  blur: 18,
  fontFamily: "SF Pro Text, Helvetica Neue, sans-serif",
  animation: "minimal",
  appearance: "system"
};

async function getTheme() {
  const result = await browser.storage.local.get("theme");
  return { ...DEFAULT_THEME, ...(result.theme || {}) };
}

async function cycleAppearance() {
  const theme = await getTheme();
  theme.appearance = theme.appearance === "dark" ? "light" : "dark";
  await browser.storage.local.set({ theme });
}

browser.runtime.onInstalled.addListener(async () => {
  const theme = await getTheme();
  await browser.storage.local.set({ theme, newTabMode: "dashboard" });
});

browser.action.onClicked.addListener(cycleAppearance);
browser.commands.onCommand.addListener(command => {
  if (command === "toggle-appearance") cycleAppearance();
});
