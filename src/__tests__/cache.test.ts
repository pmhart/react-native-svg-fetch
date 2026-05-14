import { getFromMemory, setInMemory, clearMemoryCache } from '../cache';

beforeEach(() => clearMemoryCache());

describe('in-memory cache', () => {
  it('returns null for a miss with no color', () => {
    expect(getFromMemory('https://example.com/miss.svg')).toBeNull();
  });

  it('returns null for a miss with color', () => {
    expect(getFromMemory('https://example.com/miss.svg', '#ff0000')).toBeNull();
  });

  it('returns stored value after set with no color', () => {
    setInMemory('https://example.com/a.svg', undefined, '<svg/>');
    expect(getFromMemory('https://example.com/a.svg')).toBe('<svg/>');
  });

  it('returns stored value after set with color', () => {
    setInMemory('https://example.com/b.svg', '#ff0000', '<svg red/>');
    expect(getFromMemory('https://example.com/b.svg', '#ff0000')).toBe(
      '<svg red/>'
    );
  });

  it('separates entries by color for the same uri', () => {
    setInMemory('https://example.com/c.svg', '#ff0000', '<svg red/>');
    setInMemory('https://example.com/c.svg', '#0000ff', '<svg blue/>');
    expect(getFromMemory('https://example.com/c.svg', '#ff0000')).toBe(
      '<svg red/>'
    );
    expect(getFromMemory('https://example.com/c.svg', '#0000ff')).toBe(
      '<svg blue/>'
    );
  });

  it('separates entries by uri', () => {
    setInMemory('https://example.com/x.svg', undefined, '<svg x/>');
    setInMemory('https://example.com/y.svg', undefined, '<svg y/>');
    expect(getFromMemory('https://example.com/x.svg')).toBe('<svg x/>');
    expect(getFromMemory('https://example.com/y.svg')).toBe('<svg y/>');
  });

  it('returns null after clearMemoryCache', () => {
    setInMemory('https://example.com/d.svg', undefined, '<svg/>');
    clearMemoryCache();
    expect(getFromMemory('https://example.com/d.svg')).toBeNull();
  });
});

describe('file system cache', () => {
  const mockExpoFs = {
    cacheDirectory: 'file:///mock-cache/',
    getInfoAsync: jest.fn(),
    readAsStringAsync: jest.fn(),
    writeAsStringAsync: jest.fn(),
  };

  beforeEach(() => {
    jest.resetModules();
    jest.mock('expo-file-system', () => mockExpoFs, { virtual: true });
    mockExpoFs.getInfoAsync.mockReset();
    mockExpoFs.readAsStringAsync.mockReset();
    mockExpoFs.writeAsStringAsync.mockReset();
  });

  it('returns null when the file does not exist', async () => {
    mockExpoFs.getInfoAsync.mockResolvedValue({ exists: false });
    const { getFromFileSystem: get } = require('../cache');
    expect(await get('https://example.com/x.svg')).toBeNull();
  });

  it('returns file content when the file exists', async () => {
    mockExpoFs.getInfoAsync.mockResolvedValue({ exists: true });
    mockExpoFs.readAsStringAsync.mockResolvedValue('<svg cached/>');
    const { getFromFileSystem: get } = require('../cache');
    expect(await get('https://example.com/y.svg')).toBe('<svg cached/>');
  });

  it('writes content to the file system', async () => {
    mockExpoFs.writeAsStringAsync.mockResolvedValue(undefined);
    const { setInFileSystem: set } = require('../cache');
    await set('https://example.com/z.svg', '<svg/>');
    expect(mockExpoFs.writeAsStringAsync).toHaveBeenCalledWith(
      expect.stringContaining('rnsvguri_'),
      '<svg/>'
    );
  });

  it('throws a descriptive error when no adapter is available', async () => {
    jest.resetModules();
    jest.mock(
      'expo-file-system',
      () => {
        throw new Error('not found');
      },
      { virtual: true }
    );
    jest.mock(
      'react-native-fs',
      () => {
        throw new Error('not found');
      },
      { virtual: true }
    );
    const { setInFileSystem: set } = require('../cache');
    await expect(set('https://x.com/f.svg', '<svg/>')).rejects.toThrow(
      'expo-file-system'
    );
  });
});
