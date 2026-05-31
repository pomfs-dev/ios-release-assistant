import { useEffect, useRef } from "react";
import { formatScanList, getAppScanSummary } from "../data/appScanSummary";
import type { AppleConnectionState, FolderScanState } from "../types";

type StartPanelProps = {
  appleConnection: AppleConnectionState;
  focusToken: number;
  folderPath: string;
  pendingReviewCount: number;
  scanState: FolderScanState;
  onAppleConnect: () => void;
  onContinueFromScan: () => void;
  onFolderPathChange: (path: string) => void;
  onReadTypedPath: () => void;
  onSelectFolder: () => void;
  onSelectProjectSpec: () => void;
  onStartNewApp: () => void;
};

function scanStatusLabel(scanState: FolderScanState) {
  if (scanState.status === "loading") return "읽는 중";
  if (scanState.status === "success") return "읽기 완료";
  if (scanState.status === "error") return "오류";
  return "대기 중";
}

function scanRows(scanState: FolderScanState) {
  if (scanState.status === "success") {
    const summary = getAppScanSummary(scanState.result);

    return [
      ["앱 이름", summary?.appName ?? scanState.result.folder.name, "found"],
      [
        "앱 고유 주소",
        summary?.bundleId ?? "project.yml에서 확인 필요",
        summary?.bundleId ? "found" : "warn",
      ],
      [
        "Xcode 프로젝트",
        summary?.xcodeProject ?? ".xcodeproj 없음",
        summary?.xcodeProject ? "found" : "warn",
      ],
      [
        "Info.plist",
        summary?.infoPlist
          ? `${summary.infoPlist} · ${summary.privacyKeys.length}개 권한 문구`
          : "Info.plist 확인 필요",
        summary?.infoPlist ? "found" : "warn",
      ],
      [
        "Apple 기능",
        summary?.entitlements
          ? `${summary.entitlements} · ${formatScanList(
              summary.capabilities.map((capability) => capability.label),
              "읽은 기능 없음",
              2,
            )}`
          : "Entitlements 확인 필요",
        summary?.entitlements ? "found" : "warn",
      ],
    ] as const;
  }

  return [
    ["앱 이름", "P.O.MFS", "found"],
    ["앱 고유 주소", "com.prideofmisfits.community", "found"],
    ["Apple 기능", "Apple 로그인, 링크 열기, 알림 사용 중", "found"],
    ["개인정보 준비", "개인정보 처리방침 주소 확인 필요", "warn"],
  ] as const;
}

export function StartPanel({
  appleConnection,
  focusToken,
  folderPath,
  pendingReviewCount,
  scanState,
  onAppleConnect,
  onContinueFromScan,
  onFolderPathChange,
  onReadTypedPath,
  onSelectFolder,
  onSelectProjectSpec,
  onStartNewApp,
}: StartPanelProps) {
  const appleStatusLabel =
    appleConnection.status === "ready"
      ? "세션 준비됨"
      : appleConnection.status === "error"
        ? "입력 확인 필요"
        : appleConnection.status === "connecting"
          ? "연결 확인 중"
          : appleConnection.status === "editing"
            ? "입력 중"
            : "연결 안 됨";
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focusToken) return;

    const input = folderInputRef.current;
    if (!input) return;

    input.scrollIntoView({ block: "center", behavior: "smooth" });
    input.focus();
    input.select();
  }, [focusToken]);

  return (
    <article className="launch-panel">
      <div className="launch-head">
        <div>
          <div className="eyebrow">Start</div>
          <div className="launch-title">
            앱 폴더를 불러오면 출시 준비 상태를 먼저 읽어드릴게요.
          </div>
          <div className="launch-copy">
            이미 바이브 코딩으로 만든 앱 폴더를 불러오거나, 폴더 연결 전에 출시 답변을
            먼저 정리할 수 있습니다. Apple 정보 연결은 선택 사항이며, 연결하지 않아도 기본 설정 도우미는
            사용할 수 있습니다.
          </div>
        </div>
        <span className="mini-tag">첫 화면 시안</span>
      </div>

      <div className="launch-grid">
        <section className="setup-card emphasis">
          <div className="setup-icon">1</div>
          <h3>시작 방법 선택</h3>
          <p>
            앱 폴더나 project.yml 경로를 직접 입력하거나, 이 Mac에서 찾아 선택합니다.
            project.yml을 선택하면 상위 폴더를 앱 루트로 읽습니다.
          </p>
          <div className="button-stack">
            <label className="folder-path-field">
              <span>앱 폴더 또는 project.yml 경로</span>
              <input
                ref={folderInputRef}
                value={folderPath}
                onChange={(event) => onFolderPathChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  onReadTypedPath();
                }}
                placeholder="/Users/me/MyApp 또는 /Users/me/MyApp/project.yml"
                spellCheck={false}
              />
            </label>
            <button
              type="button"
              className="wide-button primary-soft"
              disabled={scanState.status === "loading"}
              onClick={onSelectFolder}
            >
              {scanState.status === "loading" ? "앱 폴더 읽는 중..." : "Finder에서 앱 폴더 선택"}
            </button>
            <button
              type="button"
              className="wide-button"
              disabled={scanState.status === "loading"}
              onClick={onSelectProjectSpec}
            >
              {scanState.status === "loading" ? "설정 파일 읽는 중..." : "Finder에서 project.yml 선택"}
            </button>
            <button type="button" className="wide-button" onClick={onStartNewApp}>
              출시 답변 먼저 작성
            </button>
          </div>
          <div className="safe-note compact" id="settings-soon-note">
            파일 업로드가 아니라 로컬 경로 입력 방식입니다. project.yml 경로를 넣으면
            그 파일의 상위 폴더를 앱 루트로 읽습니다.
          </div>
        </section>

        <section className="setup-card">
          <div className="setup-icon">2</div>
          <h3>불러온 앱에서 찾은 정보</h3>
          <div className={`scan-status ${scanState.status}`}>{scanStatusLabel(scanState)}</div>
          {scanState.status === "error" ? (
            <div className="safe-note error">{scanState.error}</div>
          ) : null}
          <div className="found-list">
            {scanRows(scanState).map(([title, copy, status]) => (
              <div className={`found-row ${status === "warn" ? "warn" : ""}`} key={title}>
                <span className="found-dot">{status === "warn" ? "!" : "✓"}</span>
                <span>
                  <strong>{title}</strong>
                  <br />
                  {copy}
                </span>
              </div>
            ))}
          </div>
          {scanState.status === "success" ? (
            <button type="button" className="wide-button primary-soft" onClick={onContinueFromScan}>
              {pendingReviewCount > 0
                ? `${pendingReviewCount}개 확인 항목 보기`
                : "Review & Confirm으로 이동"}
            </button>
          ) : null}
        </section>

        <section className="setup-card">
          <div className="setup-icon">3</div>
          <h3>Apple 정보 연결</h3>
          <p>
            선택 사항입니다. App Store Connect API Key로 실제 앱 조회를 확인하고,
            제출 항목 점검 단계와 연결합니다.
          </p>
          <div className="connect-box">
            <div className="connect-row">
              <span>연결 상태</span>
              <strong>{appleStatusLabel}</strong>
            </div>
            <div className="connect-row">
              <span>필요한 것</span>
              <strong>Apple API Key</strong>
            </div>
            <div className="connect-row">
              <span>비밀번호 입력</span>
              <strong>요구하지 않음</strong>
            </div>
          </div>
          <button type="button" className="wide-button primary-soft" onClick={onAppleConnect}>
            Apple 정보 연결하기
          </button>
          <div className="safe-note">
            Apple ID 비밀번호를 입력받지 않습니다. private key는 저장하지 않고 세션 입력
            흐름과 이 Mac의 local bridge 메모리에서만 확인합니다.
          </div>
        </section>
      </div>
    </article>
  );
}
