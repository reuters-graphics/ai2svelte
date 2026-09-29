/**
 * Screenshot every example page for the thumbnails on the home page.
 *
 * The examples are live Svelte components, so these are captures of the real
 * rendered page rather than anything exported out of Illustrator. The page
 * chrome (the download, view-source and artboard controls) is hidden first so
 * only the graphic itself is in frame.
 *
 * Usage: pnpm capture-examples [-- --width=900 --scale=2 --only=1,4]
 */
import { spawn } from "node:child_process";
import { mkdir, readdir, rm } from "node:fs/promises";
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";

import sharp from "sharp";
import { chromium } from "playwright";

const ASPECT = 3 / 2;
const OUT_DIR = new URL("../public/images/examples/", import.meta.url);
const EXAMPLES = [1, 2, 3, 4, 5, 6, 7];

/**
 * Capture width per example, for the ones the default width frames badly. The
 * width decides which artboard the component renders, so it controls how large
 * the graphic is drawn. Example 7 is mostly type, which is unreadable at
 * thumbnail size unless captured narrow.
 */
const WIDTH_OVERRIDES = { 7: 560 };

const args = new Map(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, v = "true"] = a.slice(2).split("=");
      return [k, v];
    })
);

const baseUrl = args.get("base-url") ?? "http://localhost:4321/ai2svelte";
/** Capture width in CSS pixels. Picks which artboard the component renders. */
const width = Number(args.get("width") ?? 900);
/** An explicit --width applies to every example, overrides included. */
const widthForced = args.has("width");
/** Device pixel ratio, so the thumbnail stays sharp on retina screens. */
const scale = Number(args.get("scale") ?? 2);
/** Width of the written file. The card paints it at 320px. */
const outWidth = Number(args.get("out-width") ?? 960);
const only = args.get("only")?.split(",").map(Number);

const widthFor = (n) =>
  widthForced ? width : (WIDTH_OVERRIDES[n] ?? width);

const targets = only?.length ? EXAMPLES.filter((n) => only.includes(n)) : EXAMPLES;

const reachable = async (url) => {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
};

/** Start `astro dev` if nothing is already serving the site. */
const startServer = async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const child = spawn("pnpm", ["dev"], { cwd: root, stdio: "ignore" });

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await reachable(`${baseUrl}/`)) return child;
  }

  child.kill();
  throw new Error(`dev server never came up at ${baseUrl}/`);
};

/**
 * Wait for the things that would otherwise be captured half-drawn: webfonts,
 * images, and the video and 3D examples, which paint nothing until they have
 * decoded a frame.
 */
const settle = async (page) => {
  // Astro re-injects the dev toolbar after load, so removing the element once
  // isn't enough. A style rule keeps it out of frame however often it returns.
  await page.addStyleTag({
    content: "astro-dev-toolbar { display: none !important; }",
  });

  await page.evaluate(async () => {
    document.querySelector("astro-dev-toolbar")?.remove();

    // The page chrome is fixed over the graphic. Hide rather than remove it, so
    // nothing reflows and the capture matches what the page really lays out.
    for (const el of document.querySelectorAll(".ex-chrome"))
      el.style.visibility = "hidden";

    await document.fonts.ready;

    await Promise.all(
      [...document.images].map((img) =>
        img.complete
          ? null
          : new Promise((res) => {
              img.addEventListener("load", res, { once: true });
              img.addEventListener("error", res, { once: true });
            })
      )
    );

    // Seek videos off frame zero, which is usually black, then hold that frame.
    await Promise.all(
      [...document.querySelectorAll("video")].map(async (video) => {
        try {
          video.muted = true;
          await video.play().catch(() => {});
          video.pause();
          if (video.duration && Number.isFinite(video.duration))
            video.currentTime = Math.min(1.5, video.duration / 2);
          await new Promise((res) => {
            video.addEventListener("seeked", res, { once: true });
            setTimeout(res, 2000);
          });
        } catch {
          /* a video that won't decode still shouldn't fail the run */
        }
      })
    );
  });

  await page.waitForTimeout(2500);
};

const server = (await reachable(`${baseUrl}/`)) ? null : await startServer();

const browser = await chromium.launch();
const context = await browser.newContext({
  deviceScaleFactor: scale,
  reducedMotion: "reduce",
});

await mkdir(OUT_DIR, { recursive: true });

// Drop captures for examples that no longer exist. Anything still listed is
// left alone, so a --only run refreshes its targets without wiping the rest.
for (const file of await readdir(OUT_DIR).catch(() => [])) {
  const match = /^example(\d+)\.(webp|png)$/.exec(file);
  if (match && !EXAMPLES.includes(Number(match[1])))
    await rm(new URL(file, OUT_DIR));
}

try {
  for (const n of targets) {
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));

    const shotWidth = widthFor(n);
    await page.setViewportSize({
      width: shotWidth,
      height: Math.round(shotWidth / ASPECT),
    });

    await page.goto(`${baseUrl}/example${n}/`, { waitUntil: "load" });
    await settle(page);

    const shot = await page.screenshot({ type: "png" });
    const out = new URL(`example${n}.webp`, OUT_DIR);

    await sharp(shot)
      .resize(outWidth, Math.round(outWidth / ASPECT), { fit: "cover" })
      .webp({ quality: 82 })
      .toFile(fileURLToPath(out));

    const { size } = statSync(fileURLToPath(out));
    console.log(
      `example${n} → captured at ${shotWidth}px, ` +
        `${outWidth}x${Math.round(outWidth / ASPECT)}, ` +
        `${Math.round(size / 1024)} KB` +
        (errors.length ? `  (page errors: ${errors.length})` : "")
    );

    await page.close();
  }
} finally {
  await browser.close();
  server?.kill();
}
