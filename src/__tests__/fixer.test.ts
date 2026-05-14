import { clean, colorize } from '../fixer';

describe('clean()', () => {
  it('strips <script> tags and their content', () => {
    const input =
      '<svg viewBox="0 0 24 24"><script>alert(1)</script><path d="M0 0"/></svg>';
    expect(clean(input)).not.toContain('<script');
    expect(clean(input)).not.toContain('alert');
  });

  it('strips <style> tags and their content', () => {
    const input =
      '<svg viewBox="0 0 24 24"><style>.a { fill: red }</style><path d="M0 0"/></svg>';
    expect(clean(input)).not.toContain('<style');
    expect(clean(input)).not.toContain('.a');
  });

  it('strips <animate> self-closing tags', () => {
    const input =
      '<svg viewBox="0 0 24 24"><path d="M0 0"><animate attributeName="opacity" values="0;1" dur="1s"/></path></svg>';
    expect(clean(input)).not.toContain('<animate');
  });

  it('strips <animateTransform> tags', () => {
    const input =
      '<svg viewBox="0 0 24 24"><animateTransform attributeName="transform" type="rotate" dur="2s"/></svg>';
    expect(clean(input)).not.toContain('<animateTransform');
  });

  it('strips <foreignObject> and its nested content', () => {
    const input =
      '<svg viewBox="0 0 24 24"><foreignObject><div>hello</div></foreignObject></svg>';
    expect(clean(input)).not.toContain('<foreignObject');
    expect(clean(input)).not.toContain('<div>');
  });

  it('removes width and height attributes from the root <svg>', () => {
    const input =
      '<svg width="100" height="100" viewBox="0 0 100 100"><path d="M0 0"/></svg>';
    const result = clean(input);
    expect(result).not.toMatch(/\swidth="/);
    expect(result).not.toMatch(/\sheight="/);
    expect(result).toContain('viewBox="0 0 100 100"');
  });

  it('derives viewBox from width and height when viewBox is absent', () => {
    const input = '<svg width="24" height="24"><path d="M0 0"/></svg>';
    expect(clean(input)).toContain('viewBox="0 0 24 24"');
  });

  it('preserves an existing viewBox when width and height are also present', () => {
    const input =
      '<svg width="100" height="100" viewBox="0 0 50 50"><path d="M0 0"/></svg>';
    const result = clean(input);
    expect(result).toContain('viewBox="0 0 50 50"');
    expect(result).not.toMatch(/\swidth="/);
  });

  it('logs a warning and continues when svg has no viewBox, width, or height', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    clean('<svg><path d="M0 0"/></svg>');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('viewBox'));
    warn.mockRestore();
  });
});

describe('colorize()', () => {
  it('replaces a hex fill attribute with currentColor', () => {
    const input = '<svg><path fill="#ff0000" d="M0 0"/></svg>';
    expect(colorize(input)).toContain('fill="currentColor"');
    expect(colorize(input)).not.toContain('#ff0000');
  });

  it('replaces a named color fill attribute with currentColor', () => {
    const input = '<svg><path fill="red" d="M0 0"/></svg>';
    expect(colorize(input)).toContain('fill="currentColor"');
  });

  it('replaces a stroke attribute with currentColor', () => {
    const input = '<svg><path stroke="blue" d="M0 0"/></svg>';
    expect(colorize(input)).toContain('stroke="currentColor"');
  });

  it('preserves fill="none"', () => {
    const input = '<svg><path fill="none" d="M0 0"/></svg>';
    expect(colorize(input)).toContain('fill="none"');
  });

  it('preserves fill="transparent"', () => {
    const input = '<svg><path fill="transparent" d="M0 0"/></svg>';
    expect(colorize(input)).toContain('fill="transparent"');
  });

  it('preserves fill="inherit"', () => {
    const input = '<svg><path fill="inherit" d="M0 0"/></svg>';
    expect(colorize(input)).toContain('fill="inherit"');
  });

  it('does not double-replace fill="currentColor"', () => {
    const input = '<svg><path fill="currentColor" d="M0 0"/></svg>';
    const matches = colorize(input).match(/fill="currentColor"/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('preserves url() fill references', () => {
    const input = '<svg><path fill="url(#gradient)" d="M0 0"/></svg>';
    expect(colorize(input)).toContain('fill="url(#gradient)"');
  });

  it('replaces fill in an inline style attribute', () => {
    const input = '<svg><path style="fill: red; opacity: 1" d="M0 0"/></svg>';
    expect(colorize(input)).toContain('fill: currentColor');
    expect(colorize(input)).toContain('opacity: 1');
  });

  it('preserves fill: none in an inline style attribute', () => {
    const input = '<svg><path style="fill: none" d="M0 0"/></svg>';
    expect(colorize(input)).toContain('fill: none');
  });

  it('replaces stroke in an inline style attribute', () => {
    const input = '<svg><path style="stroke: #333" d="M0 0"/></svg>';
    expect(colorize(input)).toContain('stroke: currentColor');
  });
});
