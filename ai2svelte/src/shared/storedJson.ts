export function parseStoredJson(raw: string | null): unknown {
  return raw === null ? {} : JSON.parse(raw);
}
