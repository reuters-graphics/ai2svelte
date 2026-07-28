const RELEASES_URL =
  "https://api.github.com/repos/reuters-graphics/ai2svelte/releases/latest";

export function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/^v/i, "")
      .split(".")
      .map((n) => parseInt(n, 10) || 0);

  const [lMajor, lMinor, lPatch] = parse(latest);
  const [cMajor, cMinor, cPatch] = parse(current);

  if (lMajor !== cMajor) return lMajor > cMajor;
  if (lMinor !== cMinor) return lMinor > cMinor;
  return lPatch > cPatch;
}

export async function checkForUpdate(
  currentVersion: string
): Promise<{ version: string; url: string } | null> {
  try {
    const response = await fetch(RELEASES_URL);
    if (!response.ok) return null;

    const release = await response.json();
    const latestVersion: string = release.tag_name;
    const url: string = release.html_url;
    if (!latestVersion || !url) return null;

    return isNewerVersion(latestVersion, currentVersion)
      ? { version: latestVersion, url }
      : null;
  } catch {
    return null;
  }
}
