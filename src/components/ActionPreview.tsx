import { ChevronRight } from "lucide-react";
import type { ActionView } from "../types";

export function ActionPreview({ action }: { action: ActionView }) {
  return (
    <article className="action-preview">
      <div className="action-main">
        <div className="panel-heading">
          <p className="eyebrow">{action.eyebrow}</p>
          <span className="mini-tag">{action.tag}</span>
        </div>
        <h2>{action.title}</h2>
        <p>{action.copy}</p>

        <div className="action-steps">
          {action.steps.map(([title, copy], index) => (
            <div className="action-step" key={title}>
              <span>{index + 1}</span>
              <div>
                <strong>{title}</strong>
                <small>{copy}</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="action-side">
        <h3>{action.sideTitle}</h3>
        <p>{action.sideCopy}</p>
        <div className="mock-list">
          {action.mock.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <footer>
          <ChevronRight size={15} />
          {action.footer}
        </footer>
      </aside>
    </article>
  );
}
