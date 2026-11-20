export interface TextPreviewStatus {
  active: boolean;
  sourceIdentity: string;
  language: string;
  translated: number;
  untranslated: number;
  overflowed: number;
}
