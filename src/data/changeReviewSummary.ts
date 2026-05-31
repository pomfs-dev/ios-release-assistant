import type {
  ChangeReviewItem,
  ChangeReviewItemStatus,
  ChangeReviewSection,
  ChangeReviewSummary,
  FolderScanResult,
  ReleaseStepId,
  StepDefinition,
  UserAnswerState,
} from "../types";
import { getAppScanSummary } from "./appScanSummary";
import {
  getExplicitSelectedChoiceTitles,
  getExplicitTextAnswer,
  getSelectedChoiceTitles,
} from "./userAnswers";

function display(value: string | null | undefined, fallback = "확인 필요") {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function requiredStatus(value: string | null | undefined): ChangeReviewItemStatus {
  return value?.trim() ? "ready" : "blocked";
}

function reviewStatus(value: string | null | undefined): ChangeReviewItemStatus {
  return value?.trim() ? "ready" : "needs-review";
}

function valuesMatch(currentValue: string | null | undefined, proposedValue: string | null | undefined) {
  const current = currentValue?.trim();
  const proposed = proposedValue?.trim();
  return Boolean(current && proposed && current === proposed);
}

function item(
  id: string,
  title: string,
  target: string,
  currentValue: string | null | undefined,
  proposedValue: string | null | undefined,
  status: ChangeReviewItemStatus,
  action?: ChangeReviewItem["action"],
): ChangeReviewItem {
  const itemStatus =
    status === "ready" && valuesMatch(currentValue, proposedValue) ? "unchanged" : status;

  return {
    id,
    title,
    target,
    currentValue: display(currentValue, "스캔 필요"),
    proposedValue: display(proposedValue),
    status: itemStatus,
    action,
  };
}

function resolveAction(stepId: ReleaseStepId, fieldLabel?: string): ChangeReviewItem["action"] {
  return {
    label: fieldLabel ? "입력하기" : "확인하기",
    stepId,
    fieldLabel,
  };
}

function section(
  id: ChangeReviewSection["id"],
  title: string,
  summary: string,
  items: ChangeReviewItem[],
): ChangeReviewSection {
  return { id, title, summary, items };
}

function selectedCapabilityValue(
  steps: StepDefinition[],
  answers: UserAnswerState,
  title: string,
  enabledValue: string,
) {
  return getSelectedChoiceTitles(steps, answers, "capabilities", title).includes(title)
    ? enabledValue
    : "선택 안 함";
}

function redactSensitiveAnswer(value: string) {
  return value.trim() ? "입력됨" : "";
}

export function deriveChangeReviewSummary(
  scanResult: FolderScanResult | null,
  steps: StepDefinition[],
  answers: UserAnswerState,
): ChangeReviewSummary {
  const scan = getAppScanSummary(scanResult);
  const projectSpec = scan?.projectSpec ?? "project.yml";
  const infoPlist = scan?.infoPlist ?? "Info.plist";
  const entitlements = scan?.entitlements ?? "Entitlements";
  const appNameAnswer = getExplicitTextAnswer(answers, "basic", "앱 이름");
  const bundleIdAnswer = getExplicitTextAnswer(answers, "basic", "앱 고유 주소");
  const teamIdAnswer = getExplicitTextAnswer(answers, "signing", "Apple 개발자 팀 ID");
  const appName = appNameAnswer || scan?.appName || "";
  const bundleId = bundleIdAnswer || scan?.bundleId || "";
  const teamId = teamIdAnswer || scan?.developmentTeam || "";
  const privacyUrl = getExplicitTextAnswer(answers, "privacy", "개인정보 처리방침 주소");
  const appDescription = getExplicitTextAnswer(answers, "store", "App Store에 보일 앱 설명");
  const demoAccount = getExplicitTextAnswer(answers, "store", "심사용 데모 계정");
  const selectedReviewAccess = getExplicitSelectedChoiceTitles(
    steps,
    answers,
    "store",
    "로그인 필요",
  );
  const selectedStoreTasks = getExplicitSelectedChoiceTitles(
    steps,
    answers,
    "store",
    "스크린샷 준비 완료",
  );

  const privacyPermissionItems =
    scan?.privacyKeys.map((permission) => {
      const proposed = getExplicitTextAnswer(answers, "privacy", `${permission.label} 권한 문구`);
      return item(
        `privacy-${permission.key}`,
        `${permission.label} 권한 문구`,
        infoPlist,
        permission.value,
        proposed || permission.value,
        reviewStatus(proposed || permission.value),
        resolveAction("privacy", `${permission.label} 권한 문구`),
      );
    }) ?? [];

  const fileChanges = [
    item(
      "app-name",
      "앱 이름",
      projectSpec,
      scan?.appName,
      appName,
      requiredStatus(appName),
      resolveAction("basic", "앱 이름"),
    ),
    item(
      "bundle-id",
      "앱 고유 주소",
      projectSpec,
      scan?.bundleId,
      bundleId,
      requiredStatus(bundleId),
      resolveAction("basic", "앱 고유 주소"),
    ),
    item(
      "development-team",
      "Apple 개발자 팀 ID",
      projectSpec,
      scan?.developmentTeam,
      teamId,
      reviewStatus(teamId),
      resolveAction("signing", "Apple 개발자 팀 ID"),
    ),
    ...privacyPermissionItems,
    item(
      "apple-sign-in",
        "Apple 로그인 권한",
        entitlements,
      scan?.capabilities.some((capability) => capability.key === "com.apple.developer.applesignin")
        ? "켜짐"
        : "꺼짐",
      selectedCapabilityValue(steps, answers, "Apple 로그인 사용", "켜짐"),
      "needs-review",
      resolveAction("capabilities"),
    ),
    item(
      "associated-domains",
      "웹사이트 링크 권한",
      entitlements,
      scan?.associatedDomains.join(", "),
      getExplicitTextAnswer(answers, "capabilities", "앱과 연결할 웹사이트 주소") ||
        selectedCapabilityValue(steps, answers, "웹사이트 링크 연결", "켜짐"),
      "needs-review",
      resolveAction("capabilities", "앱과 연결할 웹사이트 주소"),
    ),
  ];

  const appStoreConnectUpdates = [
    item(
      "privacy-policy-url",
      "Privacy Policy URL",
      "App Store Connect",
      null,
      privacyUrl,
      requiredStatus(privacyUrl),
      resolveAction("privacy", "개인정보 처리방침 주소"),
    ),
    item(
      "app-description",
      "상품 설명",
      "App Store Connect",
      null,
      appDescription,
      reviewStatus(appDescription),
      resolveAction("store", "App Store에 보일 앱 설명"),
    ),
    item(
      "demo-account",
      "심사용 데모 계정",
      "App Store Connect",
      null,
      selectedReviewAccess.includes("로그인 필요 없음")
        ? "필요 없음"
        : redactSensitiveAnswer(demoAccount),
      selectedReviewAccess.includes("로그인 필요 없음") ? "ready" : reviewStatus(demoAccount),
      resolveAction(
        "store",
        selectedReviewAccess.includes("로그인 필요 없음") ? "심사 접근 방식" : "심사용 데모 계정",
      ),
    ),
    item(
      "app-store-icon",
      "App Store 아이콘",
      "Xcode asset catalog",
      scan?.appIconSet,
      scan?.hasMarketingAppIcon ? "1024x1024 아이콘 포함" : "",
      scan?.hasMarketingAppIcon ? "ready" : "needs-review",
      resolveAction("store"),
    ),
    item(
      "screenshots",
      "스크린샷 준비 상태",
      "App Store Connect",
      null,
      selectedStoreTasks.includes("스크린샷 준비 완료")
        ? selectedStoreTasks.join(", ")
        : scan?.screenshotCount
          ? `${scan.screenshotCount}개 후보`
          : selectedStoreTasks.join(", "),
      scan?.screenshotCount || selectedStoreTasks.includes("스크린샷 준비 완료")
        ? "ready"
        : reviewStatus(selectedStoreTasks.join(", ")),
      resolveAction("store", "App Store 미디어 자산"),
    ),
    item(
      "app-preview",
      "앱 미리보기 영상",
      "App Store Connect",
      null,
      selectedStoreTasks.includes("앱 미리보기 영상 준비") ? "준비 예정" : "선택 사항",
      selectedStoreTasks.includes("앱 미리보기 영상 준비") ? "needs-review" : "ready",
      resolveAction("store", "App Store 미디어 자산"),
    ),
  ];

  const commandActions = [
    item(
      "backup",
      "수정 전 백업 생성",
      ".release-assistant-backups",
      scanResult ? "앱 폴더 확인됨" : null,
      scanResult ? "원본 파일과 manifest 저장" : "",
      scanResult ? "ready" : "blocked",
      resolveAction("basic"),
    ),
    item(
      "write-plan",
      "파일 저장 계획 적용",
      "local bridge",
      "아직 저장 안 함",
      "사용자 승인 후 파일 변경",
      "needs-review",
      resolveAction("generate"),
    ),
    item(
      "xcodegen-generate",
      "Xcode 프로젝트 생성",
      "xcodegen generate",
      scan?.xcodeProject,
      scan?.projectSpec ? `${scan.projectSpec} 기준으로 명령 실행` : "",
      scan?.projectSpec ? "needs-review" : "blocked",
      resolveAction("generate"),
    ),
    item(
      "rescan",
      "저장 후 재검증",
      "local bridge",
      scanResult ? "스캔 결과 있음" : null,
      "expected value와 actual value 비교",
      scanResult ? "ready" : "blocked",
      resolveAction("generate"),
    ),
  ];

  const sections = [
    section("fileChanges", "파일 변경", "project.yml, Info.plist, Entitlements에 반영할 후보", fileChanges),
    section(
      "appStoreConnectUpdates",
      "App Store Connect",
      "API 업데이트 또는 사용자가 직접 확인할 제출 준비 항목",
      appStoreConnectUpdates,
    ),
    section("commandActions", "명령 실행", "백업, 저장, generate, 재스캔 승인 순서", commandActions),
  ];
  const items = sections.flatMap((currentSection) => currentSection.items);

  return {
    sections,
    totalCount: items.length,
    readyCount: items.filter((currentItem) => currentItem.status === "ready").length,
    unchangedCount: items.filter((currentItem) => currentItem.status === "unchanged").length,
    reviewCount: items.filter((currentItem) => currentItem.status === "needs-review").length,
    blockedCount: items.filter((currentItem) => currentItem.status === "blocked").length,
  };
}
