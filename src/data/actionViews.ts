import type { ActionView } from "../types";

export const actionViews: Record<string, ActionView> = {
  "next-question": {
    eyebrow: "다음 설정",
    title: "현재 답변을 저장하고 다음 출시 준비 질문으로 이동합니다.",
    copy: "질문 하나가 끝날 때마다 오른쪽 미리보기와 출시 준비 체크리스트가 같이 업데이트됩니다.",
    tag: "질문 이동",
    sideTitle: "다음에 보일 것",
    sideCopy:
      "현재 단계 다음에는 Apple 배포 계정, 권한 문구, 개인정보, App Store 제출 항목을 순서대로 확인합니다.",
    steps: [
      ["현재 답변 저장", "앱 이름과 앱 고유 주소를 설정 파일에 반영할 준비를 합니다."],
      ["위험도 확인", "나중에 바꾸기 어려운 값인지 알려줍니다."],
      ["다음 질문 표시", "Apple 계정과 배포 준비 단계로 이동합니다."],
    ],
    facts: [
      ["저장 예정", "앱 이름, 앱 고유 주소"],
      ["다음 단계", "배포 계정"],
      ["진행률", "다음 단계로 이동"],
    ],
    footer:
      "답변은 즉시 파일에 쓰지 않고 Review & Confirm의 변경 목록에 모아 백업 승인 뒤 적용합니다.",
    footerActionLabel: "다음 단계로 이동",
  },
  "load-folder": {
    eyebrow: "앱 폴더 불러오기",
    title: "앱 폴더를 선택하면 필요한 파일을 자동으로 찾습니다.",
    copy:
      "사용자는 앱 폴더만 고르면 됩니다. 도구가 설정 파일, 앱 정보 파일, Apple 기능 권한 파일, 아이콘 폴더를 찾아서 현재 상태를 읽습니다.",
    tag: "파일 선택",
    sideTitle: "사용자가 해야 할 일",
    sideCopy:
      "이 Mac에서 앱 폴더나 project.yml을 한 번 선택합니다. GitHub 계정이나 Apple 계정 연결은 필요하지 않습니다.",
    steps: [
      ["폴더 선택창 열기", "예: MyVibeApp 폴더를 선택합니다."],
      ["앱 정보 읽기", "앱 이름, 앱 고유 주소, 버전, 권한 문구를 찾아옵니다."],
      ["부족한 항목 표시", "출시 전에 채워야 하는 항목을 쉬운 체크리스트로 보여줍니다."],
    ],
    facts: [
      ["찾은 앱 이름", "P.O.MFS"],
      ["찾은 앱 고유 주소", "com.prideofmisfits.community"],
      ["확인 필요", "개인정보 처리방침 주소"],
    ],
    footer:
      "Finder 선택창이나 직접 경로 입력으로 앱 폴더 안의 설정 파일을 읽습니다.",
    footerActionLabel: "앱 폴더 경로 확인",
  },
  "load-settings": {
    eyebrow: "설정 파일 불러오기",
    title: "project.yml 파일만 선택해도 앱 루트를 찾아서 읽습니다.",
    copy:
      "업로드가 아니라 로컬 project.yml 또는 project.yaml 파일 경로를 입력합니다. 도구가 그 파일의 상위 폴더를 앱 루트로 보고 Info.plist와 Entitlements까지 함께 확인합니다.",
    tag: "경로 입력",
    sideTitle: "사용자가 해야 할 일",
    sideCopy:
      "왼쪽 경로 입력칸에 project.yml 또는 project.yaml 파일 경로를 넣고 설정 파일 읽기를 누릅니다.",
    steps: [
      ["project.yml 경로 입력", "예: /Users/me/MyVibeApp/project.yml 파일 경로를 입력합니다."],
      ["앱 루트 계산", "선택한 설정 파일의 상위 폴더를 앱 폴더로 사용합니다."],
      ["연결 파일 스캔", "Info.plist, Entitlements, Xcode project 존재 여부까지 함께 읽습니다."],
    ],
    facts: [
      ["설정 파일", "project.yml"],
      ["앱 고유 주소", "com.example.myapp"],
      ["상태", "수정 가능"],
    ],
    footer:
      "project.yml 파일 경로만 입력해도 이후 Review & Confirm과 백업 저장 흐름은 같은 안전 게이트를 사용합니다.",
    footerActionLabel: "project.yml 경로로 읽기",
  },
  "new-app": {
    eyebrow: "출시 답변 먼저 작성",
    title: "폴더 연결 전에 앱 이름과 고유 주소 답변을 먼저 입력합니다.",
    copy:
      "기존 폴더를 선택하지 않은 사용자도 앱 이름, bundle id, Apple 팀, 권한 문구를 먼저 정리할 수 있습니다. 파일 저장은 앱 폴더와 Review & Confirm을 거친 뒤에만 진행합니다.",
    tag: "답변 준비",
    sideTitle: "다음 입력",
    sideCopy:
      "기본 정보 단계로 이동해 앱 이름과 앱 고유 주소를 입력합니다. 이후 기존 앱 폴더를 연결하면 답변이 변경 계획에 반영됩니다.",
    steps: [
      ["기본값 채우기", "앱 이름과 bundle id 입력칸으로 바로 이동합니다."],
      ["출시 질문 이어가기", "서명, 권한 문구, App Store 제출 정보를 순서대로 작성합니다."],
      ["폴더 연결 후 저장", "실제 파일 쓰기는 앱 폴더 스캔과 백업 승인 뒤에만 가능합니다."],
    ],
    facts: [
      ["앱 이름", "My First App"],
      ["지원 기기", "iPhone + iPad"],
      ["파일 생성", "폴더 연결 후 승인"],
    ],
    footer:
      "이 흐름은 새 프로젝트를 즉시 생성하지 않습니다. 백업 가능한 앱 폴더가 확인된 뒤에만 파일 저장과 generate를 실행합니다.",
    footerActionLabel: "앱 이름 입력하기",
  },
  "apple-connect": {
    eyebrow: "Apple 정보 연결",
    title: "App Store Connect API Key를 세션 전용으로 입력합니다.",
    copy:
      "Issuer ID, Key ID, private key 내용을 세션에서만 받아 Apple API 연결을 확인합니다. 입력값은 파일에 저장하지 않고, 화면 로그에도 남기지 않습니다.",
    tag: "세션 연결",
    sideTitle: "입력할 정보",
    sideCopy:
      "App Store Connect에서 발급한 Issuer ID, Key ID, .p8 private key, 그리고 확인할 앱 ID 또는 bundle id를 입력합니다.",
    steps: [
      ["API Key 입력", "Apple ID 비밀번호가 아니라 App Store Connect API Key만 사용합니다."],
      ["세션 준비", "private key 원문은 연결 준비 후 입력칸에서 비웁니다."],
      ["앱 조회 확인", "Apple API에서 앱 이름과 Bundle ID를 확인합니다."],
    ],
    facts: [
      ["비밀번호 입력", "필요 없음"],
      ["가져올 정보", "앱 이름, 앱 ID, 빌드"],
      ["연결 방식", "공식 API Key"],
    ],
    footer:
      "연결 버튼은 App Store Connect API로 앱 조회까지 확인합니다. 상품 페이지 값은 Review & Confirm에서 수동 처리 항목으로 분리합니다.",
    footerActionLabel: "API Key 입력하기",
  },
  "store-items": {
    eyebrow: "App Store 제출 항목",
    title: "앱스토어 상품 페이지와 심사 제출에 필요한 정보를 작성합니다.",
    copy:
      "Xcode 프로젝트 설정과 별도로, App Store에 보일 앱 설명, 앱 아이콘, 스크린샷, 개인정보 처리방침, 심사용 계정도 준비해야 합니다.",
    tag: "제출 준비",
    sideTitle: "여기에 저장되는 정보",
    sideCopy:
      "일부는 앱 파일이 아니라 App Store Connect에 직접 입력해야 합니다. 이 도구는 빠진 항목을 체크하고 복사 가능한 형태로 정리합니다.",
    steps: [
      ["상품 페이지 정보", "앱 이름, 부제, 설명, 키워드, 카테고리, 고객지원 주소를 준비합니다."],
      ["미디어 자산", "앱 아이콘과 App Store Connect에 올릴 스크린샷을 확인합니다."],
      ["개인정보 정보", "개인정보 처리방침 주소와 수집 데이터 종류를 확인합니다."],
      ["심사용 정보", "데모 계정, 리뷰 메모, 연락처, 가격과 출시 국가를 정리합니다."],
    ],
    facts: [
      ["빌드 포함", "앱 아이콘"],
      ["필수", "개인정보 처리방침 URL"],
      ["필수 가능", "스크린샷"],
      ["로그인 앱", "데모 계정 필요"],
    ],
    footer:
      "App Store Connect API 연결 시 앱 조회가 가능하며, 상품 페이지 입력 값은 Review & Confirm에서 수동 처리 항목으로 확인합니다.",
    footerActionLabel: "심사 항목 입력",
  },
  "preflight": {
    eyebrow: "미리 점검",
    title: "프로젝트를 만들기 전에 위험한 부분을 먼저 확인합니다.",
    copy:
      "파일을 만들기 전에 부족한 항목과 바뀔 내용을 먼저 보여줍니다. Git을 몰라도 자동 백업 안내를 제공합니다.",
    tag: "안전 점검",
    sideTitle: "검사 항목",
    sideCopy:
      "필수 값 누락, 권한 문구 누락, Apple 정보 불일치, App Store 제출 항목 누락을 확인합니다.",
    steps: [
      ["현재 폴더 확인", "앱 폴더와 기존 파일이 있는지 확인합니다."],
      ["출시 필수 항목 검사", "앱 고유 주소, 버전, 권한 문구, 개인정보 항목을 검사합니다."],
      ["바뀔 내용 미리보기", "프로젝트 만들기 전에 변경 목록을 쉬운 말로 보여줍니다."],
    ],
    facts: [
      ["결과", "2개 확인 필요"],
      ["파일 변경", "계획 전"],
      ["백업", "생성 예정"],
    ],
    footer:
      "미리 점검을 통과하거나 사용자가 수동 확인을 완료한 뒤에만 저장과 프로젝트 생성을 실행합니다.",
    footerActionLabel: "Review & Confirm 열기",
  },
  "review-confirm": {
    eyebrow: "Review & Confirm",
    title: "저장하거나 실행하기 전에 변경 예정 목록을 먼저 확인합니다.",
    copy:
      "이 단계는 데모 미리보기가 아니라 실제 파일 저장, App Store Connect 제출 준비, 로컬 명령 실행 전에 필요한 안전 게이트입니다.",
    tag: "승인 게이트",
    sideTitle: "오른쪽에서 확인할 것",
    sideCopy:
      "파일 변경, App Store Connect에 쓸 항목, 백업과 xcodegen 실행 순서를 나눠서 확인합니다.",
    steps: [
      ["파일 변경 확인", "project.yml, Info.plist, Entitlements에 들어갈 값을 봅니다."],
      ["제출 준비 확인", "App Store Connect에서 처리할 항목과 파일 변경 항목을 나눕니다."],
      ["명령 실행 승인", "백업, 저장, xcodegen generate는 별도 승인 뒤에만 실행합니다."],
    ],
    facts: [
      ["파일 변경", "승인 전"],
      ["ASC 항목", "확인 필요"],
      ["명령 실행", "승인 전"],
    ],
    footer:
      "쓰기 계획을 만든 뒤 체크박스로 백업, 저장 적용, xcodegen generate를 각각 승인해 실행합니다.",
    footerActionLabel: "쓰기 계획 만들기",
  },
  "generate-project": {
    eyebrow: "Xcode 프로젝트 만들기",
    title: "Xcode에서 열 수 있는 프로젝트 파일을 만듭니다.",
    copy:
      "마지막 단계입니다. 먼저 백업을 만들고, 설정 파일을 저장한 뒤, XcodeGen으로 Xcode 프로젝트 파일을 생성합니다.",
    tag: "실행 단계",
    sideTitle: "실행 후 보여줄 것",
    sideCopy:
      "성공 여부, 바뀐 파일, 다음에 Xcode에서 눌러야 할 메뉴를 단계별로 안내합니다.",
    steps: [
      ["자동 백업 만들기", "문제가 생기면 이전 상태로 돌아갈 수 있게 합니다."],
      ["Xcode 프로젝트 생성", "설정 파일을 기준으로 Xcode에서 열 파일을 만듭니다."],
      ["다음 안내 표시", "Xcode 열기, Archive 만들기, App Store 업로드 순서를 보여줍니다."],
    ],
    facts: [
      ["생성 파일", "MyVibeApp.xcodeproj"],
      ["다음 버튼", "Xcode에서 열기"],
      ["상태", "성공 화면 표시"],
    ],
    footer:
      "xcodegen generate는 이 Mac의 local bridge에서 실행됩니다. 실행 전 기존 Xcode 프로젝트와 workspace를 백업합니다.",
    footerActionLabel: "Review & Confirm으로 돌아가기",
  },
};
