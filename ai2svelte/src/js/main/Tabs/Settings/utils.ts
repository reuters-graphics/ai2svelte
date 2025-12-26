// converts string in textarea to js object
export function convertStringToObject(s: string): { [key: string]: string } {
  const obj: { [key: string]: unknown } = {};
  s.trim()
    .split("\n")
    .forEach((line) => {
      const [key, ...rest] = line.split(":");
      if (key && rest.length) {
        let value: unknown = rest.join(":").trim();
        obj[key.trim()] = value;
      }
    });

  return obj;
}
