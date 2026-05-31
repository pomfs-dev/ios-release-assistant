import type { ActionView } from "../types";

export function ActionPreview({
  action,
  onFooterAction,
}: {
  action: ActionView;
  onFooterAction?: () => void;
}) {
  const [primaryStep, ...nextSteps] = action.steps;
  const primaryActionLabel = action.footerActionLabel ?? primaryStep?.[0] ?? "다음으로 이동";

  return (
    <article className="action-preview">
      <div className="action-preview-head">
        <div>
          <div className="eyebrow">{action.eyebrow}</div>
          <div className="action-preview-title">{action.title}</div>
          <div className="action-preview-copy">{action.copy}</div>
        </div>
        {action.footerActionLabel ? (
          <button
            type="button"
            className="mini-tag action-tag"
            aria-label={`${action.tag}: ${action.footerActionLabel}`}
            onClick={onFooterAction}
          >
            {action.tag}
          </button>
        ) : (
          <span className="mini-tag">{action.tag}</span>
        )}
      </div>

      <div className="action-preview-body">
        <div className="action-main">
          <section className="action-now">
            <div>
              <span className="action-now-label">지금 할 일</span>
              <strong>{primaryActionLabel}</strong>
              {primaryStep ? <p>{primaryStep[1]}</p> : null}
            </div>
            {action.footerActionLabel ? (
              <button type="button" className="primary" onClick={onFooterAction}>
                {action.footerActionLabel}
              </button>
            ) : null}
          </section>

          <div className="action-sequence-title">그 다음 순서</div>
          <div className="action-steps" aria-label="다음 작업 순서">
            {nextSteps.map(([title, copy], index) => (
              <div className="action-step" key={title}>
                <span className="action-step-num">{index + 2}</span>
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
          <div className="fact-box">
            {action.facts.map(([label, value]) => (
              <div className="fact-row" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className="action-preview-footer">
        <span>{action.footer}</span>
        {action.footerActionLabel ? (
          <button type="button" className="secondary" onClick={onFooterAction}>
            {action.footerActionLabel}
          </button>
        ) : null}
      </div>
    </article>
  );
}
