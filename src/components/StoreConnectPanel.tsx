type StoreConnectPanelProps = {
  onAction: (actionKey: string) => void;
};

const storeTasks = [
  {
    state: "",
    icon: "✓",
    title: "앱스토어 기본 정보",
    copy: "앱 이름, 부제, 앱 고유 주소, 카테고리, 고객지원 주소를 준비합니다.",
    tag: "완료",
  },
  {
    state: "warn",
    icon: "!",
    title: "개인정보와 처리방침",
    copy: "개인정보 처리방침 주소, 수집하는 데이터 종류, 사용자 선택 안내 주소를 확인합니다.",
    tag: "확인 필요",
  },
  {
    state: "todo",
    icon: "·",
    title: "스크린샷과 앱 미리보기",
    copy: "iPhone/iPad 스크린샷, 선택 사항인 앱 미리보기 영상을 제출 형식에 맞게 준비합니다.",
    tag: "준비 전",
  },
  {
    state: "warn",
    icon: "!",
    title: "심사용 정보",
    copy: "로그인이 필요한 앱이면 심사용 계정, 연락처, 심사자에게 남길 설명을 준비합니다.",
    tag: "확인 필요",
  },
  {
    state: "todo",
    icon: "·",
    title: "가격과 출시 국가",
    copy: "무료/유료 여부, 출시 국가, 예약 주문 여부, 수동 출시 여부를 선택합니다.",
    tag: "선택 전",
  },
  {
    state: "todo",
    icon: "·",
    title: "업로드할 빌드 선택",
    copy: "Xcode에서 Archive 후 올린 빌드를 App Store Connect에서 선택해 심사에 제출합니다.",
    tag: "나중에",
  },
];

export function StoreConnectPanel({ onAction }: StoreConnectPanelProps) {
  return (
    <article className="store-connect-panel">
      <div className="store-connect-head">
        <div>
          <div className="eyebrow">App Store Connect</div>
          <div className="store-connect-title">
            앱스토어에 올릴 상품 정보와 심사 정보를 같이 준비합니다.
          </div>
          <div className="store-connect-copy">
            Xcode 프로젝트 파일은 앱을 빌드하기 위한 준비이고, App Store Connect 정보는
            앱스토어 상품 페이지와 심사 제출을 위한 준비입니다. 이 도구는 둘을 따로 보지
            않고 출시 전 체크리스트로 함께 관리합니다.
          </div>
        </div>
        <span className="mini-tag">제출 준비</span>
      </div>

      <div className="store-connect-grid">
        {storeTasks.map((task) => (
          <section className={`store-task ${task.state}`} key={task.title}>
            <span className="store-task-icon">{task.icon}</span>
            <div>
              <h3>{task.title}</h3>
              <p>{task.copy}</p>
            </div>
            <span className="mini-tag">{task.tag}</span>
          </section>
        ))}
      </div>

      <div className="store-connect-footer">
        <p>
          Apple 정보를 연결하면 App Store에 이미 만든 앱 기록을 읽어와 현재 앱 설정과
          비교합니다. 연결하지 않아도 빈칸 체크리스트와 작성 가이드는 사용할 수 있습니다.
        </p>
        <button type="button" className="secondary" onClick={() => onAction("store-items")}>
          App Store 제출 항목 열기
        </button>
      </div>
    </article>
  );
}
