import type { FolderScanState } from "../types";

type StartPanelProps = {
  folderPath: string;
  scanState: FolderScanState;
  onAction: (actionKey: string) => void;
  onFolderPathChange: (path: string) => void;
  onScanFolder: () => void;
};

function scanStatusLabel(scanState: FolderScanState) {
  if (scanState.status === "loading") return "읽는 중";
  if (scanState.status === "success") return "읽기 완료";
  if (scanState.status === "error") return "오류";
  return "대기 중";
}

function scanRows(scanState: FolderScanState) {
  if (scanState.status === "success") {
    const target = scanState.result.project?.targets[0];
    return [
      ["앱 이름", scanState.result.project?.name ?? scanState.result.folder.name, "found"],
      ["앱 고유 주소", target?.bundleId ?? "project.yml에서 확인 필요", "found"],
      [
        "Xcode 프로젝트",
        scanState.result.files.xcodeProjects[0]?.relativePath ?? ".xcodeproj 없음",
        scanState.result.files.xcodeProjects.length > 0 ? "found" : "warn",
      ],
      [
        "개인정보 준비",
        scanState.result.files.infoPlists.length > 0
          ? `${scanState.result.files.infoPlists.length}개 Info.plist 후보`
          : "Info.plist 확인 필요",
        scanState.result.files.infoPlists.length > 0 ? "found" : "warn",
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
  folderPath,
  scanState,
  onAction,
  onFolderPathChange,
  onScanFolder,
}: StartPanelProps) {
  return (
    <article className="launch-panel">
      <div className="launch-head">
        <div>
          <div className="eyebrow">Start</div>
          <div className="launch-title">
            앱 폴더를 불러오면 출시 준비 상태를 먼저 읽어드릴게요.
          </div>
          <div className="launch-copy">
            새 앱을 시작할 수도 있고, 이미 바이브 코딩으로 만든 앱 폴더를 불러올 수도
            있습니다. Apple 정보 연결은 선택 사항이며, 연결하지 않아도 기본 설정 도우미는
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
            개발 지식이 없어도 괜찮습니다. 앱 폴더만 선택하면 필요한 파일을 찾아서 현재
            상태를 읽습니다.
          </p>
          <div className="button-stack">
            <label className="folder-path-field">
              <span>앱 폴더 경로</span>
              <input
                value={folderPath}
                onChange={(event) => onFolderPathChange(event.target.value)}
                spellCheck={false}
              />
            </label>
            <button
              type="button"
              className="wide-button primary-soft"
              disabled={scanState.status === "loading"}
              onClick={onScanFolder}
            >
              {scanState.status === "loading" ? "앱 폴더 읽는 중..." : "기존 앱 폴더 불러오기"}
            </button>
            <button type="button" className="wide-button" onClick={() => onAction("load-settings")}>
              설정 파일만 불러오기
            </button>
            <button type="button" className="wide-button" onClick={() => onAction("new-app")}>
              새 앱 설정 만들기
            </button>
          </div>
        </section>

        <section className="setup-card">
          <div className="setup-icon">2</div>
          <h3>불러온 앱에서 찾은 정보</h3>
          <div className={`scan-status ${scanState.status}`}>{scanStatusLabel(scanState)}</div>
          {scanState.status === "error" ? <div className="safe-note error">{scanState.error}</div> : null}
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
        </section>

        <section className="setup-card">
          <div className="setup-icon">3</div>
          <h3>Apple 정보 연결</h3>
          <p>
            선택 사항입니다. 연결하면 App Store에 등록된 앱 정보와 현재 앱 설정이 같은지
            비교해줍니다.
          </p>
          <div className="connect-box">
            <div className="connect-row">
              <span>연결 상태</span>
              <strong>연결 안 됨</strong>
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
          <button
            type="button"
            className="wide-button primary-soft"
            onClick={() => onAction("apple-connect")}
          >
            Apple 정보 연결하기
          </button>
          <div className="safe-note">
            Apple ID 비밀번호를 입력받지 않습니다. 연결하지 않아도 앱 폴더 분석과 프로젝트
            만들기는 가능합니다.
          </div>
        </section>
      </div>
    </article>
  );
}
