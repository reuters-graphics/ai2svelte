export function canonicalizeLanguageTag(value: string): string {
  const tag = value.trim();
  if (!tag) throw new Error("Enter a language tag, such as en or fr-CA.");

  try {
    const [canonical] = Intl.getCanonicalLocales(tag);
    if (!canonical) throw new Error();
    return canonical;
  } catch {
    throw new Error(`“${tag}” is not a valid BCP 47 language tag.`);
  }
}

export function canonicalizeLanguageTags(values: string[]): string[] {
  const canonical = values.map(canonicalizeLanguageTag);
  return canonical.filter(
    (tag, index) =>
      canonical.findIndex(
        (candidate) => candidate.toLowerCase() === tag.toLowerCase(),
      ) === index,
  );
}

export function languageDisplayName(tag: string): string {
  try {
    return new Intl.DisplayNames([tag], { type: "language" }).of(tag) ?? tag;
  } catch {
    return tag;
  }
}
