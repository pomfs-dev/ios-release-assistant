import { useMemo, useState } from "react";
import { actionViews } from "./data/actionViews";
import { releaseSteps } from "./data/releaseSteps";
import { ActionPreview } from "./components/ActionPreview";
import { DevNotesModal } from "./components/DevNotesModal";
import { InspectorPreview } from "./components/InspectorPreview";
import { SetupWizard } from "./components/SetupWizard";
import { SidebarProgress } from "./components/SidebarProgress";
import { StartPanel } from "./components/StartPanel";
import { TopBar } from "./components/TopBar";

export default function App() {
  const [activeStepId, setActiveStepId] = useState(releaseSteps[0].id);
  const [activeActionKey, setActiveActionKey] = useState("load-folder");
  const [showNotes, setShowNotes] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);

  const activeStep = useMemo(
    () => releaseSteps.find((step) => step.id === activeStepId) ?? releaseSteps[0],
    [activeStepId],
  );
  const activeAction = actionViews[activeActionKey] ?? actionViews["load-folder"];
  const completedCount = releaseSteps.filter((step) => step.status === "done").length;
  const reviewCount = releaseSteps.filter((step) => step.status === "warning").length;

  return (
    <main className="app-shell">
      <TopBar
        advancedMode={advancedMode}
        onToggleAdvanced={setAdvancedMode}
        onOpenNotes={() => setShowNotes(true)}
      />

      <section className="workspace">
        <SidebarProgress
          activeStepId={activeStep.id}
          completedCount={completedCount}
          reviewCount={reviewCount}
          steps={releaseSteps}
          onSelectStep={(stepId) => {
            setActiveStepId(stepId);
            const step = releaseSteps.find((item) => item.id === stepId);
            if (step) setActiveActionKey(step.actionKey);
          }}
        />

        <section className="main-column">
          <StartPanel onAction={setActiveActionKey} />
          <ActionPreview action={activeAction} />
          <SetupWizard
            advancedMode={advancedMode}
            step={activeStep}
            onAction={setActiveActionKey}
          />
        </section>

        <InspectorPreview step={activeStep} />
      </section>

      <section className="generate-bar">
        <div>
          <strong>2개 항목만 더 확인하면 Xcode에서 열 프로젝트 파일을 만들 수 있습니다.</strong>
          <span>
            로컬 설치판에서는 백업을 만든 뒤 XcodeGen을 실행합니다. 온라인판에서는 설정 파일 작성과
            App Store Connect 점검을 먼저 제공합니다.
          </span>
        </div>
        <button type="button" className="secondary" onClick={() => setActiveActionKey("preflight")}>
          미리 점검
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => setActiveActionKey("generate-project")}
        >
          Xcode 프로젝트 만들기
        </button>
      </section>

      <DevNotesModal open={showNotes} onClose={() => setShowNotes(false)} />
    </main>
  );
}
