import { FileText, FolderOpen, KeyRound, Wand2 } from "lucide-react";

type StartPanelProps = {
  onAction: (actionKey: string) => void;
};

const startActions = [
  {
    key: "load-folder",
    icon: FolderOpen,
    title: "앱 폴더 불러오기",
    copy: "Mac 안의 기존 iOS 앱 폴더를 읽습니다.",
  },
  {
    key: "load-settings",
    icon: FileText,
    title: "설정 파일 불러오기",
    copy: "project.yml만 먼저 확인합니다.",
  },
  {
    key: "new-app",
    icon: Wand2,
    title: "새 설정 만들기",
    copy: "처음 출시용 설정 초안을 만듭니다.",
  },
  {
    key: "apple-connect",
    icon: KeyRound,
    title: "Apple 정보 연결",
    copy: "App Store Connect 정보와 비교합니다.",
  },
];

export function StartPanel({ onAction }: StartPanelProps) {
  return (
    <article className="start-panel">
      <div>
        <p className="eyebrow">Start</p>
        <h2>앱을 어떻게 준비할까요?</h2>
      </div>
      <div className="start-actions">
        {startActions.map((action) => {
          const Icon = action.icon;
          return (
            <button type="button" key={action.key} onClick={() => onAction(action.key)}>
              <Icon size={19} />
              <span>
                <strong>{action.title}</strong>
                <small>{action.copy}</small>
              </span>
            </button>
          );
        })}
      </div>
    </article>
  );
}
