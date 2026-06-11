import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, FileDiff } from "lucide-react";
import type {
  ChangeReviewItem,
  ChangeReviewSummary,
  PreflightCheck,
  SafeWriteState,
  StepDefinition,
} from "../types";

type InspectorCheck = Pick<PreflightCheck, "status" | "title" | "copy"> & {
  id?: string;
  resolution?: PreflightCheck["resolution"];
};

type InspectorPreviewProps = {
  checkLabel?: string;
  checks?: InspectorCheck[];
  reviewSummary?: ChangeReviewSummary;
  safeWrite?: SafeWriteState;
  step: StepDefinition;
  onApplyWritePlan?: () => void;
  onBackupWritePlan?: () => void;
  onBuildWritePlan?: () => void;
  onConfirmCheck?: (checkId: string) => void;
  onGenerateProject?: () => void;
  onResolveReviewItem?: (item: ChangeReviewItem) => void;
  onSelectScreenshot?: () => void;
};

type ReviewFilter = Extract<ChangeReviewItem["status"], "ready" | "needs-review" | "blocked">;

function statusLabel(status: "ready" | "unchanged" | "needs-review" | "blocked") {
  if (status === "ready") return "준비됨";
  if (status === "unchanged") return "변경 없음";
  if (status === "blocked") return "막힘";
  return "확인";
}

const reviewFilterLabels: Record<ReviewFilter, string> = {
  ready: "변경 준비",
  "needs-review": "확인",
  blocked: "막힘",
};

function safeWriteStatusLabel(status: SafeWriteState["status"] | undefined) {
  if (status === "planning") return "계획 중";
  if (status === "planned") return "계획 준비";
  if (status === "backing-up") return "백업 중";
  if (status === "backed-up") return "백업 완료";
  if (status === "applying") return "저장 중";
  if (status === "applied") return "저장 완료";
  if (status === "generating") return "생성 중";
  if (status === "generated") return "생성 완료";
  if (status === "error") return "확인 필요";
  return "대기";
}

function shortPlanId(planId: string) {
  return planId.slice(0, 8);
}

export function InspectorPreview({
  checkLabel = "심사 준비",
  checks,
  onConfirmCheck,
  onApplyWritePlan,
  onBackupWritePlan,
  onBuildWritePlan,
  onGenerateProject,
  onResolveReviewItem,
  onSelectScreenshot,
  reviewSummary,
  safeWrite,
  step,
}: InspectorPreviewProps) {
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter | null>(null);
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [applyConfirmed, setApplyConfirmed] = useState(false);
  const [generateConfirmed, setGenerateConfirmed] = useState(false);
  const shownChecks: InspectorCheck[] = checks ?? step.checks;
  const warningCount = shownChecks.filter((check) => check.status !== "ok").length;
  const canBuildPlan = Boolean(onBuildWritePlan);
  const hasFileChanges = Boolean(safeWrite?.plan && safeWrite.plan.operationCount > 0);
  const generated = safeWrite?.status === "generated";
  const canConfirmBackup = Boolean(
    onBackupWritePlan && hasFileChanges && !safeWrite?.backup,
  );
  const canConfirmApply = Boolean(
    onApplyWritePlan &&
      hasFileChanges &&
      safeWrite?.backup &&
      safeWrite?.status !== "applied" &&
      !generated,
  );
  const canBackup = canConfirmBackup && backupConfirmed && safeWrite?.status !== "backing-up";
  const canApply = canConfirmApply && applyConfirmed && safeWrite?.status !== "applying";
  const verificationPassed = safeWrite?.result?.verification.every((item) => item.ok) ?? false;
  const canConfirmGenerate = Boolean(
    onGenerateProject &&
      safeWrite?.plan &&
      (safeWrite.plan.operationCount === 0 || verificationPassed || safeWrite.status === "applied"),
  );
  const canGenerate =
    canConfirmGenerate &&
    generateConfirmed &&
    safeWrite?.status !== "generating" &&
    safeWrite?.status !== "generated";
  const safeWriteSteps = [
    {
      title: "쓰기 계획",
      copy: safeWrite?.plan
        ? `${safeWrite.plan.operationCount}개 파일 작업`
        : "저장 전에 변경 목록을 먼저 만듭니다.",
      status: safeWrite?.plan ? "done" : safeWrite?.status === "planning" ? "active" : "pending",
    },
    {
      title: "원본 백업",
      copy: safeWrite?.backup
        ? `Backup ${safeWrite.backup.manifest.backupId}`
        : "원본 파일을 앱 폴더 안 백업 위치에 복사합니다.",
      status: safeWrite?.backup
        ? "done"
        : safeWrite?.status === "backing-up"
          ? "active"
          : "pending",
    },
    {
      title: "저장 후 검증",
      copy: safeWrite?.result
        ? verificationPassed
          ? "재스캔 검증 통과"
          : "재스캔 확인 필요"
        : "저장 후 다시 스캔해 바뀐 값을 확인합니다.",
      status: safeWrite?.result
        ? verificationPassed
          ? "done"
          : "pending"
        : safeWrite?.status === "applying"
          ? "active"
          : "pending",
    },
    {
      title: "Xcode 프로젝트 생성",
      copy: safeWrite?.generateResult
        ? `Generate backup ${safeWrite.generateResult.backup.backupId}`
        : "기존 Xcode 프로젝트를 백업한 뒤 xcodegen generate를 실행합니다.",
      status: safeWrite?.status === "generated" ? "done" : safeWrite?.status === "generating" ? "active" : "pending",
    },
  ];

  useEffect(() => {
    setBackupConfirmed(false);
    setApplyConfirmed(false);
    setGenerateConfirmed(false);
  }, [safeWrite?.plan?.id]);

  useEffect(() => {
    setApplyConfirmed(false);
  }, [safeWrite?.backup?.manifest.backupId]);
  const visibleReviewSections = useMemo(() => {
    if (!reviewSummary) return [];
    if (!reviewFilter) return reviewSummary.sections;

    return reviewSummary.sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.status === reviewFilter),
      }))
      .filter((section) => section.items.length > 0);
  }, [reviewFilter, reviewSummary]);
  const visibleReviewCount = visibleReviewSections.reduce(
    (count, section) => count + section.items.length,
    0,
  );
  const reviewFilterOptions: Array<{ count: number; label: string; status: ReviewFilter }> =
    reviewSummary
      ? [
          { status: "ready", label: reviewFilterLabels.ready, count: reviewSummary.readyCount },
          {
            status: "needs-review",
            label: reviewFilterLabels["needs-review"],
            count: reviewSummary.reviewCount,
          },
          {
            status: "blocked",
            label: reviewFilterLabels.blocked,
            count: reviewSummary.blockedCount,
          },
        ]
      : [];

  return (
    <aside className="inspector">
      <article className="preview-panel">
        <div className="panel-title">
          <span>사용자가 보게 되는 위치</span>
          <span className="mini-tag">미리보기</span>
        </div>

        <div className="phone-wrap">
          <div
            className={`phone ${step.preview.screenImageDataUrl ? "has-screen" : ""}`}
            aria-label="iPhone preview"
          >
            <span className="phone-side-button phone-side-button-left-top" aria-hidden="true" />
            <span className="phone-side-button phone-side-button-left-bottom" aria-hidden="true" />
            <span className="phone-side-button phone-side-button-right" aria-hidden="true" />
            <div className={`phone-screen ${step.preview.screenImageDataUrl ? "actual-screen" : ""}`}>
              {step.preview.screenImageDataUrl ? (
                <img
                  alt=""
                  className="screen-preview-image"
                  src={step.preview.screenImageDataUrl}
                />
              ) : (
                <>
                  <div className="app-icon">
                    {step.preview.appIconDataUrl ? (
                      <img alt="" src={step.preview.appIconDataUrl} />
                    ) : null}
                  </div>
                  <strong className="phone-name">{step.preview.phoneName}</strong>
                  <div className="permission-alert">
                    <strong>{step.preview.alertTitle}</strong>
                    <p>{step.preview.alertCopy}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="store-preview">
          {step.preview.storeRows.map(([label, value]) => (
            <div className="store-line" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </article>

      <article className="check-panel">
        <div className="panel-title">
          <span>{checkLabel}</span>
          <span className="mini-tag">
            {warningCount === 0 ? "완료" : `${warningCount}개 확인 필요`}
          </span>
        </div>
        <div className="checklist">
          {shownChecks.map((check) => (
            <div className={`check ${check.status}`} key={check.id ?? check.title}>
              <div className="check-icon">
                {check.status === "ok" ? <Check size={13} /> : <AlertCircle size={14} />}
              </div>
              <div>
                <strong>{check.title}</strong>
                <p>{check.copy}</p>
                {check.id && check.status === "warn" && check.resolution === "manual" ? (
                  <div className="check-action-row">
                    {check.id === "screenshots" ? (
                      <button type="button" className="check-action" onClick={onSelectScreenshot}>
                        스크린샷 선택
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="check-action"
                      onClick={() => onConfirmCheck?.(check.id!)}
                    >
                      확인 완료
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="diff-panel">
        <div className="panel-title">
          <span>Review &amp; Confirm</span>
          <span className="mini-tag">
            <FileDiff size={13} />
            {reviewSummary ? `${reviewSummary.totalCount}개` : "Preview"}
          </span>
        </div>
        {reviewSummary ? (
          <div className="review-summary">
            <div className="review-meter">
              {reviewFilterOptions.map((filter) => (
                <button
                  type="button"
                  className={reviewFilter === filter.status ? "active" : ""}
                  aria-pressed={reviewFilter === filter.status}
                  aria-label={`${filter.label} 항목 ${filter.count}개만 보기`}
                  key={filter.status}
                  onClick={() =>
                    setReviewFilter((currentFilter) =>
                      currentFilter === filter.status ? null : filter.status,
                    )
                  }
                >
                  {filter.count} {filter.label}
                </button>
              ))}
            </div>
            <div className="review-guidance" aria-live="polite">
              {reviewFilter ? (
                <>
                  현재 <strong>{reviewFilterLabels[reviewFilter]}</strong> {visibleReviewCount}개만
                  표시합니다. 같은 숫자 버튼을 한 번 더 누르면 전체 목록으로 돌아갑니다.
                </>
              ) : (
                <>
                  확인이 필요한 항목은 <strong>입력하기</strong>를 눌러 해당 질문으로 이동합니다.
                  {reviewSummary.unchangedCount > 0
                    ? ` ${reviewSummary.unchangedCount}개 항목은 현재 값과 같아 파일 저장 대상이 아닙니다.`
                    : ""}
                </>
              )}
            </div>
            {visibleReviewSections.length > 0 ? (
              visibleReviewSections.map((section) => (
                <section className="review-section" key={section.id}>
                  <div className="review-section-title">
                    <strong>{section.title}</strong>
                    <span>{section.summary}</span>
                  </div>
                  <div className="review-items">
                    {section.items.map((item) => (
                      <div className={`review-item ${item.status}`} key={item.id}>
                        <div className="review-item-head">
                          <strong>{item.title}</strong>
                          <span>{statusLabel(item.status)}</span>
                        </div>
                        <div className="review-target">{item.target}</div>
                        <div className="review-values">
                          <span>현재: {item.currentValue}</span>
                          <span>예정: {item.proposedValue}</span>
                        </div>
                        {item.action && item.status !== "ready" && item.status !== "unchanged" ? (
                          <button
                            type="button"
                            className="review-resolve"
                            onClick={() => onResolveReviewItem?.(item)}
                          >
                            {item.action.label}
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="review-empty">
                해당 상태의 항목이 없습니다. 다른 숫자 버튼을 누르거나 현재 필터를 해제하세요.
              </div>
            )}
            <div className="safe-write-panel">
              <div className="safe-write-head">
                <strong>Backup + Safe Write</strong>
                <span>{safeWriteStatusLabel(safeWrite?.status)}</span>
              </div>
              <p>
                {safeWrite?.plan && safeWrite.plan.operationCount === 0
                  ? "파일에 저장할 변경이 없습니다. 확인 필요 항목을 먼저 입력하거나 수동 처리 항목을 완료하세요."
                  : "실제 저장은 write plan 생성, 원본 백업, 저장 후 재스캔 검증 순서로만 진행합니다."}
              </p>
              <div className="safe-write-steps" aria-label="Safe write 진행 순서">
                {safeWriteSteps.map((safeStep, index) => (
                  <div className={`safe-write-step ${safeStep.status}`} key={safeStep.title}>
                    <span>{index + 1}</span>
                    <strong>{safeStep.title}</strong>
                    <small>{safeStep.copy}</small>
                  </div>
                ))}
              </div>
              {safeWrite?.plan ? (
                <div className="safe-write-facts">
                  <span>
                    Plan: {shortPlanId(safeWrite.plan.id)} · {safeWrite.plan.operationCount}개 파일 작업
                  </span>
                  <span>
                    Backup: {safeWrite.backup ? safeWrite.backup.manifest.backupId : "대기"}
                  </span>
                  <span>
                    Verify:{" "}
                    {safeWrite.result
                      ? safeWrite.result.verification.every((item) => item.ok)
                        ? "통과"
                        : "확인 필요"
                      : "대기"}
                  </span>
                  <span>
                    Generate: {safeWrite.generateResult ? safeWrite.generateResult.command : "대기"}
                  </span>
                </div>
              ) : null}
              {safeWrite?.plan && safeWrite.plan.operations.length > 0 ? (
                <div className="safe-write-operation-list">
                  {safeWrite.plan.operations.map((operation) => (
                    <div className="safe-write-operation" key={operation.id}>
                      <strong>{operation.title}</strong>
                      <span>
                        {operation.relativePath} · {operation.changes.length}개 값
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
              {safeWrite?.plan ? (
                <div className="safe-write-confirmations">
                  {hasFileChanges ? (
                    <>
                      <label>
                        <input
                          checked={backupConfirmed}
                          disabled={!canConfirmBackup || safeWrite.status === "backing-up"}
                          onChange={(event) => setBackupConfirmed(event.target.checked)}
                          type="checkbox"
                        />
                        <span>변경 예정 파일과 값을 확인했습니다.</span>
                      </label>
                      <label>
                        <input
                          checked={applyConfirmed}
                          disabled={!canConfirmApply || safeWrite.status === "applying"}
                          onChange={(event) => setApplyConfirmed(event.target.checked)}
                          type="checkbox"
                        />
                        <span>백업 ID와 저장 대상을 확인했습니다.</span>
                      </label>
                    </>
                  ) : null}
                  <label>
                    <input
                      checked={generateConfirmed}
                      disabled={!canConfirmGenerate || safeWrite.status === "generating"}
                      onChange={(event) => setGenerateConfirmed(event.target.checked)}
                      type="checkbox"
                    />
                    <span>xcodegen generate 실행과 기존 Xcode 프로젝트 백업을 승인합니다.</span>
                  </label>
                </div>
              ) : null}
              {safeWrite?.generateResult ? (
                <div className="safe-write-operation-list">
                  <div className="safe-write-operation">
                    <strong>Xcode 프로젝트 생성 완료</strong>
                    <span>
                      {safeWrite.generateResult.cwd} · backup {safeWrite.generateResult.backup.backupId}
                    </span>
                  </div>
                </div>
              ) : null}
              {safeWrite?.error ? <div className="safe-write-error">{safeWrite.error}</div> : null}
              <div className="safe-write-actions">
                <button
                  type="button"
                  className="secondary"
                  disabled={!canBuildPlan || safeWrite?.status === "planning"}
                  onClick={onBuildWritePlan}
                >
                  {safeWrite?.status === "planning" ? "계획 만드는 중..." : "쓰기 계획 만들기"}
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={!canBackup || safeWrite?.status === "backing-up"}
                  onClick={onBackupWritePlan}
                >
                  {safeWrite?.status === "backing-up" ? "백업 만드는 중..." : "백업 만들기"}
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={!canApply || safeWrite?.status === "applying"}
                  onClick={onApplyWritePlan}
                >
                  {safeWrite?.status === "applying"
                    ? "저장 적용 중..."
                    : generated
                      ? "저장 적용 완료"
                      : "저장 적용"}
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={!canGenerate || safeWrite?.status === "generating"}
                  onClick={onGenerateProject}
                >
                  {safeWrite?.status === "generating"
                    ? "프로젝트 생성 중..."
                    : generated
                      ? "프로젝트 생성 완료"
                      : "Xcode 프로젝트 생성"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <pre>{step.changePreview}</pre>
        )}
      </article>
    </aside>
  );
}
