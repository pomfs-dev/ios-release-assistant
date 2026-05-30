import type { StepDefinition } from "../types";

type SidebarProgressProps = {
  activeStepId: string;
  completedCount: number;
  reviewCount: number;
  steps: StepDefinition[];
  onSelectStep: (stepId: string) => void;
};

export function SidebarProgress({
  activeStepId,
  completedCount,
  reviewCount,
  steps,
  onSelectStep,
}: SidebarProgressProps) {
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <aside className="sidebar">
      <div className="side-head">
        <div className="side-title">출시 준비 진행률</div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="readiness">
          <span>{progress}% 완료</span>
          <span>{reviewCount}개 확인 필요</span>
        </div>
      </div>

      <nav className="steps" aria-label="출시 준비 단계">
        {steps.map((step) => (
          <button
            type="button"
            key={step.id}
            className={`step ${step.status === "done" ? "done" : ""} ${
              step.status === "warning" ? "warn" : ""
            } ${activeStepId === step.id ? "active" : ""}`}
            onClick={() => onSelectStep(step.id)}
          >
            <span className="step-number">{step.index}</span>
            <span>
              <span className="step-name">{step.title}</span>
              <span className="step-meta">{step.summary}</span>
            </span>
            <span className="step-state" />
          </button>
        ))}
      </nav>
    </aside>
  );
}
