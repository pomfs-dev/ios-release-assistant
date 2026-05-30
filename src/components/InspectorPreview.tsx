import { AlertCircle, Check, FileDiff } from "lucide-react";
import type { StepDefinition } from "../types";

export function InspectorPreview({ step }: { step: StepDefinition }) {
  const warningCount = step.checks.filter((check) => check.status !== "ok").length;

  return (
    <aside className="inspector">
      <article className="preview-panel">
        <div className="panel-title">
          <span>사용자가 보게 되는 위치</span>
          <span className="mini-tag">미리보기</span>
        </div>

        <div className="phone-wrap">
          <div className="phone" aria-label="iPhone preview">
            <div className="phone-screen">
              <div className="app-icon" />
              <strong className="phone-name">{step.preview.phoneName}</strong>
              <div className="permission-alert">
                <strong>{step.preview.alertTitle}</strong>
                <p>{step.preview.alertCopy}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="store-preview">
          {step.preview.storeRows.map(([label, value]) => (
            <div className="store-line" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </article>

      <article className="check-panel">
        <div className="panel-title">
          <span>심사 준비 체크</span>
          <span className="mini-tag">
            {warningCount === 0 ? "완료" : `${warningCount}개 확인 필요`}
          </span>
        </div>
        <div className="checklist">
          {step.checks.map((check) => (
            <div className={`check ${check.status}`} key={check.title}>
              <div className="check-icon">
                {check.status === "ok" ? <Check size={13} /> : <AlertCircle size={14} />}
              </div>
              <div>
                <strong>{check.title}</strong>
                <p>{check.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="diff-panel">
        <div className="panel-title">
          <span>변경 미리보기</span>
          <span className="mini-tag">
            <FileDiff size={13} />
            Preview
          </span>
        </div>
        <pre>{step.changePreview}</pre>
      </article>
    </aside>
  );
}
