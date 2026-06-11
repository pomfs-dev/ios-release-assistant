import type { Language } from "../i18n";
import { useI18n } from "../i18n";

type TopBarProps = {
  advancedMode: boolean;
  folderName: string;
  folderPath: string;
  language: Language;
  onToggleAdvanced: (enabled: boolean) => void;
  onLanguageChange: (language: Language) => void;
  onOpenNotes: () => void;
};

export function TopBar({
  advancedMode,
  folderName,
  folderPath,
  language,
  onLanguageChange,
  onToggleAdvanced,
  onOpenNotes,
}: TopBarProps) {
  const { text } = useI18n();

  return (
    <header className="topbar">
      <div className="brand">
        <div className="mark">iOS</div>
        <div>
          <div className="brand-title">Release Assistant</div>
          <div className="brand-subtitle">
            {text("앱 출시 전 설정을 대신 정리해주는 쉬운 도우미")}
          </div>
        </div>
      </div>

      <div className="project-pill" title={folderPath}>
        <strong>{folderName}</strong>
        <span className="project-path">
          {text("현재 앱 폴더:")} {folderPath}
        </span>
      </div>

      <div className="top-actions">
        <span className="status-chip">
          <span className="dot" />
          {text("로컬 변경 없음")}
        </span>
        <button type="button" className="note-button" onClick={onOpenNotes}>
          {text("만든 이야기")}
        </button>
        <div className="mode-toggle language-toggle" aria-label={text("언어 선택")}>
          <button
            type="button"
            className={language === "ko" ? "active" : ""}
            onClick={() => onLanguageChange("ko")}
          >
            한국어
          </button>
          <button
            type="button"
            className={language === "en" ? "active" : ""}
            onClick={() => onLanguageChange("en")}
          >
            English
          </button>
        </div>
        <div className="mode-toggle" aria-label={text("보기 모드")}>
          <button
            type="button"
            className={!advancedMode ? "active" : ""}
            onClick={() => onToggleAdvanced(false)}
          >
            {text("쉬운 설정")}
          </button>
          <button
            type="button"
            className={advancedMode ? "active" : ""}
            onClick={() => onToggleAdvanced(true)}
          >
            {text("자세히")}
          </button>
        </div>
      </div>
    </header>
  );
}
