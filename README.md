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
