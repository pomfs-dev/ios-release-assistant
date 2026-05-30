# iOS Release Assistant

iOS Release Assistant is an open-source tool for people who are new to Xcode and need help preparing an iOS app for App Store release.

The goal is to turn difficult Xcode and App Store Connect setup work into beginner-friendly questions, then safely generate or update the project configuration needed for release.

## Product Direction

- Beginner-first setup assistant for iOS release preparation
- General-purpose iOS app tool, not POMFS-specific
- Local install for real file access and `xcodegen generate`
- Online version for guided setup, `project.yml` creation, review checklists, and App Store Connect checks
- App Store Connect API support in the MVP
- MIT License

## Current Status

This project is currently being drafted inside the POMFS iOS app repository under `ios-release-assistant/`.

The plan is to move or push this folder to a separate GitHub repository named `ios-release-assistant` when the initial structure is ready.

## Documentation

- [Product Plan](docs/product-plan.md)
- [HTML Prototype](prototypes/ios-release-assistant-mockup.html)

## License

MIT License. See [LICENSE](LICENSE).

## Safety Notes

- This is not an official Apple tool.
- The app must not ask for an Apple ID password.
- App Store Connect integration should use API keys with the minimum required permissions.
- Local project generation should create a backup before running XcodeGen.
