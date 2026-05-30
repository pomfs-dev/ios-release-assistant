import { AlertCircle, CheckCircle2, Circle } from "lucide-react";
import type { StepDefinition } from "../types";

type SidebarProgressProps = {
  activeStepId: string;
  completedCount: number;
  reviewCount: number;
  steps: StepDefinition[];
  onSelectStep: (stepId: string) => void;
};

function StatusDot({ status }: { status: StepDefinition["status"] }) {
  if (status === "done") return <CheckCircle2 size={18} />;
  if (status === "warning") return <AlertCircle size={18} />;
  return <Circle size={18} />;
}

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
      <div className="progress-card">
        <h2>출시 준비 진행률</h2>
        <div className="progress-track">
          <div style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-meta">
          <span>{progress}% 완료</span>
          <span>{reviewCount}개 확인 필요</span>
        </div>
      </div>

      <nav className="step-list" aria-label="출시 준비 단계">
        {steps.map((step) => (
          <button
            type="button"
            key={step.id}
            className={`step-button ${activeStepId === step.id ? "active" : ""}`}
            onClick={() => onSelectStep(step.id)}
          >
            <span className="step-number">{step.index}</span>
            <span className="step-text">
              <strong>{step.title}</strong>
              <small>{step.summary}</small>
            </span>
            <span className={`status-dot ${step.status}`}>
              <StatusDot status={step.status} />
            </span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
