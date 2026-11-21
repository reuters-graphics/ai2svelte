# Design Spec: ai2svelte Panel

Visual language for the Illustrator panel (`ai2svelte/src/js/main`). Tokens live in
`styles/theme.scss`; components consume them via CSS variables, never hardcoded values.

## Principles

- **Quiet and consistent.** One surface scale, one border, three text levels, one accent.
- **Soft, small radii.** Three radii only; no pill shapes or mixed values.
- **Accent is a response.** Orange appears on hover, focus, active state and primary actions.
- **Fixed scales.** The panel is a fixed 300px width, so type and spacing do not scale fluidly.
- **Both themes equal.** Every token is defined for dark and light.

## Color tokens

| Token | Role | Dark | Light |
|---|---|---|---|
| `--color-background` | App background | `#121212` | `#e8e8e8` |
| `--color-primary` | Surface: fields, cards, buttons | `#1c1c1c` | `#ffffff` |
| `--color-secondary` | Raised/hover surface | `#292929` | `#dadada` |
| `--color-border` | Hairlines and outlines | `#333333` | `#bfbfbf` |
| `--color-border-subtle` | Field (input) inner outline, softer | `#2a2a2a` | `#cfcfcf` |
| `--color-text` | Primary text | `#f2f2f2` | `#1a1a1a` |
| `--color-text-secondary` | Labels, supporting text | `#a3a3a3` | `#555555` |
| `--color-text-muted` | Placeholders, disabled, icons | `#6b6b6b` | `#8a8a8a` |
| `--color-accent-primary` | Hover/active/focus, primary action | `#dc4300` | `#dc4300` |
| `--color-warning` | Errors and destructive | `#ff5c5c` | `#d92d20` |
| `--color-invert` / `black` / `white` | Contrast helpers | | |

Do not add new shades. Use these; use opacity only for disabled (0.5).

## Typography

Geist Mono throughout. Sizes: `--font-size-xs` 11px, `sm` 12px, `base` 13px, `lg` 15px,
`xl` 17px. Labels and buttons are uppercase `sm`; body and values are `base`.

## Spacing and radius

Spacing: `--space-3xs` 2px, `2xs` 4px, `xs` 6px, `s` 8px, `m` 12px, `l` 16px, `xl` 24px,
`2xl` 32px, `3xl` 48px. Radius: `--radius-xs` 2px (slider track and fill), `--radius-sm` 4px (fields, small items), `--radius-md` 6px
(small inner elements), `--radius-lg` 8px (buttons, chips, cards, dialogs).

## Components

- **Button.** Surface fill, 1px border, `lg` radius, uppercase `sm`, 0.08em tracking. Hover
  fills with accent. Focus: 2px accent outline, 2px offset. Disabled: 0.5 opacity. `minimal`
  has no border or fill.
- **Field (Input/Dropdown/range).** Surface fill, 1px inset border, `sm` radius. Focus-within:
  2px accent inset ring. Title is muted uppercase `sm`; value turns to primary text on hover.
- **Chip/Pill.** Surface fill, 1px border, `lg` radius; hover raises to `secondary`.
- **Card (shadow/animation).** Surface fill, border, `lg` radius; no drop shadow.
- **Dialog.** Surface fill, border, `lg` radius, single elevation shadow; dividers use
  `--color-border`.
- **Dividers.** `hr` is a 1px line in `--color-border`.
- **Alerts/Toasts.** Use `--color-warning` for errors; otherwise neutral surfaces.

## Rules

- No hardcoded colors, radii, or font sizes in components; use the tokens above.
- Avoid CSS unsupported by CEP's Chromium 99 (container queries).
- Check every change in dark and light themes.
