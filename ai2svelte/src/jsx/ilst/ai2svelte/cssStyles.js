// CSS text-transform equivalents
let caps = [
  { ai: "FontCapsOption.NORMALCAPS", html: "none" },
  { ai: "FontCapsOption.ALLCAPS", html: "uppercase" },
  { ai: "FontCapsOption.SMALLCAPS", html: "uppercase" },
];

// CSS text-align equivalents
let align = [
  { ai: "Justification.LEFT", html: "left" },
  { ai: "Justification.RIGHT", html: "right" },
  { ai: "Justification.CENTER", html: "center" },
  { ai: "Justification.FULLJUSTIFY", html: "justify" },
  { ai: "Justification.FULLJUSTIFYLASTLINELEFT", html: "justify" },
  { ai: "Justification.FULLJUSTIFYLASTLINECENTER", html: "justify" },
  { ai: "Justification.FULLJUSTIFYLASTLINERIGHT", html: "justify" },
];

let blendModes = [
  { ai: "BlendModes.MULTIPLY", html: "multiply" },
  { ai: "BlendModes.SCREEN", html: "screen" },
  { ai: "BlendModes.OVERLAY", html: "overlay" },
  { ai: "BlendModes.DARKEN", html: "darken" },
  { ai: "BlendModes.LIGHTEN", html: "lighten" },
  { ai: "BlendModes.COLOR_DODGE", html: "color-dodge" },
  { ai: "BlendModes.COLOR_BURN", html: "color-burn" },
  { ai: "BlendModes.HARD_LIGHT", html: "hard-light" },
  { ai: "BlendModes.SOFT_LIGHT", html: "soft-light" },
  { ai: "BlendModes.DIFFERENCE", html: "difference" },
  { ai: "BlendModes.EXCLUSION", html: "exclusion" },
  { ai: "BlendModes.HUE", html: "hue" },
  { ai: "BlendModes.SATURATION", html: "saturation" },
  { ai: "BlendModes.COLOR", html: "color" },
  { ai: "BlendModes.LUMINOSITY", html: "luminosity" },
  { ai: "BlendModes.NORMAL", html: "normal" },
];

// list of CSS properties used for translating AI text styles
// (used for creating a unique identifier for each style)
let cssTextStyleProperties = [
  //'top' // used with vshift; not independent of other properties
  "position",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "color",
  "line-height",
  "height", // used for point-type paragraph styles
  "letter-spacing",
  "opacity",
  "padding-top",
  "padding-bottom",
  "text-align",
  "text-transform",
  "mix-blend-mode",
  "vertical-align", // for superscript
];

let cssPrecision = 4;

export { caps, align, blendModes, cssTextStyleProperties, cssPrecision };
