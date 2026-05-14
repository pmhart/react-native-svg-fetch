import { fetchSvg } from '../fetcher';

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

beforeEach(() => mockFetch.mockReset());

describe('fetchSvg', () => {
  it('returns SVG text on a successful response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () =>
        Promise.resolve('<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'),
    });
    const result = await fetchSvg('https://example.com/icon.svg');
    expect(result).toContain('<svg');
  });

  it('throws when response status is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });
    await expect(fetchSvg('https://example.com/icon.svg')).rejects.toThrow(
      '404'
    );
  });

  it('throws when response body does not contain an svg element', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('<html><body>Not SVG</body></html>'),
    });
    await expect(fetchSvg('https://example.com/icon.svg')).rejects.toThrow(
      'SVG'
    );
  });
});
