export function main(settingsArg: any): string[];
export function exportProgress(done: number, total: number, title: string): void;
export function finishExport(summary: {
  converted?: number;
  dropped?: number;
  failed?: number;
  keptAsPng?: number;
}): void;
