import { X } from "lucide-react";
import { useI18n } from "../i18n";

type DevNotesModalProps = {
  open: boolean;
  onClose: () => void;
};

export function DevNotesModal({ open, onClose }: DevNotesModalProps) {
  const { text } = useI18n();

  if (!open) return null;

  return (
    <section className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="notesTitle">
      <article className="modal">
        <header>
          <div>
            <p className="eyebrow">About This Tool</p>
            <h2 id="notesTitle">이 도구를 만드는 이유 / Why This Tool Exists</h2>
            <p>
              iOS Release Assistant는 XcodeGen에서 영감을 받아 만든 출시 준비 도우미입니다.
              Inspired by XcodeGen, it helps people turn iOS release setup into a guided,
              reviewable workflow.
            </p>
          </div>
          <button type="button" className="icon-only" aria-label={text("닫기")} onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <div className="note-grid">
          <section>
            <h3>한국어 소개</h3>
            <p>
              Xcode를 처음 열어본 앱 제작자, 개발 언어를 모르지만 AI로 앱을 만든 사용자,
              그리고 App Store 제출 전에 무엇을 준비해야 하는지 알고 싶은 사람을 위한
              도구입니다. XcodeGen이 Xcode 프로젝트 생성을 명확하고 반복 가능한 설정으로
              정리해준 것에서 영감을 받아, 출시 준비도 질문, 점검, 백업, 승인 단계로
              나누었습니다.
            </p>
          </section>
          <section>
            <h3>English About</h3>
            <p>
              This tool is for app makers who are new to Xcode, people who built an app with AI,
              and anyone who needs a clearer path before App Store submission. It is inspired by
              XcodeGen's explicit, repeatable project generation model and applies that same
              spirit to release readiness: questions, checks, backups, and explicit approvals.
            </p>
          </section>
          <section>
            <h3>License / 라이선스</h3>
            <p>
              MIT License로 공개합니다. 이 도구는 Apple 공식 도구가 아닙니다.
              Published under the MIT License. This is not an official Apple tool.
            </p>
          </section>
        </div>
      </article>
    </section>
  );
}
