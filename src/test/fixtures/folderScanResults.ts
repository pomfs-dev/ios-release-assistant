import type { FolderScanResult } from "../../types";

export const completeFolderScanResult: FolderScanResult = {
  ok: true,
  folder: {
    name: "complete-xcodegen-app",
    path: "/fixtures/complete-xcodegen-app",
  },
  files: {
    projectSpec: {
      name: "project.yml",
      relativePath: "project.yml",
      absolutePath: "/fixtures/complete-xcodegen-app/project.yml",
    },
    xcodeProjects: [
      {
        name: "FixtureApp.xcodeproj",
        relativePath: "FixtureApp.xcodeproj",
        absolutePath: "/fixtures/complete-xcodegen-app/FixtureApp.xcodeproj",
      },
    ],
    workspaces: [],
    infoPlists: [
      {
        name: "Info.plist",
        relativePath: "FixtureApp/Info.plist",
        absolutePath: "/fixtures/complete-xcodegen-app/FixtureApp/Info.plist",
        parseError: null,
        parsed: {
          bundleDisplayName: "Fixture App",
          bundleName: "FixtureApp",
          bundleIdentifier: "com.example.fixture",
          version: "1.2.3",
          build: "45",
          privacyKeys: [
            {
              key: "NSCameraUsageDescription",
              label: "카메라",
              value: "프로필 사진을 촬영할 때 사용합니다.",
            },
          ],
          appBoundDomains: [],
          backgroundModes: [],
        },
      },
    ],
    entitlements: [
      {
        name: "FixtureApp.entitlements",
        relativePath: "FixtureApp/FixtureApp.entitlements",
        absolutePath: "/fixtures/complete-xcodegen-app/FixtureApp/FixtureApp.entitlements",
        parseError: null,
        parsed: {
          capabilities: [
            {
              key: "com.apple.developer.applesignin",
              label: "Apple 로그인",
              value: "Default",
            },
            {
              key: "com.apple.developer.associated-domains",
              label: "웹사이트 링크",
              value: "applinks:example.com",
            },
          ],
          associatedDomains: ["applinks:example.com"],
          appleSignIn: ["Default"],
          pushEnvironment: null,
          applicationGroups: [],
        },
      },
    ],
    assetCatalogs: [
      {
        name: "Assets.xcassets",
        relativePath: "FixtureApp/Assets.xcassets",
        absolutePath: "/fixtures/complete-xcodegen-app/FixtureApp/Assets.xcassets",
      },
    ],
    appIconSets: [
      {
        name: "AppIcon.appiconset",
        relativePath: "FixtureApp/Assets.xcassets/AppIcon.appiconset",
        absolutePath: "/fixtures/complete-xcodegen-app/FixtureApp/Assets.xcassets/AppIcon.appiconset",
        parseError: null,
        parsed: {
          imageCount: 2,
          referencedImageCount: 2,
          existingImageCount: 2,
          hasMarketingIcon: true,
          marketingIcon: {
            filename: "AppStoreIcon.png",
            idiom: "ios-marketing",
            scale: "1x",
            size: "1024x1024",
            exists: true,
          },
          previewDataUrl: "data:image/png;base64,ZmFrZS1pY29u",
          missingFilenames: [],
        },
      },
    ],
    screenshots: [
      {
        name: "iphone-home.png",
        relativePath: "screenshots/iphone-home.png",
        absolutePath: "/fixtures/complete-xcodegen-app/screenshots/iphone-home.png",
        source: "local-image",
        previewDataUrl: "data:image/png;base64,ZmFrZS1zY3JlZW4=",
      },
    ],
    webApp: null,
  },
  project: {
    name: "FixtureApp",
    targetCount: 1,
    targets: [
      {
        name: "FixtureApp",
        type: "application",
        platform: "iOS",
        deploymentTarget: "17.0",
        productName: "Fixture App",
        bundleId: "com.example.fixture",
        developmentTeam: "ABCDE12345",
        infoPlist: "FixtureApp/Info.plist",
        entitlements: "FixtureApp/FixtureApp.entitlements",
        marketingVersion: "1.2.3",
        currentProjectVersion: "45",
        sourceCount: 1,
        resourceCount: 1,
      },
    ],
  },
  projectParseError: null,
  checklist: [],
};

export const missingInfoPlistScanResult: FolderScanResult = {
  ...completeFolderScanResult,
  files: {
    ...completeFolderScanResult.files,
    infoPlists: [],
  },
};

export const missingEntitlementsScanResult: FolderScanResult = {
  ...completeFolderScanResult,
  files: {
    ...completeFolderScanResult.files,
    entitlements: [],
  },
  project: completeFolderScanResult.project
    ? {
        ...completeFolderScanResult.project,
        targets: completeFolderScanResult.project.targets.map((target) => ({
          ...target,
          entitlements: null,
        })),
      }
    : null,
};
