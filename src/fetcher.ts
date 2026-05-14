export async function fetchSvg(uri: string): Promise<string> {
  const response = await fetch(uri, {
    headers: { 'User-Agent': 'react-native-svg-fetch/1.0' },
  });
  if (!response.ok) {
    throw new Error(
      `[react-native-svg-fetch] Failed to fetch SVG: ${response.status} ${response.statusText}`
    );
  }
  const text = await response.text();
  if (!text.includes('<svg')) {
    throw new Error(
      '[react-native-svg-fetch] Response does not appear to be an SVG document'
    );
  }
  return text;
}
