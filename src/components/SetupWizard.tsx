import { ArrowLeft, ArrowRight, Code2 } from "lucide-react";
import type { FieldDefinition, StepDefinition } from "../types";

type SetupWizardProps = {
  advancedMode: boolean;
  step: StepDefinition;
  onAction: (actionKey: string) => void;
};

function FieldRenderer({ field }: { field: FieldDefinition }) {
  if (field.kind === "note") {
    return <div className="assistant-note">{field.value}</div>;
  }

  if (field.kind === "choices") {
    return (
      <div className={`choice-grid ${field.multi ? "multi" : ""}`}>
        {field.choices?.map((choice) => (
          <button
            type="button"
            className={`choice ${choice.active ? "active" : ""}`}
            key={choice.title}
          >
            <div className="choice-title">{choice.title}</div>
            <div className="choice-copy">{choice.copy}</div>
          </button>
        ))}
      </div>
    );
  }

  if (field.kind === "textarea") {
    return (
      <label className="field">
        <span>{field.label}</span>
        <textarea defaultValue={field.value} placeholder={field.placeholder} />
      </label>
    );
  }

  if (field.kind === "select") {
    return (
      <label className="field">
        <span>{field.label}</span>
        <select className="select" defaultValue={field.options?.[0]}>
          {field.options?.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="field">
      <span>{field.label}</span>
      <div className="input-row">
        <input className="text-input" defaultValue={field.value} placeholder={field.placeholder} />
        {field.helper ? <em className="suffix">{field.helper}</em> : null}
      </div>
    </label>
  );
}

export function SetupWizard({ advancedMode, step, onAction }: SetupWizardProps) {
  return (
    <article className="question-panel">
      <div className="question-top">
        <div>
          <div className="eyebrow">{step.eyebrow}</div>
          <h1>{step.heading}</h1>
          <div className="helper">{step.helper}</div>
        </div>
        <span className="risk-badge">{step.badge}</span>
      </div>

      <div className="question-body">
        <section className="field-stack">
          {step.fields.map((field, index) => (
            <FieldRenderer field={field} key={`${step.id}-${field.kind}-${index}`} />
          ))}
        </section>

        <aside className="explain-box">
          <div className="explain-title">이 설정이 의미하는 것</div>
          <p>{step.explain}</p>
          <div className="write-targets">
            {step.targets.map(([label, value]) => (
              <div className="target-line" key={label}>
                <span>{label}</span>
                <code>{value}</code>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {advancedMode ? (
        <section className="advanced">
          <div className="advanced-head">
            <div>
              <div className="advanced-title">자세히 보기: 실제 파일에는 이렇게 기록됩니다</div>
              <div className="advanced-subtitle">
                쉬운 질문에 답하면 아래처럼 Xcode용 설정 파일에 안전하게 변환됩니다.
              </div>
            </div>
            <Code2 size={18} />
          </div>
          <div className="table-wrap">
            <pre>{step.changePreview}</pre>
          </div>
        </section>
      ) : null}

      <footer className="panel-footer">
        <button type="button" className="secondary">
          <ArrowLeft size={16} />
          이전
        </button>
        <div>
          <button type="button" className="secondary" onClick={() => onAction("store-items")}>
            질문 건너뛰기
          </button>
          <button type="button" className="primary" onClick={() => onAction(step.actionKey)}>
            다음 설정
            <ArrowRight size={16} />
          </button>
        </div>
      </footer>
    </article>
  );
}
