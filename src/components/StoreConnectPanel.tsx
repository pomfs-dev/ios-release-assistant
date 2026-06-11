import { useEffect } from "react";
import { getAppScanSummary } from "../data/appScanSummary";
import { useI18n } from "../i18n";
import type {
  AppleConnectionState,
  AppleCredentialDraft,
  FolderScanResult,
  PreflightCheck,
  PreflightSummary,
} from "../types";

type StoreConnectPanelProps = {
  appleConnection: AppleConnectionState;
  appleCredentialDraft: AppleCredentialDraft;
  appleFocusToken: number;
  preflight?: PreflightSummary | null;
  scanResult?: FolderScanResult | null;
  onAppleCredentialChange: (field: keyof AppleCredentialDraft, value: string) => void;
  onPrepareAppleSession: () => void;
  onOpenStoreStep: () => void;
};

type StoreTask = {
  state: "" | "warn" | "todo";
  icon: string;
  title: string;
  copy: string;
  tag: string;
};

function taskFromCheck(
  check: PreflightCheck | undefined,
  title: string,
  readyCopy: string,
  fallbackCopy: string,
  fallbackTag = "확인 필요",
): StoreTask {
  if (check?.status === "ok") {
    return {
      state: "",
      icon: "✓",
      title,
      copy: readyCopy,
      tag: "완료",
    };
  }

  return {
    state: check?.status === "error" || check?.status === "warn" ? "warn" : "todo",
    icon: check?.status === "error" || check?.status === "warn" ? "!" : "·",
    title,
    copy: check?.copy ?? fallbackCopy,
    tag: check?.status === "error" || check?.status === "warn" ? fallbackTag : "준비 전",
  };
}

function findCheck(preflight: PreflightSummary | null | undefined, id: string) {
  return preflight?.checks.find((check) => check.id === id);
}

function storeTasksFor(
  scanResult: FolderScanResult | null | undefined,
  preflight: PreflightSummary | null | undefined,
): StoreTask[] {
  const summary = getAppScanSummary(scanResult ?? null);
  const hasBasicInfo = Boolean(summary?.appName && summary.bundleId);

  return [
  {
    state: hasBasicInfo ? "" : "warn",
    icon: hasBasicInfo ? "✓" : "!",
    title: "앱스토어 기본 정보",
    copy: hasBasicInfo
      ? `${summary?.appName ?? "앱"} · ${summary?.bundleId ?? "Bundle ID"}`
      : "앱 이름, 부제, 앱 고유 주소, 카테고리, 고객지원 주소를 준비합니다.",
    tag: hasBasicInfo ? "완료" : "확인 필요",
  },
    taskFromCheck(
      findCheck(preflight, "app-store-icon"),
      "앱 아이콘",
      summary?.appIconSet
        ? `${summary.appIconSet}에서 App Store용 1024x1024 아이콘을 확인했습니다.`
        : "App Store용 1024x1024 아이콘을 확인했습니다.",
      "Xcode asset catalog에 App Store용 1024x1024 아이콘이 들어있는지 확인합니다.",
      "확인 필요",
    ),
    taskFromCheck(
      findCheck(preflight, "app-store-privacy"),
      "개인정보와 처리방침",
      "개인정보 처리방침 주소를 제출 준비 항목에 연결했습니다.",
      "개인정보 처리방침 주소, 수집하는 데이터 종류, 사용자 선택 안내 주소를 확인합니다.",
      "확인 필요",
    ),
    taskFromCheck(
      findCheck(preflight, "screenshots"),
      "스크린샷과 앱 미리보기",
      "App Store Connect에 올릴 스크린샷 준비 상태를 확인했습니다.",
      "iPhone/iPad 스크린샷, 선택 사항인 앱 미리보기 영상을 제출 형식에 맞게 준비합니다.",
      "확인 필요",
    ),
    taskFromCheck(
      findCheck(preflight, "demo-account"),
      "심사용 정보",
      "심사용 접근 방식과 데모 계정 정보를 준비했습니다.",
      "로그인이 필요한 앱이면 심사용 계정, 연락처, 심사자에게 남길 설명을 준비합니다.",
      "확인 필요",
    ),
    {
      state: "todo",
      icon: "·",
      title: "가격과 출시 국가",
      copy: "무료/유료 여부, 출시 국가, 예약 주문 여부, 수동 출시 여부를 선택합니다.",
      tag: "선택 전",
    },
    {
      state: "todo",
      icon: "·",
      title: "업로드할 빌드 선택",
      copy: "Xcode에서 Archive 후 올린 빌드를 App Store Connect에서 선택해 심사에 제출합니다.",
      tag: "나중에",
    },
  ];
}

function connectionStatusLabel(connection: AppleConnectionState) {
  if (connection.status === "ready") return "세션 준비됨";
  if (connection.status === "connecting") return "연결 확인 중";
  if (connection.status === "error") return "입력 확인 필요";
  if (connection.status === "editing") return "입력 중";
  return "연결 안 됨";
}

export function StoreConnectPanel({
  appleConnection,
  appleCredentialDraft,
  appleFocusToken,
  onAppleCredentialChange,
  onOpenStoreStep,
  onPrepareAppleSession,
  preflight,
  scanResult,
}: StoreConnectPanelProps) {
  const { text } = useI18n();
  const storeTasks = storeTasksFor(scanResult, preflight);

  useEffect(() => {
    if (!appleFocusToken) return;

    const field = document.querySelector<HTMLElement>(".asc-connect-field input");
    field?.scrollIntoView({ block: "center", behavior: "smooth" });
    field?.focus();
  }, [appleFocusToken]);

  return (
    <article className="store-connect-panel">
      <div className="store-connect-head">
        <div>
          <div className="eyebrow">App Store Connect</div>
          <div className="store-connect-title">
            {text("앱스토어에 올릴 상품 정보와 심사 정보를 같이 준비합니다.")}
          </div>
          <div className="store-connect-copy">
            {text(
              "Xcode 프로젝트 파일은 앱을 빌드하기 위한 준비이고, App Store Connect 정보는 앱스토어 상품 페이지와 심사 제출을 위한 준비입니다. 이 도구는 둘을 따로 보지 않고 출시 전 체크리스트로 함께 관리합니다.",
            )}
          </div>
        </div>
        <span className="mini-tag">{text("제출 준비")}</span>
      </div>

      <div className="store-connect-grid">
        {storeTasks.map((task) => (
          <section className={`store-task ${task.state}`} key={task.title}>
            <span className="store-task-icon">{task.icon}</span>
            <div>
              <h3>{text(task.title)}</h3>
              <p>{text(task.copy)}</p>
            </div>
            <span className="mini-tag">{text(task.tag)}</span>
          </section>
        ))}
      </div>

      <section className="asc-connect-box" aria-label="App Store Connect API Key">
        <div className="asc-connect-head">
          <div>
            <div className="asc-connect-title">{text("Apple 정보 세션 연결")}</div>
            <p>
              {text(
                "App Store Connect API Key로 Apple API에 실제 앱 조회 요청을 보냅니다. private key는 파일에 저장하지 않고 연결 확인 후 입력칸에서 비웁니다.",
              )}
            </p>
          </div>
          <span
            className={`scan-status ${
              appleConnection.status === "ready"
                ? "success"
                : appleConnection.status === "error"
                  ? "error"
                  : appleConnection.status === "connecting"
                    ? "loading"
                  : ""
            }`}
          >
            {text(connectionStatusLabel(appleConnection))}
          </span>
        </div>

        <div className="asc-field-grid">
          <label className="asc-connect-field">
            <span>Issuer ID</span>
            <input
              autoComplete="off"
              value={appleCredentialDraft.issuerId}
              onChange={(event) => onAppleCredentialChange("issuerId", event.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              spellCheck={false}
            />
          </label>
          <label className="asc-connect-field">
            <span>Key ID</span>
            <input
              autoComplete="off"
              value={appleCredentialDraft.keyId}
              onChange={(event) => onAppleCredentialChange("keyId", event.target.value)}
              placeholder="ABC123DEFG"
              spellCheck={false}
            />
          </label>
          <label className="asc-connect-field">
            <span>Apple App ID</span>
            <input
              autoComplete="off"
              value={appleCredentialDraft.appAppleId}
              onChange={(event) => onAppleCredentialChange("appAppleId", event.target.value)}
              placeholder="1234567890"
              spellCheck={false}
            />
          </label>
          <label className="asc-connect-field">
            <span>Bundle ID</span>
            <input
              autoComplete="off"
              value={appleCredentialDraft.bundleId}
              onChange={(event) => onAppleCredentialChange("bundleId", event.target.value)}
              placeholder="com.company.app"
              spellCheck={false}
            />
          </label>
          <label className="asc-connect-field private-key">
            <span>.p8 Private Key</span>
            <textarea
              autoComplete="off"
              value={appleCredentialDraft.privateKeyInput}
              onChange={(event) => onAppleCredentialChange("privateKeyInput", event.target.value)}
              placeholder="-----BEGIN PRIVATE KEY-----"
              spellCheck={false}
            />
          </label>
        </div>

        {appleConnection.status === "error" ? (
          <div className="safe-note error">{text(appleConnection.error)}</div>
        ) : null}
        {appleConnection.status === "ready" ? (
          <div className="safe-note">
            {text(
              `App Store Connect API로 ${appleConnection.app?.name ?? "앱"} 정보를 확인했습니다.`,
            )}
            {appleConnection.app?.bundleId ? ` Bundle ID: ${appleConnection.app.bundleId}.` : ""}
            {" "}
            {text("private key 원문은 입력칸에 남기지 않았습니다.")}
          </div>
        ) : null}

        <div className="asc-connect-actions">
          <button
            type="button"
            className="secondary"
            disabled={appleConnection.status === "connecting"}
            onClick={onPrepareAppleSession}
          >
            {appleConnection.status === "connecting"
              ? text("Apple API 확인 중...")
              : text("Apple API로 연결 확인")}
          </button>
          <button type="button" className="secondary" onClick={onOpenStoreStep}>
            {text("제출 항목 입력")}
          </button>
        </div>
      </section>

      <div className="store-connect-footer">
        <p>
          {text(
            "Apple 정보를 연결하면 App Store Connect의 앱 존재 여부를 확인합니다. 상품 페이지 입력과 심사 제출 값은 Review & Confirm에서 수동 처리 항목으로 분리해 확인합니다.",
          )}
        </p>
        <button type="button" className="secondary" onClick={onOpenStoreStep}>
          {text("App Store 제출 항목 열기")}
        </button>
      </div>
    </article>
  );
}
