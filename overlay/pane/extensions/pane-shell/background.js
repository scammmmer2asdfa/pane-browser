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

const DARK_COLORS = {
  background: "#101216",
  surface: "#181B21",
  text: "#E8EAF0",
  muted: "#9AA3B2"
};

async function getTheme() {
  const result = await browser.storage.local.get("theme");
  return { ...DEFAULT_THEME, ...(result.theme || {}) };
}

async function applyBrowserTheme(theme) {
  const isDark = theme.appearance === "dark" ||
    (theme.appearance === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  const palette = isDark ? { ...theme, ...DARK_COLORS } : theme;
  await browser.theme.update({
    colors: {
      frame: palette.background,
      frame_inactive: palette.surface,
      toolbar: palette.surface,
      toolbar_text: palette.text,
      tab_background_text: palette.text,
      tab_selected: palette.background,
      tab_line: palette.accent,
      icons: palette.text,
      icons_attention: palette.accent,
      popup: palette.surface,
      popup_text: palette.text,
      popup_border: palette.muted,
      sidebar: palette.background,
      sidebar_text: palette.text
    }
  });
}

async function cycleAppearance() {
  const theme = await getTheme();
  theme.appearance = theme.appearance === "dark" ? "light" : "dark";
  await browser.storage.local.set({ theme });
  await applyBrowserTheme(theme);
}

browser.runtime.onInstalled.addListener(async () => {
  const theme = await getTheme();
  await browser.storage.local.set({ theme, newTabMode: "dashboard", tabPosition: "top" });
  await applyBrowserTheme(theme);
});

browser.runtime.onStartup.addListener(async () => applyBrowserTheme(await getTheme()));
browser.action.onClicked.addListener(cycleAppearance);
browser.commands.onCommand.addListener(command => {
  if (command === "toggle-appearance") cycleAppearance();
});
browser.storage.onChanged.addListener(changes => {
  if (changes.theme?.newValue) applyBrowserTheme(changes.theme.newValue);
});
