# Streamline SVG icons

Drop downloaded Streamline SVGs here. The `<AnimatedIcon name="..." />`
component looks up files by basename: `name="bell"` → `bell.svg`.

Naming: lowercase, kebab-case, matching `iconName` in `src/data/navigation.ts`.

The component:
- replaces every `fill="..."` and `stroke="..."` with `currentColor`, so the
  icon follows whatever `text-*` class is on the parent
- strips the SVG's own `width`/`height` and applies the size you pass via prop
- adds `transition + group-hover:scale-110` (or `hover:scale-110` for `trigger="self"`)
  so the icon scales when its parent button/card is hovered

For solid SVGs, drop them in as-is. For mixed fill+stroke SVGs they'll be
flattened to one color (currentColor) — preview before bulk-importing if that
matters for any specific icon.
