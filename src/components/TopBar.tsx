type TopBarProps = {
  advancedMode: boolean;
  folderName: string;
  folderPath: string;
  onToggleAdvanced: (enabled: boolean) => void;
  onOpenNotes: () => void;
};

export function TopBar({
  advancedMode,
  folderName,
  folderPath,
  onToggleAdvanced,
  onOpenNotes,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="mark">iOS</div>
        <div>
          <div className="brand-title">Release Assistant</div>
          <div className="brand-subtitle">앱 출시 전 설정을 대신 정리해주는 쉬운 도우미</div>
        </div>
      </div>

      <div className="project-pill" title={folderPath}>
        <strong>{folderName}</strong>
        <span className="project-path">현재 앱 폴더: {folderPath}</span>
      </div>

      <div className="top-actions">
        <span className="status-chip">
          <span className="dot" />
          로컬 변경 없음
        </span>
        <button type="button" className="note-button" onClick={onOpenNotes}>
          만든 이야기
        </button>
        <div className="mode-toggle" aria-label="보기 모드">
          <button
            type="button"
            className={!advancedMode ? "active" : ""}
            onClick={() => onToggleAdvanced(false)}
          >
            쉬운 설정
          </button>
          <button
            type="button"
            className={advancedMode ? "active" : ""}
            onClick={() => onToggleAdvanced(true)}
          >
            자세히
          </button>
        </div>
      </div>
    </header>
  );
}
