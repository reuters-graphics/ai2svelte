// Same shape as the panel's RasterJob (src/js/main/utils/rasterJobs.ts)
export type EngineRasterJob = {
  src: string;
  dest: string;
  format: "png" | "png24" | "webp";
  quality: number;
  tile: { id: string; varKey: string } | null;
  svelte: string | null;
};
// undefined when the export stops early (e.g. no document open)
export function main(settingsArg: Record<string, unknown>):
  | {
      missingFontFamilies: string[];
      rasterJobs: EngineRasterJob[];
      errors: string[];
      warnings: string[];
    }
  | undefined;
export function exportProgress(
  done: number,
  total: number,
  title: string,
): void;
export function finishExport(summary: {
  converted?: number;
  dropped?: number;
  failed?: number;
  keptAsPng?: number;
}): void;
