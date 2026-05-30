import { useMemo, useState } from "react";
import { actionViews } from "./data/actionViews";
import { releaseSteps } from "./data/releaseSteps";
import { ActionPreview } from "./components/ActionPreview";
import { DevNotesModal } from "./components/DevNotesModal";
import { InspectorPreview } from "./components/InspectorPreview";
import { SetupWizard } from "./components/SetupWizard";
import { SidebarProgress } from "./components/SidebarProgress";
import { StartPanel } from "./components/StartPanel";
import { StoreConnectPanel } from "./components/StoreConnectPanel";
import { TopBar } from "./components/TopBar";

export default function App() {
  const [activeStepId, setActiveStepId] = useState(releaseSteps[0].id);
  const [activeActionKey, setActiveActionKey] = useState(releaseSteps[0].actionKey);
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
    <main className="app">
      <TopBar
        advancedMode={advancedMode}
        onToggleAdvanced={setAdvancedMode}
        onOpenNotes={() => setShowNotes(true)}
      />

      <section className="shell">
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

        <section className="workspace">
          <StartPanel onAction={setActiveActionKey} />
          <ActionPreview action={activeAction} />
          <StoreConnectPanel onAction={setActiveActionKey} />
          <SetupWizard
            advancedMode={advancedMode}
            step={activeStep}
            onAction={setActiveActionKey}
          />
        </section>

        <InspectorPreview step={activeStep} />
      </section>

      <section className="generate-bar">
        <div className="generate-copy">
          <strong>2개 항목만 더 확인하면 Xcode에서 열 프로젝트 파일을 만들 수 있습니다.</strong>
          <span>
            버튼을 누르면 현재 앱 폴더를 안전하게 확인한 뒤 Xcode용 프로젝트 파일을 만들고,
            무엇이 바뀌었는지 쉬운 말로 보여줍니다. GitHub 계정은 필요하지 않습니다.
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
