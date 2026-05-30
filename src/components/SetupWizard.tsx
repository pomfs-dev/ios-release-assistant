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
            className={`choice-card ${choice.active ? "active" : ""}`}
            key={choice.title}
          >
            <strong>{choice.title}</strong>
            <span>{choice.copy}</span>
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
        <select defaultValue={field.options?.[0]}>
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
        <input defaultValue={field.value} placeholder={field.placeholder} />
        {field.helper ? <em>{field.helper}</em> : null}
      </div>
    </label>
  );
}

export function SetupWizard({ advancedMode, step, onAction }: SetupWizardProps) {
  return (
    <article className="wizard-panel">
      <div className="wizard-top">
        <div>
          <p className="eyebrow">{step.eyebrow}</p>
          <h2>{step.heading}</h2>
          <p>{step.helper}</p>
        </div>
        <span className="risk-badge">{step.badge}</span>
      </div>

      <div className="wizard-body">
        <section className="field-stack">
          {step.fields.map((field, index) => (
            <FieldRenderer field={field} key={`${step.id}-${field.kind}-${index}`} />
          ))}
        </section>

        <aside className="explain-box">
          <h3>이 설정이 의미하는 것</h3>
          <p>{step.explain}</p>
          <div className="target-list">
            {step.targets.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <code>{value}</code>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {advancedMode ? (
        <section className="advanced-panel">
          <div>
            <Code2 size={18} />
            <strong>자세히 보기: 실제 파일에는 이렇게 기록됩니다</strong>
          </div>
          <pre>{step.changePreview}</pre>
        </section>
      ) : null}

      <footer className="wizard-footer">
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
