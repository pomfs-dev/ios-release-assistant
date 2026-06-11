import { useMemo, useState } from "react";
import {
  BridgeRequestError,
  applyWritePlan,
  backupWritePlan,
  buildWritePlan,
  connectAppStoreConnect,
  generateProject,
  scanFolder,
  selectFolder,
  selectProjectSpec,
  selectScreenshot,
} from "./api/bridge";
import { actionViews } from "./data/actionViews";
import { getAppScanSummary } from "./data/appScanSummary";
import { deriveChangeReviewSummary } from "./data/changeReviewSummary";
import { deriveReleaseSteps } from "./data/deriveReleaseSteps";
import { applyPreflightToSteps, derivePreflightSummary } from "./data/preflightChecks";
import { releaseSteps } from "./data/releaseSteps";
import { confirmStepAnswers, updateUserAnswer } from "./data/userAnswers";
import { ActionPreview } from "./components/ActionPreview";
import { DevNotesModal } from "./components/DevNotesModal";
import { InspectorPreview } from "./components/InspectorPreview";
import { SetupWizard } from "./components/SetupWizard";
import { SidebarProgress } from "./components/SidebarProgress";
import { StartPanel } from "./components/StartPanel";
import { StoreConnectPanel } from "./components/StoreConnectPanel";
import { TopBar } from "./components/TopBar";
import type {
  AppleConnectionState,
  AppleCredentialDraft,
  ChangeReviewItem,
  FolderScanState,
  PreflightCheck,
  SafeWriteState,
  UserAnswerState,
  UserAnswerValue,
} from "./types";

const defaultFolderPath = import.meta.env.VITE_DEFAULT_APP_PATH ?? "/Users/me/MyVibeApp";
const emptyAppleCredentialDraft: AppleCredentialDraft = {
  issuerId: "",
  keyId: "",
  appAppleId: "",
  bundleId: "",
  privateKeyInput: "",
};

function emptySafeWriteState(): SafeWriteState {
  return {
    status: "idle",
    plan: null,
    backup: null,
    result: null,
    generateResult: null,
    error: null,
  };
}

const preflightFocusFields: Partial<Record<string, string>> = {
  "development-team": "Apple 개발자 팀 ID",
  "privacy-policy-url": "개인정보 처리방침 주소",
  "app-store-privacy": "개인정보 처리방침 주소",
  "associated-domains-site": "앱과 연결할 웹사이트 주소",
  screenshots: "App Store 미디어 자산",
  "demo-account": "심사용 데모 계정",
  "backup-before-generate": "자동 백업 위치",
};

function isProjectSpecPath(inputPath: string) {
  return /(^|\/)project\.ya?ml$/i.test(inputPath.trim());
}

function canUseTypedPathFallback(inputPath: string) {
  const trimmedPath = inputPath.trim();
  if (!trimmedPath || trimmedPath === "/Users/me/MyVibeApp") return false;
  return trimmedPath.startsWith("/") || trimmedPath.startsWith("~/");
}

function pickerErrorMessage(error: unknown, fallbackCopy: string) {
  const baseMessage =
    error instanceof BridgeRequestError && error.canceled
      ? "선택이 취소됐습니다."
      : error instanceof Error
        ? error.message
        : "Finder 선택창을 열지 못했습니다.";

  return `${baseMessage} ${fallbackCopy}`;
}

function withSelectedChoice(
  answers: UserAnswerState,
  stepId: string,
  key: string,
  choice: string,
): UserAnswerState {
  const currentValue = answers[stepId]?.[key];
  const currentChoices = Array.isArray(currentValue) ? currentValue : [];
  if (currentChoices.includes(choice)) return answers;

  return updateUserAnswer(answers, stepId, key, [...currentChoices, choice]);
}

export default function App() {
  const [activeStepId, setActiveStepId] = useState(releaseSteps[0].id);
  const [activeActionKey, setActiveActionKey] = useState(releaseSteps[0].actionKey);
  const [showNotes, setShowNotes] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [folderPath, setFolderPath] = useState(defaultFolderPath);
  const [answers, setAnswers] = useState<UserAnswerState>({});
  const [appleCredentialDraft, setAppleCredentialDraft] =
    useState<AppleCredentialDraft>(emptyAppleCredentialDraft);
  const [appleConnection, setAppleConnection] = useState<AppleConnectionState>({
    status: "idle",
    error: null,
  });
  const [appleFocusToken, setAppleFocusToken] = useState(0);
  const [folderFocusToken, setFolderFocusToken] = useState(0);
  const [focusRequest, setFocusRequest] = useState<{
    fieldLabel: string | null;
    token: number;
  } | null>(null);
  const [confirmedCheckIds, setConfirmedCheckIds] = useState<string[]>([]);
  const [safeWrite, setSafeWrite] = useState<SafeWriteState>(emptySafeWriteState);
  const [scanState, setScanState] = useState<FolderScanState>({
    status: "idle",
    result: null,
    error: null,
  });
  const scanResult = scanState.status === "success" ? scanState.result : null;
  const scannedSummary = useMemo(() => getAppScanSummary(scanResult), [scanResult]);
  const preflight = useMemo(
    () => derivePreflightSummary(scanResult, answers, confirmedCheckIds),
    [answers, confirmedCheckIds, scanResult],
  );
  const derivedSteps = useMemo(() => deriveReleaseSteps(scanResult), [scanResult]);
  const steps = useMemo(
    () => applyPreflightToSteps(derivedSteps, preflight),
    [derivedSteps, preflight],
  );
  const changeReview = useMemo(
    () => deriveChangeReviewSummary(scanResult, steps, answers),
    [answers, scanResult, steps],
  );

  const activeStep = useMemo(
    () => steps.find((step) => step.id === activeStepId) ?? steps[0],
    [activeStepId, steps],
  );
  const activeStepIndex = steps.findIndex((step) => step.id === activeStep.id);
  const isFinalQuestionStep = activeStepIndex === steps.length - 1;
  const completedCount = steps.filter((step) => step.status === "done").length;
  const reviewCount =
    preflight?.reviewCount ?? steps.filter((step) => step.status === "warning").length;
  const progress = preflight?.progress ?? 76;
  const scannedFolder = scanResult?.folder ?? null;
  const inspectorChecks =
    activeActionKey === "preflight"
      ? preflight?.checks
      : preflight?.checksByStep[activeStep.id as keyof typeof preflight.checksByStep];
  const inspectorLabel = activeActionKey === "preflight" ? "전체 점검" : "단계 점검";
  const nextPendingCheck = useMemo(() => {
    if (!preflight) return null;

    const stepOrder = new Map(steps.map((step, index) => [step.id, index]));
    return (
      [...preflight.checks]
        .filter((check) => check.status !== "ok")
        .sort(
          (a, b) =>
            (stepOrder.get(a.stepId) ?? Number.MAX_SAFE_INTEGER) -
            (stepOrder.get(b.stepId) ?? Number.MAX_SAFE_INTEGER),
        )[0] ?? null
    );
  }, [preflight, steps]);
  const activeAction = useMemo(() => {
    const baseAction = actionViews[activeActionKey] ?? actionViews["load-folder"];
    if (activeActionKey === "review-confirm") {
      if (safeWrite.status === "planning") {
        return {
          ...baseAction,
          title: "쓰기 계획을 만들고 있습니다.",
          copy:
            "현재 입력값과 스캔 결과를 비교해 실제로 바뀔 파일 목록을 계산하는 중입니다.",
          tag: "계획 중",
          steps: [
            ["쓰기 계획 생성 중", "project.yml, Info.plist, Entitlements 변경 후보를 계산합니다."],
            ["변경 목록 확인", "계획이 준비되면 파일 작업 수와 대상 파일을 보여줍니다."],
            ["승인 후 실행", "백업, 저장 적용, xcodegen generate는 각각 승인 뒤 실행합니다."],
          ] as [string, string][],
          facts: [
            ["파일 변경", "계산 중"],
            ["명령 실행", "대기"],
            ["다음", "계획 결과 확인"],
          ] as [string, string][],
          footer: "잠시만 기다려 주세요. 완료되면 Backup + Safe Write 영역으로 이동합니다.",
          footerActionLabel: undefined,
        };
      }

      if (safeWrite.status === "planned" && safeWrite.plan) {
        return {
          ...baseAction,
          title: "쓰기 계획이 준비됐습니다.",
          copy:
            "이제 변경 예정 파일을 확인하고, 백업과 저장 적용을 각각 승인할 수 있습니다.",
          tag: "계획 준비",
          steps: [
            [
              "변경 목록 확인",
              `${safeWrite.plan.operationCount}개 파일 작업을 Backup + Safe Write 영역에서 확인합니다.`,
            ],
            ["백업 승인", "파일 변경이 있으면 원본 백업을 먼저 만듭니다."],
            ["저장 또는 생성 실행", "저장 적용과 xcodegen generate를 별도 승인 후 실행합니다."],
          ] as [string, string][],
          facts: [
            ["파일 작업", `${safeWrite.plan.operationCount}개`],
            ["Plan ID", safeWrite.plan.id.slice(0, 8)],
            ["다음", safeWrite.plan.operationCount > 0 ? "백업 승인" : "프로젝트 생성 승인"],
          ] as [string, string][],
          footer: "아래 또는 오른쪽의 Backup + Safe Write에서 체크박스를 확인한 뒤 다음 실행 버튼을 누릅니다.",
          footerActionLabel: "승인 단계 보기",
        };
      }

      if (safeWrite.status === "error") {
        return {
          ...baseAction,
          title: "쓰기 계획을 만들지 못했습니다.",
          copy: safeWrite.error ?? "local bridge 요청이 실패했습니다. 다시 시도해 주세요.",
          tag: "확인 필요",
          steps: [
            ["오류 확인", "Backup + Safe Write 영역에 표시된 오류를 확인합니다."],
            ["입력값 확인", "앱 폴더 경로와 현재 질문 값을 확인합니다."],
            ["다시 시도", "문제가 정리되면 쓰기 계획을 다시 만듭니다."],
          ] as [string, string][],
          facts: [
            ["상태", "실패"],
            ["파일 변경", "계획 전"],
            ["다음", "다시 시도"],
          ] as [string, string][],
          footer: "오류가 계속되면 앱 폴더를 다시 읽은 뒤 Review & Confirm을 다시 열어 주세요.",
          footerActionLabel: "다시 시도",
        };
      }
    }

    if (activeActionKey !== "load-folder") return baseAction;

    const trimmedPath = folderPath.trim();
    if (scanState.status === "loading") {
      return {
        ...baseAction,
        eyebrow: "앱 폴더 읽는 중",
        title: "입력한 경로에서 출시 준비 파일을 읽고 있습니다.",
        copy:
          "project.yml, Info.plist, Entitlements와 Xcode 프로젝트 파일을 찾은 뒤 다음 확인 항목을 보여드립니다.",
        tag: "읽는 중",
        steps: [
          ["앱 정보 읽는 중", "경로 안의 설정 파일과 앱 정보 파일을 확인합니다."],
          ["결과 정리", "찾은 값과 확인이 필요한 항목을 나눕니다."],
          ["다음 확인 항목 안내", "사용자가 바로 처리할 수 있는 질문으로 이동합니다."],
        ] as [string, string][],
        facts: [
          ["상태", "읽는 중"],
          ["대상", trimmedPath || "앱 폴더"],
          ["다음", "확인 항목 표시"],
        ] as [string, string][],
        footer: "스캔이 끝나면 다음 버튼이 확인 항목 이동으로 바뀝니다.",
        footerActionLabel: undefined,
      };
    }

    if (scanState.status === "success") {
      const nextStep = nextPendingCheck
        ? steps.find((step) => step.id === nextPendingCheck.stepId)
        : null;

      return {
        ...baseAction,
        eyebrow: "앱 폴더 읽기 완료",
        title:
          reviewCount > 0
            ? "앱 정보를 읽었습니다. 이제 확인이 필요한 항목으로 이동합니다."
            : "앱 정보를 읽었습니다. 변경 전에 Review & Confirm으로 이동합니다.",
        copy:
          reviewCount > 0
            ? `${scannedSummary?.appName ?? scanState.result.folder.name}에서 ${reviewCount}개 확인 항목을 찾았습니다. 버튼을 누르면 가장 먼저 처리할 질문으로 이동합니다.`
            : "기본 점검이 통과했습니다. 파일을 저장하기 전 변경 예정 목록과 백업 단계를 확인합니다.",
        tag: "다음 액션",
        sideTitle: "다음에 할 일",
        sideCopy: nextPendingCheck
          ? `${nextPendingCheck.title} 항목을 먼저 확인합니다.`
          : "Review & Confirm에서 파일 변경, 백업, 실행 계획을 확인합니다.",
        steps: [
          [
            nextPendingCheck?.title ?? "Review & Confirm 열기",
            nextPendingCheck?.copy ?? "저장 전 변경 예정 목록과 백업 순서를 확인합니다.",
          ],
          ["질문에 답하기", "필요한 입력칸으로 바로 이동해 값을 채우거나 확인합니다."],
          ["변경 확인", "모든 확인 항목을 처리한 뒤 쓰기 계획과 백업을 검토합니다."],
        ] as [string, string][],
        facts: [
          ["읽은 앱", scannedSummary?.appName ?? scanState.result.folder.name],
          ["확인 필요", `${reviewCount}개`],
          ["다음 위치", nextStep?.title ?? "Review & Confirm"],
        ] as [string, string][],
        footer:
          "스캔은 완료됐습니다. 이제 다음 확인 항목으로 이동해 실제 출시 준비 값을 채웁니다.",
        footerActionLabel:
          reviewCount > 0 ? "다음 확인 항목으로 이동" : "Review & Confirm으로 이동",
      };
    }

    if (trimmedPath) {
      return {
        ...baseAction,
        steps: [
          ["이 경로로 앱 읽기", "입력한 경로에서 project.yml, Info.plist, Entitlements를 읽습니다."],
          ["앱 정보 정리", "찾은 앱 이름, 앱 고유 주소, Xcode 프로젝트 상태를 표시합니다."],
          ["다음 확인 항목 안내", "부족한 항목이 있으면 바로 처리할 질문으로 연결합니다."],
        ] as [string, string][],
        footer: "경로를 입력했으면 이 버튼으로 앱 폴더 스캔을 시작합니다.",
        footerActionLabel: "이 경로로 앱 읽기",
      };
    }

    return {
      ...baseAction,
      footer: "먼저 왼쪽 Start 카드에 앱 폴더 또는 project.yml 경로를 입력합니다.",
      footerActionLabel: "앱 폴더 경로 입력",
    };
  }, [
    activeActionKey,
    folderPath,
    nextPendingCheck,
    reviewCount,
    safeWrite.error,
    safeWrite.plan,
    safeWrite.status,
    scanState,
    scannedSummary?.appName,
    steps,
  ]);

  async function handleScanPath(actionKey: "load-folder" | "load-settings", pathToScan = folderPath) {
    setActiveActionKey(actionKey);
    setConfirmedCheckIds([]);
    setSafeWrite(emptySafeWriteState());
    setScanState({ status: "loading", result: null, error: null });

    try {
      const result = await scanFolder(pathToScan);
      setScanState({ status: "success", result, error: null });
    } catch (error) {
      setScanState({
        status: "error",
        result: null,
        error: error instanceof Error ? error.message : "앱 폴더를 읽지 못했습니다.",
      });
    }
  }

  async function handleScanFolder() {
    await handleScanPath("load-folder");
  }

  async function handleReadTypedPath() {
    await handleScanPath(isProjectSpecPath(folderPath) ? "load-settings" : "load-folder");
  }

  async function handleScanSettingsFile() {
    if (!isProjectSpecPath(folderPath)) {
      setActiveActionKey("load-settings");
      setSafeWrite(emptySafeWriteState());
      setScanState({
        status: "error",
        result: null,
        error:
          "project.yml 또는 project.yaml 파일의 전체 경로를 입력한 뒤 다시 눌러주세요. 업로드가 아니라 로컬 파일 경로를 읽습니다.",
      });
      setFolderFocusToken(Date.now());
      return;
    }

    await handleScanPath("load-settings");
  }

  async function handleSelectFolder() {
    setActiveActionKey("load-folder");
    setSafeWrite(emptySafeWriteState());
    setScanState({ status: "loading", result: null, error: null });

    try {
      const selection = await selectFolder();
      setFolderPath(selection.path);
      await handleScanPath("load-folder", selection.path);
    } catch (error) {
      const typedPath = folderPath.trim();
      if (!(error instanceof BridgeRequestError && error.canceled) && canUseTypedPathFallback(typedPath)) {
        await handleScanPath(isProjectSpecPath(typedPath) ? "load-settings" : "load-folder", typedPath);
        return;
      }

      setScanState({
        status: "error",
        result: null,
        error: pickerErrorMessage(
          error,
          "전체 앱 폴더 경로를 입력칸에 붙여넣고 Enter를 눌러주세요.",
        ),
      });
      setFolderFocusToken(Date.now());
    }
  }

  async function handleSelectProjectSpec() {
    setActiveActionKey("load-settings");
    setSafeWrite(emptySafeWriteState());
    setScanState({ status: "loading", result: null, error: null });

    try {
      const selection = await selectProjectSpec();
      setFolderPath(selection.path);
      await handleScanPath("load-settings", selection.path);
    } catch (error) {
      const typedPath = folderPath.trim();
      if (
        !(error instanceof BridgeRequestError && error.canceled) &&
        isProjectSpecPath(typedPath) &&
        canUseTypedPathFallback(typedPath)
      ) {
        await handleScanPath("load-settings", typedPath);
        return;
      }

      setScanState({
        status: "error",
        result: null,
        error: pickerErrorMessage(
          error,
          "project.yml 전체 경로를 입력칸에 붙여넣고 Enter를 눌러주세요.",
        ),
      });
      setFolderFocusToken(Date.now());
    }
  }

  async function handleSelectScreenshot() {
    if (!scanResult) {
      setActiveStepId("store");
      setActiveActionKey("store-items");
      setFocusRequest({ fieldLabel: "App Store 미디어 자산", token: Date.now() });
      return;
    }

    setSafeWrite(emptySafeWriteState());

    try {
      const selection = await selectScreenshot();
      setScanState({
        status: "success",
        result: {
          ...scanResult,
          files: {
            ...scanResult.files,
            screenshots: [
              {
                name: selection.name,
                relativePath: selection.relativePath,
                absolutePath: selection.absolutePath,
                source: "local-image",
                previewDataUrl: selection.previewDataUrl,
              },
              ...scanResult.files.screenshots.filter(
                (screenshot) => screenshot.absolutePath !== selection.absolutePath,
              ),
            ],
          },
        },
        error: null,
      });
      setAnswers((currentAnswers) =>
        withSelectedChoice(
          currentAnswers,
          "store",
          "App Store 미디어 자산",
          "스크린샷 준비 완료",
        ),
      );
      setConfirmedCheckIds((currentIds) =>
        currentIds.includes("screenshots") ? currentIds : [...currentIds, "screenshots"],
      );
      setActiveStepId("store");
      setActiveActionKey("store-items");
    } catch (error) {
      setActiveStepId("store");
      setActiveActionKey("store-items");
      setFocusRequest({ fieldLabel: "App Store 미디어 자산", token: Date.now() });
      setSafeWrite((currentState) => ({
        ...currentState,
        status: "error",
        error: pickerErrorMessage(
          error,
          "App Store에 사용할 실제 스크린샷 파일을 선택하거나, 수동으로 준비 완료를 표시해주세요.",
        ),
      }));
    }
  }

  function handleStartNewApp() {
    setActiveStepId("basic");
    setActiveActionKey("new-app");
    setConfirmedCheckIds([]);
    setSafeWrite(emptySafeWriteState());
    setScanState({ status: "idle", result: null, error: null });
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      basic: {
        ...currentAnswers.basic,
        "앱 이름": currentAnswers.basic?.["앱 이름"] ?? "My First App",
        "앱 고유 주소": currentAnswers.basic?.["앱 고유 주소"] ?? "com.example.myapp",
      },
    }));
    setFocusRequest({ fieldLabel: "앱 이름", token: Date.now() });
  }

  function handleAnswerChange(stepId: string, key: string, value: UserAnswerValue) {
    setAnswers((currentAnswers) => updateUserAnswer(currentAnswers, stepId, key, value));
    setSafeWrite((currentState) => ({
      ...currentState,
      status: currentState.plan ? "idle" : currentState.status,
      plan: null,
      backup: null,
      result: null,
      generateResult: null,
      error: null,
    }));
  }

  function handleConfirmCheck(checkId: string) {
    setConfirmedCheckIds((currentIds) =>
      currentIds.includes(checkId) ? currentIds : [...currentIds, checkId],
    );
  }

  function handleFolderPathChange(path: string) {
    setFolderPath(path);
    setConfirmedCheckIds([]);
    setSafeWrite(emptySafeWriteState());
    if (scanState.status === "success" || scanState.status === "error") {
      setScanState({ status: "idle", result: null, error: null });
    }
  }

  function handleResolveReviewItem(item: ChangeReviewItem) {
    if (!item.action) return;

    const step = steps.find((currentStep) => currentStep.id === item.action?.stepId);
    setActiveStepId(item.action.stepId);
    if (step) setActiveActionKey(step.actionKey);
    setFocusRequest({
      fieldLabel: item.action.fieldLabel ?? null,
      token: Date.now(),
    });
  }

  function handleSelectStep(stepId: string) {
    setActiveStepId(stepId);
    const step = steps.find((item) => item.id === stepId);
    if (step) setActiveActionKey(step.actionKey);
  }

  function handleQuestionStep(delta: -1 | 1) {
    const currentIndex = steps.findIndex((step) => step.id === activeStep.id);
    const nextStep = steps[currentIndex + delta];

    if (nextStep) {
      handleSelectStep(nextStep.id);
      return;
    }

    if (delta > 0) {
      setActiveStepId("generate");
      setActiveActionKey("review-confirm");
    }
  }

  function handleMoveToNextPendingCheck(check: PreflightCheck | null = nextPendingCheck) {
    if (!check) {
      setActiveStepId("generate");
      setActiveActionKey("review-confirm");
      revealReviewConfirm();
      return;
    }

    const step = steps.find((item) => item.id === check.stepId);
    setActiveStepId(check.stepId);
    setActiveActionKey(step?.actionKey ?? "preflight");
    setFocusRequest({
      fieldLabel: preflightFocusFields[check.id] ?? null,
      token: Date.now(),
    });
  }

  function handleSelectPreflightCheck(check: PreflightCheck) {
    handleMoveToNextPendingCheck(check);
  }

  function handleActionFooter() {
    if (activeActionKey === "load-folder") {
      if (!folderPath.trim()) {
        setActiveActionKey("load-folder");
        setFolderFocusToken(Date.now());
        return;
      }

      if (scanState.status === "success") {
        handleMoveToNextPendingCheck();
        return;
      }

      void handleScanFolder();
      return;
    }

    if (activeActionKey === "load-settings") {
      void handleScanSettingsFile();
      return;
    }

    if (activeActionKey === "new-app") {
      handleStartNewApp();
      return;
    }

    if (activeActionKey === "apple-connect") {
      handleAppleConnect();
      return;
    }

    if (activeActionKey === "store-items") {
      setActiveStepId("store");
      setActiveActionKey("store-items");
      setFocusRequest({ fieldLabel: "개인정보 처리방침 주소", token: Date.now() });
      return;
    }

    if (activeActionKey === "preflight" || activeActionKey === "generate-project") {
      setActiveStepId("generate");
      setActiveActionKey("review-confirm");
      revealReviewConfirm();
      return;
    }

    if (activeActionKey === "review-confirm") {
      if (safeWrite.plan && safeWrite.status !== "error") {
        revealSafeWrite();
        return;
      }

      void handleBuildWritePlan();
      return;
    }

    const currentIndex = steps.findIndex((step) => step.id === activeStep.id);
    const nextStep = steps[currentIndex + 1];
    if (nextStep) {
      setActiveStepId(nextStep.id);
      setActiveActionKey(nextStep.actionKey);
    }
  }

  function revealReviewConfirm() {
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(".action-preview")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function revealSafeWrite() {
    window.setTimeout(() => {
      document.querySelector<HTMLElement>(".safe-write-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);
  }

  function handleSetupNext() {
    const nextAnswers = confirmStepAnswers(answers, activeStep);
    setAnswers(nextAnswers);

    if (isFinalQuestionStep) {
      void handleBuildWritePlan(nextAnswers);
      return;
    }

    handleQuestionStep(1);
  }

  function handleOpenStoreStep() {
    setActiveStepId("store");
    setActiveActionKey("store-items");
    setFocusRequest({ fieldLabel: "개인정보 처리방침 주소", token: Date.now() });
  }

  function handleAppleConnect() {
    setActiveActionKey("apple-connect");
    setActiveStepId("store");
    setAppleConnection((currentConnection) =>
      currentConnection.status === "ready"
        ? currentConnection
        : { status: "editing", error: null },
    );
    setAppleFocusToken(Date.now());
  }

  function handleAppleCredentialChange(field: keyof AppleCredentialDraft, value: string) {
    setAppleCredentialDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
    setAppleConnection((currentConnection) =>
      currentConnection.status === "ready"
        ? { ...currentConnection, status: "editing", app: currentConnection.app, error: null }
        : { status: "editing", error: null },
    );
  }

  async function handlePrepareAppleSession() {
    const issuerId = appleCredentialDraft.issuerId.trim();
    const keyId = appleCredentialDraft.keyId.trim();
    const appAppleId = appleCredentialDraft.appAppleId.trim();
    const bundleId = appleCredentialDraft.bundleId.trim();
    const privateKeyInput = appleCredentialDraft.privateKeyInput.trim();

    if (!issuerId || !keyId || !privateKeyInput || (!appAppleId && !bundleId)) {
      setAppleConnection({
        status: "error",
        error: "Issuer ID, Key ID, private key, 그리고 Apple App ID 또는 Bundle ID를 입력해야 합니다.",
      });
      setAppleFocusToken(Date.now());
      return;
    }

    if (!privateKeyInput.includes("BEGIN PRIVATE KEY")) {
      setAppleConnection({
        status: "error",
        error: ".p8 private key 본문은 BEGIN PRIVATE KEY 형식이어야 합니다.",
      });
      setAppleFocusToken(Date.now());
      return;
    }

    setAppleConnection({
      status: "connecting",
      issuerId,
      keyId,
      appAppleId,
      bundleId,
      privateKeyLoaded: true,
      error: null,
    });

    try {
      const result = await connectAppStoreConnect({
        issuerId,
        keyId,
        appAppleId,
        bundleId,
        privateKeyInput,
      });
      setAppleConnection({
        status: "ready",
        issuerId: result.issuerId,
        keyId: result.keyId,
        appAppleId,
        bundleId: result.app.bundleId ?? bundleId,
        app: result.app,
        resolvedBy: result.resolvedBy,
        sessionId: result.sessionId,
        privateKeyLoaded: true,
        error: null,
        updatedAt: result.connectedAt,
      });
      setAppleCredentialDraft({
        issuerId,
        keyId,
        appAppleId,
        bundleId: result.app.bundleId ?? bundleId,
        privateKeyInput: "",
      });
    } catch (error) {
      setAppleConnection({
        status: "error",
        issuerId,
        keyId,
        appAppleId,
        bundleId,
        privateKeyLoaded: false,
        error: error instanceof Error ? error.message : "App Store Connect 연결에 실패했습니다.",
      });
      setAppleFocusToken(Date.now());
    }
  }

  async function handleBuildWritePlan(answersForPlan: UserAnswerState = answers) {
    if (!scanResult) {
      setSafeWrite({
        status: "error",
        plan: null,
        backup: null,
        result: null,
        generateResult: null,
        error: "먼저 앱 폴더를 스캔해야 쓰기 계획을 만들 수 있습니다.",
      });
      return;
    }

    setActiveStepId("generate");
    setActiveActionKey("review-confirm");
    revealReviewConfirm();
    setSafeWrite({
      status: "planning",
      plan: null,
      backup: null,
      result: null,
      generateResult: null,
      error: null,
    });

    try {
      const plan = await buildWritePlan(scanResult.folder.path, answersForPlan);
      setSafeWrite({
        status: "planned",
        plan,
        backup: null,
        result: null,
        generateResult: null,
        error: null,
      });
      revealSafeWrite();
    } catch (error) {
      setSafeWrite({
        status: "error",
        plan: null,
        backup: null,
        result: null,
        generateResult: null,
        error: error instanceof Error ? error.message : "쓰기 계획을 만들지 못했습니다.",
      });
      revealSafeWrite();
    }
  }

  async function handleBackupWritePlan() {
    if (!safeWrite.plan) return;

    setSafeWrite((currentState) => ({ ...currentState, status: "backing-up", error: null }));

    try {
      const backup = await backupWritePlan(safeWrite.plan);
      setSafeWrite((currentState) => ({
        ...currentState,
        status: "backed-up",
        backup,
        generateResult: null,
        error: null,
      }));
    } catch (error) {
      setSafeWrite((currentState) => ({
        ...currentState,
        status: "error",
        error: error instanceof Error ? error.message : "백업을 만들지 못했습니다.",
      }));
    }
  }

  async function handleApplyWritePlan() {
    if (!safeWrite.plan || !safeWrite.backup) return;

    setSafeWrite((currentState) => ({ ...currentState, status: "applying", error: null }));

    try {
      const result = await applyWritePlan(safeWrite.plan);
      setSafeWrite((currentState) => ({
        ...currentState,
        status: result.ok ? "applied" : "error",
        result,
        generateResult: null,
        error: result.ok ? null : "저장 후 재검증에서 일부 값이 맞지 않았습니다.",
      }));

      if (result.ok) {
        setScanState({ status: "success", result: result.scanResult, error: null });
      }
    } catch (error) {
      setSafeWrite((currentState) => ({
        ...currentState,
        status: "error",
        error: error instanceof Error ? error.message : "저장 적용에 실패했습니다.",
      }));
    }
  }

  async function handleGenerateProject() {
    if (!safeWrite.plan) return;

    setSafeWrite((currentState) => ({ ...currentState, status: "generating", error: null }));

    try {
      const result = await generateProject(safeWrite.plan);
      setSafeWrite((currentState) => ({
        ...currentState,
        status: "generated",
        generateResult: result,
        error: null,
      }));
      if (result.scanResult) {
        setScanState({ status: "success", result: result.scanResult, error: null });
      }
    } catch (error) {
      setSafeWrite((currentState) => ({
        ...currentState,
        status: "error",
        error: error instanceof Error ? error.message : "Xcode 프로젝트 생성에 실패했습니다.",
      }));
    }
  }

  return (
    <main className="app">
      <TopBar
        advancedMode={advancedMode}
        folderName={scannedSummary?.appName ?? scannedFolder?.name ?? "MyVibeApp"}
        folderPath={scannedFolder?.path ?? folderPath}
        onToggleAdvanced={setAdvancedMode}
        onOpenNotes={() => setShowNotes(true)}
      />

      <section className="shell">
        <SidebarProgress
          activeStepId={activeStep.id}
          checks={preflight?.checks}
          checksByStep={preflight?.checksByStep}
          completedCount={completedCount}
          progress={progress}
          steps={steps}
          onSelectCheck={handleSelectPreflightCheck}
          onSelectStep={handleSelectStep}
        />

        <section className="workspace">
          <StartPanel
            appleConnection={appleConnection}
            focusToken={folderFocusToken}
            folderPath={folderPath}
            pendingReviewCount={reviewCount}
            scanState={scanState}
            onAppleConnect={handleAppleConnect}
            onContinueFromScan={() => handleMoveToNextPendingCheck()}
            onFolderPathChange={handleFolderPathChange}
            onReadTypedPath={() => void handleReadTypedPath()}
            onSelectFolder={() => void handleSelectFolder()}
            onSelectProjectSpec={() => void handleSelectProjectSpec()}
            onStartNewApp={handleStartNewApp}
          />
          <ActionPreview action={activeAction} onFooterAction={handleActionFooter} />
          <StoreConnectPanel
            appleConnection={appleConnection}
            appleCredentialDraft={appleCredentialDraft}
            appleFocusToken={appleFocusToken}
            preflight={preflight}
            scanResult={scanResult}
            onAppleCredentialChange={handleAppleCredentialChange}
            onOpenStoreStep={handleOpenStoreStep}
            onPrepareAppleSession={() => void handlePrepareAppleSession()}
          />
          <SetupWizard
            advancedMode={advancedMode}
            answers={answers}
            canGoPrevious={activeStepIndex > 0}
            focusRequest={focusRequest}
            nextLabel={isFinalQuestionStep ? "Review & Confirm 열기" : "다음 설정"}
            showSkip={!isFinalQuestionStep}
            step={activeStep}
            onAnswerChange={handleAnswerChange}
            onGoNext={handleSetupNext}
            onGoPrevious={() => handleQuestionStep(-1)}
            onSkip={() => handleQuestionStep(1)}
          />
        </section>

        <InspectorPreview
          checks={inspectorChecks}
          checkLabel={inspectorLabel}
          safeWrite={safeWrite}
          reviewSummary={changeReview}
          step={activeStep}
          onApplyWritePlan={handleApplyWritePlan}
          onBackupWritePlan={handleBackupWritePlan}
          onBuildWritePlan={handleBuildWritePlan}
          onGenerateProject={handleGenerateProject}
          onResolveReviewItem={handleResolveReviewItem}
          onConfirmCheck={handleConfirmCheck}
          onSelectScreenshot={() => void handleSelectScreenshot()}
        />
      </section>

      <section className="generate-bar">
        <div className="generate-copy">
          <strong>
            {reviewCount > 0
              ? `${reviewCount}개 항목만 더 확인하면 Xcode에서 열 프로젝트 파일을 만들 수 있습니다.`
              : "기본 출시 설정을 모두 읽었습니다."}
          </strong>
          <span>
            {preflight
              ? `${preflight.okCount}/${preflight.totalCount}개 점검이 통과했습니다. 파일을 만들기 전 변경 예정 목록과 백업을 먼저 확인합니다.`
              : "버튼을 누르면 현재 앱 폴더를 안전하게 확인한 뒤 Xcode용 프로젝트 파일을 만들고, 무엇이 바뀌었는지 쉬운 말로 보여줍니다. GitHub 계정은 필요하지 않습니다."}
          </span>
        </div>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setActiveStepId("generate");
            setActiveActionKey("preflight");
          }}
        >
          미리 점검
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => {
            setActiveStepId("generate");
            setActiveActionKey("review-confirm");
            void handleBuildWritePlan();
          }}
        >
          변경 확인
        </button>
      </section>

      <DevNotesModal open={showNotes} onClose={() => setShowNotes(false)} />
    </main>
  );
}
