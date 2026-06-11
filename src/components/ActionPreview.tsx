import { useI18n } from "../i18n";
import type { ActionView } from "../types";

export function ActionPreview({
  action,
  onFooterAction,
}: {
  action: ActionView;
  onFooterAction?: () => void;
}) {
  const { text } = useI18n();
  const [primaryStep, ...nextSteps] = action.steps;
  const primaryActionLabel = action.footerActionLabel ?? primaryStep?.[0] ?? "다음으로 이동";

  return (
    <article className="action-preview">
      <div className="action-preview-head">
        <div>
          <div className="eyebrow">{text(action.eyebrow)}</div>
          <div className="action-preview-title">{text(action.title)}</div>
          <div className="action-preview-copy">{text(action.copy)}</div>
        </div>
        {action.footerActionLabel ? (
          <button
            type="button"
            className="mini-tag action-tag"
            aria-label={`${text(action.tag)}: ${text(action.footerActionLabel)}`}
            onClick={onFooterAction}
          >
            {text(action.tag)}
          </button>
        ) : (
          <span className="mini-tag">{text(action.tag)}</span>
        )}
      </div>

      <div className="action-preview-body">
        <div className="action-main">
          <section className="action-now">
            <div>
              <span className="action-now-label">{text("지금 할 일")}</span>
              <strong>{text(primaryActionLabel)}</strong>
              {primaryStep ? <p>{text(primaryStep[1])}</p> : null}
            </div>
            {action.footerActionLabel ? (
              <button type="button" className="primary" onClick={onFooterAction}>
                {text(action.footerActionLabel)}
              </button>
            ) : null}
          </section>

          <div className="action-sequence-title">{text("그 다음 순서")}</div>
          <div className="action-steps" aria-label={text("다음 작업 순서")}>
            {nextSteps.map(([title, copy], index) => (
              <div className="action-step" key={title}>
                <span className="action-step-num">{index + 2}</span>
                <div>
                  <strong>{text(title)}</strong>
                  <span>{text(copy)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="action-side">
          <div className="action-side-title">{text(action.sideTitle)}</div>
          <p>{text(action.sideCopy)}</p>
          <div className="fact-box">
            {action.facts.map(([label, value]) => (
              <div className="fact-row" key={label}>
                <span>{text(label)}</span>
                <strong>{text(value)}</strong>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className="action-preview-footer">
        <span>{text(action.footer)}</span>
        {action.footerActionLabel ? (
          <button type="button" className="secondary" onClick={onFooterAction}>
            {text(action.footerActionLabel)}
          </button>
        ) : null}
      </div>
    </article>
  );
}
