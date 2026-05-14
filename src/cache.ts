const memoryCache = new Map<string, string>();

function memKey(uri: string, color?: string): string {
  return `${uri}::${color ?? ''}`;
}

export function getFromMemory(uri: string, color?: string): string | null {
  return memoryCache.get(memKey(uri, color)) ?? null;
}

export function setInMemory(
  uri: string,
  color: string | undefined,
  xml: string
): void {
  memoryCache.set(memKey(uri, color), xml);
}

export function clearMemoryCache(): void {
  memoryCache.clear();
}

function hashUri(uri: string): string {
  let h = 5381;
  for (let i = 0; i < uri.length; i++) {
    // eslint-disable-next-line no-bitwise
    h = ((h << 5) + h) ^ uri.charCodeAt(i);
    // eslint-disable-next-line no-bitwise
    h = h >>> 0;
  }
  return h.toString(16);
}

type FsAdapter = {
  cacheDir: string;
  read: (path: string) => Promise<string | null>;
  write: (path: string, content: string) => Promise<void>;
};

function getAdapter(): FsAdapter | null {
  try {
    const fs = require('expo-file-system');
    return {
      cacheDir: fs.cacheDirectory as string,
      read: async (path: string) => {
        const info = await fs.getInfoAsync(path);
        if (!info.exists) return null;
        return fs.readAsStringAsync(path) as Promise<string>;
      },
      write: (path: string, content: string) =>
        fs.writeAsStringAsync(path, content) as Promise<void>,
    };
  } catch {}

  try {
    const RNFS = require('react-native-fs');
    return {
      cacheDir: (RNFS.CachesDirectoryPath as string) + '/',
      read: async (path: string) => {
        const exists = await RNFS.exists(path);
        if (!exists) return null;
        return RNFS.readFile(path, 'utf8') as Promise<string>;
      },
      write: (path: string, content: string) =>
        RNFS.writeFile(path, content, 'utf8') as Promise<void>,
    };
  } catch {}

  return null;
}

export async function getFromFileSystem(uri: string): Promise<string | null> {
  const adapter = getAdapter();
  if (!adapter) return null;
  const path = `${adapter.cacheDir}rnsvguri_${hashUri(uri)}.svg`;
  return adapter.read(path);
}

export async function setInFileSystem(uri: string, xml: string): Promise<void> {
  const adapter = getAdapter();
  if (!adapter) {
    throw new Error(
      '[react-native-svg-fetch] persistCache requires expo-file-system or react-native-fs. ' +
        'Install one as a project dependency.'
    );
  }
  const path = `${adapter.cacheDir}rnsvguri_${hashUri(uri)}.svg`;
  await adapter.write(path, xml);
}
