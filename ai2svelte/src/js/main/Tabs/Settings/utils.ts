// converts string in textarea to js object
export function convertStringToObject(s: string): Record<string, string> {
  const obj: Record<string, string> = {};
  s.trim()
    .split("\n")
    .forEach((line) => {
      const [key, ...rest] = line.split(":");
      if (key && rest.length) {
        obj[key.trim()] = rest.join(":").trim();
      }
    });

  return obj;
}
