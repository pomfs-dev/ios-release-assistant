import { describe, expect, it } from "vitest";
import { completeFolderScanResult, missingInfoPlistScanResult } from "../test/fixtures/folderScanResults";
import { deriveChangeReviewSummary } from "./changeReviewSummary";
import { deriveReleaseSteps } from "./deriveReleaseSteps";
import { updateUserAnswer } from "./userAnswers";
import type { UserAnswerState } from "../types";

function answersWith(...entries: Array<[string, string, string | string[]]>) {
  return entries.reduce<UserAnswerState>(
    (answers, [stepId, key, value]) => updateUserAnswer(answers, stepId, key, value),
    {},
  );
}

function allItems(summary: ReturnType<typeof deriveChangeReviewSummary>) {
  return summary.sections.flatMap((section) => section.items);
}

describe("deriveChangeReviewSummary", () => {
  it("builds a review gate with file, App Store Connect, and command sections", () => {
    const steps = deriveReleaseSteps(completeFolderScanResult);
    const summary = deriveChangeReviewSummary(
      completeFolderScanResult,
      steps,
      answersWith(
        ["basic", "앱 이름", "Renamed Fixture"],
        ["privacy", "개인정보 처리방침 주소", "https://example.com/privacy"],
        ["store", "App Store에 보일 앱 설명", "A production-ready fixture app."],
        ["store", "심사 접근 방식", ["로그인 필요"]],
        ["store", "App Store 미디어 자산", ["스크린샷 준비 완료"]],
      ),
    );

    expect(summary.sections.map((section) => section.id)).toEqual([
      "fileChanges",
      "appStoreConnectUpdates",
      "commandActions",
    ]);
    expect(allItems(summary)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "app-name",
          target: "project.yml",
          proposedValue: "Renamed Fixture",
          status: "ready",
        }),
        expect.objectContaining({
          id: "privacy-policy-url",
          target: "App Store Connect",
          proposedValue: "https://example.com/privacy",
          status: "ready",
          action: expect.objectContaining({
            stepId: "privacy",
            fieldLabel: "개인정보 처리방침 주소",
          }),
        }),
        expect.objectContaining({
          id: "app-store-icon",
          target: "Xcode asset catalog",
          proposedValue: "1024x1024 아이콘 포함",
          status: "ready",
        }),
        expect.objectContaining({
          id: "screenshots",
          target: "App Store Connect",
          proposedValue: "스크린샷 준비 완료",
          status: "ready",
        }),
        expect.objectContaining({
          id: "xcodegen-generate",
          target: "xcodegen generate",
          status: "needs-review",
        }),
      ]),
    );
  });

  it("keeps sensitive demo account details out of the review summary", () => {
    const steps = deriveReleaseSteps(completeFolderScanResult);
    const summary = deriveChangeReviewSummary(
      completeFolderScanResult,
      steps,
      answersWith(["store", "심사용 데모 계정", "sample demo access note"]),
    );

    const demoAccount = allItems(summary).find((item) => item.id === "demo-account");

    expect(demoAccount).toMatchObject({
      proposedValue: "입력됨",
      status: "ready",
    });
    expect(JSON.stringify(summary)).not.toContain("sample demo access note");
  });

  it("marks equal current and proposed values as unchanged instead of file changes", () => {
    const steps = deriveReleaseSteps(completeFolderScanResult);
    const summary = deriveChangeReviewSummary(completeFolderScanResult, steps, {});
    const appName = allItems(summary).find((item) => item.id === "app-name");

    expect(appName).toMatchObject({
      currentValue: "Fixture App",
      proposedValue: "Fixture App",
      status: "unchanged",
    });
    expect(summary.unchangedCount).toBeGreaterThan(0);
  });

  it("does not treat sample defaults as confirmed user changes", () => {
    const scanResult = structuredClone(completeFolderScanResult);
    scanResult.project!.targets[0].developmentTeam = null;
    const steps = deriveReleaseSteps(scanResult);
    const summary = deriveChangeReviewSummary(scanResult, steps, {});
    const teamId = allItems(summary).find((item) => item.id === "development-team");

    expect(teamId).toMatchObject({
      currentValue: "스캔 필요",
      proposedValue: "확인 필요",
      status: "needs-review",
    });
  });

  it("blocks required submission fields until the user provides them", () => {
    const steps = deriveReleaseSteps(missingInfoPlistScanResult);
    const summary = deriveChangeReviewSummary(missingInfoPlistScanResult, steps, {});

    expect(allItems(summary)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "privacy-policy-url",
          status: "blocked",
          action: expect.objectContaining({
            label: "입력하기",
            stepId: "privacy",
          }),
        }),
      ]),
    );
    expect(summary.blockedCount).toBeGreaterThan(0);
  });
});
