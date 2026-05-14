import React from 'react';
import { View } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { SvgFetch } from '../SvgFetch';
import { fetchSvg } from '../fetcher';

jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  return {
    ...rn,
    Image: {
      ...rn.Image,
      resolveAssetSource: jest.fn().mockReturnValue({
        uri: 'https://example.com/asset.svg',
        width: 24,
        height: 24,
        scale: 1,
      }),
    },
  };
});

jest.mock('react-native-svg', () => {
  const React = require('react');
  const RNView = require('react-native').View;
  return {
    SvgXml: ({ testID }: { testID?: string }) =>
      React.createElement(RNView, { testID: testID ?? 'svg-xml' }),
  };
});

jest.mock('../fetcher', () => ({
  fetchSvg: jest.fn(),
}));

jest.mock('../fixer', () => ({
  clean: (xml: string) => xml,
  colorize: (xml: string) => xml,
}));

jest.mock('../cache', () => {
  const memoryCache = new Map<string, string>();
  const memKey = (uri: string, color?: string) => `${uri}::${color ?? ''}`;
  return {
    getFromMemory: (uri: string, color?: string) =>
      memoryCache.get(memKey(uri, color)) ?? null,
    setInMemory: (uri: string, color: string | undefined, xml: string) =>
      memoryCache.set(memKey(uri, color), xml),
    clearMemoryCache: () => memoryCache.clear(),
    getFromFileSystem: jest.fn().mockResolvedValue(null),
    setInFileSystem: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('../config', () => ({
  getConfig: jest.fn().mockReturnValue({ persistCache: false }),
}));

import { clearMemoryCache, setInMemory } from '../cache';
import { Image } from 'react-native';

const mockFetchSvg = fetchSvg as jest.Mock;
const mockResolveAssetSource = Image.resolveAssetSource as jest.Mock;

beforeEach(() => {
  clearMemoryCache();
  mockFetchSvg.mockReset();
});

describe('SvgFetch — uri source', () => {
  it('renders SVG immediately when memory cache is already populated', () => {
    setInMemory('https://example.com/icon.svg', undefined, '<svg/>');
    const { getByTestId } = render(
      <SvgFetch
        source={{ uri: 'https://example.com/icon.svg' }}
        width={24}
        height={24}
      />
    );
    expect(getByTestId('svg-xml')).toBeTruthy();
  });

  it('shows a user-provided placeholder while fetching', () => {
    mockFetchSvg.mockReturnValue(new Promise(() => {}));
    const { getByTestId } = render(
      <SvgFetch
        source={{ uri: 'https://example.com/icon.svg' }}
        width={24}
        height={24}
        placeholder={<View testID="my-placeholder" />}
      />
    );
    expect(getByTestId('my-placeholder')).toBeTruthy();
  });

  it('shows the default grey placeholder when none is provided', () => {
    mockFetchSvg.mockReturnValue(new Promise(() => {}));
    const { getByTestId } = render(
      <SvgFetch
        source={{ uri: 'https://example.com/icon.svg' }}
        width={24}
        height={24}
      />
    );
    expect(getByTestId('remote-svg-placeholder')).toBeTruthy();
  });

  it('renders SVG after a successful fetch', async () => {
    mockFetchSvg.mockResolvedValue('<svg viewBox="0 0 24 24"/>');
    const { getByTestId } = render(
      <SvgFetch
        source={{ uri: 'https://example.com/icon.svg' }}
        width={24}
        height={24}
      />
    );
    await waitFor(() => expect(getByTestId('svg-xml')).toBeTruthy());
  });

  it('shows the fallback prop after a fetch failure', async () => {
    mockFetchSvg.mockRejectedValue(new Error('network error'));
    const { getByTestId } = render(
      <SvgFetch
        source={{ uri: 'https://example.com/icon.svg' }}
        width={24}
        height={24}
        fallback={<View testID="my-fallback" />}
      />
    );
    await waitFor(() => expect(getByTestId('my-fallback')).toBeTruthy());
  });

  it('falls back to placeholder when no fallback prop is provided', async () => {
    mockFetchSvg.mockRejectedValue(new Error('network error'));
    const { getByTestId } = render(
      <SvgFetch
        source={{ uri: 'https://example.com/icon.svg' }}
        width={24}
        height={24}
        placeholder={<View testID="my-placeholder" />}
      />
    );
    await waitFor(() => expect(getByTestId('my-placeholder')).toBeTruthy());
  });

  it('falls back to default grey placeholder when neither fallback nor placeholder is provided', async () => {
    mockFetchSvg.mockRejectedValue(new Error('network error'));
    const { getByTestId } = render(
      <SvgFetch
        source={{ uri: 'https://example.com/icon.svg' }}
        width={24}
        height={24}
      />
    );
    await waitFor(() =>
      expect(getByTestId('remote-svg-placeholder')).toBeTruthy()
    );
  });
});

describe('SvgFetch — asset source', () => {
  it('resolves asset number to URI via Image.resolveAssetSource', async () => {
    mockFetchSvg.mockResolvedValue('<svg viewBox="0 0 24 24"/>');
    const { getByTestId } = render(
      <SvgFetch source={1} width={24} height={24} />
    );
    await waitFor(() => expect(getByTestId('svg-xml')).toBeTruthy());
    expect(mockResolveAssetSource).toHaveBeenCalledWith(1);
    expect(mockFetchSvg).toHaveBeenCalledWith('https://example.com/asset.svg');
  });

  it('uses resolved URI as cache key for asset source', async () => {
    setInMemory('https://example.com/asset.svg', undefined, '<svg/>');
    const { getByTestId } = render(
      <SvgFetch source={1} width={24} height={24} />
    );
    expect(getByTestId('svg-xml')).toBeTruthy();
    expect(mockFetchSvg).not.toHaveBeenCalled();
  });
});
