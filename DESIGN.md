# Design Spec: Mono / Hairline / Dither

A portable spec for the visual language of the ai2svelte homepage. Values under
**Reference** are the ones ai2svelte ships. Token names are generic so the system can be
re-skinned. Swap the accent and the fonts for a new brand and keep the rules.

---

## 1. Character

- **Dark-first, technical, editorial.** It should read like a well-made instrument panel, not a
  marketing page.
- **Monospace-led.** Mono carries every piece of structure (headlines, labels, buttons, the
  logotype). A humanist sans carries only running prose.
- **Hairline-ruled.** Structure comes from 1px lines, not from filled cards, gaps or shadows.
- **Square.** No border-radius anywhere, including the indicator dot.
- **Near-monochrome plus one hot accent.** Grays do the work. The accent is scarce, and it
  mostly appears as a response to the user (hover, focus, scroll).
- **1-bit texture.** Ordered/dithered pixel texture is the signature: dithered imagery, dithered
  fluid, and headings that "dither in" from ASCII noise.
- **Restraint at rest, life on interaction.** The page is quiet until touched. Then dots glow,
  titles resolve, buttons reveal, and the dye moves.

---

## 2. Color

### Tokens

| Token | Role | Dark (default) | Light |
|---|---|---|---|
| `--bg` | Page, card, panel surface | `#050505` | `#fafafa` |
| `--surface-deep` | Hero field behind imagery | `#000000` | `#ffffff` |
| `--line` | All hairlines, outline buttons, idle logotype | `#2b2b2b` | `#dcdcdc` |
| `--line-hover` | Hairline under hover | `#4a4a4a` | `#b5b5b5` |
| `--text` | Primary text, button labels | `#f3f3f3` | `#111111` |
| `--heading` | Section titles at full strength, lit logotype | `#ffffff` | `#000000` |
| `--copy` | Body prose | `#b9b9b9` | `#4a4a4a` |
| `--muted` | Credits, meta, resting dot | `#828282` | `#707070` |
| `--accent` | Brand fill: primary button, lit dot, knob, focus ring | `#dc4300` | `#dc4300` |
| `--accent-strong` | Primary hover; accent-colored text on light surfaces | `#c23b00` | `#c23b00` |
| `--on-accent` | Text on accent fills | `#ffffff` | `#ffffff` |
| `--hover-bg` | Tint behind hovered outline buttons | `rgba(255,255,255,.04)` | `rgba(0,0,0,.04)` |
| `--track` | Scrubber track | `rgba(255,255,255,.2)` | `rgba(0,0,0,.15)` |
| `--scrim` | Ground for outline buttons over busy art | `rgba(5,5,5,.72)` | `rgba(250,250,250,.72)` |
| `--shadow` | Floating-card drop shadow | `rgba(0,0,0,.4)` | `rgba(0,0,0,.1)` |

### Rules

1. **One hue.** The accent is the only chromatic color in the UI. Everything else is neutral
   gray. Extra hues are allowed only inside generative art (see the fluid dye in §9).
2. **The accent is for:** the primary CTA, the eyebrow line, lit indicator dots, the scrubber
   knob, and focus rings. It is never used for body text, borders at rest, or backgrounds of
   whole sections.
3. **Accent text:** use `--accent` on dark surfaces and `--accent-strong` on light ones, so small
   accent text always clears 4.5:1.
4. **Hover darkens accents** (`--accent` → `--accent-strong`) and brightens neutrals (`--line` →
   `--line-hover`, plus `--hover-bg`).
5. **No gradients in UI chrome.** Flat fills and 1px lines only. Glow (box-shadow in the accent)
   is the only soft effect, and it is reserved for the lit dot.
6. **Two text strengths for headings.** Titles sit at 50% opacity at rest and go to 100% when their
   block is active.
7. **Contrast floor:** every text token must clear 4.5:1 on `--bg` and `--surface-deep` in both
   themes.

---

## 3. Theming

- Dark is the default. Light is enabled by `data-theme="light"` on `<html>`, and `color-scheme` is
  set to match.
- **No flash:** an inline, render-blocking script in `<head>` reads the saved theme from
  `localStorage` and falls back to `prefers-color-scheme`. It sets the attribute before first paint.
  Share the storage key with any sibling site (e.g. the docs) so the theme carries across.
- The toggle is a plain text button that names the mode you would switch **to** (`LIGHT` / `DARK`).
  It is not an icon.
- **Artwork:** monochrome white-on-black art (logotype, dithered imagery) is inverted with
  `filter: invert(1)` in light mode rather than re-exported. **Product screenshots stay dark** in
  both themes, because they depict a real dark UI.

---

## 4. Typography

### Families

| Token | Family (reference) | Weights | Use |
|---|---|---|---|
| `--mono` | Geist Mono | 300–600 (variable) | Display, headings, labels, buttons, logotype |
| `--sans` | Inter | 400, 500 | Prose, card meta |

Fallbacks: `ui-monospace, SFMono-Regular, Menlo, monospace` / `system-ui, -apple-system,
"Segoe UI", sans-serif`. Self-host both and **preload** the woff2 files. Do not load from a
third-party stylesheet at runtime. Apply `-webkit-font-smoothing: antialiased` to the body.

### Scale

| Role | Family | Size / line-height | Weight | Tracking | Case | Color |
|---|---|---|---|---|---|---|
| Display (H1) | mono | 48 / 53 (≤900: 40/44, ≤640: 34/38) | 300 | −0.08em | Sentence | `--text` |
| Section / card title | mono | 16 / 1, trimmed to cap height | 500 | +0.1em | UPPER | `--heading` |
| Eyebrow | mono | 12 / 15 | 500 | +0.1em | UPPER | accent text |
| Button / label | mono | 12 / 15 | 400 | +0.04em | UPPER | `--text` |
| Body | sans | 14 / 20 | 400 | 0 | Sentence | `--copy` |
| Card title (media) | sans | 16 / 19 | 500 | 0 | Sentence | `--text` |
| Card meta (media) | sans | 14 / 17 | 400 | 0 | Sentence | `--copy` |
| Credit / fine print | sans | 12 / 16 | 400 | 0 | Sentence | `--muted`, links underlined |

### Rules

1. **Light display, heavy labels.** The biggest type is the thinnest (300, tight negative
   tracking). The smallest type is the widest-tracked and in caps.
2. **Cap-height trim on titles.** Titles sit optically flush with the 12px dot beside them. Use
   `text-box: trim-both cap alphabetic`, and in engines without it apply equivalent negative
   top/bottom margins measured for the font.
3. **Mono glyphs never shift layout.** Rely on this: animated text (§8) can swap characters
   without reflow.
4. **Links in prose** are the only underlined text. Elsewhere `text-decoration: none` and
   `color: inherit`.

### Logotype

- Set as **live text** in mono at weight 550, not as an image, so it stays crisp and themable.
- **Hand-kerned:** each letter is its own `inline-block` with a per-pair negative `margin-left`
  in **em** (reference kerns, a→e: `0, −.077, −.039, −.064, −.071, −.093, −.083, −.219, −.090`),
  so it scales as one piece.
- Sized by **container query**: the section is `container-type: inline-size` and the mark uses
  `font-size: min(<max>px, <k>cqw)`, where `k = 100 / (mark advance width in em)`. The mark then
  fills a fixed share of the container and never overflows.
- Trim the half-leading with negative em margins so the box hugs the letterforms.
- `user-select: none`, `pointer-events: none`, `aria-hidden` (decorative).
- A small inline SVG version of the same mark (120px wide) is used in the topbar.

---

## 5. Copy patterns

- **Mono UI text is ALL CAPS:** titles, eyebrows, buttons, toggles (`READ DOCS`, `READ MORE`).
- **Prose is sentence case**, short and concrete. It names the user's action and outcome and avoids
  adjectives about the product.
- **Headline:** one declarative sentence ending in a full stop that states the transformation.
- **Eyebrow:** a short `FROM X TO Y` style framing line above the headline.
- **CTAs:** imperative, two to three words. Offer **one primary and at most one secondary** per
  group, primary first.
- **Feature titles:** the feature's noun name in caps (two words max). The body is one or two
  sentences.
- **Credit line:** small, muted, one sentence of provenance with links.

---

## 6. Layout

### Shell

- A centered column with max width **1180px** (`width: min(1180px, 100%)`) and **1px `--line`
  rules on the left and right**, running the full page height. The page reads as a ruled sheet.
- Sections stack edge to edge inside the shell. **Separate sections with a 1px bottom hairline**
  (`box-shadow: 0 1px 0 var(--line)`), never with margins.
- End the shell with an empty 64px tail so the side rules finish below the last section.

### Grid

- **Feature grids are ruled tables, not card galleries.** Use no gaps and no card fills. Adjacent
  cells share a single 1px border (`border-left` on every cell except the first in a row; `border-top`
  on every row after the first).
- The reference rhythm is a **2-up lead row** (hero features), then a **3-up row** followed by a
  row with one **span-2 cell** + one single cell. Varying cell widths keeps the ruled grid from
  feeling like a spreadsheet.
- Cells use `flex-direction: column; justify-content: space-between`: the title at the top, the
  body at the bottom, and generous empty space between them (min heights ~280–320px desktop).

### Spacing

8px base. The steps in use: **8, 12, 16, 24, 32, 40, 56, 64, 80, 120**.

| Context | Value |
|---|---|
| Button padding | 8 × 12 |
| Gap between buttons | 8 (nav), 12–16 (CTA groups) |
| Floating card padding / internal gap | 16 / 16 |
| Grid cell padding | 32 |
| Section side padding | 32 (20 on mobile) |
| Media-card meta padding | 16 × 12 |
| Rail gap | 16 |
| Showcase section vertical padding / head-to-rail | 120 / 120 (mobile 64–72 / 56) |
| Outro padding / gap | 80 × 32 / 40 |

### Shape and depth

- **`border-radius: 0` everywhere.**
- Depth is used once: the floating hero card gets `filter: drop-shadow(0 32px 32px var(--shadow))`
  and a 1px `outline` in `--line`. Nothing else floats.

---

## 7. Components

### Button

- `inline-flex`, padding 8 × 12, 1px border, mono 12/15, weight 400, +0.04em, caps, `nowrap`.
- **Outline (default):** transparent fill, `--line` border, `--text` label. Hover: `--line-hover`
  border and `--hover-bg` fill.
- **Primary:** `--accent` fill and border, `--on-accent` label. Hover: `--accent-strong`.
- Transition `background-color, border-color, color` at **160ms ease**.
- **Over busy art** (dye, imagery), outline buttons get a `--scrim` fill so they stay legible.

### Topbar

- **Sticky**, 80px tall, `--bg` fill, bottom hairline, `z-index` above content.
- Logotype SVG at the left. A button row at the right (docs, repo, theme toggle), all outline
  buttons with an 8px gap.
- ≤640px: height auto, 20px padding.

### Hero

- A full-bleed field (800px tall on desktop) in `--surface-deep`, bottom hairline, `overflow: hidden`.
- **Background art:** a large dithered image covering the field (`object-fit: cover`, anchored
  top-left), decorative and `aria-hidden`.
- **Floating card**, overlapping the art on the left (~⅓ down, 32px from the edge, ~640px wide).
  It holds the eyebrow → H1 → body → credit → CTA row (16px gap; the CTA row adds 16px top padding).
  It has a `--bg` fill, 1px outline and the drop shadow.
- **Product visual** on the right: an image of the real product UI (~464px wide), right-aligned
  about 24px from the edge.
- ≤900px: everything stacks in flow (card, then product visual centered), the art dims to 55% opacity
  and is anchored top-center, and the card gets 20px side margins.

### Section title (dot + title)

- A row of **dot (12×12 square) + 8px gap + title**. The title is cap-trimmed to the dot's height.
- Used for grid cells and section heads alike. It is the system's one heading pattern.

### Feature cell

- Section title at the top. Body copy at the bottom, followed by a **hidden `READ MORE` outline
  button**.
- **At rest:** title at 50% opacity, dot muted, button collapsed.
- **Active** (hover / focus-within): title at 100% (220ms), dot lit (§8), title dithers in, and
  the button **reveals** by animating `grid-template-rows: 0fr → 1fr` together with `opacity 0 → 1`
  (240ms ease; the inner wrapper has `overflow: hidden; min-height: 0`). The height animates
  with no JS measurement.
- ≤640px (touch): the button is always shown and the title is at full opacity.

### Section head with scrubber

- Section title on the left. A **scrubber rule** on the right (280px wide, full width ≤640 under the
  title).
- See §10 for behavior.

### Media rail

- A horizontal `overflow-x: auto` flex row with a 16px gap and 32px side padding, the **scrollbar hidden**
  (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`) and
  `overscroll-behavior-x: contain`. The scrubber replaces the scrollbar.
- **Media card:** fixed 322px wide, 1px `--line` border, `--bg` fill. The image is **3:2** (`object-fit:
  cover`) with a hairline under it. Meta below it: sans title 16/19 w500 plus copy 14/17.

### Outro

- A centered column: **giant logotype** above a CTA row (primary + outline), 40px gap, 80 × 32
  padding.
- A generative fluid backdrop (§9) fills the section behind (`position: absolute; inset: 0`, z-index 0).
  Content sits at z-index 1. The section uses `overflow: hidden; isolation: isolate` so the canvas
  can't escape into the sticky topbar's layer.
- The logotype rests in **`--line`** (barely visible, like an embossed mark) and **warms to
  `--heading` over 420ms** while the pointer is anywhere in the section.
- ≤640px: CTA rows stack vertically.

---

## 8. The indicator dot and the dither-in

The dot is the system's signature micro-interaction. It turns each section heading into a
status light.

### Dot states

| State | Fill | Glow |
|---|---|---|
| Rest | `--muted` | none |
| Lit | `--accent` | `box-shadow: 0 0 40px 0 var(--accent), 0 0 12px 0 var(--accent)` |

Transition: `background, box-shadow` at 220ms ease.

### What lights it

- **Hover-capable devices** (`@media (hover: hover)`): the dot lights while its block is
  `:hover` or `:focus-within`. This is pure CSS.
- **Touch devices** (`@media (hover: none)`): the dot lights by **scroll position**. It turns on
  when it rises above a line at 25% of the viewport height from the top, and stays lit above it.
  Implement this with an `IntersectionObserver` using `rootMargin: "100000px 0px -75% 0px"`; the huge
  top margin makes the region unbounded upward, so a fast scroll can't skip it.

### Dither-in (title reveal)

When a dot lights (on pointer-enter, or on scroll-in for touch), its title **condenses out of ASCII
noise, left to right**:

- **Density ramp**, sparse → dense, punctuation only so nothing mid-flight reads as a word:
  `` .,:;-~=+*!#%&@$ ``
- Each character becomes a cell that churns through the ramp in step with its own progress
  (±1.5 steps of random jitter, so neighbours differ). It **locks to the real glyph** at its
  finish time.
- **Timing per cell:** 170ms base + 25ms × index (the left-to-right stagger) + random 0–230ms
  (so cells don't finish in lockstep). Each cell re-rolls its glyph every ~19–57ms (38ms × 0.5–1.5).
- Drive it by **elapsed time, not frame count**, so it looks the same at 60Hz and 120Hz.
- **Spaces are never scrambled**, so word shapes stay readable.
- Don't restart a title that is already running.
- **Accessibility:** set the heading's `aria-label` to the real text up front so screen readers
  never read the noise. Skip entirely under `prefers-reduced-motion: reduce`.
- It works only because the title is monospaced (§4 rule 3).

---

## 9. Texture and imagery

### Dithered imagery

- Hero and social art are **1-bit ordered-dither renderings** of a photographic subject (the
  reference is a half-moon, lit from below, cropped by the top edge): white pixels on pure black
  with a visible pixel grid.
- Keep it monochrome so it inverts cleanly for the light theme.
- **Social / OG card (1200×630):** the same dithered subject, full-bleed on black, with the logotype
  centered in white on top.

### Fluid backdrop (generative)

A WebGL fluid simulation rendered through the same dither aesthetic.

- **Pointer-driven only.** It is still until the cursor moves across it, with no autoplay. Decorative
  content above it is `pointer-events: none` so the fluid keeps responding under it.
- **Dye ramp** (fresh → aged): `--accent` `#dc4300` → magenta `#9c0c81` → violet `#4e0bac` →
  deep red `#6f0000`, eased with `cubic-bezier(0.03, 0.6, 0.48, 1)`. This gives an iridescent,
  ember-like decay. It is the only place other hues appear.
- **Dither:** an 8×8 Bayer ordered dither with **2 levels per channel** and **4px cells** (the physical
  pixels per matrix cell). It samples once per cell, so the fluid's silhouette itself is blocky.
- **Bloom** on the bright dithered pixels: threshold 0.3, intensity 1, radius 0.2.
- **Feel:** dye dissipation 0.95, velocity dissipation 0.985, 16 pressure iterations, splat size 0.0125.
- Transparent canvas (`alpha: true`, clear to 0), rendered at the device pixel ratio.
- **Performance and accessibility:** mount lazily when the section enters view, halve the sim
  resolution at ≤640px (the canvas size is unchanged), and **don't render at all** under
  `prefers-reduced-motion`. The container element is always present so lazy hydration can observe it.

---

## 10. Interaction patterns

### Scrubber (replacement scrollbar)

- **Track:** 2px tall in `--track`. **Knob:** a 64px-wide `--accent` bar moved with `transform`
  (`will-change: transform`).
- **Hit area:** a `::before` pseudo-element extends the target 14px above and below, so the target
  is usable without changing the visual.
- **Pointer:** drag the knob (keeps the grab offset), or press anywhere on the track to jump and
  drag (centers the knob). Use pointer capture. Cursors are `grab` / `grabbing`.
- **Keyboard:** ←/→ step one card (card width + gap), PageUp/PageDown step one viewport, and Home/End
  jump to the ends. Smooth scrolling unless reduced motion is on.
- **Idle** (content fits, nothing to scroll): the knob fills the whole track, the cursor is
  `default`, it is removed from the tab order, and `aria-disabled="true"`.
- **ARIA:** `role="scrollbar"`, `aria-controls` → rail, `aria-orientation="horizontal"`, and
  `aria-valuenow` 0–100 updated only when the integer changes.
- Re-measure with a `ResizeObserver`. Sync on the rail's passive `scroll` event.

### Rail drag

- **Mouse only**, since touch already pans natively. Start the drag after a **5px** threshold, then
  capture the pointer.
- A drag that ends over a card **must not open it**: suppress the click in the capture phase.
  Block native image/link `dragstart`.

### Focus

- `:focus-visible` gets a **1px `--accent` outline**. It is offset 6px on thin controls (the scrubber)
  and inset (−1px) on large scroll regions (the rail).

---

## 11. Motion summary

| What | Duration | Easing |
|---|---|---|
| Button color / border | 160ms | ease |
| Dot glow, title opacity | 220ms | ease |
| Reveal (grid rows + opacity) | 240ms | ease |
| Logotype warm-up | 420ms | ease |
| Dither-in | ~0.2–0.6s per title | time-based, per cell |

Only `ease` is used, with no bounces or springs. Motion is **responsive, never ambient**: nothing
moves unless the user hovers, scrolls or drags. Under `prefers-reduced-motion`, skip the dither-in and
the fluid, and use instant scrolling.

---

## 12. Responsive

| Breakpoint | Changes |
|---|---|
| ≤1180px | The hero product visual pins to the right edge (24px). The floating card narrows to leave room. |
| ≤900px | The hero stacks in flow, and the art dims to 55% and centers. H1 is 40/44. The 3-up grid becomes 2-up and span-2 cells collapse to single. Borders are re-drawn for the new rows. Showcase spacing shrinks. |
| ≤640px | All grids are 1-up with top borders between cells. Reveals are always open and titles are at full opacity. H1 is 34/38. CTA groups stack. The section head stacks with a full-width scrubber. The topbar compacts. |

**Hover vs touch is a separate axis** from width: gate hover effects with `(hover: hover)` and use
scroll-lit dots under `(hover: none)`.

---

## 13. Accessibility rules

- The contrast floor is 4.5:1 for all text tokens in both themes (see §2 rule 7).
- Decorative art (backgrounds, logotype, dots, fluid) is `aria-hidden` with empty `alt`.
  Meaningful images (the product UI) get descriptive `alt`.
- Any text that animates keeps its real content as its accessible name.
- Respect `prefers-reduced-motion` everywhere motion is added.
- Tiny visual controls get enlarged invisible hit areas.
- Custom controls get full keyboard support and ARIA roles and values.
- Visible focus uses the accent.

---

## 14. Do / Don't

**Do**
- Structure with 1px hairlines and shared cell borders.
- Use mono caps for anything that labels, and the sans only for sentences.
- Keep the accent scarce and tie it to interaction.
- Use dithered, monochrome art that inverts cleanly.
- Keep one primary CTA per group.
- Make every hover effect have a touch equivalent.

**Don't**
- Round corners, add card backgrounds, or use gaps in grids.
- Introduce a second UI hue or a gradient.
- Add drop shadows beyond the single floating hero card.
- Autoplay motion or animate on page load.
- Use proportional fonts for animated text.
- Put accent text on light surfaces without `--accent-strong`.

---

## 15. Token block

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
  --shell: 1180px;

  --dur-fast: 160ms;   /* buttons */
  --dur-base: 220ms;   /* dot, title */
  --dur-reveal: 240ms; /* grid-rows reveal */
  --dur-slow: 420ms;   /* logotype */
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

/* Accent-colored text: --accent on dark, --accent-strong on light. */
.eyebrow { color: var(--accent); }
:root[data-theme="light"] .eyebrow { color: var(--accent-strong); }
```
