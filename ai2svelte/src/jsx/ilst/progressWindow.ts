// ScriptUI supports update(), but Adobe's Window declarations omit it.
interface ProgressWindow extends Window {
  update(): void;
}

export function createProgressWindow(name: string) {
  const window = new Window(
    "palette",
    name,
    [150, 150, 600, 260],
  ) as ProgressWindow;
  const panel = window.add("panel", [10, 10, 440, 100], "Progress");
  const bar = panel.add("progressbar", [20, 35, 410, 60], 0, 100);
  const label = panel.add("statictext", [20, 20, 410, 35], "0%");
  window.show();
  return { window, panel, bar, label };
}
