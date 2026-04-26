export const STORAGE_KEY = "cw_theme";

export const DEFAULT_THEME = "default";
export const GLOBAL_THEME = "global";
export const LIGHT_THEME = "light";
export const SYSTEM_THEME = "system";

export const DEFAULT_GLOBAL_STYLE = "dashboard-classic";
export const DEFAULT_THEME_FLAVOR = DEFAULT_GLOBAL_STYLE;
export const APP_DEFAULT_THEME = DEFAULT_THEME;
export const APP_DEFAULT_THEME_FLAVOR = DEFAULT_THEME_FLAVOR;
export const DEFAULT_ACCENT = "#e5be6e";
export const DEFAULT_ACCENT_OVERRIDE = "";

export const themeModes = new Set([
  DEFAULT_THEME,
  GLOBAL_THEME,
  LIGHT_THEME,
  SYSTEM_THEME,
]);

export const themeModeOptions = [
  {
    value: DEFAULT_THEME,
    label: "Default",
    description: "The signature Crossworld experience.",
  },
  {
    value: GLOBAL_THEME,
    label: "Global Style",
    description: "Apply another Crossworld visual identity across the whole site.",
  },
  {
    value: LIGHT_THEME,
    label: "Light",
    description: "Clean, modern light mode with preserved accent identity.",
  },
  {
    value: SYSTEM_THEME,
    label: "System",
    description: "Professional fallback that follows your OS preference.",
  },
];

export const themeModeMeta = {
  [DEFAULT_THEME]: {
    accent: DEFAULT_ACCENT,
    summaryTitle: "Signature Crossworld",
    summaryBody:
      "Warm charcoal, subtle navy undertones, cinematic depth, and gold accents.",
  },
  [GLOBAL_THEME]: {
    accent: "#f0c978",
    summaryTitle: "Global Style",
    summaryBody:
      "Choose another Crossworld brand atmosphere and apply it across every app surface.",
  },
  [LIGHT_THEME]: {
    accent: "#c89232",
    summaryTitle: "Light",
    summaryBody:
      "Soft whites, refined neutrals, and a cleaner daylight presentation.",
  },
  [SYSTEM_THEME]: {
    accent: DEFAULT_ACCENT,
    summaryTitle: "System",
    summaryBody:
      "Follows your operating system preference only when explicitly selected.",
  },
};

export const globalStyleOptions = [
  {
    value: "community",
    label: "Community",
    glyph: "C",
    accent: "#f0c978",
    description: "Richer navy atmosphere with warm gold lift and strong social energy.",
  },
  {
    value: "squash",
    label: "Squash",
    glyph: "S",
    accent: "#ef9a43",
    description: "Sharper productivity contrast with amber utility edges and fast clarity.",
  },
  {
    value: "archipelago",
    label: "Archipelago",
    glyph: "A",
    accent: "#69c8bb",
    description: "Adventurous teal depth with layered atmosphere and exploratory mood.",
  },
  {
    value: "dashboard-classic",
    label: "Dashboard Classic",
    glyph: "D",
    accent: "#d9b36c",
    description: "Refined Crossworld dashboard shell with balanced gold and graphite polish.",
  },
  {
    value: "pale-shelter",
    label: "Pale Shelter",
    glyph: "P",
    accent: "#c8ba9a",
    description: "Moody artistic charcoal with ash, brass, and desaturated steel nuance.",
  },
  {
    value: "midnight",
    label: "Midnight",
    glyph: "M",
    accent: "#9db9ff",
    description: "Ultra-dark premium shell with deep ink, glass contrast, and cool precision.",
  },
  {
    value: "gold-standard",
    label: "Gold Standard",
    glyph: "G",
    accent: "#f3cd77",
    description: "Prestige-forward variant with richer gold architecture and elevated depth.",
  },
];

export const themeFlavors = new Set(globalStyleOptions.map((option) => option.value));
export const globalStyles = themeFlavors;

const SYSTEM_DARK = "dark";
const SYSTEM_LIGHT = LIGHT_THEME;

const DEFAULT_PALETTE = {
  "--color-accent": DEFAULT_ACCENT,
  "--color-danger": "#ff7f90",
  "--color-success": "#7ee2b8",
  "--color-warning": "#e5be6e",
  "--color-bg": "#090d13",
  "--color-surface": "rgba(19, 24, 33, 0.78)",
  "--color-surface-solid": "rgba(27, 33, 43, 0.92)",
  "--color-border": "rgba(196, 182, 152, 0.16)",
  "--color-text": "rgba(244, 246, 252, 0.96)",
  "--color-text-muted": "rgba(201, 197, 190, 0.78)",
  "--color-shadow-ambient": "rgba(5, 7, 11, 0.56)",
  "--color-shadow-elevated": "rgba(5, 7, 11, 0.62)",
  "--cw-bg": "var(--color-bg)",
  "--cw-surface": "var(--color-surface)",
  "--cw-surface-elevated": "var(--color-surface-solid)",
  "--cw-text": "var(--color-text)",
  "--cw-muted": "var(--color-text-muted)",
  "--cw-border": "var(--color-border)",
  "--cw-accent": "var(--color-accent)",
  "--cw-bg-soft": "#0c1017",
  "--cw-surface-strong": "rgba(29, 35, 46, 0.94)",
  "--cw-border-cool": "rgba(150, 164, 188, 0.1)",
  "--cw-shadow": "rgba(0, 0, 0, 0.45)",
  "--cw-text-strong": "rgba(255, 244, 223, 0.96)",
  "--cw-copy-soft": "rgba(255, 255, 255, 0.82)",
  "--cw-copy-muted": "rgba(255, 255, 255, 0.72)",
  "--cw-copy-dim": "rgba(255, 255, 255, 0.68)",
  "--cw-copy-faint": "rgba(255, 255, 255, 0.58)",
  "--cw-gold-label": "rgba(229, 190, 110, 0.82)",
  "--cw-glow-gold-soft": "rgba(229, 190, 110, 0.12)",
  "--cw-glow-blue-soft": "rgba(120, 180, 255, 0.12)",
  "--cw-hero-glow-gold": "rgba(229, 190, 110, 0.12)",
  "--cw-hero-glow-blue": "rgba(120, 180, 255, 0.12)",
  "--cw-chip-bg-soft": "rgba(255, 255, 255, 0.05)",
  "--cw-chip-border-soft": "rgba(255, 255, 255, 0.08)",
  "--cw-page-bg":
    "radial-gradient(circle at 10% 10%, rgba(229, 190, 110, 0.11), transparent 24%), radial-gradient(circle at 84% 14%, rgba(96, 132, 184, 0.11), transparent 30%), radial-gradient(circle at 74% 100%, rgba(31, 42, 64, 0.18), transparent 42%), radial-gradient(circle at 50% 120%, rgba(8, 12, 20, 0.42), transparent 48%), linear-gradient(180deg, #090d13 0%, #101720 44%, #07090d 100%)",
  "--cw-panel-bg":
    "radial-gradient(circle at top left, rgba(229, 190, 110, 0.08), transparent 32%), radial-gradient(circle at 85% 10%, rgba(120, 180, 255, 0.08), transparent 36%), linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.025)), rgba(19, 24, 33, 0.78)",
  "--cw-panel-bg-hero":
    "radial-gradient(circle at top left, rgba(229, 190, 110, 0.1), transparent 28%), radial-gradient(circle at bottom right, rgba(120, 180, 255, 0.08), transparent 36%), linear-gradient(180deg, rgba(255, 255, 255, 0.085), rgba(255, 255, 255, 0.03)), rgba(27, 33, 43, 0.92)",
  "--cw-panel-bg-hover":
    "radial-gradient(circle at top left, rgba(229, 190, 110, 0.12), transparent 32%), radial-gradient(circle at 85% 10%, rgba(120, 180, 255, 0.1), transparent 34%), linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.035)), rgba(31, 39, 52, 0.94)",
  "--cw-panel-bg-selected":
    "radial-gradient(circle at top left, rgba(229, 190, 110, 0.14), transparent 32%), radial-gradient(circle at 85% 10%, rgba(120, 180, 255, 0.11), transparent 34%), linear-gradient(180deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.035)), rgba(34, 41, 54, 0.96)",
  "--cw-panel-bg-subtle":
    "radial-gradient(circle at top left, rgba(229, 190, 110, 0.06), transparent 34%), linear-gradient(180deg, rgba(255, 255, 255, 0.065), rgba(255, 255, 255, 0.022)), rgba(24, 30, 40, 0.82)",
  "--cw-panel-border": "rgba(196, 182, 152, 0.16)",
  "--cw-panel-border-hero": "rgba(210, 193, 156, 0.18)",
  "--cw-panel-border-hover": "rgba(220, 203, 167, 0.22)",
  "--cw-panel-pill-border": "rgba(183, 190, 204, 0.12)",
  "--cw-panel-shadow":
    "0 24px 60px rgba(3, 5, 9, 0.5), 0 0 0 1px rgba(229, 190, 114, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
  "--cw-panel-shadow-soft":
    "0 10px 24px rgba(3, 5, 9, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
  "--cw-panel-shadow-hover":
    "0 28px 64px rgba(3, 5, 9, 0.56), 0 0 0 1px rgba(229, 190, 114, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
  "--cw-panel-shadow-selected":
    "0 28px 64px rgba(3, 5, 9, 0.56), 0 0 0 1px rgba(229, 190, 114, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
  "--cw-panel-chip-bg": "rgba(255, 255, 255, 0.055)",
  "--cw-panel-tag-bg": "rgba(255, 255, 255, 0.045)",
  "--cw-panel-blur": "blur(12px)",
  "--cw-control-bg":
    "linear-gradient(180deg, rgba(28, 36, 50, 0.96), rgba(11, 14, 19, 0.98))",
  "--cw-control-bg-soft": "rgba(33, 41, 57, 0.24)",
  "--cw-control-bg-selected": "rgba(51, 44, 30, 0.52)",
  "--cw-control-border": "var(--cw-border)",
  "--cw-control-border-strong": "var(--cw-panel-pill-border)",
  "--cw-control-shadow":
    "inset 0 1px 0 color-mix(in srgb, white 4%, transparent)",
  "--cw-control-shadow-elevated":
    "0 8px 18px rgba(3, 5, 9, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
  "--cw-button-bg":
    "linear-gradient(180deg, color-mix(in srgb, var(--cw-accent) 76%, #ffe4ab 24%), color-mix(in srgb, var(--cw-accent) 68%, #ab7d2d 32%))",
  "--cw-button-bg-hover":
    "linear-gradient(180deg, color-mix(in srgb, var(--cw-accent) 84%, #fff0c6 16%), color-mix(in srgb, var(--cw-accent) 74%, #b78633 26%))",
  "--cw-button-shadow":
    "0 16px 30px rgba(230, 191, 116, 0.16), 0 12px 28px color-mix(in srgb, var(--cw-bg) 66%, black 34%), inset 0 1px 0 color-mix(in srgb, white 24%, transparent)",
  "--cw-button-primary-fg": "#1b1307",
  "--cw-menu-bg":
    "linear-gradient(180deg, rgba(20, 23, 31, 0.985) 0%, rgba(14, 16, 22, 0.985) 100%)",
  "--cw-menu-border": "rgba(229, 190, 110, 0.35)",
  "--cw-menu-shadow":
    "0 24px 60px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
  "--cw-modal-scrim":
    "radial-gradient(circle at top, rgba(108, 118, 255, 0.12), transparent 30%), rgba(4, 8, 16, 0.68)",
  "--cw-success-bg": "rgba(86, 205, 154, 0.12)",
  "--cw-success-text": "rgba(176, 248, 219, 0.98)",
  "--cw-info-bg": "rgba(120, 180, 255, 0.12)",
  "--cw-info-text": "rgba(205, 229, 255, 0.96)",
  "--cw-warning-bg": "rgba(229, 190, 110, 0.12)",
  "--cw-warning-text": "rgba(255, 231, 178, 0.98)",
  "--cw-danger-bg": "rgba(255, 132, 132, 0.12)",
  "--cw-danger-border": "rgba(255, 132, 132, 0.18)",
  "--cw-danger-text": "rgba(255, 207, 207, 0.96)",
  "--cw-dashboard-card-gold": "var(--cw-accent)",
  "--cw-dashboard-accent-projects":
    "color-mix(in srgb, var(--cw-dashboard-card-gold) 65%, transparent)",
  "--cw-dashboard-accent-music": "rgba(255, 170, 90, 0.65)",
  "--cw-dashboard-accent-games": "rgba(120, 210, 255, 0.65)",
  "--cw-dashboard-accent-literature": "rgba(190, 150, 255, 0.65)",
  "--cw-dashboard-accent-community": "rgba(140, 255, 200, 0.55)",
  "--cw-dashboard-accent-profile":
    "color-mix(in srgb, var(--cw-accent) 40%, var(--cw-text) 60%)",
  "--cw-dashboard-accent-settings":
    "color-mix(in srgb, var(--cw-accent) 40%, var(--cw-text) 60%)",
};

const LIGHT_PALETTE = {
  "--color-accent": "#c89232",
  "--color-danger": "#c85c6f",
  "--color-success": "#2f8a68",
  "--color-warning": "#c89232",
  "--color-bg": "#eef3fb",
  "--color-surface": "rgba(255, 255, 255, 0.9)",
  "--color-surface-solid": "rgba(255, 255, 255, 0.98)",
  "--color-border": "rgba(45, 67, 110, 0.14)",
  "--color-text": "rgba(24, 33, 54, 0.96)",
  "--color-text-muted": "rgba(66, 83, 112, 0.72)",
  "--cw-bg": "var(--color-bg)",
  "--cw-surface": "var(--color-surface)",
  "--cw-surface-elevated": "var(--color-surface-solid)",
  "--cw-text": "var(--color-text)",
  "--cw-muted": "var(--color-text-muted)",
  "--cw-border": "var(--color-border)",
  "--cw-accent": "var(--color-accent)",
  "--cw-bg-soft": "#e7edf7",
  "--cw-surface-strong": "rgba(248, 251, 255, 0.98)",
  "--cw-border-cool": "rgba(45, 67, 110, 0.08)",
  "--cw-shadow": "rgba(45, 67, 110, 0.16)",
  "--cw-text-strong": "rgba(24, 33, 54, 0.98)",
  "--cw-copy-soft": "rgba(45, 60, 88, 0.84)",
  "--cw-copy-muted": "rgba(66, 83, 112, 0.76)",
  "--cw-copy-dim": "rgba(82, 96, 124, 0.72)",
  "--cw-copy-faint": "rgba(102, 116, 145, 0.66)",
  "--cw-gold-label": "rgba(160, 112, 26, 0.92)",
  "--cw-glow-gold-soft": "rgba(200, 146, 50, 0.1)",
  "--cw-glow-blue-soft": "rgba(125, 167, 226, 0.12)",
  "--cw-hero-glow-gold": "rgba(200, 146, 50, 0.1)",
  "--cw-hero-glow-blue": "rgba(125, 167, 226, 0.12)",
  "--cw-chip-bg-soft": "rgba(255, 255, 255, 0.72)",
  "--cw-chip-border-soft": "rgba(45, 67, 110, 0.08)",
  "--cw-page-bg":
    "radial-gradient(circle at 12% 8%, rgba(200, 146, 50, 0.08), transparent 24%), radial-gradient(circle at 84% 14%, rgba(125, 167, 226, 0.1), transparent 30%), linear-gradient(180deg, #f4f7fd 0%, #edf2fb 46%, #e7edf7 100%)",
  "--cw-panel-bg":
    "radial-gradient(circle at top left, rgba(200, 146, 50, 0.05), transparent 32%), radial-gradient(circle at 85% 10%, rgba(125, 167, 226, 0.06), transparent 36%), linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 255, 0.92)), rgba(255, 255, 255, 0.9)",
  "--cw-panel-bg-hero":
    "radial-gradient(circle at top left, rgba(200, 146, 50, 0.06), transparent 30%), radial-gradient(circle at bottom right, rgba(125, 167, 226, 0.07), transparent 36%), linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 250, 255, 0.94)), rgba(255, 255, 255, 0.98)",
  "--cw-panel-bg-hover": "rgba(255, 255, 255, 0.98)",
  "--cw-panel-bg-selected": "rgba(252, 247, 236, 0.98)",
  "--cw-panel-bg-subtle": "rgba(244, 247, 253, 0.96)",
  "--cw-panel-border": "rgba(45, 67, 110, 0.14)",
  "--cw-panel-border-hero": "rgba(45, 67, 110, 0.16)",
  "--cw-panel-border-hover": "rgba(200, 146, 50, 0.24)",
  "--cw-panel-pill-border": "rgba(45, 67, 110, 0.12)",
  "--cw-panel-shadow":
    "0 18px 42px rgba(45, 67, 110, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
  "--cw-panel-shadow-soft":
    "0 8px 18px rgba(45, 67, 110, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.55)",
  "--cw-panel-shadow-hover":
    "0 22px 48px rgba(45, 67, 110, 0.16), 0 0 0 1px rgba(200, 146, 50, 0.06)",
  "--cw-panel-shadow-selected":
    "0 22px 48px rgba(45, 67, 110, 0.16), 0 0 0 1px rgba(200, 146, 50, 0.08)",
  "--cw-panel-tag-bg": "rgba(238, 243, 251, 0.96)",
  "--cw-panel-chip-bg": "rgba(245, 248, 253, 0.96)",
  "--cw-panel-blur": "blur(10px)",
  "--cw-control-bg": "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(243, 247, 253, 0.96))",
  "--cw-control-bg-soft": "rgba(242, 246, 252, 0.98)",
  "--cw-control-bg-selected": "rgba(251, 244, 231, 0.98)",
  "--cw-control-border": "var(--cw-border)",
  "--cw-control-border-strong": "var(--cw-panel-pill-border)",
  "--cw-control-shadow": "inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 2px 6px rgba(45, 67, 110, 0.05)",
  "--cw-control-shadow-elevated": "0 8px 18px rgba(45, 67, 110, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
  "--cw-button-bg": "linear-gradient(180deg, #d6a448 0%, #b57a1f 100%)",
  "--cw-button-bg-hover": "linear-gradient(180deg, #e0b257 0%, #c28728 100%)",
  "--cw-button-shadow": "0 14px 28px rgba(200, 146, 50, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.35)",
  "--cw-button-primary-fg": "#ffffff",
  "--cw-menu-bg": "linear-gradient(180deg, rgba(255, 255, 255, 0.99) 0%, rgba(245, 248, 253, 0.99) 100%)",
  "--cw-menu-border": "rgba(45, 67, 110, 0.14)",
  "--cw-menu-shadow": "0 18px 42px rgba(45, 67, 110, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
  "--cw-modal-scrim": "radial-gradient(circle at top, rgba(125, 167, 226, 0.14), transparent 30%), rgba(234, 240, 249, 0.72)",
  "--cw-success-bg": "rgba(47, 138, 104, 0.12)",
  "--cw-success-text": "rgba(37, 104, 80, 0.96)",
  "--cw-info-bg": "rgba(91, 136, 212, 0.12)",
  "--cw-info-text": "rgba(56, 88, 145, 0.96)",
  "--cw-warning-bg": "rgba(200, 146, 50, 0.12)",
  "--cw-warning-text": "rgba(138, 96, 22, 0.96)",
  "--cw-danger-bg": "rgba(200, 92, 111, 0.12)",
  "--cw-danger-border": "rgba(200, 92, 111, 0.18)",
  "--cw-danger-text": "rgba(145, 57, 74, 0.96)",
  "--cw-dashboard-card-gold": "var(--cw-accent)",
  "--cw-dashboard-accent-projects": "color-mix(in srgb, var(--cw-dashboard-card-gold) 65%, transparent)",
  "--cw-dashboard-accent-music": "rgba(214, 142, 56, 0.52)",
  "--cw-dashboard-accent-games": "rgba(91, 136, 212, 0.5)",
  "--cw-dashboard-accent-literature": "rgba(143, 113, 196, 0.48)",
  "--cw-dashboard-accent-community": "rgba(47, 138, 104, 0.48)",
  "--cw-dashboard-accent-profile": "color-mix(in srgb, var(--cw-accent) 36%, var(--cw-text) 64%)",
  "--cw-dashboard-accent-settings": "color-mix(in srgb, var(--cw-accent) 36%, var(--cw-text) 64%)",
};

function createGlobalPalette(overrides) {
  return { ...DEFAULT_PALETTE, ...overrides };
}

const GLOBAL_STYLE_PALETTES = {
  community: createGlobalPalette({
    "--color-accent": "#f0c978",
    "--cw-page-bg": "radial-gradient(circle at 12% 8%, rgba(240, 201, 120, 0.14), transparent 24%), radial-gradient(circle at 82% 12%, rgba(98, 149, 223, 0.15), transparent 28%), radial-gradient(circle at 50% 100%, rgba(18, 32, 58, 0.28), transparent 44%), linear-gradient(180deg, #080b11 0%, #0d1420 44%, #05070b 100%)",
    "--cw-panel-bg": "radial-gradient(circle at top left, rgba(240, 201, 120, 0.1), transparent 30%), radial-gradient(circle at 85% 10%, rgba(120, 180, 255, 0.1), transparent 34%), linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.03)), rgba(21, 27, 38, 0.82)",
    "--cw-panel-border": "rgba(240, 201, 120, 0.2)",
  }),
  squash: createGlobalPalette({
    "--color-accent": "#ef9a43",
    "--cw-page-bg": "radial-gradient(circle at 14% 12%, rgba(239, 154, 67, 0.14), transparent 22%), radial-gradient(circle at 78% 8%, rgba(110, 137, 178, 0.08), transparent 24%), radial-gradient(circle at 48% 100%, rgba(33, 22, 12, 0.22), transparent 42%), linear-gradient(180deg, #0a0c10 0%, #11151b 46%, #060709 100%)",
    "--cw-control-bg-selected": "rgba(77, 49, 18, 0.54)",
  }),
  archipelago: createGlobalPalette({
    "--color-accent": "#69c8bb",
    "--cw-page-bg": "radial-gradient(circle at 11% 10%, rgba(105, 200, 187, 0.14), transparent 24%), radial-gradient(circle at 84% 14%, rgba(108, 148, 210, 0.14), transparent 28%), radial-gradient(circle at 54% 108%, rgba(24, 49, 58, 0.24), transparent 42%), linear-gradient(180deg, #081014 0%, #0d1820 44%, #05090c 100%)",
  }),
  "dashboard-classic": createGlobalPalette({
    "--color-accent": "#d9b36c",
    "--cw-page-bg": "radial-gradient(circle at 12% 10%, rgba(217, 179, 108, 0.12), transparent 22%), radial-gradient(circle at 82% 14%, rgba(113, 144, 192, 0.11), transparent 28%), radial-gradient(circle at 74% 100%, rgba(28, 36, 52, 0.2), transparent 40%), linear-gradient(180deg, #090d13 0%, #111722 46%, #06080b 100%)",
  }),
  "pale-shelter": createGlobalPalette({
    "--color-accent": "#c8ba9a",
    "--cw-page-bg": "radial-gradient(circle at 12% 12%, rgba(200, 186, 154, 0.12), transparent 22%), radial-gradient(circle at 82% 14%, rgba(122, 144, 175, 0.1), transparent 28%), radial-gradient(circle at 50% 102%, rgba(44, 46, 52, 0.22), transparent 42%), linear-gradient(180deg, #0a0b0e 0%, #14161b 46%, #08090b 100%)",
    "--cw-text-strong": "rgba(245, 241, 230, 0.95)",
  }),
  midnight: createGlobalPalette({
    "--color-accent": "#9db9ff",
    "--cw-page-bg": "radial-gradient(circle at 16% 10%, rgba(136, 164, 255, 0.1), transparent 20%), radial-gradient(circle at 84% 16%, rgba(111, 135, 233, 0.14), transparent 24%), radial-gradient(circle at 50% 100%, rgba(10, 16, 30, 0.34), transparent 40%), linear-gradient(180deg, #040508 0%, #090c12 44%, #020304 100%)",
    "--cw-panel-shadow": "0 30px 72px rgba(0, 0, 0, 0.66), 0 0 0 1px rgba(136, 164, 255, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
  }),
  "gold-standard": createGlobalPalette({
    "--color-accent": "#f3cd77",
    "--cw-page-bg": "radial-gradient(circle at 12% 10%, rgba(243, 205, 119, 0.16), transparent 22%), radial-gradient(circle at 84% 14%, rgba(112, 147, 212, 0.1), transparent 28%), radial-gradient(circle at 50% 102%, rgba(42, 28, 8, 0.18), transparent 42%), linear-gradient(180deg, #0a0b0d 0%, #13151a 44%, #070707 100%)",
    "--cw-button-primary-fg": "#120d05",
  }),
};

export const globalStyleMeta = Object.fromEntries(
  globalStyleOptions.map((option) => [
    option.value,
    {
      ...option,
      quickInfoTitle: option.label,
      quickInfoBody: option.description,
    },
  ])
);

export const themePalettes = {
  [DEFAULT_THEME]: DEFAULT_PALETTE,
  [LIGHT_THEME]: LIGHT_PALETTE,
};

export function normalizeThemeMode(value) {
  return themeModes.has(value) ? value : DEFAULT_THEME;
}

export function normalizeGlobalStyle(value) {
  return globalStyles.has(value) ? value : DEFAULT_GLOBAL_STYLE;
}

export function normalizeThemeFlavor(value) {
  return normalizeGlobalStyle(value);
}

export function normalizeAccentColor(value) {
  if (typeof value !== "string") {
    return DEFAULT_ACCENT_OVERRIDE;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue || normalizedValue === "default") {
    return DEFAULT_ACCENT_OVERRIDE;
  }

  return normalizedValue;
}

export function parseStoredThemePreferences(rawValue) {
  if (!rawValue) {
    return {
      themeMode: DEFAULT_THEME,
      globalStyle: DEFAULT_GLOBAL_STYLE,
      accentColor: DEFAULT_ACCENT_OVERRIDE,
    };
  }

  try {
    const parsed = JSON.parse(rawValue);

    return {
      themeMode: normalizeThemeMode(parsed?.theme ?? parsed?.themeMode),
      globalStyle: normalizeGlobalStyle(
        parsed?.globalStyle ?? parsed?.themeFlavor ?? parsed?.brandSkin
      ),
      accentColor: normalizeAccentColor(
        parsed?.accentOverride ?? parsed?.accentColor
      ),
    };
  } catch {
    return {
      themeMode: DEFAULT_THEME,
      globalStyle: DEFAULT_GLOBAL_STYLE,
      accentColor: DEFAULT_ACCENT_OVERRIDE,
    };
  }
}

export function serializeThemePreferences(themeMode, globalStyle, accentColor) {
  const safeGlobalStyle = normalizeGlobalStyle(globalStyle);

  return JSON.stringify({
    theme: themeMode,
    themeMode,
    globalStyle: safeGlobalStyle,
    themeFlavor: safeGlobalStyle,
    brandSkin: safeGlobalStyle,
    accentColor,
    accentOverride: accentColor,
  });
}

export function resolveThemeMode(themeMode, systemTheme) {
  if (themeMode === SYSTEM_THEME) {
    return systemTheme === SYSTEM_LIGHT ? LIGHT_THEME : DEFAULT_THEME;
  }

  return normalizeThemeMode(themeMode);
}

export function getThemeModeMeta(themeMode) {
  return themeModeMeta[normalizeThemeMode(themeMode)] || themeModeMeta[DEFAULT_THEME];
}

export function getGlobalStyleMeta(globalStyle) {
  return (
    globalStyleMeta[normalizeGlobalStyle(globalStyle)] ||
    globalStyleMeta[DEFAULT_GLOBAL_STYLE]
  );
}

export function getThemeFlavorMeta(globalStyle) {
  return getGlobalStyleMeta(globalStyle);
}

export function getThemeFlavorAccent(globalStyle) {
  return getGlobalStyleMeta(globalStyle).accent;
}

function getActivePalette(themeMode, resolvedTheme, globalStyle) {
  if (resolvedTheme === LIGHT_THEME) {
    return LIGHT_PALETTE;
  }

  if (themeMode === GLOBAL_THEME) {
    return (
      GLOBAL_STYLE_PALETTES[normalizeGlobalStyle(globalStyle)] ||
      GLOBAL_STYLE_PALETTES[DEFAULT_GLOBAL_STYLE]
    );
  }

  return DEFAULT_PALETTE;
}

export function getThemeCssVariables({
  themeMode,
  resolvedTheme,
  globalStyle = DEFAULT_GLOBAL_STYLE,
  accentOverride = DEFAULT_ACCENT_OVERRIDE,
}) {
  const palette = getActivePalette(themeMode, resolvedTheme, globalStyle);
  const accent = accentOverride || palette["--color-accent"] || DEFAULT_ACCENT;

  return {
    ...palette,
    "--color-accent": accent,
    "--color-accent-soft": `color-mix(in srgb, ${accent} 14%, transparent)`,
    "--color-accent-border": `color-mix(in srgb, ${accent} 38%, transparent)`,
    "--focus-ring": `color-mix(in srgb, ${accent} 22%, transparent)`,
    "--cw-accent": accent,
    "--cw-accent-soft": `color-mix(in srgb, ${accent} 14%, transparent)`,
    "--cw-control-border-active": `color-mix(in srgb, ${accent} 38%, transparent)`,
    "--cw-button-border": `color-mix(in srgb, ${accent} 38%, transparent)`,
    "--cw-button-border-hover": `color-mix(in srgb, ${accent} 56%, transparent)`,
    "--cw-dashboard-card-gold": accent,
  };
}

export function applyThemeToDocument(
  rootElement,
  { themeMode, resolvedTheme, globalStyle = DEFAULT_GLOBAL_STYLE, cssVariables }
) {
  if (!rootElement) {
    return;
  }

  const safeGlobalStyle = normalizeGlobalStyle(globalStyle);

  rootElement.dataset.theme = themeMode;
  rootElement.dataset.themeResolved = resolvedTheme;
  rootElement.dataset.themeMode = themeMode;
  rootElement.dataset.globalStyle = safeGlobalStyle;
  rootElement.dataset.themeFlavor = safeGlobalStyle;
  rootElement.dataset.brandSkin = safeGlobalStyle;

  Object.entries(cssVariables).forEach(([key, value]) => {
    rootElement.style.setProperty(key, value);
  });
}

export function getSystemThemeMode() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return SYSTEM_DARK;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? SYSTEM_DARK
    : SYSTEM_LIGHT;
}
