const STRIP_TAGS = [
  'script',
  'style',
  'animate',
  'animateTransform',
  'animateMotion',
  'foreignObject',
];

export function clean(xml: string): string {
  let result = xml;

  for (const tag of STRIP_TAGS) {
    result = result.replace(
      new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'),
      ''
    );
    result = result.replace(new RegExp(`<${tag}\\b[^>]*/?>`, 'gi'), '');
  }

  const viewBoxMatch = result.match(/<svg[^>]*\sviewBox="([^"]*)"/);
  const widthMatch = result.match(/<svg[^>]*\swidth="([^"]*)"/);
  const heightMatch = result.match(/<svg[^>]*\sheight="([^"]*)"/);

  if (!viewBoxMatch) {
    if (widthMatch && heightMatch) {
      result = result.replace(
        /<svg\b/,
        `<svg viewBox="0 0 ${widthMatch[1]} ${heightMatch[1]}"`
      );
    } else {
      console.warn(
        '[react-native-svg-fetch] SVG has no viewBox, width, or height — sizing may be incorrect'
      );
    }
  }

  result = result.replace(/(<svg\b[^>]*)\swidth="[^"]*"/, '$1');
  result = result.replace(/(<svg\b[^>]*)\sheight="[^"]*"/, '$1');

  return result.trim();
}

const SKIP_COLOR_VALUES = ['none', 'transparent', 'inherit', 'currentcolor'];

export function colorize(xml: string): string {
  let result = xml;

  result = result.replace(
    /\b(fill|stroke)="([^"]*)"/gi,
    (match, attr: string, value: string) => {
      const v = value.trim().toLowerCase();
      if (SKIP_COLOR_VALUES.includes(v)) return match;
      if (v.startsWith('url(')) return match;
      return `${attr}="currentColor"`;
    }
  );

  result = result.replace(
    /style="([^"]*)"/gi,
    (_match, styleContent: string) => {
      const updated = styleContent.replace(
        /(fill|stroke)\s*:\s*([^;}"]+)/gi,
        (m: string, prop: string, value: string) => {
          const v = value.trim().toLowerCase();
          if (SKIP_COLOR_VALUES.includes(v)) return m;
          if (v.startsWith('url(')) return m;
          return `${prop}: currentColor`;
        }
      );
      return `style="${updated}"`;
    }
  );

  return result;
}
