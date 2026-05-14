# react-native-svg-fetch

Render SVGs in React Native from remote URLs or local bundled assets. Fetches and cleans SVGs for `react-native-svg` compatibility, caches the result, and renders with full control over size, color, and fallback states.

## Installation

```sh
npm install react-native-svg-fetch react-native-svg
# or
yarn add react-native-svg-fetch react-native-svg
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
import { SvgFetch } from 'react-native-svg-fetch'

// Remote URL
<SvgFetch
  source={{ uri: 'https://example.com/icon.svg' }}
  width={64}
  height={64}
/>

// Local bundled asset
<SvgFetch
  source={require('./assets/icon.svg')}
  width={64}
  height={64}
/>
```

## Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `source` | `{ uri: string } \| number` | Yes | Remote URL or local asset (`require('./icon.svg')`) |
| `width` | `number \| string` | Yes | Width passed to react-native-svg |
| `height` | `number \| string` | Yes | Height passed to react-native-svg |
| `color` | `string` | No | Replaces all fill/stroke colors with this color |
| `placeholder` | `ReactNode` | No | Shown while loading. Defaults to a grey box. |
| `fallback` | `ReactNode` | No | Shown on error. Defaults to `placeholder`. |
| `persistCache` | `boolean` | No | Persist to device file system across restarts |
| `style` | `StyleProp<ViewStyle>` | No | Applied to the wrapping View |

## Color theming

Pass a `color` prop to tint the entire SVG. All `fill` and `stroke` values are replaced with `currentColor` and the color is applied via `react-native-svg`'s color prop. Values of `none`, `transparent`, `inherit`, and `url()` references are preserved.

```tsx
<SvgFetch
  source={{ uri: 'https://example.com/icon.svg' }}
  width={24}
  height={24}
  color="#E63946"
/>
```

## Global configuration

To enable file system caching app-wide without passing `persistCache` on every component, call `configureSvgFetch` once at app startup (e.g. in your root `App.tsx` before rendering):

```ts
import { configureSvgFetch } from 'react-native-svg-fetch'

configureSvgFetch({ persistCache: true })
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
