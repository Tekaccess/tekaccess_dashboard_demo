import { useEffect, useState, type ReactNode } from 'react';

const svgLoaders = import.meta.glob('../icons/*.svg', {
  query: '?raw',
  import: 'default',
});

type Trigger = 'parent' | 'self' | 'none';

interface AnimatedIconProps {
  name: string;
  size?: number;
  className?: string;
  /** `parent` (default): scales when nearest ancestor with class `group` is hovered.
   * `self`: scales on its own hover. `none`: no animation. */
  trigger?: Trigger;
  /** Rendered when the SVG file isn't present yet. */
  fallback?: ReactNode;
}

/** Make the SVG follow currentColor and drop hard-coded sizing so the wrapper controls it. */
function normalizeSvg(raw: string, size: number): string {
  return raw
    .replace(/(stroke|fill)="(?!none|transparent)[^"]*"/gi, '$1="currentColor"')
    .replace(/\s(width|height)="[^"]*"/gi, '')
    .replace(/<svg\b/, `<svg width="${size}" height="${size}"`);
}

export default function AnimatedIcon({
  name,
  size = 20,
  className = '',
  trigger = 'parent',
  fallback,
}: AnimatedIconProps) {
  const [svg, setSvg] = useState<string | null>(null);

  const loaderKey = `../icons/${name}.svg`;
  const loader = svgLoaders[loaderKey];

  useEffect(() => {
    if (!loader) return;
    let alive = true;
    (loader() as Promise<string>).then((raw) => {
      if (alive) setSvg(normalizeSvg(raw, size));
    });
    return () => {
      alive = false;
    };
  }, [loader, size]);

  const animClass =
    trigger === 'self'
      ? 'transition-transform duration-200 ease-out hover:scale-110'
      : trigger === 'parent'
        ? 'transition-transform duration-200 ease-out group-hover:scale-110'
        : '';

  if (!loader) {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 ${animClass} ${className}`}
        style={{ width: size, height: size }}
      >
        {fallback}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${animClass} ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
