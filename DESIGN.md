# Design Spec: Mono / Hairline / Dither

A portable visual language: base styles, primitives and rules. It is not a page template. It
says what things look like and how they behave, not where they go. Any layout built from these
parts should feel like it belongs to the same family.

The values given are the reference implementation (the ai2svelte site). Token names are generic:
swap the accent and the typefaces for another brand and keep the rules.

---

## 1. Principles

- **Dark-first, technical, editorial.** It should read like a well-made instrument, not a
  marketing page.
- **Monospace carries structure.** Everything that labels, titles or acts is set in mono. A
  humanist sans is used only for running prose.
- **Hairlines, not boxes.** Structure comes from 1px rules. Surfaces are flat. Separation
  comes from lines rather than gaps, fills or shadows.
- **Square.** No border-radius, anywhere.
- **Near-monochrome plus one hot accent.** Grays do the work. The accent is scarce and mostly
  appears as a response to the user.
- **1-bit texture.** Ordered/dithered pixel texture is the signature, in imagery, in generative
  backgrounds and in how text resolves.
- **Quiet at rest, alive on interaction.** Nothing moves by itself. Hover, focus, scroll and drag
  bring things to life.

---

## 2. Color

### Tokens

| Token | Role | Dark (default) | Light |
|---|---|---|---|
| `--bg` | Base surface | `#050505` | `#fafafa` |
| `--surface-deep` | Deepest field, behind imagery | `#000000` | `#ffffff` |
| `--line` | Hairlines, outline controls | `#2b2b2b` | `#dcdcdc` |
| `--line-hover` | Hairline under hover | `#4a4a4a` | `#b5b5b5` |
| `--text` | Primary text, control labels | `#f3f3f3` | `#111111` |
| `--heading` | Titles at full strength | `#ffffff` | `#000000` |
| `--copy` | Body prose | `#b9b9b9` | `#4a4a4a` |
| `--muted` | Meta, fine print, inactive indicators | `#828282` | `#707070` |
| `--accent` | Brand fill: primary action, active indicator, focus | `#dc4300` | `#dc4300` |
| `--accent-strong` | Accent hover; accent-colored text on light surfaces | `#c23b00` | `#c23b00` |
| `--on-accent` | Text on accent fills | `#ffffff` | `#ffffff` |
| `--hover-bg` | Tint behind hovered neutral controls | `rgba(255,255,255,.04)` | `rgba(0,0,0,.04)` |
| `--track` | Inactive track of sliders/scrubbers | `rgba(255,255,255,.2)` | `rgba(0,0,0,.15)` |
| `--scrim` | Ground for controls placed over busy art | `rgba(5,5,5,.72)` | `rgba(250,250,250,.72)` |
| `--shadow` | The single elevation shadow | `rgba(0,0,0,.4)` | `rgba(0,0,0,.1)` |

### Rules

1. **One hue.** The accent is the only chromatic color in the interface. Extra hues are allowed
   only inside generative art (§8).
2. **The accent marks what is active or primary.** Use it for the primary action, active
   indicators, progress/position, focus rings and small eyebrow text. Never use it for body text,
   resting borders or large background areas.
3. **Accent text** uses `--accent` on dark surfaces and `--accent-strong` on light ones.
4. **Hover:** accents darken (`--accent` → `--accent-strong`), and neutrals brighten (`--line` →
   `--line-hover`, plus `--hover-bg`).
5. **No gradients in the interface.** Use flat fills and 1px lines. The only soft effect is the
   accent glow on an active indicator.
6. **Titles have two strengths:** subdued (50% opacity) at rest, full when their block is
   active.
7. **Contrast floor:** every text token clears 4.5:1 on `--bg` and `--surface-deep` in both themes.

---

## 3. Theming

- Dark is the default. Light is enabled by `data-theme="light"` on the root, and `color-scheme` is
  set to match.
- **No flash:** a render-blocking inline script applies the saved theme (falling back to
  `prefers-color-scheme`) before first paint. Share the storage key across related sites.
- The theme toggle is a text control that names the mode it switches **to**.
- Monochrome white-on-black art is inverted with `filter: invert(1)` for light mode, not
  re-exported. Screenshots of real dark UIs stay dark in both themes.

---

## 4. Typography

### Families

| Token | Reference face | Weights | Use |
|---|---|---|---|
| `--mono` | Geist Mono | 300–600 | Display, titles, labels, controls, wordmarks |
| `--sans` | Inter | 400, 500 | Prose, meta |

Self-host and preload the fonts. Use `-webkit-font-smoothing: antialiased`.

### Roles

| Role | Family | Size / line-height | Weight | Tracking | Case |
|---|---|---|---|---|---|
| Display | mono | 48/53 → 40/44 → 34/38 as width shrinks | 300 | −0.08em | Sentence |
| Title | mono | 16 / 1, cap-trimmed | 500 | +0.1em | UPPER |
| Eyebrow | mono | 12 / 15 | 500 | +0.1em | UPPER, accent |
| Label / control | mono | 12 / 15 | 400 | +0.5px | UPPER |
| Body | sans | 14 / 20 | 400 | 0 | Sentence |
| Item title | sans | 16 / 19 | 500 | 0 | Sentence |
| Item meta | sans | 14 / 17 | 400 | 0 | Sentence |
| Fine print | sans | 12 / 16 | 400 | 0 | Sentence, `--muted` |

### Rules

1. **Light display, heavy labels.** The largest type is the thinnest, with tight negative tracking.
   The smallest type is the widest-tracked and set in caps.
2. **Cap-height trim** on titles so they sit optically flush with adjacent marks (the indicator).
   Use `text-box: trim-both cap alphabetic`, with measured negative margins as a fallback.
3. **Mono never reflows.** Text can be animated glyph by glyph without layout shift (§8).
4. **Only prose links are underlined.** Other links inherit color and have no decoration.
5. **Casing:** mono UI text is ALL CAPS; sentences are sentence case. Action labels are short
   imperatives (two or three words).

### Wordmarks

Set wordmarks as live mono text rather than images. Hand-kern pairs with per-letter em margins so
the mark scales as one piece. Size it with a container query (`font-size: min(<cap>, <k>cqw)`, where
`k` ≈ 100 ÷ the mark's width in em), so it fills its container and never overflows. Trim the
half-leading with negative em margins. Decorative instances are `aria-hidden` and
non-interactive.

---

## 5. Space, shape, structure

- **8px base unit.** Steps: 8, 12, 16, 24, 32, 40, 56, 64, 80, 120. Use tight steps inside
  components and the large steps (80/120) only between major blocks.
- **A ruled column:** content sits in a max-width column (reference 1180px) bounded by 1px
  vertical rules, and blocks stack edge to edge, divided by 1px horizontal rules
  (`box-shadow: 0 1px 0 var(--line)`) rather than margins.
- **Radius:** 0.
- **Elevation: one level only.** An element that genuinely floats above others gets a 1px `--line`
  outline and `drop-shadow(0 32px 32px var(--shadow))`. Everything else is flat.

---

## 6. Primitives

### Button

- Padding 8 × 12, 1px border, label type (mono 12/15, caps, +0.5px), `nowrap`.
- **Outline (default):** transparent fill, `--line` border, `--text` label. Hover: `--line-hover`
  plus `--hover-bg`.
- **Primary:** `--accent` fill and border, `--on-accent` label. Hover: `--accent-strong`.
- At most one primary per group, listed first.
- Over imagery or generative art, outline buttons take a `--scrim` fill.
- Transition color, border and background at 160ms ease.

### Indicator + title

The system's one heading pattern: a **12×12 square indicator**, an 8px gap, then a **title**
cap-trimmed to the indicator's height. Use it for any block heading.

| State | Indicator | Title |
|---|---|---|
| Rest | `--muted` | `--heading` at 50% |
| Active | `--accent` + glow `0 0 40px var(--accent), 0 0 12px var(--accent)` | 100%, dithers in (§8) |

### Ruled grid

- Cells share single 1px borders (a left border between columns, a top border between rows). There
  are no gaps and no cell fills.
- Cell padding is 32. Content is spaced top to bottom (`justify-content: space-between`) so cells
  breathe.
- Mixing cell spans (e.g. a span-2 cell beside a single cell) keeps a ruled grid from reading as a
  spreadsheet.

### Panel

A `--bg` surface with a 1px outline and 16px padding and gap. It may use the single elevation level
when it overlaps imagery.

### Media item

A 1px `--line` border on `--bg`. The image is 3:2 (`object-fit: cover`) with a hairline beneath it.
Below that sits meta at 16 × 12 padding (item title + item meta).

### Horizontal rail

A scrolling row of fixed-width items with a 16px gap. The native scrollbar is hidden
(`scrollbar-width: none`) and `overscroll-behavior-x: contain` is set. It is paired with a scrubber
(below), never left without a visible position cue.

### Scrubber

- **Track:** 2px, `--track`. **Knob:** 64px `--accent` bar moved by `transform`.
- **Hit area:** extend it about 14px above and below with a pseudo-element. The visual stays 2px.
- **Pointer:** drag the knob (keeping the grab offset), or press the track to jump and drag. Use
  pointer capture, with `grab`/`grabbing` cursors.
- **Keyboard:** arrows step one item, PageUp/PageDown step one view, Home/End jump to the ends.
- **Idle** (nothing to scroll): the knob fills the track, and the control is removed from the tab
  order and marked `aria-disabled`.
- **ARIA:** `role="scrollbar"`, `aria-controls`, `aria-orientation`, and `aria-valuenow` 0–100.

### Reveal

Secondary actions can be hidden until their block is active. Animate
`grid-template-rows: 0fr → 1fr` together with `opacity` (240ms). The inner wrapper has
`overflow: hidden; min-height: 0`. On touch/narrow screens, show them always.

---

## 7. Interaction model

- **Every hover has a touch equivalent.** Gate hover effects with `@media (hover: hover)`. Under
  `(hover: none)`, activate indicators by scroll position instead: active once the element rises
  above ~25% from the top of the viewport, and it stays active above that line. (Use an
  `IntersectionObserver` with `rootMargin: "100000px 0px -75% 0px"` so fast scrolls can't skip it.)
- **Activation is block-level.** Hovering or focusing anywhere in a block (`:hover`,
  `:focus-within`) activates its indicator, title and reveals.
- **Focus:** `:focus-visible` gets a 1px `--accent` outline, offset on thin controls and inset on
  large scroll regions.
- **Drag-to-scroll** on mouse only, after a 5px threshold. A drag must not trigger a click on the
  item underneath.

---

## 8. Signature effects

### Dither-in text

When a title becomes active, it condenses out of ASCII noise, left to right.

- **Ramp** (sparse → dense, punctuation only, so nothing mid-flight reads as a word):
  `` .,:;-~=+*!#%&@$ ``
- Each character churns along the ramp in step with its progress (with ±1.5 steps of jitter so
  neighbours differ), then locks to its real glyph.
- **Per-cell finish:** 170ms + 25ms × index + random 0–230ms. The glyph re-rolls every ~20–60ms.
- Drive it by elapsed time, not frames. Leave spaces untouched. Don't restart a title that is
  already running.
- Pin the real text as `aria-label`. Skip it under reduced motion. It needs a monospaced face.

### Dithered imagery

Photographic or illustrative subjects rendered as **1-bit ordered dither**: white pixels on pure
black with a visible pixel grid. Keep them monochrome so they invert for light mode. They work as
large, low-key backgrounds behind content. Dim them (e.g. 55%) where content overlaps on small
screens.

### Dithered generative backdrop

An optional WebGL fluid (or similar) field rendered through the same dither aesthetic.

- **Pointer-driven only**, with no autoplay. Content above it is `pointer-events: none` where it
  is decorative.
- **Color:** the dye starts at `--accent` and decays through adjacent hues (reference: magenta
  `#9c0c81` → violet `#4e0bac` → deep red `#6f0000`, eased `cubic-bezier(.03,.6,.48,1)`). This is
  the only place the palette widens.
- **Dither:** 8×8 Bayer, 2 levels per channel, 4px cells, sampled per cell so the silhouette is
  blocky. Add a light bloom on bright pixels.
- Use a transparent canvas. Mount it lazily when in view, halve the resolution on phones, and
  don't render it under reduced motion.
- Its container clips it (`overflow: hidden; isolation: isolate`) so it can't bleed into sticky
  layers.

### Warm-up

Large decorative marks can rest at `--line` (barely visible, like an embossed mark) and warm to
`--heading` while the pointer is in their block (420ms).

---

## 9. Motion

| What | Duration | Easing |
|---|---|---|
| Control color/border | 160ms | ease |
| Indicator glow, title strength | 220ms | ease |
| Reveal | 240ms | ease |
| Large decorative color shifts | 420ms | ease |

Use only `ease`, with no bounces or springs. Motion is **responsive, never ambient**. Under
`prefers-reduced-motion`, drop the dither-in and the generative backdrops, and use instant scrolling.

---

## 10. Responsive

- Step the display type down (48 → 40 → 34) as width shrinks. Other roles stay fixed.
- Ruled grids drop columns rather than shrinking cells, and borders are redrawn for the new rows.
- Overlapping compositions un-overlap into normal flow on narrow screens.
- Action groups stack vertically on phones.
- Treat hover capability as a separate axis from width (§7).

---

## 11. Accessibility

- Every text token meets 4.5:1 in both themes.
- Decorative art, indicators, wordmarks and backdrops are `aria-hidden` with empty `alt`.
  Informative images get real `alt`.
- Animated text keeps its real accessible name.
- Honor `prefers-reduced-motion` wherever motion is added.
- Small visual controls get enlarged invisible hit areas.
- Custom controls get full keyboard support and ARIA.

---

## 12. Do / Don't

**Do**
- Build structure from 1px rules.
- Use mono caps for anything that labels or acts, and the sans for sentences.
- Keep the accent scarce and tied to state.
- Use monochrome dithered art that inverts cleanly.
- Give every hover a touch counterpart.

**Don't**
- Round corners, fill cards, or put gaps in ruled grids.
- Add a second interface hue or a gradient.
- Stack elevation or scatter shadows.
- Animate anything that the user didn't trigger.
- Animate proportional type.
- Put accent text on light surfaces without `--accent-strong`.

---

## 13. Tokens

```css
:root {
  color-scheme: dark;
  --bg: #050505;
  --surface-deep: #000000;
  --line: #2b2b2b;
  --line-hover: #4a4a4a;
  --text: #f3f3f3;
  --heading: #ffffff;
  --copy: #b9b9b9;
  --muted: #828282;
  --accent: #dc4300;
  --accent-strong: #c23b00;
  --on-accent: #ffffff;
  --hover-bg: rgba(255, 255, 255, 0.04);
  --track: rgba(255, 255, 255, 0.2);
  --scrim: rgba(5, 5, 5, 0.72);
  --shadow: rgba(0, 0, 0, 0.4);

  --mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  --sans: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  --column: 1180px;
  --unit: 8px;

  --dur-fast: 160ms;
  --dur-base: 220ms;
  --dur-reveal: 240ms;
  --dur-slow: 420ms;
}

:root[data-theme="light"] {
  color-scheme: light;
  --bg: #fafafa;
  --surface-deep: #ffffff;
  --line: #dcdcdc;
  --line-hover: #b5b5b5;
  --text: #111111;
  --heading: #000000;
  --copy: #4a4a4a;
  --muted: #707070;
  --hover-bg: rgba(0, 0, 0, 0.04);
  --track: rgba(0, 0, 0, 0.15);
  --scrim: rgba(250, 250, 250, 0.72);
  --shadow: rgba(0, 0, 0, 0.1);
}
```
