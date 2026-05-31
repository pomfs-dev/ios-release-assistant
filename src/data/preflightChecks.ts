import type {
  PreflightCheck,
  PreflightSummary,
  ReleaseStepId,
  StepDefinition,
  StepStatus,
  UserAnswerState,
} from "../types";
import { getAppScanSummary } from "./appScanSummary";
import type { AppScanSummary } from "./appScanSummary";
import type { FolderScanResult } from "../types";
import { getExplicitTextAnswer } from "./userAnswers";

function check(
  id: string,
  stepId: ReleaseStepId,
  status: PreflightCheck["status"],
  title: string,
  copy: string,
  resolution: PreflightCheck["resolution"] = "system",
): PreflightCheck {
  return { id, stepId, status, title, copy, resolution };
}

function hasCapability(summary: AppScanSummary, key: string) {
  return summary.capabilities.some((capability) => capability.key === key);
}

function manualStatus(id: string, confirmedCheckIds: ReadonlySet<string>) {
  return confirmedCheckIds.has(id) ? "ok" : "warn";
}

function manualTitle(
  id: string,
  confirmedCheckIds: ReadonlySet<string>,
  pendingTitle: string,
  doneTitle: string,
) {
  return confirmedCheckIds.has(id) ? doneTitle : pendingTitle;
}

function explicitChoiceAnswer(
  answers: UserAnswerState,
  stepId: string,
  key: string,
) {
  const value = answers[stepId]?.[key];
  return Array.isArray(value) ? value : [];
}

function maybeCapabilityChecks(summary: AppScanSummary, confirmedCheckIds: ReadonlySet<string>) {
  const checks: PreflightCheck[] = [];

  if (hasCapability(summary, "com.apple.developer.applesignin")) {
    const id = "apple-sign-in-portal";
    checks.push(
      check(
        id,
        "capabilities",
        manualStatus(id, confirmedCheckIds),
        manualTitle(
          id,
          confirmedCheckIds,
          "Apple 로그인 사이트 설정 확인",
          "Apple 로그인 사이트 설정 확인됨",
        ),
        confirmedCheckIds.has(id)
          ? "Apple Developer Identifier의 Apple 로그인 설정을 확인했습니다."
          : "Entitlements에는 Apple 로그인 권한이 있습니다. Apple Developer Identifier에서도 같은 기능이 켜져 있어야 합니다.",
        "manual",
      ),
    );
  }

  if (summary.associatedDomains.length > 0) {
    const id = "associated-domains-site";
    checks.push(
      check(
        id,
        "capabilities",
        manualStatus(id, confirmedCheckIds),
        manualTitle(
          id,
          confirmedCheckIds,
          "Associated Domains 웹사이트 파일 확인",
          "Associated Domains 웹사이트 파일 확인됨",
        ),
        confirmedCheckIds.has(id)
          ? "웹사이트의 apple-app-site-association 파일을 확인했습니다."
          : "웹 링크 기능은 앱 권한 파일뿐 아니라 웹사이트의 apple-app-site-association 파일도 필요합니다.",
        "manual",
      ),
    );
  }

  if (hasCapability(summary, "aps-environment")) {
    const id = "push-portal";
    checks.push(
      check(
        id,
        "capabilities",
        manualStatus(id, confirmedCheckIds),
        manualTitle(
          id,
          confirmedCheckIds,
          "Push 알림 인증 설정 확인",
          "Push 알림 인증 설정 확인됨",
        ),
        confirmedCheckIds.has(id)
          ? "Apple Developer와 서버 알림 인증 설정을 확인했습니다."
          : "Push 알림 권한이 켜져 있습니다. Apple Developer와 서버 알림 인증 설정을 함께 확인해야 합니다.",
        "manual",
      ),
    );
  }

  return checks;
}

export function derivePreflightSummary(
  scanResult: FolderScanResult | null,
  answers: UserAnswerState = {},
  confirmedCheckIdsInput: Iterable<string> = [],
): PreflightSummary | null {
  const summary = getAppScanSummary(scanResult);
  if (!summary) return null;

  const confirmedCheckIds = new Set(confirmedCheckIdsInput);
  const teamIdAnswer = getExplicitTextAnswer(answers, "signing", "Apple 개발자 팀 ID");
  const privacyUrlAnswer = getExplicitTextAnswer(answers, "privacy", "개인정보 처리방침 주소");
  const demoAccountAnswer = getExplicitTextAnswer(answers, "store", "심사용 데모 계정");
  const hasTeamId = Boolean(summary.developmentTeam || teamIdAnswer);
  const hasPrivacyUrl = Boolean(privacyUrlAnswer);
  const hasDemoAccount = Boolean(demoAccountAnswer);
  const screenshotsId = "screenshots";
  const selectedReviewAccess = explicitChoiceAnswer(answers, "store", "심사 접근 방식");
  const selectedMediaAssets = explicitChoiceAnswer(answers, "store", "App Store 미디어 자산");
  const loginNotRequired = selectedReviewAccess.includes("로그인 필요 없음");
  const loginRequired =
    selectedReviewAccess.includes("로그인 필요") ||
    hasCapability(summary, "com.apple.developer.applesignin");
  const needsDemoAccount = !loginNotRequired && loginRequired;
  const hasScreenshots =
    selectedMediaAssets.includes("스크린샷 준비 완료") || summary.screenshotCount > 0;
  const backupId = "backup-before-generate";

  const checks: PreflightCheck[] = [
    check(
      "project-spec",
      "basic",
      summary.projectSpec ? "ok" : "warn",
      summary.projectSpec ? "XcodeGen 설정 파일 찾음" : "XcodeGen 설정 파일 확인 필요",
      summary.projectSpec ?? "project.yml 또는 project.yaml 파일을 찾지 못했습니다.",
    ),
    check(
      "bundle-id",
      "basic",
      summary.bundleId ? "ok" : "error",
      summary.bundleId ? "앱 고유 주소 읽음" : "앱 고유 주소 없음",
      summary.bundleId ?? "App Store 등록 전에 bundle id가 반드시 필요합니다.",
    ),
    check(
      "xcode-project",
      "basic",
      summary.xcodeProject ? "ok" : "warn",
      summary.xcodeProject ? "Xcode 프로젝트 찾음" : "Xcode 프로젝트 없음",
      summary.xcodeProject ?? ".xcodeproj 파일을 찾지 못했습니다.",
    ),
    check(
      "development-team",
      "signing",
      hasTeamId ? "ok" : "warn",
      hasTeamId ? "Apple 팀 ID 준비됨" : "Apple 팀 ID 확인 필요",
      summary.developmentTeam || teamIdAnswer || "자동 서명 또는 App Store 배포 전에 팀 ID를 확인해야 합니다.",
      summary.developmentTeam ? "system" : "input",
    ),
    check(
      "info-plist",
      "privacy",
      summary.infoPlist ? "ok" : "error",
      summary.infoPlist ? "Info.plist 찾음" : "Info.plist 없음",
      summary.infoPlist ?? "권한 문구와 앱 버전을 읽을 앱 정보 파일이 필요합니다.",
    ),
    check(
      "privacy-usage-keys",
      "privacy",
      summary.privacyKeys.length > 0 ? "ok" : "warn",
      summary.privacyKeys.length > 0
        ? `권한 문구 ${summary.privacyKeys.length}개 읽음`
        : "권한 문구 확인 필요",
      summary.privacyKeys.length > 0
        ? summary.privacyKeys.map((permission) => permission.label).join(" · ")
        : "카메라, 사진, 위치 같은 권한을 쓰면 Info.plist에 설명 문구가 필요합니다.",
    ),
    check(
      "privacy-policy-url",
      "privacy",
      hasPrivacyUrl ? "ok" : "warn",
      hasPrivacyUrl ? "Privacy Policy URL 입력됨" : "Privacy Policy URL 필요",
      privacyUrlAnswer || "App Store Connect 제출 전에 개인정보 처리방침 주소를 입력해야 합니다.",
      "input",
    ),
    check(
      "entitlements-file",
      "capabilities",
      summary.entitlements ? "ok" : "warn",
      summary.entitlements ? "Entitlements 파일 찾음" : "Entitlements 파일 없음",
      summary.entitlements ?? "Apple 로그인, Associated Domains, Push 사용 여부를 확인해야 합니다.",
    ),
    check(
      "capabilities-known",
      "capabilities",
      summary.capabilities.length > 0 ? "ok" : "warn",
      summary.capabilities.length > 0
        ? `Apple 기능 ${summary.capabilities.length}개 읽음`
        : "Apple 기능 확인 필요",
      summary.capabilities.length > 0
        ? summary.capabilities.map((capability) => capability.label).join(" · ")
        : "권한 파일에서 출시 관련 Apple 기능을 찾지 못했습니다.",
    ),
    ...maybeCapabilityChecks(summary, confirmedCheckIds),
    check(
      "app-store-privacy",
      "store",
      hasPrivacyUrl ? "ok" : "warn",
      hasPrivacyUrl ? "App Store 개인정보 기본 항목 준비됨" : "App Store 개인정보 항목 필요",
      hasPrivacyUrl
        ? "개인정보 처리방침 주소를 App Store Connect 제출 준비 항목에 연결했습니다."
        : "수집 데이터 종류와 개인정보 처리방침 주소는 App Store Connect에서 별도로 작성해야 합니다.",
      "input",
    ),
    check(
      "app-store-icon",
      "store",
      summary.hasMarketingAppIcon ? "ok" : "warn",
      summary.hasMarketingAppIcon ? "App Store 아이콘 준비됨" : "App Store 아이콘 확인 필요",
      summary.hasMarketingAppIcon
        ? `${summary.appIconSet}에서 App Store용 1024x1024 아이콘을 찾았습니다.`
        : summary.appIconSet
          ? `${summary.appIconSet}에서 App Store용 1024x1024 아이콘을 확인해야 합니다.`
          : "Xcode asset catalog에 AppIcon.appiconset과 App Store용 1024x1024 아이콘이 필요합니다.",
    ),
    check(
      screenshotsId,
      "store",
      hasScreenshots ? "ok" : manualStatus(screenshotsId, confirmedCheckIds),
      hasScreenshots
        ? "스크린샷 준비 확인됨"
        : manualTitle(screenshotsId, confirmedCheckIds, "스크린샷 준비 필요", "스크린샷 준비 확인됨"),
      hasScreenshots || confirmedCheckIds.has(screenshotsId)
        ? summary.screenshotCount > 0
          ? `${summary.screenPreviewLabel} 등 스크린샷 후보 ${summary.screenshotCount}개를 찾았습니다.`
          : "출시할 기기 크기의 App Store 스크린샷을 준비했다고 표시했습니다."
        : "App Store Connect에 올릴 기기별 스크린샷을 최소 1장 준비해야 합니다.",
      "manual",
    ),
    check(
      "demo-account",
      "store",
      !needsDemoAccount || hasDemoAccount ? "ok" : "warn",
      loginNotRequired
        ? "데모 계정 필요 없음 확인됨"
        : hasDemoAccount
          ? "심사용 데모 계정 입력됨"
          : "심사용 데모 계정 확인",
      loginNotRequired
        ? "계정 없이 심사자가 핵심 기능을 확인할 수 있다고 표시했습니다."
        : hasDemoAccount
        ? "심사용 데모 계정을 세션 답변에 준비했습니다."
        : "로그인이 필요한 앱이면 Apple 심사자가 접근할 수 있는 계정이 필요합니다.",
      "input",
    ),
    check(
      backupId,
      "generate",
      manualStatus(backupId, confirmedCheckIds),
      manualTitle(backupId, confirmedCheckIds, "생성 전 백업 필요", "생성 전 백업 확인됨"),
      confirmedCheckIds.has(backupId)
        ? "Review & Confirm에서 백업을 만든 뒤 저장/생성을 진행하는 것으로 확인했습니다."
        : "프로젝트 파일을 만들기 전에 변경 예정 목록과 백업 위치를 확인해야 합니다.",
      "manual",
    ),
  ];

  const checksByStep = checks.reduce<PreflightSummary["checksByStep"]>((grouped, item) => {
    grouped[item.stepId] = [...(grouped[item.stepId] ?? []), item];
    return grouped;
  }, {});
  const okCount = checks.filter((item) => item.status === "ok").length;
  const reviewCount = checks.filter((item) => item.status !== "ok").length;
  const errorCount = checks.filter((item) => item.status === "error").length;
  const totalCount = checks.length;

  return {
    checks,
    checksByStep,
    progress: totalCount > 0 ? Math.round((okCount / totalCount) * 100) : 0,
    okCount,
    reviewCount,
    errorCount,
    totalCount,
  };
}

function statusForChecks(checks: PreflightCheck[] | undefined, fallback: StepStatus): StepStatus {
  if (!checks || checks.length === 0) return fallback;
  return checks.some((item) => item.status !== "ok") ? "warning" : "done";
}

export function applyPreflightToSteps(
  steps: StepDefinition[],
  preflight: PreflightSummary | null,
): StepDefinition[] {
  if (!preflight) return steps;

  return steps.map((step) => ({
    ...step,
    status: statusForChecks(preflight.checksByStep[step.id as ReleaseStepId], step.status),
  }));
}
