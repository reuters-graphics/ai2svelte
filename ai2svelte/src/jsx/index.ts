// @include './lib/json2.js'

import { ns } from "../shared/shared";

import * as ilst from "./ilst/ilst";

// @ts-expect-error -- `window` only exists when this runs in a CEP panel
const host = typeof $ !== "undefined" ? $ : window;

// A safe way to get the app name since some versions of Adobe Apps broken BridgeTalk in various places (e.g. After Effects 24-25)
// in that case we have to do various checks per app to deterimine the app name

const getAppNameSafely = (): ApplicationName | "unknown" => {
  const compare = (a: string, b: string) => {
    return a.toLowerCase().indexOf(b.toLowerCase()) > -1;
  };
  const exists = (a: unknown) => typeof a !== "undefined";
  const isBridgeTalkWorking =
    typeof BridgeTalk !== "undefined" &&
    typeof BridgeTalk.appName !== "undefined";

  if (isBridgeTalkWorking) {
    return BridgeTalk.appName;
  } else if (app) {
    // @ts-expect-error -- Bolt multi-app check: not on Illustrator's Application type
    if (exists(app.name)) {
      // @ts-expect-error -- Bolt multi-app check: not on Illustrator's Application type
      const name: string = app.name;
      if (compare(name, "photoshop")) return "photoshop";
      if (compare(name, "illustrator")) return "illustrator";
      if (compare(name, "audition")) return "audition";
      if (compare(name, "bridge")) return "bridge";
      if (compare(name, "indesign")) return "indesign";
    }
    // @ts-expect-error -- Bolt multi-app check: not on Illustrator's Application type
    if (exists(app.appName)) {
      // @ts-expect-error -- Bolt multi-app check: not on Illustrator's Application type
      const appName: string = app.appName;
      if (compare(appName, "after effects")) return "aftereffects";
      if (compare(appName, "animate")) return "animate";
    }
    // @ts-expect-error -- Bolt multi-app check: not on Illustrator's Application type
    if (exists(app.path)) {
      // @ts-expect-error -- Bolt multi-app check: not on Illustrator's Application type
      const path = app.path;
      if (compare(path, "premiere")) return "premierepro";
    }
    // @ts-expect-error -- Bolt multi-app check: not on Illustrator's Application type
    if (exists(app.getEncoderHost) && exists(AMEFrontendEvent)) {
      return "ame";
    }
  }
  return "unknown";
};

switch (getAppNameSafely()) {
  case "illustrator":
  case "illustratorbeta":
    host[ns] = ilst;
    break;
}

export type Scripts = typeof ilst;

// https://extendscript.docsforadobe.dev/interapplication-communication/bridgetalk-class.html?highlight=bridgetalk#appname
type ApplicationName =
  | "aftereffects"
  | "aftereffectsbeta"
  | "ame"
  | "amebeta"
  | "audition"
  | "auditionbeta"
  | "animate"
  | "animatebeta"
  | "bridge"
  | "bridgebeta"
  // | "flash"
  | "illustrator"
  | "illustratorbeta"
  | "indesign"
  | "indesignbeta"
  // | "indesignserver"
  | "photoshop"
  | "photoshopbeta"
  | "premierepro"
  | "premiereprobeta";
