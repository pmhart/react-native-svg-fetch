import React, { useEffect, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Image, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { fetchSvg } from './fetcher';
import { clean, colorize } from './fixer';
import {
  getFromMemory,
  setInMemory,
  getFromFileSystem,
  setInFileSystem,
} from './cache';
import { getConfig } from './config';

export type SvgSource = { uri: string } | number;

export interface SvgFetchProps {
  source: SvgSource;
  width: number | string;
  height: number | string;
  color?: string;
  placeholder?: React.ReactNode;
  fallback?: React.ReactNode;
  persistCache?: boolean;
  style?: StyleProp<ViewStyle>;
}

type RenderState = 'loading' | 'ready' | 'error';

export function SvgFetch({
  source,
  width,
  height,
  color,
  placeholder,
  fallback,
  persistCache: persistCacheProp,
  style,
}: SvgFetchProps) {
  const persistCache = persistCacheProp ?? getConfig().persistCache;

  const uri =
    typeof source === 'number'
      ? (Image.resolveAssetSource(source)?.uri ?? '')
      : source.uri;

  const [xml, setXml] = useState<string | null>(null);
  const [state, setState] = useState<RenderState>('loading');

  useEffect(() => {
    let cancelled = false;

    const cached = getFromMemory(uri, color);
    if (cached) {
      setXml(cached);
      setState('ready');
      return;
    }

    setXml(null);
    setState('loading');

    async function load() {
      if (persistCache) {
        const fsCached = await getFromFileSystem(uri);
        if (fsCached && !cancelled) {
          const ready = color ? colorize(fsCached) : fsCached;
          setInMemory(uri, color, ready);
          setXml(ready);
          setState('ready');
          return;
        }
      }

      try {
        const raw = await fetchSvg(uri);
        const cleaned = clean(raw);

        if (persistCache) {
          await setInFileSystem(uri, cleaned);
        }

        const ready = color ? colorize(cleaned) : cleaned;
        setInMemory(uri, color, ready);

        if (!cancelled) {
          setXml(ready);
          setState('ready');
        }
      } catch (e) {
        console.error('[react-native-svg-fetch]', e);
        if (!cancelled) {
          setState('error');
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [uri, color, persistCache]);

  const defaultPlaceholder = (
    <View
      testID="remote-svg-placeholder"
      style={[{ width, height, backgroundColor: '#E0E0E0' }, style]}
    />
  );

  const effectiveFallback = fallback ?? placeholder ?? defaultPlaceholder;
  const effectivePlaceholder = placeholder ?? defaultPlaceholder;

  if (state === 'error') {
    return <>{effectiveFallback}</>;
  }

  if (state === 'loading' || !xml) {
    return <>{effectivePlaceholder}</>;
  }

  return (
    <View style={style}>
      <SvgXml
        xml={xml}
        width={width}
        height={height}
        color={color}
        testID="svg-xml"
      />
    </View>
  );
}
