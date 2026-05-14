# react-native-svg-uri Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a React Native npm package that fetches, cleans, caches, and renders remote SVGs using react-native-svg.

**Architecture:** Four focused modules (`fetcher`, `fixer`, `cache`, `config`) orchestrated by a single `SvgUri` component. The fixer runs a clean pass once per URL (result is cached), then a separate colorize pass at render time when a `color` prop is set. Caching uses a module-level in-memory Map by default, with optional file system persistence auto-detected between `expo-file-system` and `react-native-fs`.

**Tech Stack:** TypeScript, React Native, react-native-svg, react-native-builder-bob (via create-react-native-library), Jest + @testing-library/react-native

---

## File Map

| File | Responsibility |
|---|---|
| `src/fetcher.ts` | `fetchSvg(uri)` — HTTP GET → raw SVG XML string |
| `src/fixer.ts` | `clean(xml)` — strip bad elements + fix sizing; `colorize(xml)` — replace fill/stroke with currentColor |
| `src/cache.ts` | In-memory Map (`getFromMemory`, `setInMemory`, `clearMemoryCache`) + file system (`getFromFileSystem`, `setInFileSystem`) |
| `src/config.ts` | `configureSvgUri()` global defaults store |
| `src/SvgUri.tsx` | Component — orchestrates modules, manages loading/ready/error state |
| `src/index.ts` | Public exports |
| `src/__tests__/fetcher.test.ts` | Unit tests for `fetchSvg` |
| `src/__tests__/fixer.test.ts` | Unit tests for `clean` and `colorize` |
| `src/__tests__/cache.test.ts` | Unit tests for memory and file system cache |
| `src/__tests__/config.test.ts` | Unit tests for `configureSvgUri` |
| `src/__tests__/SvgUri.test.tsx` | Component integration tests |

---

### Task 1: Scaffold the package

**Files:** All scaffold files via `create-react-native-library`

- [ ] **Step 1: Save the existing docs folder**

```bash
cp -r /Users/paul/code/react-native-svg-uri/docs /tmp/rnsvguri-docs
```

- [ ] **Step 2: Scaffold into a temp directory**

```bash
cd /tmp
npx create-react-native-library@latest react-native-svg-uri
```

When prompted:
- **Description:** `Render remote SVGs in React Native using react-native-svg`
- **Languages:** `JavaScript (TypeScript)` — do NOT select Kotlin/Swift native modules
- **Type:** `Library` (not Turbo Module)
- **Example:** Accept the default (Expo or Vanilla, either works)

- [ ] **Step 3: Copy scaffold into the project directory**

```bash
cp -r /tmp/react-native-svg-uri/. /Users/paul/code/react-native-svg-uri/
```

- [ ] **Step 4: Restore the docs folder**

```bash
cp -r /tmp/rnsvguri-docs /Users/paul/code/react-native-svg-uri/docs
```

- [ ] **Step 5: Delete the generated placeholder source and tests**

```bash
cd /Users/paul/code/react-native-svg-uri
rm src/index.tsx
# Also remove any generated __tests__ placeholder if present:
rm -f __tests__/index.test.tsx
rmdir --ignore-fail-on-non-empty __tests__
```

- [ ] **Step 6: Add react-native-svg and optional peer dependencies to `package.json`**

Open `package.json` and add to `peerDependencies`:
```json
"react-native-svg": ">=12.0.0"
```
Add a `peerDependenciesMeta` block (create it if absent):
```json
"peerDependenciesMeta": {
  "expo-file-system": { "optional": true },
  "react-native-fs": { "optional": true }
}
```

- [ ] **Step 7: Install dependencies and verify the build tooling**

```bash
yarn
yarn prepare
```

Expected: build completes. Warnings about missing exports are fine at this stage.

- [ ] **Step 8: Initialize git and commit**

```bash
git init
git add .
git commit -m "feat: scaffold package with create-react-native-library"
```

---

### Task 2: Fetcher module

**Files:**
- Create: `src/fetcher.ts`
- Create: `src/__tests__/fetcher.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/fetcher.test.ts`:

```typescript
import { fetchSvg } from '../fetcher'

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

beforeEach(() => mockFetch.mockReset())

describe('fetchSvg', () => {
  it('returns SVG text on a successful response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'),
    })
    const result = await fetchSvg('https://example.com/icon.svg')
    expect(result).toContain('<svg')
  })

  it('throws when response status is not ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' })
    await expect(fetchSvg('https://example.com/icon.svg')).rejects.toThrow('404')
  })

  it('throws when response body does not contain an svg element', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('<html><body>Not SVG</body></html>'),
    })
    await expect(fetchSvg('https://example.com/icon.svg')).rejects.toThrow('SVG')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
yarn test src/__tests__/fetcher.test.ts
```

Expected: FAIL — `Cannot find module '../fetcher'`

- [ ] **Step 3: Implement `src/fetcher.ts`**

```typescript
export async function fetchSvg(uri: string): Promise<string> {
  const response = await fetch(uri)
  if (!response.ok) {
    throw new Error(
      `[react-native-svg-uri] Failed to fetch SVG: ${response.status} ${response.statusText}`
    )
  }
  const text = await response.text()
  if (!text.includes('<svg')) {
    throw new Error('[react-native-svg-uri] Response does not appear to be an SVG document')
  }
  return text
}
```

- [ ] **Step 4: Run to verify pass**

```bash
yarn test src/__tests__/fetcher.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/fetcher.ts src/__tests__/fetcher.test.ts
git commit -m "feat: add fetcher module"
```

---

### Task 3: Fixer — `clean()`

**Files:**
- Create: `src/fixer.ts`
- Create: `src/__tests__/fixer.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/fixer.test.ts`:

```typescript
import { clean } from '../fixer'

describe('clean()', () => {
  it('strips <script> tags and their content', () => {
    const input = '<svg viewBox="0 0 24 24"><script>alert(1)</script><path d="M0 0"/></svg>'
    expect(clean(input)).not.toContain('<script')
    expect(clean(input)).not.toContain('alert')
  })

  it('strips <style> tags and their content', () => {
    const input = '<svg viewBox="0 0 24 24"><style>.a { fill: red }</style><path d="M0 0"/></svg>'
    expect(clean(input)).not.toContain('<style')
    expect(clean(input)).not.toContain('.a')
  })

  it('strips <animate> self-closing tags', () => {
    const input =
      '<svg viewBox="0 0 24 24"><path d="M0 0"><animate attributeName="opacity" values="0;1" dur="1s"/></path></svg>'
    expect(clean(input)).not.toContain('<animate')
  })

  it('strips <animateTransform> tags', () => {
    const input =
      '<svg viewBox="0 0 24 24"><animateTransform attributeName="transform" type="rotate" dur="2s"/></svg>'
    expect(clean(input)).not.toContain('<animateTransform')
  })

  it('strips <foreignObject> and its nested content', () => {
    const input =
      '<svg viewBox="0 0 24 24"><foreignObject><div>hello</div></foreignObject></svg>'
    expect(clean(input)).not.toContain('<foreignObject')
    expect(clean(input)).not.toContain('<div>')
  })

  it('removes width and height attributes from the root <svg>', () => {
    const input = '<svg width="100" height="100" viewBox="0 0 100 100"><path d="M0 0"/></svg>'
    const result = clean(input)
    expect(result).not.toMatch(/\swidth="/)
    expect(result).not.toMatch(/\sheight="/)
    expect(result).toContain('viewBox="0 0 100 100"')
  })

  it('derives viewBox from width and height when viewBox is absent', () => {
    const input = '<svg width="24" height="24"><path d="M0 0"/></svg>'
    expect(clean(input)).toContain('viewBox="0 0 24 24"')
  })

  it('preserves an existing viewBox when width and height are also present', () => {
    const input = '<svg width="100" height="100" viewBox="0 0 50 50"><path d="M0 0"/></svg>'
    const result = clean(input)
    expect(result).toContain('viewBox="0 0 50 50"')
    expect(result).not.toMatch(/\swidth="/)
  })

  it('logs a warning and continues when svg has no viewBox, width, or height', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    clean('<svg><path d="M0 0"/></svg>')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('viewBox'))
    warn.mockRestore()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
yarn test src/__tests__/fixer.test.ts
```

Expected: FAIL — `Cannot find module '../fixer'`

- [ ] **Step 3: Implement `clean()` in `src/fixer.ts`**

```typescript
const STRIP_TAGS = [
  'script',
  'style',
  'animate',
  'animateTransform',
  'animateMotion',
  'foreignObject',
]

export function clean(xml: string): string {
  let result = xml

  for (const tag of STRIP_TAGS) {
    result = result.replace(
      new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'),
      ''
    )
    result = result.replace(new RegExp(`<${tag}\\b[^>]*/?>`, 'gi'), '')
  }

  const viewBoxMatch = result.match(/<svg[^>]*\sviewBox="([^"]*)"/)
  const widthMatch = result.match(/<svg[^>]*\swidth="([^"]*)"/)
  const heightMatch = result.match(/<svg[^>]*\sheight="([^"]*)"/)

  if (!viewBoxMatch) {
    if (widthMatch && heightMatch) {
      result = result.replace(
        /<svg\b/,
        `<svg viewBox="0 0 ${widthMatch[1]} ${heightMatch[1]}"`
      )
    } else {
      console.warn(
        '[react-native-svg-uri] SVG has no viewBox, width, or height — sizing may be incorrect'
      )
    }
  }

  result = result.replace(/(<svg\b[^>]*)\swidth="[^"]*"/, '$1')
  result = result.replace(/(<svg\b[^>]*)\sheight="[^"]*"/, '$1')

  return result.trim()
}
```

- [ ] **Step 4: Run to verify pass**

```bash
yarn test src/__tests__/fixer.test.ts
```

Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/fixer.ts src/__tests__/fixer.test.ts
git commit -m "feat: add fixer clean() — strips unsupported elements and fixes SVG sizing"
```

---

### Task 4: Fixer — `colorize()`

**Files:**
- Modify: `src/fixer.ts`
- Modify: `src/__tests__/fixer.test.ts`

- [ ] **Step 1: Update the import and append colorize tests to `src/__tests__/fixer.test.ts`**

Change the first line from:
```typescript
import { clean } from '../fixer'
```
to:
```typescript
import { clean, colorize } from '../fixer'
```

Then append these tests at the bottom of the file:

```typescript
describe('colorize()', () => {
  it('replaces a hex fill attribute with currentColor', () => {
    const input = '<svg><path fill="#ff0000" d="M0 0"/></svg>'
    expect(colorize(input)).toContain('fill="currentColor"')
    expect(colorize(input)).not.toContain('#ff0000')
  })

  it('replaces a named color fill attribute with currentColor', () => {
    const input = '<svg><path fill="red" d="M0 0"/></svg>'
    expect(colorize(input)).toContain('fill="currentColor"')
  })

  it('replaces a stroke attribute with currentColor', () => {
    const input = '<svg><path stroke="blue" d="M0 0"/></svg>'
    expect(colorize(input)).toContain('stroke="currentColor"')
  })

  it('preserves fill="none"', () => {
    const input = '<svg><path fill="none" d="M0 0"/></svg>'
    expect(colorize(input)).toContain('fill="none"')
  })

  it('preserves fill="transparent"', () => {
    const input = '<svg><path fill="transparent" d="M0 0"/></svg>'
    expect(colorize(input)).toContain('fill="transparent"')
  })

  it('preserves fill="inherit"', () => {
    const input = '<svg><path fill="inherit" d="M0 0"/></svg>'
    expect(colorize(input)).toContain('fill="inherit"')
  })

  it('does not double-replace fill="currentColor"', () => {
    const input = '<svg><path fill="currentColor" d="M0 0"/></svg>'
    const matches = colorize(input).match(/fill="currentColor"/g) ?? []
    expect(matches.length).toBe(1)
  })

  it('preserves url() fill references', () => {
    const input = '<svg><path fill="url(#gradient)" d="M0 0"/></svg>'
    expect(colorize(input)).toContain('fill="url(#gradient)"')
  })

  it('replaces fill in an inline style attribute', () => {
    const input = '<svg><path style="fill: red; opacity: 1" d="M0 0"/></svg>'
    expect(colorize(input)).toContain('fill: currentColor')
    expect(colorize(input)).toContain('opacity: 1')
  })

  it('preserves fill: none in an inline style attribute', () => {
    const input = '<svg><path style="fill: none" d="M0 0"/></svg>'
    expect(colorize(input)).toContain('fill: none')
  })

  it('replaces stroke in an inline style attribute', () => {
    const input = '<svg><path style="stroke: #333" d="M0 0"/></svg>'
    expect(colorize(input)).toContain('stroke: currentColor')
  })
})
```

- [ ] **Step 2: Run to verify the colorize tests fail**

```bash
yarn test src/__tests__/fixer.test.ts
```

Expected: FAIL — `colorize is not a function`

- [ ] **Step 3: Append `colorize()` to `src/fixer.ts`**

```typescript
const SKIP_COLOR_VALUES = ['none', 'transparent', 'inherit', 'currentcolor']

export function colorize(xml: string): string {
  let result = xml

  result = result.replace(
    /\b(fill|stroke)="([^"]*)"/gi,
    (match, attr: string, value: string) => {
      const v = value.trim().toLowerCase()
      if (SKIP_COLOR_VALUES.includes(v)) return match
      if (v.startsWith('url(')) return match
      return `${attr}="currentColor"`
    }
  )

  result = result.replace(/style="([^"]*)"/gi, (_match, styleContent: string) => {
    const updated = styleContent.replace(
      /(fill|stroke)\s*:\s*([^;}"]+)/gi,
      (m: string, prop: string, value: string) => {
        const v = value.trim().toLowerCase()
        if (SKIP_COLOR_VALUES.includes(v)) return m
        if (v.startsWith('url(')) return m
        return `${prop}: currentColor`
      }
    )
    return `style="${updated}"`
  })

  return result
}
```

- [ ] **Step 4: Run all fixer tests to verify pass**

```bash
yarn test src/__tests__/fixer.test.ts
```

Expected: PASS (20 tests — 9 clean + 11 colorize)

- [ ] **Step 5: Commit**

```bash
git add src/fixer.ts src/__tests__/fixer.test.ts
git commit -m "feat: add fixer colorize() — replaces fill/stroke colors with currentColor"
```

---

### Task 5: Cache — in-memory

**Files:**
- Create: `src/cache.ts`
- Create: `src/__tests__/cache.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/cache.test.ts`:

```typescript
import { getFromMemory, setInMemory, clearMemoryCache } from '../cache'

beforeEach(() => clearMemoryCache())

describe('in-memory cache', () => {
  it('returns null for a miss with no color', () => {
    expect(getFromMemory('https://example.com/miss.svg')).toBeNull()
  })

  it('returns null for a miss with color', () => {
    expect(getFromMemory('https://example.com/miss.svg', '#ff0000')).toBeNull()
  })

  it('returns stored value after set with no color', () => {
    setInMemory('https://example.com/a.svg', undefined, '<svg/>')
    expect(getFromMemory('https://example.com/a.svg')).toBe('<svg/>')
  })

  it('returns stored value after set with color', () => {
    setInMemory('https://example.com/b.svg', '#ff0000', '<svg red/>')
    expect(getFromMemory('https://example.com/b.svg', '#ff0000')).toBe('<svg red/>')
  })

  it('separates entries by color for the same uri', () => {
    setInMemory('https://example.com/c.svg', '#ff0000', '<svg red/>')
    setInMemory('https://example.com/c.svg', '#0000ff', '<svg blue/>')
    expect(getFromMemory('https://example.com/c.svg', '#ff0000')).toBe('<svg red/>')
    expect(getFromMemory('https://example.com/c.svg', '#0000ff')).toBe('<svg blue/>')
  })

  it('separates entries by uri', () => {
    setInMemory('https://example.com/x.svg', undefined, '<svg x/>')
    setInMemory('https://example.com/y.svg', undefined, '<svg y/>')
    expect(getFromMemory('https://example.com/x.svg')).toBe('<svg x/>')
    expect(getFromMemory('https://example.com/y.svg')).toBe('<svg y/>')
  })

  it('returns null after clearMemoryCache', () => {
    setInMemory('https://example.com/d.svg', undefined, '<svg/>')
    clearMemoryCache()
    expect(getFromMemory('https://example.com/d.svg')).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
yarn test src/__tests__/cache.test.ts
```

Expected: FAIL — `Cannot find module '../cache'`

- [ ] **Step 3: Create `src/cache.ts` with in-memory functions**

```typescript
const memoryCache = new Map<string, string>()

function memKey(uri: string, color?: string): string {
  return `${uri}::${color ?? ''}`
}

export function getFromMemory(uri: string, color?: string): string | null {
  return memoryCache.get(memKey(uri, color)) ?? null
}

export function setInMemory(uri: string, color: string | undefined, xml: string): void {
  memoryCache.set(memKey(uri, color), xml)
}

export function clearMemoryCache(): void {
  memoryCache.clear()
}
```

- [ ] **Step 4: Run to verify pass**

```bash
yarn test src/__tests__/cache.test.ts
```

Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/cache.ts src/__tests__/cache.test.ts
git commit -m "feat: add cache module with in-memory Map"
```

---

### Task 6: Cache — file system adapter

**Files:**
- Modify: `src/cache.ts`
- Modify: `src/__tests__/cache.test.ts`

- [ ] **Step 1: Append file system tests to `src/__tests__/cache.test.ts`**

Add this import at the top of the file (after the existing import):
```typescript
import { getFromFileSystem, setInFileSystem } from '../cache'
```

Then append at the bottom of the file:

```typescript
describe('file system cache', () => {
  const mockExpoFs = {
    cacheDirectory: 'file:///mock-cache/',
    getInfoAsync: jest.fn(),
    readAsStringAsync: jest.fn(),
    writeAsStringAsync: jest.fn(),
  }

  beforeEach(() => {
    jest.resetModules()
    jest.mock('expo-file-system', () => mockExpoFs, { virtual: true })
    mockExpoFs.getInfoAsync.mockReset()
    mockExpoFs.readAsStringAsync.mockReset()
    mockExpoFs.writeAsStringAsync.mockReset()
  })

  it('returns null when the file does not exist', async () => {
    mockExpoFs.getInfoAsync.mockResolvedValue({ exists: false })
    const { getFromFileSystem: get } = require('../cache')
    expect(await get('https://example.com/x.svg')).toBeNull()
  })

  it('returns file content when the file exists', async () => {
    mockExpoFs.getInfoAsync.mockResolvedValue({ exists: true })
    mockExpoFs.readAsStringAsync.mockResolvedValue('<svg cached/>')
    const { getFromFileSystem: get } = require('../cache')
    expect(await get('https://example.com/y.svg')).toBe('<svg cached/>')
  })

  it('writes content to the file system', async () => {
    mockExpoFs.writeAsStringAsync.mockResolvedValue(undefined)
    const { setInFileSystem: set } = require('../cache')
    await set('https://example.com/z.svg', '<svg/>')
    expect(mockExpoFs.writeAsStringAsync).toHaveBeenCalledWith(
      expect.stringContaining('rnsvguri_'),
      '<svg/>'
    )
  })

  it('throws a descriptive error when no adapter is available', async () => {
    jest.resetModules()
    jest.mock('expo-file-system', () => { throw new Error('not found') }, { virtual: true })
    jest.mock('react-native-fs', () => { throw new Error('not found') }, { virtual: true })
    const { setInFileSystem: set } = require('../cache')
    await expect(set('https://x.com/f.svg', '<svg/>')).rejects.toThrow('expo-file-system')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
yarn test src/__tests__/cache.test.ts
```

Expected: FAIL — `getFromFileSystem is not a function`

- [ ] **Step 3: Append file system functions to `src/cache.ts`**

```typescript
function hashUri(uri: string): string {
  let h = 5381
  for (let i = 0; i < uri.length; i++) {
    h = ((h << 5) + h) ^ uri.charCodeAt(i)
    h = h >>> 0
  }
  return h.toString(16)
}

type FsAdapter = {
  cacheDir: string
  read: (path: string) => Promise<string | null>
  write: (path: string, content: string) => Promise<void>
}

function getAdapter(): FsAdapter | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('expo-file-system')
    return {
      cacheDir: fs.cacheDirectory as string,
      read: async (path: string) => {
        const info = await fs.getInfoAsync(path)
        if (!info.exists) return null
        return fs.readAsStringAsync(path) as Promise<string>
      },
      write: (path: string, content: string) =>
        fs.writeAsStringAsync(path, content) as Promise<void>,
    }
  } catch {}

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const RNFS = require('react-native-fs')
    return {
      cacheDir: (RNFS.CachesDirectoryPath as string) + '/',
      read: async (path: string) => {
        const exists = await RNFS.exists(path)
        if (!exists) return null
        return RNFS.readFile(path, 'utf8') as Promise<string>
      },
      write: (path: string, content: string) =>
        RNFS.writeFile(path, content, 'utf8') as Promise<void>,
    }
  } catch {}

  return null
}

export async function getFromFileSystem(uri: string): Promise<string | null> {
  const adapter = getAdapter()
  if (!adapter) return null
  const path = `${adapter.cacheDir}rnsvguri_${hashUri(uri)}.svg`
  return adapter.read(path)
}

export async function setInFileSystem(uri: string, xml: string): Promise<void> {
  const adapter = getAdapter()
  if (!adapter) {
    throw new Error(
      '[react-native-svg-uri] persistCache requires expo-file-system or react-native-fs. ' +
        'Install one as a project dependency.'
    )
  }
  const path = `${adapter.cacheDir}rnsvguri_${hashUri(uri)}.svg`
  await adapter.write(path, xml)
}
```

- [ ] **Step 4: Run all cache tests to verify pass**

```bash
yarn test src/__tests__/cache.test.ts
```

Expected: PASS (11 tests — 7 memory + 4 file system)

- [ ] **Step 5: Commit**

```bash
git add src/cache.ts src/__tests__/cache.test.ts
git commit -m "feat: add cache file system adapter — auto-detects expo-file-system or react-native-fs"
```

---

### Task 7: Global config

**Files:**
- Create: `src/config.ts`
- Create: `src/__tests__/config.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/config.test.ts`:

```typescript
import { configureSvgUri, getConfig } from '../config'

beforeEach(() => configureSvgUri({ persistCache: false }))

describe('configureSvgUri', () => {
  it('defaults persistCache to false', () => {
    expect(getConfig().persistCache).toBe(false)
  })

  it('sets persistCache to true', () => {
    configureSvgUri({ persistCache: true })
    expect(getConfig().persistCache).toBe(true)
  })

  it('can reset persistCache back to false', () => {
    configureSvgUri({ persistCache: true })
    configureSvgUri({ persistCache: false })
    expect(getConfig().persistCache).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
yarn test src/__tests__/config.test.ts
```

Expected: FAIL — `Cannot find module '../config'`

- [ ] **Step 3: Create `src/config.ts`**

```typescript
interface SvgUriConfig {
  persistCache: boolean
}

let config: SvgUriConfig = {
  persistCache: false,
}

export function configureSvgUri(options: Partial<SvgUriConfig>): void {
  config = { ...config, ...options }
}

export function getConfig(): Readonly<SvgUriConfig> {
  return config
}
```

- [ ] **Step 4: Run to verify pass**

```bash
yarn test src/__tests__/config.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/config.ts src/__tests__/config.test.ts
git commit -m "feat: add configureSvgUri global config"
```

---

### Task 8: SvgUri component

**Files:**
- Create: `src/SvgUri.tsx`
- Create: `src/__tests__/SvgUri.test.tsx`

- [ ] **Step 1: Install the component test dependency if not already present**

```bash
yarn add --dev @testing-library/react-native
```

- [ ] **Step 2: Write the failing tests**

Create `src/__tests__/SvgUri.test.tsx`:

```tsx
import React from 'react'
import { View } from 'react-native'
import { render, waitFor } from '@testing-library/react-native'
import { SvgUri } from '../SvgUri'
import { fetchSvg } from '../fetcher'

jest.mock('react-native-svg', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    SvgXml: ({ testID }: { testID?: string }) =>
      React.createElement(View, { testID: testID ?? 'svg-xml' }),
  }
})

jest.mock('../fetcher', () => ({
  fetchSvg: jest.fn(),
}))

jest.mock('../fixer', () => ({
  clean: (xml: string) => xml,
  colorize: (xml: string) => xml,
}))

// Keep real memory cache functions; mock only file system functions
jest.mock('../cache', () => {
  const memoryCache = new Map<string, string>()
  const memKey = (uri: string, color?: string) => `${uri}::${color ?? ''}`
  return {
    getFromMemory: (uri: string, color?: string) =>
      memoryCache.get(memKey(uri, color)) ?? null,
    setInMemory: (uri: string, color: string | undefined, xml: string) =>
      memoryCache.set(memKey(uri, color), xml),
    clearMemoryCache: () => memoryCache.clear(),
    getFromFileSystem: jest.fn().mockResolvedValue(null),
    setInFileSystem: jest.fn().mockResolvedValue(undefined),
  }
})

jest.mock('../config', () => ({
  getConfig: jest.fn().mockReturnValue({ persistCache: false }),
}))

import { clearMemoryCache, setInMemory } from '../cache'

const mockFetchSvg = fetchSvg as jest.Mock

beforeEach(() => {
  clearMemoryCache()
  mockFetchSvg.mockReset()
})

describe('SvgUri', () => {
  it('renders SVG immediately when memory cache is already populated', () => {
    setInMemory('https://example.com/icon.svg', undefined, '<svg/>')
    const { getByTestId } = render(
      <SvgUri uri="https://example.com/icon.svg" width={24} height={24} />
    )
    expect(getByTestId('svg-xml')).toBeTruthy()
  })

  it('shows a user-provided placeholder while fetching', () => {
    mockFetchSvg.mockReturnValue(new Promise(() => {}))
    const { getByTestId } = render(
      <SvgUri
        uri="https://example.com/icon.svg"
        width={24}
        height={24}
        placeholder={<View testID="my-placeholder" />}
      />
    )
    expect(getByTestId('my-placeholder')).toBeTruthy()
  })

  it('shows the auto-generated grey box when no placeholder is provided', () => {
    mockFetchSvg.mockReturnValue(new Promise(() => {}))
    const { getByTestId } = render(
      <SvgUri uri="https://example.com/icon.svg" width={24} height={24} />
    )
    expect(getByTestId('svg-uri-default-placeholder')).toBeTruthy()
  })

  it('renders SVG after a successful fetch', async () => {
    mockFetchSvg.mockResolvedValue('<svg viewBox="0 0 24 24"/>')
    const { getByTestId } = render(
      <SvgUri uri="https://example.com/icon.svg" width={24} height={24} />
    )
    await waitFor(() => expect(getByTestId('svg-xml')).toBeTruthy())
  })

  it('shows the fallback prop after a fetch failure', async () => {
    mockFetchSvg.mockRejectedValue(new Error('network error'))
    const { getByTestId } = render(
      <SvgUri
        uri="https://example.com/icon.svg"
        width={24}
        height={24}
        fallback={<View testID="my-fallback" />}
      />
    )
    await waitFor(() => expect(getByTestId('my-fallback')).toBeTruthy())
  })

  it('falls back to placeholder when no fallback prop is provided', async () => {
    mockFetchSvg.mockRejectedValue(new Error('network error'))
    const { getByTestId } = render(
      <SvgUri
        uri="https://example.com/icon.svg"
        width={24}
        height={24}
        placeholder={<View testID="my-placeholder" />}
      />
    )
    await waitFor(() => expect(getByTestId('my-placeholder')).toBeTruthy())
  })

  it('falls back to the auto-generated grey box when neither fallback nor placeholder is provided', async () => {
    mockFetchSvg.mockRejectedValue(new Error('network error'))
    const { getByTestId } = render(
      <SvgUri uri="https://example.com/icon.svg" width={24} height={24} />
    )
    await waitFor(() => expect(getByTestId('svg-uri-default-placeholder')).toBeTruthy())
  })
})
```

- [ ] **Step 3: Run to verify failure**

```bash
yarn test src/__tests__/SvgUri.test.tsx
```

Expected: FAIL — `Cannot find module '../SvgUri'`

- [ ] **Step 4: Create `src/SvgUri.tsx`**

```tsx
import React, { useEffect, useState } from 'react'
import { StyleProp, View, ViewStyle } from 'react-native'
import { SvgXml } from 'react-native-svg'
import { fetchSvg } from './fetcher'
import { clean, colorize } from './fixer'
import { getFromMemory, setInMemory, getFromFileSystem, setInFileSystem } from './cache'
import { getConfig } from './config'

export interface SvgUriProps {
  uri: string
  width: number | string
  height: number | string
  color?: string
  placeholder?: React.ReactNode
  fallback?: React.ReactNode
  persistCache?: boolean
  style?: StyleProp<ViewStyle>
}

type RenderState = 'loading' | 'ready' | 'error'

export function SvgUri({
  uri,
  width,
  height,
  color,
  placeholder,
  fallback,
  persistCache: persistCacheProp,
  style,
}: SvgUriProps) {
  const persistCache = persistCacheProp ?? getConfig().persistCache

  const [xml, setXml] = useState<string | null>(null)
  const [state, setState] = useState<RenderState>('loading')

  useEffect(() => {
    let cancelled = false

    const cached = getFromMemory(uri, color)
    if (cached) {
      setXml(cached)
      setState('ready')
      return
    }

    setXml(null)
    setState('loading')

    async function load() {
      if (persistCache) {
        const fsCached = await getFromFileSystem(uri)
        if (fsCached && !cancelled) {
          const ready = color ? colorize(fsCached) : fsCached
          setInMemory(uri, color, ready)
          setXml(ready)
          setState('ready')
          return
        }
      }

      try {
        const raw = await fetchSvg(uri)
        const cleaned = clean(raw)

        if (persistCache) {
          await setInFileSystem(uri, cleaned)
        }

        const ready = color ? colorize(cleaned) : cleaned
        setInMemory(uri, color, ready)

        if (!cancelled) {
          setXml(ready)
          setState('ready')
        }
      } catch {
        if (!cancelled) {
          setState('error')
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [uri, color, persistCache])

  const defaultPlaceholder = (
    <View
      testID="svg-uri-default-placeholder"
      style={[{ width, height, backgroundColor: '#E0E0E0' }, style]}
    />
  )

  const effectiveFallback = fallback ?? placeholder ?? defaultPlaceholder
  const effectivePlaceholder = placeholder ?? defaultPlaceholder

  if (state === 'error') {
    return <>{effectiveFallback}</>
  }

  if (state === 'loading' || !xml) {
    return <>{effectivePlaceholder}</>
  }

  return (
    <View style={style}>
      <SvgXml xml={xml} width={width} height={height} color={color} testID="svg-xml" />
    </View>
  )
}
```

- [ ] **Step 5: Run to verify pass**

```bash
yarn test src/__tests__/SvgUri.test.tsx
```

Expected: PASS (7 tests)

- [ ] **Step 6: Run the full test suite to confirm no regressions**

```bash
yarn test
```

Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
git add src/SvgUri.tsx src/__tests__/SvgUri.test.tsx
git commit -m "feat: add SvgUri component with loading, error, and cache states"
```

---

### Task 9: Public exports and README

**Files:**
- Create: `src/index.ts`
- Modify: `README.md`

- [ ] **Step 1: Create `src/index.ts`**

```typescript
export { SvgUri } from './SvgUri'
export { configureSvgUri } from './config'
export type { SvgUriProps } from './SvgUri'
```

- [ ] **Step 2: Verify the build succeeds**

```bash
yarn prepare
```

Expected: build completes without errors, CJS and ESM outputs generated.

- [ ] **Step 3: Replace `README.md` with the following content**

```markdown
# react-native-svg-uri

Render remote SVGs in React Native. Fetches an SVG from a URL, cleans it for `react-native-svg` compatibility, caches the result, and renders it with full control over size, color, and fallback states.

## Installation

```sh
npm install react-native-svg-uri react-native-svg
# or
yarn add react-native-svg-uri react-native-svg
```

Follow the [react-native-svg installation guide](https://github.com/software-mansion/react-native-svg) to complete native setup.

### File system cache (optional)

To persist SVGs across app restarts, install one of:

```sh
# Expo projects
npx expo install expo-file-system

# Bare React Native
yarn add react-native-fs
```

## Usage

```tsx
import { SvgUri } from 'react-native-svg-uri'

<SvgUri
  uri="https://example.com/icon.svg"
  width={64}
  height={64}
/>
```

## Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `uri` | `string` | Yes | URL of the SVG to render |
| `width` | `number \| string` | Yes | Width passed to react-native-svg |
| `height` | `number \| string` | Yes | Height passed to react-native-svg |
| `color` | `string` | No | Replaces all fill/stroke colors with this color |
| `placeholder` | `ReactNode` | No | Shown while fetching. Defaults to a grey box. |
| `fallback` | `ReactNode` | No | Shown on fetch failure. Defaults to `placeholder`. |
| `persistCache` | `boolean` | No | Persist to device file system across restarts |
| `style` | `StyleProp<ViewStyle>` | No | Applied to the wrapping View |

## Color theming

Pass a `color` prop to tint the entire SVG. All `fill` and `stroke` values are replaced with `currentColor` and the color is applied via `react-native-svg`'s color prop. Values of `none`, `transparent`, `inherit`, and `url()` references are preserved.

```tsx
<SvgUri uri="https://example.com/icon.svg" width={24} height={24} color="#E63946" />
```

## Global configuration

To enable file system caching app-wide without passing `persistCache` on every component, call `configureSvgUri` once at app startup (e.g. in your root `App.tsx` before rendering):

```ts
import { configureSvgUri } from 'react-native-svg-uri'

configureSvgUri({ persistCache: true })
```

Individual components can still override this with their own `persistCache` prop.

## Caching behaviour

| Layer | When used | Persists |
|---|---|---|
| In-memory Map | Always | App session only |
| File system | When `persistCache` is true | Across restarts |

The file system stores the cleaned SVG (original colors). The in-memory cache stores the color-applied version so re-renders are instant.

## License

MIT
```

- [ ] **Step 4: Commit**

```bash
git add src/index.ts README.md
git commit -m "feat: wire public exports and write README"
```
