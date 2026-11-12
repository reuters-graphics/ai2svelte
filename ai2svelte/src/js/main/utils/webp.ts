import { defaultOptions } from "@jsquash/webp/meta";
import { fs } from "../../lib/cep/node";

export type WebpJob = { src: string; dest: string; quality: number };

// ponytail: codec glue + wasm are static files (src/js/public/webp, copied from
// @jsquash/webp/codec/enc) loaded at runtime; bundling the Emscripten glue breaks
// the CEP build. Re-copy them if @jsquash/webp is upgraded.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ready: Promise<any> | undefined;
const initEncoder = () =>
  (ready ??= import(
    /* @vite-ignore */ new URL("../webp/webp_enc.js", document.baseURI).href
  ).then((m) =>
    m.default({
      locateFile: (f: string) => new URL("../webp/" + f, document.baseURI).href,
    }),
  ));

// ExtendScript can't export WebP, so it exports PNGs and queues jobs;
// encode each PNG to its .webp dest, then delete the PNG.
// Returns the dests that failed.
export async function convertWebpJobs(jobs: WebpJob[]): Promise<string[]> {
  const failed: string[] = [];
  for (const { src, dest, quality } of jobs) {
    try {
      const enc = await initEncoder();
      const bytes = fs.readFileSync(src);
      const bmp = await createImageBitmap(
        new Blob([bytes], { type: "image/png" }),
      );
      const canvas = new OffscreenCanvas(bmp.width, bmp.height);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bmp, 0, 0);
      const data = ctx.getImageData(0, 0, bmp.width, bmp.height);
      const out = enc.encode(data.data, data.width, data.height, {
        ...defaultOptions,
        quality,
      });
      if (!out) throw new Error("Encoding error.");
      fs.writeFileSync(dest, new Uint8Array(out.buffer));
      fs.unlinkSync(src);
    } catch (error) {
      console.error("[ai2svelte] webp conversion failed:", src, error);
      failed.push(dest);
    }
  }
  return failed;
}
