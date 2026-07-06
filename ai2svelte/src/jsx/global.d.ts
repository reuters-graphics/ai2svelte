//@ts-ignore
declare var JSON: {
  stringify(value: unknown): string;
  parse(text: string): object;
};

// types-for-adobe's XMPScript.d.ts omits XMPFile and several real XMPConst/
// XMPMeta members documented in Adobe's XMP Scripting Guide; fill the gaps.
interface XMPConstConstructor {
  UNKNOWN: string;
  OPEN_FOR_READ: string;
  OPEN_FOR_UPDATE: string;
  CLOSE_UPDATE_SAFELY: string;
}

interface XMPMetaConstructor {
  registerNamespace(namespace: string, prefix: string): string;
}

interface XMPFileInstance {
  getXMP(): XMPMetaInstance;
  putXMP(meta: XMPMetaInstance): void;
  closeFile(closeFlags?: string): void;
}

interface XMPFileConstructor {
  new (path: string, format: string, openFlags: string): XMPFileInstance;
}

declare const XMPFile: XMPFileConstructor;
