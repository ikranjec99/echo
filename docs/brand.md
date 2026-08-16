# Echo brand guide

## Brand idea

Echo is a local, open-source browser extension for intercepting, redirecting, and
blocking HTTP requests. The brand should feel technical without being cold:
clear, dependable, lightweight, and friendly to developers.

## Product language

- **Name:** Echo
- **Short description:** Intercept, redirect, and block browser requests locally.
- **Personality:** Clear, capable, calm, and approachable.
- **Voice:** Use direct language, short sentences, and familiar technical terms.
- **Avoid:** Security alarmism, unnecessary jargon, and claims that imply Echo
  can inspect traffic beyond browser-extension API limits.

## Color palette

### Brand colors

| Token | Value | Role |
| --- | --- | --- |
| `--color-brand-primary` | `#3498DB` | Primary identity, links, focus, and selected states |
| `--color-brand-accent` | `#2ECC71` | Enabled rules, successful matches, and positive status |

Blue represents requests moving through the browser. Green represents a rule
that is enabled or has completed its intended action.

### Supporting colors

| Token | Value | Role |
| --- | --- | --- |
| `--color-primary-strong` | `#217DBB` | Primary hover and pressed states |
| `--color-accent-strong` | `#239B56` | Accent hover and pressed states |
| `--color-ink` | `#17202A` | Primary text |
| `--color-muted` | `#5D6D7E` | Secondary text |
| `--color-border` | `#DCE4E8` | Borders and dividers |
| `--color-surface` | `#FFFFFF` | Cards and controls |
| `--color-canvas` | `#F5F8FA` | Application background |
| `--color-danger` | `#C0392B` | Destructive actions and errors |

Brand blue and green should not carry meaning by color alone. Pair status colors
with text, an icon, or another visible indicator. Prefer dark text on the green
accent. Check contrast whenever colors are combined or text sizes change.

## Typography

Use a native system sans-serif stack for a fast, platform-consistent extension:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
  "Segoe UI", sans-serif;
```

- Use sentence case for headings and buttons.
- Keep body copy at `14px` or larger where space allows.
- Use medium or semibold weight for controls instead of all caps.
- Reserve monospace text for URLs, methods, patterns, and request metadata.

## Interface principles

1. Make rule status visible at a glance.
2. Keep primary actions blue and enabled/success states green.
3. Use whitespace and borders before adding shadows.
4. Show actionable errors beside the field that caused them.
5. Never hide whether interception is active.

## Icon direction

The icon should remain recognizable at `16px`, `32px`, `48px`, and `128px`.
Use a simple geometric mark: two offset request or signal waves that suggest an
echo and form a subtle lowercase **e**. Use the primary blue as the dominant
color and green as a restrained accent. Avoid text, fine lines, gradients that
disappear at small sizes, and imagery that resembles a security shield.

Required future exports:

- `icon-16.png`
- `icon-32.png`
- `icon-48.png`
- `icon-128.png`
- A scalable source file when the approved design permits it

