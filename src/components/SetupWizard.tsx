import { useEffect } from "react";
import { ArrowLeft, ArrowRight, Code2 } from "lucide-react";
import { getEffectiveFieldAnswer, getFieldAnswerKey } from "../data/userAnswers";
import type { FieldDefinition, StepDefinition, UserAnswerState, UserAnswerValue } from "../types";

type SetupWizardProps = {
  advancedMode: boolean;
  step: StepDefinition;
  answers: UserAnswerState;
  canGoPrevious: boolean;
  focusRequest?: {
    fieldLabel: string | null;
    token: number;
  } | null;
  nextLabel?: string;
  showSkip?: boolean;
  onAnswerChange: (stepId: string, key: string, value: UserAnswerValue) => void;
  onGoNext: () => void;
  onGoPrevious: () => void;
};

type FieldRendererProps = {
  answerKey: string;
  field: FieldDefinition;
  value: UserAnswerValue;
  onChange: (value: UserAnswerValue) => void;
};

function textValue(value: UserAnswerValue) {
  return typeof value === "string" ? value : "";
}

function selectedChoices(value: UserAnswerValue) {
  return Array.isArray(value) ? value : [];
}

function FieldRenderer({ answerKey, field, onChange, value }: FieldRendererProps) {
  if (field.kind === "note") {
    return <div className="assistant-note">{field.value}</div>;
  }

  if (field.kind === "choices") {
    const selected = selectedChoices(value);

    return (
      <div className="choice-field" data-field-label={field.label}>
        {field.label ? <span>{field.label}</span> : null}
        <div className={`choice-grid ${field.multi ? "multi" : ""}`}>
          {field.choices?.map((choice) => (
            <button
              type="button"
              className={`choice ${selected.includes(choice.title) ? "active" : ""}`}
              aria-pressed={selected.includes(choice.title)}
              key={choice.title}
              onClick={() => {
                if (field.multi) {
                  onChange(
                    selected.includes(choice.title)
                      ? selected.filter((title) => title !== choice.title)
                      : [...selected, choice.title],
                  );
                  return;
                }

                onChange([choice.title]);
              }}
            >
              <div className="choice-title">{choice.title}</div>
              <div className="choice-copy">{choice.copy}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.kind === "textarea") {
    return (
      <label className="field" data-field-label={field.label}>
        <span>{field.label}</span>
        <textarea
          name={answerKey}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          value={textValue(value)}
        />
      </label>
    );
  }

  if (field.kind === "select") {
    return (
      <label className="field" data-field-label={field.label}>
        <span>{field.label}</span>
        <select
          className="select"
          name={answerKey}
          onChange={(event) => onChange(event.target.value)}
          value={textValue(value)}
        >
          {field.options?.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="field" data-field-label={field.label}>
      <span>{field.label}</span>
      <div className="input-row">
        <input
          className="text-input"
          name={answerKey}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          value={textValue(value)}
        />
        {field.helper ? <em className="suffix">{field.helper}</em> : null}
      </div>
    </label>
  );
}

export function SetupWizard({
  advancedMode,
  answers,
  canGoPrevious,
  focusRequest,
  nextLabel = "다음 설정",
  onAnswerChange,
  onGoNext,
  onGoPrevious,
  showSkip = true,
  step,
}: SetupWizardProps) {
  useEffect(() => {
    if (!focusRequest?.fieldLabel) return;

    const field = [...document.querySelectorAll<HTMLElement>(".question-panel [data-field-label]")]
      .find((element) => element.dataset.fieldLabel === focusRequest.fieldLabel);
    const control = field?.querySelector<HTMLElement>("input, textarea, select, button");
    if (!field || !control) return;

    field.scrollIntoView({ block: "center", behavior: "smooth" });
    control.focus();
  }, [focusRequest, step.id]);

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
          {step.fields.map((field, index) => {
            const answerKey = getFieldAnswerKey(step.id, field, index);
            const value = getEffectiveFieldAnswer(answers, step.id, field, index);

            return (
              <FieldRenderer
                answerKey={answerKey}
                field={field}
                key={`${step.id}-${answerKey}`}
                onChange={(nextValue) => onAnswerChange(step.id, answerKey, nextValue)}
                value={value}
              />
            );
          })}
        </section>

        <aside className="explain-box">
          {step.preview.appIconDataUrl ? (
            <div className="step-preview-icon">
              <img alt="" src={step.preview.appIconDataUrl} />
              <div>
                <span>앱 아이콘</span>
                <strong>{step.preview.phoneName}</strong>
              </div>
            </div>
          ) : null}
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
        <button type="button" className="secondary" disabled={!canGoPrevious} onClick={onGoPrevious}>
          <ArrowLeft size={16} />
          이전
        </button>
        <div>
          {showSkip ? (
            <button type="button" className="secondary" onClick={onGoNext}>
              질문 건너뛰기
            </button>
          ) : null}
          <button type="button" className="primary" onClick={onGoNext}>
            {nextLabel}
            <ArrowRight size={16} />
          </button>
        </div>
      </footer>
    </article>
  );
}
