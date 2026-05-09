# Libraries

Dependencies come from [package.json](../package.json). This table summarizes **runtime** packages and their role in the app.

| Package | Role |
|---------|------|
| `react` / `react-native` | UI runtime and native bridge. |
| `@maplibre/maplibre-react-native` | Tactical map: camera, layers, offline packs, markers. |
| `@react-navigation/native` / `@react-navigation/native-stack` | App shell navigation (`src/app/navigation/`). |
| `react-native-gesture-handler` | Gesture system (must load before React Native in `index.js`). |
| `react-native-reanimated` | Smooth drone heading rotation and small UI animations. |
| `react-native-screens` | Native screen optimization for the stack navigator. |
| `react-native-safe-area-context` | Safe-area insets for HUD and overlays. |
| `@react-native-community/blur` | Glass-style blur panels where used in UI. |
| `react-native-svg` | Vector icons and HUD graphics. |
| `react-native-mmkv` | Fast synchronous persistence (`src/modules/persistence/`). |
| `react-native-keychain` | Secure enclave storage for refresh tokens (`src/modules/session/`). |
| `@react-native-community/netinfo` | Connectivity hints for basemap / offline UX. |
| `zustand` | Telemetry, session, org stores, and lightweight UI state. |

**Dev tooling** (Babel, ESLint, Prettier, Jest, TypeScript, RN CLI) supports linting, tests, and builds but is not shipped in the app binary.
