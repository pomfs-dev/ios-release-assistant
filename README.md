# iOS Release Assistant

iOS Release Assistant is an open-source tool for people who are new to Xcode and need help preparing an iOS app for App Store release.

The goal is to turn difficult Xcode and App Store Connect setup work into beginner-friendly questions, then safely generate or update the project configuration needed for release.

Repository: https://github.com/pomfs-dev/ios-release-assistant

## Product Direction

- Beginner-first setup assistant for iOS release preparation
- General-purpose iOS app tool, not POMFS-specific
- Local install for real file access and `xcodegen generate`
- Online version for guided setup, `project.yml` creation, review checklists, and App Store Connect checks
- App Store Connect API support in the MVP
- MIT License

## Current Status

This project is currently being drafted inside the POMFS iOS app repository under `ios-release-assistant/`, and is also published as a standalone GitHub repository at `pomfs-dev/ios-release-assistant`.

The current implementation is a Vite + React + TypeScript app with a local Node server. It can select an app folder or `project.yml` through Finder, scan XcodeGen specs, Xcode projects, workspaces, Info.plist files, entitlements, app icons, and asset catalogs, then build a reviewable write plan. Local backup, safe write, `xcodegen generate`, App Store Connect app lookup, and App Store Connect draft metadata updates for privacy policy URL and app description are wired through the local bridge. Screenshot upload, app preview upload, review submission, and full App Store Connect metadata mutation are not implemented yet.

## Local Development

```bash
npm install
npm run dev
```

Optional local default app path:

```bash
cp .env.example .env
```

The local development server serves both the React app and local-only APIs:

- `GET /api/health`
- `GET /api/bridge/health`
- `POST /api/bridge/select-folder`
- `POST /api/bridge/select-project-spec`
- `POST /api/bridge/scan-folder` with `{ "path": "/path/to/ios-app" }`

Build check:

```bash
npm run build
```

## License

MIT License. See [LICENSE](LICENSE).

## Safety Notes

- This is not an official Apple tool.
- The app must not ask for an Apple ID password.
- App Store Connect integration should use API keys with the minimum required permissions.
- Local project generation should create a backup before running XcodeGen.
