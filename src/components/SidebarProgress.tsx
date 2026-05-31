import { useMemo, useState } from "react";
import type { PreflightCheck, ReleaseStepId, StepDefinition } from "../types";

type SidebarProgressProps = {
  activeStepId: string;
  checks?: PreflightCheck[];
  checksByStep?: Partial<Record<ReleaseStepId, PreflightCheck[]>>;
  completedCount: number;
  progress: number;
  steps: StepDefinition[];
  onSelectCheck?: (check: PreflightCheck) => void;
  onSelectStep: (stepId: string) => void;
};

function stepChecksFor(
  checksByStep: Partial<Record<ReleaseStepId, PreflightCheck[]>> | undefined,
  stepId: string,
) {
  return checksByStep?.[stepId as ReleaseStepId] ?? [];
}

function checksFromStep(step: StepDefinition, useDetailedChecks: boolean): PreflightCheck[] {
  if (useDetailedChecks) {
    return step.checks.map((check) => ({
      ...check,
      id: `${step.id}-${check.title}`,
      stepId: step.id as ReleaseStepId,
    }));
  }

  if (step.status !== "warning") return [];

  return [
    {
      id: `${step.id}-review`,
      stepId: step.id as ReleaseStepId,
      status: "warn",
      title: `${step.title} 확인 필요`,
      copy: step.summary,
    },
  ];
}

function pendingChecks(checks: PreflightCheck[]) {
  return checks.filter((check) => check.status !== "ok");
}

function progressForStep(step: StepDefinition, checks: PreflightCheck[], useDetailedChecks: boolean) {
  if (!useDetailedChecks) {
    if (step.status === "done") return 100;
    if (step.status === "warning") return 50;
    return 0;
  }

  if (checks.length === 0) return step.status === "done" ? 100 : 0;

  return Math.round((checks.filter((check) => check.status === "ok").length / checks.length) * 100);
}

function stepCountLabel(step: StepDefinition, pendingCount: number) {
  if (pendingCount > 0) return `${pendingCount}개 확인`;
  if (step.status === "pending") return "대기";
  return "완료";
}

export function SidebarProgress({
  activeStepId,
  checks,
  checksByStep,
  completedCount,
  onSelectCheck,
  progress,
  steps,
  onSelectStep,
}: SidebarProgressProps) {
  const [issueScope, setIssueScope] = useState<"all" | string | null>(null);
  const hasPreflightChecks = Boolean(checks?.length ?? Object.keys(checksByStep ?? {}).length);
  const resolvedChecksByStep = useMemo(
    () =>
      steps.reduce<Partial<Record<ReleaseStepId, PreflightCheck[]>>>((grouped, step) => {
        grouped[step.id as ReleaseStepId] =
          checksByStep?.[step.id as ReleaseStepId] ?? checksFromStep(step, hasPreflightChecks);
        return grouped;
      }, {}),
    [checksByStep, hasPreflightChecks, steps],
  );
  const resolvedChecks = useMemo(
    () => checks ?? steps.flatMap((step) => stepChecksFor(resolvedChecksByStep, step.id)),
    [checks, resolvedChecksByStep, steps],
  );
  const displayReviewCount = pendingChecks(resolvedChecks).length;
  const issueChecks = useMemo(() => {
    if (issueScope === "all") return pendingChecks(resolvedChecks);
    if (issueScope) return pendingChecks(stepChecksFor(resolvedChecksByStep, issueScope));
    return [];
  }, [issueScope, resolvedChecks, resolvedChecksByStep]);

  function handleStepSelect(stepId: string) {
    onSelectStep(stepId);
    setIssueScope(stepId);
  }

  function handleIssueSelect(check: PreflightCheck) {
    if (onSelectCheck) {
      onSelectCheck(check);
    } else {
      onSelectStep(check.stepId);
    }
    setIssueScope(check.stepId);
  }

  return (
    <aside className="sidebar">
      <div className="side-head">
        <div className="side-title">출시 준비 진행률</div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="readiness">
          <span>{progress}% 완료</span>
          <button
            type="button"
            className={issueScope === "all" ? "active" : ""}
            aria-pressed={issueScope === "all"}
            onClick={() => setIssueScope((currentScope) => (currentScope === "all" ? null : "all"))}
          >
            {displayReviewCount}개 확인 필요
          </button>
        </div>
      </div>

      {issueScope ? (
        <section className="side-issues" aria-live="polite">
          <div className="side-issues-head">
            <strong>{issueScope === "all" ? "전체 확인 항목" : "이 단계 확인 항목"}</strong>
            <button type="button" onClick={() => setIssueScope(null)}>
              닫기
            </button>
          </div>
          {issueChecks.length > 0 ? (
            <div className="side-issue-list">
              {issueChecks.map((check) => (
                <button type="button" key={check.id} onClick={() => handleIssueSelect(check)}>
                  <strong>{check.title}</strong>
                  <span>{check.copy}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="side-issue-empty">이 단계에서 확인할 항목이 없습니다.</div>
          )}
        </section>
      ) : null}

      <nav className="steps" aria-label="출시 준비 단계">
        {steps.map((step) => {
          const currentStepChecks = stepChecksFor(resolvedChecksByStep, step.id);
          const pendingCount = pendingChecks(currentStepChecks).length;
          const stepProgress = progressForStep(step, currentStepChecks, hasPreflightChecks);

          return (
            <button
              type="button"
              key={step.id}
              className={`step ${step.status === "done" ? "done" : ""} ${
                step.status === "warning" ? "warn" : ""
              } ${activeStepId === step.id ? "active" : ""}`}
              onClick={() => handleStepSelect(step.id)}
            >
              <span className="step-number">{step.index}</span>
              <span className="step-body">
                <span className="step-name">{step.title}</span>
                <span className="step-meta">{step.summary}</span>
                <span className="step-progress-track">
                  <span style={{ width: `${stepProgress}%` }} />
                </span>
              </span>
              <span className="step-status-block">
                <span className="step-state" />
                <span
                  className={`step-count ${pendingCount > 0 ? "warn" : ""} ${
                    pendingCount === 0 && step.status === "pending" ? "pending" : ""
                  }`}
                >
                  {stepCountLabel(step, pendingCount)}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
