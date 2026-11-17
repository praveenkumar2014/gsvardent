# Verdent Design Tokens

Concrete token reference for the Verdent interface. These are the canonical values
extracted from the implemented dark theme in `src/app/globals.css`. New UI — including
prototypes and generated screens — must use these tokens instead of inventing colors,
fonts or radii. `PROJECT/design/design-system.md` defines the governance; this file
defines the values.

Status: **dark theme baseline only.** A complete, equally accessible light theme is
required by `PROJECT/design/brand-guidelines.md` and remains an open gap (tracked in
`PROJECT/TASKS.md`). Do not ship token values that diverge from this file; update this
file first when the implementation changes.

## Color

### Surfaces and text

| Token | Value | Usage |
| --- | --- | --- |
| `bg` | `#090c0d` | Page background (fallback `#090d0e` inside the app shell) |
| `panel` | `#101617` | Primary card/panel surface |
| `panel-2` | `#131c1c` | Raised/secondary panel surface |
| `line` | `rgba(185,215,202,.12)` | Default borders and dividers |
| `line-strong` | `rgba(185,215,202,.20)` | Input borders, emphasized dividers |
| `text` | `#f1f5f2` | Primary text |
| `text-soft` | `#b4c0ba` | Secondary body text |
| `text-muted` | `#889591` | Captions, helper text |
| `text-faint` | `#65756b`–`#74817b` | Placeholders, micro labels |

### Accent

| Token | Value | Usage |
| --- | --- | --- |
| `mint` | `#9ee7c4` | Accent text, icons, focus glow, brand mark fill |
| `mint-strong` | `#6dd8a5` | Status dots, active glow, secondary emphasis |
| `primary-gradient` | `linear-gradient(110deg, #a8ebc9, #75d8a7)` | Primary button fill |
| `on-primary` | `#0c2118` | Text/icons on primary gradient and brand mark |
| `brand-mark-gradient` | `linear-gradient(145deg, #b7f1d4, #54bd8c)` | Logo tile fill |

Accent usage is restrained: no large mint surfaces, no tinted body text below the
contrast ratios listed under Accessibility.

### Semantic (warning / danger / info)

| Token | Value | Usage |
| --- | --- | --- |
| `warning` | `#f1c98b` | Warning notice text and amber status tones (`#edcf9a`, `#e9c27f`) |
| `danger` | `#ff9999` | Error notice text and red status tones (`#f0aaaa`, `#ee9292`) |
| `info-blue` | `#a6d7f3` | In-progress/running status text |
| `success-green` | `#9fe3bd` | Done/completed status text |

### Task and agent status palette

Statuses must not be encoded by color alone; every status chip also carries its
uppercase text label. Text colors with translucent fills:

| Status | Text | Fill |
| --- | --- | --- |
| `ready`, `backlog` | `#a8b5ac` | `rgba(160,173,164,.06)` |
| `in_progress`, `running` | `#a6d7f3` | `rgba(69,136,177,.10)` |
| `review`, `waiting_approval` | `#edcf9a` | `rgba(176,134,67,.10)` |
| `done`, `completed` | `#9fe3bd` | `rgba(69,157,107,.12)` |
| `blocked`, `failed` | `#f0aaaa` | `rgba(184,73,73,.10)` |

Presence dots: idle `#9da9a1`, running `#83d6a5` (glowing), waiting approval `#e9c27f`,
failed `#ee9292`.

## Typography

Loaded via Google Fonts in `globals.css`.

| Token | Family | Usage |
| --- | --- | --- |
| `font-body` | `DM Sans` (400/500/600/700) | All body copy, labels, buttons |
| `font-display` | `Space Grotesk` (400–700) | Headings, brand, avatars/initial tiles |
| `font-mono` | `DM Mono` (400/500) | Kickers, timestamps, status chips, table headers, terminal |

Display headings use tight letter-spacing (`-0.05em` to `-0.075em`) and weight 600.

| Token | Value | Usage |
| --- | --- | --- |
| `text-hero` | `clamp(58px, 7vw, 96px)` / 0.98 | Auth story headline only |
| `text-page-title` | `clamp(28px, 3vw, 38px)` / 600 | Module page h1 |
| `text-section-title` | 33px / 600 | Workspace page intro h1 |
| `text-card-title` | 19px / 600 | Card headings |
| `text-body` | 12–13px / 1.6–1.7 | Paragraphs, list copy |
| `text-micro` | 10–11px | Table cells, dense rows |
| `text-kicker` | 8–10px `font-mono`, letter-spacing `0.12em–0.18em`, uppercase | Eyebrow labels, timestamps, status chips |

## Radius

| Token | Value | Usage |
| --- | --- | --- |
| `radius-sm` | 6px | Small chips, status pills, tiny inputs |
| `radius-md` | 8px | Buttons, inputs, nav items, rows |
| `radius-lg` | 10px | Panels, selects, stat tiles |
| `radius-xl` | 13px | Cards, prompt panel |
| `radius-2xl` | 15px | Hero panels, brand mark |
| `radius-pill` | 50% | Avatars, status dots, orbit rings |

## Elevation and glow

Shadows are mint-tinted, never neutral black-only:

- Primary button: `0 8px 30px rgba(92,191,142,.13)`
- Brand mark: `0 0 30px rgba(112,222,170,.17)` (up to `0 0 55px rgba(102,222,159,.3)` for the hero core)
- Status dots: `0 0 10px`–`0 0 12px` of the dot color
- Cards are flat: 1px `line` border plus gradient fills such as
  `linear-gradient(145deg, rgba(19,29,27,.88), rgba(13,20,20,.9))`

## Layout

| Token | Value |
| --- | --- |
| `sidebar-width` | 256px (210px ≤980px, hidden ≤700px) |
| `topbar-height` | 68px (55px ≤700px) |
| `content-max-width` | 1260px |
| `content-gutter` | 4.2% horizontal page padding |

## Motion

- Transitions: `transform .15s`, `background .15s`, `border-color .2s`
- Hover lift: `translateY(-1px)` on primary buttons, `translateY(-2px)` on module tiles
- Focus ring: `box-shadow: 0 0 0 3px rgba(109,216,165,.1)` with border `rgba(158,231,196,.7)`
- `prefers-reduced-motion: reduce` disables scrolling, transitions and animations

## Breakpoints

980px, 800px, 700px, 600px, 1080px (max-width, used where noted in `globals.css`).

## Accessibility rules

1. Text contrast: `text` on `bg` ≥ 15:1; `text-muted` on `bg` ≥ 4.5:1. Do not use
   `text-faint` tones for essential copy.
2. Accent on dark: `mint` and `mint-strong` are for text/icons/decoration only.
   Primary buttons put `on-primary` (`#0c2118`) on the mint gradient, never white.
3. Status is never color-only: every status chip and presence dot is paired with an
   uppercase text label (or has an accessible name).
4. Focus is always visible via the mint focus ring; `button:disabled` keeps the
   default reduced-opacity treatment with `cursor: not-allowed`.
5. Interactive targets in dense areas stay ≥ 27px tall (nav items 36–42px).

## Applying these tokens elsewhere

- Next.js app: use the existing CSS custom properties in `src/app/globals.css`
  (`--bg`, `--panel`, `--mint`, …). They are the live source of these tokens.
- Prototypes and generated screens: copy the `:root` block below rather than inventing
  adjacent hex values.

```css
:root{
  --bg:#090c0d; --panel:#101617; --panel-2:#131c1c;
  --line:rgba(185,215,202,.12); --line-strong:rgba(185,215,202,.2);
  --text:#f1f5f2; --muted:#889591; --soft:#b4c0ba;
  --mint:#9ee7c4; --mint-strong:#6dd8a5;
  --amber:#f1c98b; --red:#ff9999;
  --font-body:"DM Sans",Arial,sans-serif;
  --font-display:"Space Grotesk",Arial,sans-serif;
  --font-mono:"DM Mono",monospace;
}
```

Any visual change to these values requires design review evidence per
`PROJECT/design/design-system.md` governance.
