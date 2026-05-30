import type { ActionView } from "../types";

export function ActionPreview({ action }: { action: ActionView }) {
  return (
    <article className="action-preview">
      <div className="action-preview-head">
        <div>
          <div className="eyebrow">{action.eyebrow}</div>
          <div className="action-preview-title">{action.title}</div>
          <div className="action-preview-copy">{action.copy}</div>
        </div>
        <span className="mini-tag">{action.tag}</span>
      </div>

      <div className="action-preview-body">
        <div className="action-main">
        <div className="action-steps">
          {action.steps.map(([title, copy], index) => (
            <div className="action-step" key={title}>
              <span className="action-step-num">{index + 1}</span>
              <div>
                <strong>{title}</strong>
                <span>{copy}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="action-side">
          <div className="action-side-title">{action.sideTitle}</div>
        <p>{action.sideCopy}</p>
          <div className="mock-box">
          {action.mock.map(([label, value]) => (
              <div className="mock-row" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </aside>
      </div>

      <div className="action-preview-footer">
        <span>{action.footer}</span>
        <button type="button" className="secondary">
          미리보기 초기화
        </button>
      </div>
    </article>
  );
}
