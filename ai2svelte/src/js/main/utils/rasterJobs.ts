import { defaultOptions } from "@jsquash/webp/meta";
import { fs, zlib } from "../../lib/cep/node";

// Queued by exportRasterImage in ai2svelte.js. src is the file Illustrator
// wrote; dest is the final file (differs only for webp: src is a PNG).
export type RasterJob = {
  src: string;
  dest: string;
  format: "png" | "png24" | "webp";
  quality: number;
  tile: { id: string; varKey: string } | null;
  svelte: string | null;
  // webp that couldn't be encoded: src was renamed to the .png beside dest and
  // the .svelte relinked to it. A later successful encode relinks it back.
  keptAsPng?: boolean;
};

// ponytail: codec glue + wasm are static files (src/js/public/webp, copied from
// @jsquash/webp/codec/enc) loaded at runtime; bundling the Emscripten glue breaks
// the CEP build. Re-copy them if @jsquash/webp is upgraded.
const GLUE_URL = () => new URL("../webp/webp_enc.js", document.baseURI).href;
const WASM_DIR = () => new URL("../webp/", document.baseURI).href;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ready: Promise<any> | undefined;
const initEncoder = () =>
  (ready ??= import(/* @vite-ignore */ GLUE_URL()).then((m) =>
    m.default({ locateFile: (f: string) => WASM_DIR() + f }),
  ));

// ponytail: checks the APIs and that the wasm encoder loads, no test encode;
// an encode that fails later still falls back to PNG (see keepAsPng)
let support: Promise<boolean> | undefined;
export const checkWebpSupport = () =>
  (support ??= (async () => {
    try {
      if (
        typeof OffscreenCanvas === "undefined" ||
        typeof createImageBitmap === "undefined"
      )
        return false;
      await initEncoder();
      return true;
    } catch (error) {
      console.warn("[ai2svelte] webp encoding unavailable:", error);
      return false;
    }
  })());

type Encode = (data: ImageData, quality: number) => Promise<Uint8Array>;

// libwebp leaves out the alpha channel itself when every pixel is opaque
const encodeOnMainThread: Encode = async (data, quality) => {
  const enc = await initEncoder();
  const out = enc.encode(data.data, data.width, data.height, {
    ...defaultOptions,
    quality,
  });
  if (!out) throw new Error("Encoding error.");
  return new Uint8Array(out.buffer);
};

// WebP encoding is ~94% of the image pass and libwebp is single-threaded, so
// each lane gets its own worker running the same wasm encoder. A blob module
// worker, because CEP's file:// origin can't load a worker file directly; it
// imports the glue by absolute URL.
let workerUrl: string | undefined;
type Lane = { encode: Encode; close: () => void };
const mainThreadLane: Lane = { encode: encodeOnMainThread, close: () => {} };

function makeWorkerLane(): Lane {
  try {
    workerUrl ??= URL.createObjectURL(
      new Blob(
        [
          `import m from ${JSON.stringify(GLUE_URL())};
let enc;
onmessage = async ({ data: { pixels, w, h, opts } }) => {
  try {
    enc ??= await m({ locateFile: (f) => ${JSON.stringify(WASM_DIR())} + f });
    const out = enc.encode(pixels, w, h, opts);
    if (!out) throw new Error("Encoding error.");
    postMessage({ out: new Uint8Array(out.buffer) });
  } catch (e) {
    postMessage({ error: String(e) });
  }
};`,
        ],
        { type: "text/javascript" },
      ),
    );
    const worker = new Worker(workerUrl, { type: "module" });
    let broken = false;
    // set up front: a worker that can't load the encoder errors before any
    // message is sent, and the request after it must not wait forever
    let pending: {
      resolve: (b: Uint8Array) => void;
      reject: (e: Error) => void;
    } | null = null;
    worker.onmessage = (e) => {
      const p = pending;
      pending = null;
      if (e.data.error) p?.reject(new Error(e.data.error));
      else p?.resolve(e.data.out);
    };
    worker.onerror = (e) => {
      e.preventDefault();
      console.warn(
        "[ai2svelte] webp worker failed, using main thread:",
        e.message,
      );
      broken = true;
      const p = pending;
      pending = null;
      p?.reject(new Error(e.message || "worker error"));
    };
    const encode: Encode = (data, quality) => {
      // a worker that failed once (e.g. couldn't load the encoder) stays off
      if (broken) return encodeOnMainThread(data, quality);
      return new Promise<Uint8Array>((resolve, reject) => {
        pending = { resolve, reject };
        // copied, not transferred, so a failed worker can hand it to the fallback
        worker.postMessage({
          pixels: data.data,
          w: data.width,
          h: data.height,
          opts: { ...defaultOptions, quality },
        });
      }).catch((error) => {
        console.warn(
          "[ai2svelte] webp worker failed, using main thread:",
          error,
        );
        broken = true;
        worker.terminate();
        return encodeOnMainThread(data, quality);
      });
    };
    return { encode, close: () => worker.terminate() };
  } catch (error) {
    console.warn("[ai2svelte] webp workers unavailable:", error);
    return mainThreadLane;
  }
}

// One lane per spare core (1..8): a dual-core machine still gets one worker,
// and memory stays at one decoded image per lane. Lanes without a worker
// encode on the main thread, as before.
// ponytail: 8-lane cap is ~160 MB of pixels for 4.6 MP images; lower it if
// panels run out of memory on huge untiled images.
function laneCount() {
  return Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 2) - 1));
}

export function scanAlpha(rgba: Uint8ClampedArray | Uint8Array) {
  let clear = true;
  let opaque = true;
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i] !== 0) clear = false;
    if (rgba[i] !== 255) opaque = false;
    if (!clear && !opaque) break;
  }
  return { clear, opaque };
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf: Uint8Array) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array) {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

// Colour-management and density chunks worth carrying over from the source PNG
const KEEP_CHUNKS = ["sRGB", "gAMA", "cHRM", "iCCP", "pHYs"];
function readKeptChunks(png: Uint8Array) {
  const kept: Uint8Array[] = [];
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  for (let p = 8; p + 12 <= png.length;) {
    const len = view.getUint32(p);
    const type = String.fromCharCode(...png.subarray(p + 4, p + 8));
    if (KEEP_CHUNKS.includes(type)) kept.push(png.slice(p, p + 12 + len));
    p += 12 + len;
  }
  return kept;
}

// Opaque RGBA -> 8-bit RGB PNG (colour type 2), so browsers know it's opaque
// from the header. Per-row filter picked by the usual min-sum-of-abs heuristic.
export function encodeRgbPng(
  rgba: Uint8ClampedArray | Uint8Array,
  w: number,
  h: number,
  deflate: (raw: Uint8Array) => Uint8Array,
  extraChunks: Uint8Array[] = [],
) {
  const stride = w * 3;
  const raw = new Uint8Array(h * (stride + 1));
  let prev = new Uint8Array(stride);
  const cur = new Uint8Array(stride);
  const cand = Array.from({ length: 5 }, () => new Uint8Array(stride));
  for (let y = 0; y < h; y++) {
    for (let x = 0, i = y * w * 4; x < w; x++, i += 4) {
      cur[x * 3] = rgba[i];
      cur[x * 3 + 1] = rgba[i + 1];
      cur[x * 3 + 2] = rgba[i + 2];
    }
    let best = 0;
    let bestSum = Infinity;
    for (let f = 0; f < 5; f++) {
      const out = cand[f];
      let sum = 0;
      for (let i = 0; i < stride; i++) {
        const a = i >= 3 ? cur[i - 3] : 0;
        const b = prev[i];
        const c = i >= 3 ? prev[i - 3] : 0;
        let pred = 0;
        if (f === 1) pred = a;
        else if (f === 2) pred = b;
        else if (f === 3) pred = (a + b) >> 1;
        else if (f === 4) {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        }
        const v = (cur[i] - pred) & 0xff;
        out[i] = v;
        sum += v < 128 ? v : 256 - v;
      }
      if (sum < bestSum) {
        bestSum = sum;
        best = f;
      }
    }
    raw[y * (stride + 1)] = best;
    raw.set(cand[best], y * (stride + 1) + 1);
    prev = cur.slice();
  }
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, w);
  view.setUint32(4, h);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit, RGB, deflate, adaptive, no interlace
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    ...extraChunks,
    pngChunk("IDAT", deflate(raw)),
    pngChunk("IEND", new Uint8Array(0)),
  ];
  const png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    png.set(p, o);
    o += p.length;
  }
  return png;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Removes dropped tiles from generated .svelte text: the CSS var binding, the
// container-query rule that uses it and any preload link. That alone stops the
// fetch; the empty div goes too unless its id repeats (a tagged layer's tiles
// share ids across artboards), where removing it could hit another artboard's.
export function removeTiles(
  svelte: string,
  tiles: { id: string; varKey: string; files: string[] }[],
) {
  for (const { id, varKey, files } of tiles) {
    svelte = svelte
      // one binding per line; values hold `}` (${processedPath}) but never `>`
      .replace(new RegExp(`\\s*style:--${esc(varKey)}=\\{[^\\r\\n>]*\\};?`), "")
      .replace(
        new RegExp(
          `#${esc(id)} \\{\\s*background-image: var\\(--${esc(varKey)}\\);\\s*\\}\\s*`,
        ),
        "",
      );
    for (const f of files) {
      svelte = svelte.replace(
        new RegExp(`<link rel="preload"[^>]*href="[^"]*/${esc(f)}"[^>]*/>\\r?`),
        "",
      );
    }
    const div = new RegExp(`[\\t ]*<div id="${esc(id)}"[^>]*></div>\\r?`, "g");
    if ((svelte.match(div) || []).length === 1)
      svelte = svelte.replace(div, "");
  }
  return svelte;
}

// Points the .svelte's references to one image file at another (same folder)
export function relinkImage(svelte: string, from: string, to: string) {
  return svelte.replace(
    new RegExp(`/${esc(from)}(?=["'\`)\\s])`, "g"),
    `/${to}`,
  );
}

async function decode(path: string) {
  const bmp = await createImageBitmap(
    new Blob([new Uint8Array(fs.readFileSync(path))], { type: "image/png" }),
    { colorSpaceConversion: "none", premultiplyAlpha: "none" },
  );
  const ctx = new OffscreenCanvas(bmp.width, bmp.height).getContext("2d")!;
  ctx.drawImage(bmp, 0, 0);
  return ctx.getImageData(0, 0, bmp.width, bmp.height);
}

async function finish(
  job: RasterJob,
  data: ImageData,
  opaque: boolean,
  encode: Encode,
) {
  if (job.format === "webp") {
    fs.writeFileSync(job.dest, await encode(data, job.quality));
    fs.unlinkSync(job.src);
  } else if (job.format === "png24" && opaque) {
    // ponytail: png (8-bit) keeps its palette transparency; it's cheap to decode
    const src = new Uint8Array(fs.readFileSync(job.src));
    const png = encodeRgbPng(
      data.data,
      data.width,
      data.height,
      (raw) => new Uint8Array(zlib.deflateSync(raw, { level: 9 })),
      readKeptChunks(src),
    );
    fs.writeFileSync(job.dest, png);
  }
}

const fileName = (path: string) => path.split(/[\\/]/).pop()!;

// Post-processes ExtendScript's raster exports: encodes webp, deletes tiles
// that came out fully transparent (and patches them out of the .svelte file),
// and rewrites opaque png24 tiles without an alpha channel.
// Jobs run in parallel lanes (see laneCount). onProgress runs as each job
// finishes (drives the export's progress bar).
export async function processRasterJobs(
  jobs: RasterJob[],
  onProgress?: (done: number, total: number, title: string) => unknown,
) {
  const failed: RasterJob[] = [];
  let converted = 0;
  let droppedTiles = 0;
  let keptAsPng = 0;
  const webpOk =
    !jobs.some((j) => j.format === "webp") || (await checkWebpSupport());
  // svelte path -> [from, to] file-name swaps, applied at the end
  const relinks = new Map<string, [string, string][]>();
  const relink = (job: RasterJob, from: string, to: string) => {
    if (!job.svelte) return;
    if (!relinks.has(job.svelte)) relinks.set(job.svelte, []);
    relinks.get(job.svelte)!.push([from, to]);
  };
  // the .svelte names dest (x.webp); without an encode, the PNG Illustrator
  // wrote (x.webp.png) becomes x.png so the link still resolves
  const keepAsPng = (job: RasterJob): RasterJob => {
    const png = job.dest.replace(/\.webp$/i, "") + ".png";
    if (job.keptAsPng || !fs.existsSync(job.src)) return job;
    fs.renameSync(job.src, png);
    relink(job, fileName(job.dest), fileName(png));
    return { ...job, src: png, keptAsPng: true };
  };
  const fail = (job: RasterJob) => {
    if (job.format !== "webp") return failed.push(job);
    try {
      failed.push(keepAsPng(job));
    } catch (error) {
      console.error("[ai2svelte] couldn't keep webp as png:", job.src, error);
      failed.push(job);
    }
  };
  const succeeded = (job: RasterJob) => {
    if (job.format !== "webp") return;
    converted++;
    if (job.keptAsPng) relink(job, fileName(job.src), fileName(job.dest));
  };
  // a tile is dropped only if every density of it is clear (1x can lose art
  // that 2x keeps: Illustrator exports without anti-aliasing)
  const tiles = new Map<string, { jobs: RasterJob[]; clear: boolean }>();
  const deferred: RasterJob[] = [];

  const lanes = Array.from(
    { length: Math.min(laneCount(), jobs.length) },
    makeWorkerLane,
  );
  let next = 0;
  let done = 0;
  const report = async (job: RasterJob) => {
    done++;
    const what = job.format === "webp" ? "Converted to WebP" : "Checked tile";
    await onProgress?.(
      done,
      jobs.length,
      `${what}: ${fileName(job.dest)} (${done} of ${jobs.length})`,
    );
  };
  const runJob = async (job: RasterJob, encode: Encode) => {
    if (job.format === "webp" && !webpOk) {
      // ponytail: clear webp tiles aren't dropped here (that needs a decode)
      try {
        keepAsPng(job);
        keptAsPng++;
      } catch (error) {
        console.error("[ai2svelte] couldn't keep webp as png:", job.src, error);
        failed.push(job);
      }
      return;
    }
    try {
      const data = await decode(job.src);
      const { clear, opaque } = scanAlpha(data.data);
      if (job.tile) {
        const key = `${job.svelte}\n${job.tile.id}\n${job.tile.varKey}`;
        const t = tiles.get(key) ?? { jobs: [], clear: true };
        t.jobs.push(job);
        t.clear &&= clear;
        tiles.set(key, t);
        if (clear) {
          deferred.push(job);
          return;
        }
      }
      await finish(job, data, opaque, encode);
      succeeded(job);
    } catch (error) {
      console.error(
        "[ai2svelte] image post-processing failed:",
        job.src,
        error,
      );
      fail(job);
    }
  };
  // each lane pulls the next job until none are left
  await Promise.all(
    lanes.map(async (lane) => {
      while (next < jobs.length) {
        const job = jobs[next++];
        await runJob(job, lane.encode);
        await report(job);
      }
    }),
  );

  const dropped = new Map<string, Parameters<typeof removeTiles>[1]>();
  for (const [key, t] of tiles) {
    if (!t.clear) continue;
    const [svelte, id, varKey] = key.split("\n");
    for (const j of t.jobs) {
      for (const f of new Set([j.src, j.dest])) {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }
    }
    const files = t.jobs.map((j) => fileName(j.dest));
    droppedTiles++;
    if (!dropped.has(svelte)) dropped.set(svelte, []);
    dropped.get(svelte)!.push({ id, varKey, files });
  }
  // clear at one density but not another: finish it after all
  for (const job of deferred) {
    const t = [...tiles.values()].find((t) => t.jobs.includes(job));
    if (t && !t.clear) {
      try {
        await finish(job, await decode(job.src), false, encodeOnMainThread);
        succeeded(job);
      } catch (error) {
        console.error(
          "[ai2svelte] image post-processing failed:",
          job.src,
          error,
        );
        fail(job);
      }
    }
  }

  lanes.forEach((lane) => lane.close());

  for (const [svelte, list] of dropped) {
    if (svelte === "null" || !fs.existsSync(svelte)) continue;
    fs.writeFileSync(
      svelte,
      removeTiles(fs.readFileSync(svelte, "utf8"), list),
    );
    console.log(
      `[ai2svelte] dropped ${list.length} empty tile(s) from ${svelte}`,
    );
  }
  for (const [svelte, swaps] of relinks) {
    if (!fs.existsSync(svelte)) continue;
    let text = fs.readFileSync(svelte, "utf8");
    for (const [from, to] of swaps) text = relinkImage(text, from, to);
    fs.writeFileSync(svelte, text);
  }
  return { failed, converted, dropped: droppedTiles, keptAsPng };
}
