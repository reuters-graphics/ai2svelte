// CSS text-transform equivalents
let caps = [
  {"ai":"FontCapsOption.NORMALCAPS","html":"none"},
  {"ai":"FontCapsOption.ALLCAPS","html":"uppercase"},
  {"ai":"FontCapsOption.SMALLCAPS","html":"uppercase"}
];

// CSS text-align equivalents
let align = [
  {"ai":"Justification.LEFT","html":"left"},
  {"ai":"Justification.RIGHT","html":"right"},
  {"ai":"Justification.CENTER","html":"center"},
  {"ai":"Justification.FULLJUSTIFY","html":"justify"},
  {"ai":"Justification.FULLJUSTIFYLASTLINELEFT","html":"justify"},
  {"ai":"Justification.FULLJUSTIFYLASTLINECENTER","html":"justify"},
  {"ai":"Justification.FULLJUSTIFYLASTLINERIGHT","html":"justify"}
];

let blendModes = [
  {ai: "BlendModes.MULTIPLY", html: "multiply"}
];

// list of CSS properties used for translating AI text styles
// (used for creating a unique identifier for each style)
let cssTextStyleProperties = [
  //'top' // used with vshift; not independent of other properties
  'position',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'color',
  'line-height',
  'height', // used for point-type paragraph styles
  'letter-spacing',
  'opacity',
  'padding-top',
  'padding-bottom',
  'text-align',
  'text-transform',
  'mix-blend-mode',
  'vertical-align' // for superscript
];

let cssPrecision = 4;

export { caps, align, blendModes, cssTextStyleProperties, cssPrecision };