// --- Rune-based user preference state ---
// Stores UI preferences that persist across documents: accent colour, theme,
// and per-font-family CSS variable mappings.
//
// Written to user-settings.json on every change (see TabBar.svelte).
// For document-specific state (AI settings, CSS styles), see stores.ts.
// Do NOT add Illustrator-document-scoped data here.

export const userData = $state({
  accentColor: "#dc4300",
  theme: "dark",
  fontsConfig: {
    Knowledge2017: "var(--theme-font-family-sans-serif), Knowledge, sans-serif",
    Knowledge2017TF:
      "var(--theme-font-family-sans-serif), Knowledge, sans-serif",
  } as { [key: string]: string },
});

// Session-only: whether a newer release is available. Not persisted —
// dismissing the update ticker only lasts for the current panel session.
export const updateStatus = $state({
  checked: false,
  available: false,
  version: null as string | null,
  url: null as string | null,
  dismissed: false,
});
