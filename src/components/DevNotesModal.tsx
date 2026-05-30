import { X } from "lucide-react";

type DevNotesModalProps = {
  open: boolean;
  onClose: () => void;
};

export function DevNotesModal({ open, onClose }: DevNotesModalProps) {
  if (!open) return null;

  return (
    <section className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="notesTitle">
      <article className="modal">
        <header>
          <div>
            <p className="eyebrow">About This Tool</p>
            <h2 id="notesTitle">이 도구를 만드는 이유</h2>
            <p>
              개발 언어를 몰라도, 바이브 코딩으로 만든 iOS 앱을 App Store 제출 준비
              상태까지 데려가기 위한 설정 도우미입니다.
            </p>
          </div>
          <button type="button" className="icon-only" aria-label="닫기" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <div className="note-grid">
          <section>
            <h3>누구를 위한 것인가요?</h3>
            <p>
              Xcode를 처음 열어본 앱 제작자, 개발 언어를 모르지만 AI로 앱을 만든 사용자,
              그리고 App Store 제출 전에 무엇을 준비해야 하는지 알고 싶은 사람을 위한
              도구입니다.
            </p>
          </section>
          <section>
            <h3>어떻게 동작하나요?</h3>
            <p>
              사용자는 쉬운 질문에 답합니다. 로컬 설치판은 앱 폴더를 읽고 백업을 만든 뒤
              XcodeGen으로 프로젝트 파일을 생성합니다. 온라인판은 설정 파일 작성과
              App Store Connect 점검을 돕습니다.
            </p>
          </section>
          <section>
            <h3>라이선스</h3>
            <p>MIT License로 공개합니다. 이 도구는 Apple 공식 도구가 아닙니다.</p>
          </section>
        </div>
      </article>
    </section>
  );
}
