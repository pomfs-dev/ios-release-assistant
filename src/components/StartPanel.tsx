type StartPanelProps = {
  onAction: (actionKey: string) => void;
};

export function StartPanel({ onAction }: StartPanelProps) {
  return (
    <article className="launch-panel">
      <div className="launch-head">
        <div>
          <div className="eyebrow">Start</div>
          <div className="launch-title">
            앱 폴더를 불러오면 출시 준비 상태를 먼저 읽어드릴게요.
          </div>
          <div className="launch-copy">
            새 앱을 시작할 수도 있고, 이미 바이브 코딩으로 만든 앱 폴더를 불러올 수도
            있습니다. Apple 정보 연결은 선택 사항이며, 연결하지 않아도 기본 설정 도우미는
            사용할 수 있습니다.
          </div>
        </div>
        <span className="mini-tag">첫 화면 시안</span>
      </div>

      <div className="launch-grid">
        <section className="setup-card emphasis">
          <div className="setup-icon">1</div>
          <h3>시작 방법 선택</h3>
          <p>
            개발 지식이 없어도 괜찮습니다. 앱 폴더만 선택하면 필요한 파일을 찾아서 현재
            상태를 읽습니다.
          </p>
          <div className="button-stack">
            <button
              type="button"
              className="wide-button primary-soft"
              onClick={() => onAction("load-folder")}
            >
              기존 앱 폴더 불러오기
            </button>
            <button type="button" className="wide-button" onClick={() => onAction("load-settings")}>
              설정 파일만 불러오기
            </button>
            <button type="button" className="wide-button" onClick={() => onAction("new-app")}>
              새 앱 설정 만들기
            </button>
          </div>
        </section>

        <section className="setup-card">
          <div className="setup-icon">2</div>
          <h3>불러온 앱에서 찾은 정보</h3>
          <div className="found-list">
            <div className="found-row">
              <span className="found-dot">✓</span>
              <span>
                <strong>앱 이름</strong>
                <br />
                P.O.MFS
              </span>
            </div>
            <div className="found-row">
              <span className="found-dot">✓</span>
              <span>
                <strong>앱 고유 주소</strong>
                <br />
                com.prideofmisfits.community
              </span>
            </div>
            <div className="found-row">
              <span className="found-dot">✓</span>
              <span>
                <strong>Apple 기능</strong>
                <br />
                Apple 로그인, 링크 열기, 알림 사용 중
              </span>
            </div>
            <div className="found-row warn">
              <span className="found-dot">!</span>
              <span>
                <strong>개인정보 준비</strong>
                <br />
                개인정보 처리방침 주소 확인 필요
              </span>
            </div>
          </div>
        </section>

        <section className="setup-card">
          <div className="setup-icon">3</div>
          <h3>Apple 정보 연결</h3>
          <p>
            선택 사항입니다. 연결하면 App Store에 등록된 앱 정보와 현재 앱 설정이 같은지
            비교해줍니다.
          </p>
          <div className="connect-box">
            <div className="connect-row">
              <span>연결 상태</span>
              <strong>연결 안 됨</strong>
            </div>
            <div className="connect-row">
              <span>필요한 것</span>
              <strong>Apple API Key</strong>
            </div>
            <div className="connect-row">
              <span>비밀번호 입력</span>
              <strong>요구하지 않음</strong>
            </div>
          </div>
          <button
            type="button"
            className="wide-button primary-soft"
            onClick={() => onAction("apple-connect")}
          >
            Apple 정보 연결하기
          </button>
          <div className="safe-note">
            Apple ID 비밀번호를 입력받지 않습니다. 연결하지 않아도 앱 폴더 분석과 프로젝트
            만들기는 가능합니다.
          </div>
        </section>
      </div>
    </article>
  );
}
