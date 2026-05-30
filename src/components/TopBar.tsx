import { BookOpen, Github, Settings2 } from "lucide-react";

type TopBarProps = {
  advancedMode: boolean;
  onToggleAdvanced: (enabled: boolean) => void;
  onOpenNotes: () => void;
};

export function TopBar({ advancedMode, onToggleAdvanced, onOpenNotes }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand-block">
        <div className="brand-mark">iR</div>
        <div>
          <p className="eyebrow">iOS Release Assistant</p>
          <h1>앱 출시 설정 도우미</h1>
        </div>
      </div>

      <div className="topbar-actions">
        <button type="button" className="secondary icon-button" onClick={onOpenNotes}>
          <BookOpen size={17} />
          만든 이야기
        </button>
        <a
          className="secondary icon-button"
          href="https://github.com/pomfs-dev/ios-release-assistant"
          rel="noreferrer"
          target="_blank"
        >
          <Github size={17} />
          GitHub
        </a>
        <div className="mode-toggle" aria-label="보기 모드">
          <button
            type="button"
            className={!advancedMode ? "active" : ""}
            onClick={() => onToggleAdvanced(false)}
          >
            초보자
          </button>
          <button
            type="button"
            className={advancedMode ? "active" : ""}
            onClick={() => onToggleAdvanced(true)}
          >
            <Settings2 size={14} />
            고급
          </button>
        </div>
      </div>
    </header>
  );
}
