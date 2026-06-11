import { describe, expect, it } from "vitest";
import {
  completeFolderScanResult,
  missingEntitlementsScanResult,
  missingInfoPlistScanResult,
} from "../test/fixtures/folderScanResults";
import { getAppScanSummary } from "./appScanSummary";
import { deriveReleaseSteps } from "./deriveReleaseSteps";
import { derivePreflightSummary } from "./preflightChecks";

function findCheck(result: ReturnType<typeof derivePreflightSummary>, id: string) {
  return result?.checks.find((check) => check.id === id);
}

describe("getAppScanSummary", () => {
  it("derives release-ready app metadata from a folder scan", () => {
    const summary = getAppScanSummary(completeFolderScanResult);

    expect(summary).toMatchObject({
      appName: "Fixture App",
      bundleId: "com.example.fixture",
      version: "1.2.3",
      build: "45",
      developmentTeam: "ABCDE12345",
      projectSpec: "project.yml",
      xcodeProject: "FixtureApp.xcodeproj",
      infoPlist: "FixtureApp/Info.plist",
      entitlements: "FixtureApp/FixtureApp.entitlements",
      appIconSet: "FixtureApp/Assets.xcassets/AppIcon.appiconset",
      hasMarketingAppIcon: true,
      appIconImageCount: 2,
      appIconPreviewDataUrl: "data:image/png;base64,ZmFrZS1pY29u",
      screenPreviewDataUrl: "data:image/png;base64,ZmFrZS1zY3JlZW4=",
      screenPreviewLabel: "screenshots/iphone-home.png",
      screenshotCount: 1,
      hasInfoPlist: true,
      hasEntitlements: true,
    });
    expect(summary?.privacyKeys).toHaveLength(1);
    expect(summary?.capabilities.map((capability) => capability.key)).toEqual([
      "com.apple.developer.applesignin",
      "com.apple.developer.associated-domains",
    ]);
  });

  it("does not use automatic web captures as App Store screen previews", () => {
    const scanResult = structuredClone(completeFolderScanResult);
    scanResult.files.screenshots = [];
    scanResult.files.webApp = {
      rootUrl: "https://example.com",
      sourceFile: {
        name: "ContentView.swift",
        relativePath: "FixtureApp/ContentView.swift",
        absolutePath: "/fixtures/complete-xcodegen-app/FixtureApp/ContentView.swift",
      },
      previewDataUrl: "data:image/png;base64,ZmFrZS13ZWI=",
      previewError: null,
    };

    const summary = getAppScanSummary(scanResult);

    expect(summary).toMatchObject({
      screenPreviewDataUrl: null,
      screenPreviewLabel: null,
      webPreviewUrl: "https://example.com",
      screenshotCount: 0,
    });
  });
});

describe("derivePreflightSummary", () => {
  it("marks the missing Info.plist check as an error", () => {
    const preflight = derivePreflightSummary(missingInfoPlistScanResult);

    expect(findCheck(preflight, "info-plist")).toMatchObject({
      status: "error",
      title: "Info.plist 없음",
    });
    expect(preflight?.errorCount).toBeGreaterThan(0);
  });

  it("keeps missing entitlements as a warning, not a blocking error", () => {
    const preflight = derivePreflightSummary(missingEntitlementsScanResult);

    expect(findCheck(preflight, "entitlements-file")).toMatchObject({
      status: "warn",
      title: "Entitlements 파일 없음",
    });
  });

  it("warns when the App Store marketing icon is missing", () => {
    const scanResult = structuredClone(completeFolderScanResult);
    scanResult.files.appIconSets = [];
    const preflight = derivePreflightSummary(scanResult);

    expect(findCheck(preflight, "app-store-icon")).toMatchObject({
      status: "warn",
      title: "App Store 아이콘 확인 필요",
    });
  });

  it("closes input-based checks from explicit user answers", () => {
    const baseline = derivePreflightSummary(completeFolderScanResult);
    const preflight = derivePreflightSummary(completeFolderScanResult, {
      privacy: {
        "개인정보 처리방침 주소": "https://example.com/privacy",
      },
      store: {
        "심사용 데모 계정": "review@example.com / password",
        "심사 접근 방식": ["로그인 필요"],
        "App Store 미디어 자산": ["스크린샷 준비 완료"],
      },
    });

    expect(preflight?.reviewCount).toBeLessThan(baseline?.reviewCount ?? 0);
    expect(findCheck(preflight, "privacy-policy-url")).toMatchObject({
      status: "ok",
      title: "Privacy Policy URL 입력됨",
    });
    expect(findCheck(preflight, "app-store-privacy")).toMatchObject({
      status: "ok",
    });
    expect(findCheck(preflight, "app-store-icon")).toMatchObject({
      status: "ok",
      title: "App Store 아이콘 준비됨",
    });
    expect(findCheck(preflight, "demo-account")).toMatchObject({
      status: "ok",
      title: "심사용 데모 계정 입력됨",
    });
    expect(findCheck(preflight, "screenshots")).toMatchObject({
      status: "ok",
      title: "스크린샷 준비 확인됨",
    });
  });

  it("does not require a demo account when login is explicitly not required", () => {
    const preflight = derivePreflightSummary(completeFolderScanResult, {
      store: {
        "심사 접근 방식": ["로그인 필요 없음"],
      },
    });

    expect(findCheck(preflight, "demo-account")).toMatchObject({
      status: "ok",
      title: "데모 계정 필요 없음 확인됨",
    });
  });

  it("closes manual checks when they are explicitly confirmed", () => {
    const preflight = derivePreflightSummary(completeFolderScanResult, {}, [
      "apple-sign-in-portal",
      "associated-domains-site",
      "screenshots",
      "backup-before-generate",
    ]);

    expect(findCheck(preflight, "apple-sign-in-portal")).toMatchObject({
      status: "ok",
      title: "Apple 로그인 사이트 설정 확인됨",
    });
    expect(findCheck(preflight, "associated-domains-site")).toMatchObject({
      status: "ok",
      title: "Associated Domains 웹사이트 파일 확인됨",
    });
    expect(findCheck(preflight, "screenshots")).toMatchObject({
      status: "ok",
      title: "스크린샷 준비 확인됨",
    });
    expect(findCheck(preflight, "backup-before-generate")).toMatchObject({
      status: "ok",
      title: "생성 전 백업 확인됨",
    });
  });

  it("closes Apple capability follow-up checks when the capability step is confirmed", () => {
    const preflight = derivePreflightSummary(completeFolderScanResult, {
      capabilities: {
        "capabilities.choices.0": ["Apple 로그인 사용", "웹사이트 링크 연결"],
        "앱과 연결할 웹사이트 주소": "applinks:example.com",
      },
    });

    expect(findCheck(preflight, "apple-sign-in-portal")).toMatchObject({
      status: "ok",
      title: "Apple 로그인 사이트 설정 확인됨",
    });
    expect(findCheck(preflight, "associated-domains-site")).toMatchObject({
      status: "ok",
      title: "Associated Domains 웹사이트 파일 확인됨",
    });
  });
});

describe("deriveReleaseSteps", () => {
  it("reflects scanned values in the basic, privacy, capabilities, and store steps", () => {
    const steps = deriveReleaseSteps(completeFolderScanResult);
    const basic = steps.find((step) => step.id === "basic");
    const privacy = steps.find((step) => step.id === "privacy");
    const capabilities = steps.find((step) => step.id === "capabilities");
    const store = steps.find((step) => step.id === "store");

    expect(basic).toMatchObject({
      status: "done",
      changePreview: expect.stringContaining("PRODUCT_BUNDLE_IDENTIFIER: com.example.fixture"),
    });
    expect(privacy).toMatchObject({
      status: "done",
      changePreview: expect.stringContaining("NSCameraUsageDescription"),
    });
    expect(capabilities).toMatchObject({
      status: "done",
      changePreview: expect.stringContaining("com.apple.developer.applesignin"),
    });
    expect(store).toMatchObject({
      changePreview: expect.stringContaining("앱 아이콘: FixtureApp/Assets.xcassets/AppIcon.appiconset"),
      preview: {
        screenImageDataUrl: "data:image/png;base64,ZmFrZS1zY3JlZW4=",
      },
    });
  });
});
