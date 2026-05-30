import type { StepDefinition } from "../types";

export const releaseSteps: StepDefinition[] = [
  {
    id: "basic",
    index: 1,
    title: "앱 기본 정보",
    summary: "이름, 앱 고유 주소, 버전",
    status: "done",
    eyebrow: "General",
    heading: "앱의 이름과 고유 ID를 확인할게요.",
    helper:
      "사용자가 보는 앱 이름과 App Store에 등록할 앱의 고유 주소를 정합니다. 한 번 출시하면 바꾸기 어려운 값이라 처음에 안전하게 정하는 것이 중요합니다.",
    badge: "출시 영향 높음",
    explain:
      "앱 이름은 홈 화면과 App Store 제품 페이지에서 보입니다. 앱 고유 주소는 사용자에게 직접 보이지 않지만, iPhone과 App Store가 이 앱을 구분하는 내부 ID입니다.",
    fields: [
      { kind: "text", label: "앱 이름", value: "P.O.MFS" },
      {
        kind: "text",
        label: "앱 고유 주소",
        value: "com.prideofmisfits.community",
        helper: "예: com.company.app",
      },
      {
        kind: "choices",
        choices: [
          {
            title: "iPhone + iPad",
            copy: "대부분의 새 앱에 적합합니다. App Store에서 범용 앱처럼 보입니다.",
            active: true,
          },
          {
            title: "iPhone only",
            copy: "iPhone 화면만 준비된 앱이면 안전한 선택입니다.",
          },
          {
            title: "Mac Catalyst 포함",
            copy: "iPad 앱을 Mac에서도 배포할 때 사용합니다.",
          },
        ],
      },
      {
        kind: "note",
        value:
          "앱 고유 주소는 App Store에 앱을 등록할 때 쓰는 ID와 반드시 같아야 합니다. 첫 빌드를 올린 뒤에는 바꾸기 어렵기 때문에 회사나 서비스 이름을 넣은 형식을 추천합니다.",
      },
    ],
    targets: [
      ["저장 위치", "설정 파일"],
      ["Xcode 탭", "General"],
      ["App Store", "앱 정보"],
    ],
    preview: {
      phoneName: "P.O.MFS",
      alertTitle: "\"P.O.MFS\"에서 카메라에 접근하려고 합니다",
      alertCopy: "프로필 사진을 촬영하기 위해 카메라 접근이 필요합니다.",
      storeRows: [
        ["App Store 이름", "P.O.MFS"],
        ["앱 고유 주소", "com.prideofmisfits.community"],
        ["버전", "1.0 · build 1"],
      ],
    },
    checks: [
      {
        status: "ok",
        title: "앱 고유 주소 설정됨",
        copy: "App Store에 앱을 등록할 때 입력하는 ID와 맞춰야 합니다.",
      },
      {
        status: "ok",
        title: "버전 1.0 준비됨",
        copy: "처음 출시 버전으로 사용할 수 있습니다.",
      },
      {
        status: "warn",
        title: "Privacy Policy URL 필요",
        copy: "App Store 제출 전에 반드시 입력해야 합니다.",
      },
      {
        status: "warn",
        title: "Demo account 확인",
        copy: "로그인이 필요한 앱은 심사용 계정을 준비해야 합니다.",
      },
    ],
    changePreview:
      '설정 파일\n+ PRODUCT_BUNDLE_IDENTIFIER: com.prideofmisfits.community\n+ MARKETING_VERSION: "1.0"\n+ CURRENT_PROJECT_VERSION: "1"',
    actionKey: "next-question",
  },
  {
    id: "signing",
    index: 2,
    title: "서명과 배포",
    summary: "Apple 계정, 배포 준비",
    status: "done",
    eyebrow: "Signing",
    heading: "어떤 Apple 계정으로 앱을 배포할까요?",
    helper:
      "iPhone에 직접 설치하거나 TestFlight, App Store에 올리려면 Apple Developer 계정이 필요합니다. 처음에는 Xcode가 자동으로 관리하는 방식을 추천합니다.",
    badge: "실기기 빌드 필수",
    explain:
      "이 설정은 앱을 누가 배포하는지 Apple에 증명하는 단계입니다. 사용자는 직접 인증서 파일을 이해하지 않아도 되도록 자동 설정을 기본으로 둡니다.",
    fields: [
      {
        kind: "select",
        label: "Apple Developer 계정 상태",
        options: [
          "유료 Apple Developer Program 가입 완료",
          "아직 가입 전",
          "다른 사람이 계정을 관리함",
        ],
      },
      {
        kind: "text",
        label: "Apple 개발자 팀 ID",
        value: "LT47CYB8SL",
        helper: "Apple 계정",
      },
      {
        kind: "choices",
        choices: [
          {
            title: "Xcode 자동 관리",
            copy: "처음 배포하는 사용자에게 가장 안전합니다.",
            active: true,
          },
          {
            title: "직접 관리",
            copy: "인증서와 프로필을 아는 사용자만 선택합니다.",
          },
          {
            title: "나중에 연결",
            copy: "지금은 설정만 저장하고 Xcode에서 다시 확인합니다.",
          },
        ],
      },
      {
        kind: "note",
        value:
          "이 도구는 Apple ID 비밀번호를 묻지 않습니다. 실제 제품에서는 Xcode 또는 Apple 공식 API Key로만 연결하도록 안내해야 합니다.",
      },
    ],
    targets: [
      ["저장 위치", "설정 파일"],
      ["Xcode 탭", "Signing"],
      ["Apple 사이트", "Certificates"],
    ],
    preview: {
      phoneName: "P.O.MFS",
      alertTitle: "이 앱은 Apple 개발자 계정으로 서명됩니다",
      alertCopy:
        "TestFlight와 App Store 제출 전에 Apple 팀 ID가 현재 앱과 맞는지 확인합니다.",
      storeRows: [
        ["Apple 팀", "LT47CYB8SL"],
        ["서명 방식", "Xcode 자동 관리"],
        ["배포 대상", "TestFlight · App Store"],
      ],
    },
    checks: [
      {
        status: "ok",
        title: "Apple 팀 ID 입력됨",
        copy: "현재 설정 파일에 팀 ID가 들어갑니다.",
      },
      {
        status: "warn",
        title: "Apple Developer 가입 확인",
        copy: "유료 개발자 계정이 아니면 App Store 제출이 불가능합니다.",
      },
    ],
    changePreview:
      "설정 파일\n+ DEVELOPMENT_TEAM: LT47CYB8SL\n+ CODE_SIGN_STYLE: Automatic\n\nXcode\n+ Signing & Capabilities에서 Apple 계정 확인",
    actionKey: "preflight",
  },
  {
    id: "privacy",
    index: 3,
    title: "권한과 개인정보",
    summary: "권한 문구, 개인정보",
    status: "warning",
    eyebrow: "Privacy",
    heading: "사용자 권한 팝업에 들어갈 문구를 준비할게요.",
    helper:
      "카메라, 마이크, 위치, 사진 같은 민감한 권한은 사용자가 이해할 수 있는 설명 문구가 필요합니다. 이 문구는 iPhone 권한 팝업에 그대로 표시됩니다.",
    badge: "심사 리스크",
    explain:
      "권한 문구가 비어 있거나 실제 사용 목적과 다르면 심사에서 문제가 될 수 있습니다. 개인정보 처리 내용도 App Store 제출 전에 함께 확인해야 합니다.",
    fields: [
      {
        kind: "textarea",
        label: "카메라 권한 문구",
        value: "프로필 사진을 촬영하기 위해 카메라 접근이 필요합니다.",
      },
      {
        kind: "textarea",
        label: "사진 보관함 권한 문구",
        value: "프로필 이미지를 선택하고 저장하기 위해 사진 접근이 필요합니다.",
      },
      {
        kind: "text",
        label: "개인정보 처리방침 주소",
        placeholder: "https://example.com/privacy",
        helper: "필수",
      },
      {
        kind: "note",
        value:
          "권한 문구는 왜 필요한지를 사용자가 이해할 수 있게 써야 합니다. 막연한 문구는 심사에서 약합니다.",
      },
    ],
    targets: [
      ["저장 위치", "앱 정보 파일"],
      ["Xcode 탭", "Info"],
      ["App Store", "개인정보"],
    ],
    preview: {
      phoneName: "P.O.MFS",
      alertTitle: "\"P.O.MFS\"에서 사진에 접근하려고 합니다",
      alertCopy: "프로필 이미지를 선택하고 저장하기 위해 사진 접근이 필요합니다.",
      storeRows: [
        ["권한 문구", "카메라 · 사진"],
        ["개인정보", "URL 입력 필요"],
        ["심사 영향", "높음"],
      ],
    },
    checks: [
      {
        status: "ok",
        title: "카메라 문구 있음",
        copy: "권한 팝업에 표시할 문구가 준비되었습니다.",
      },
      {
        status: "warn",
        title: "Privacy Policy URL 필요",
        copy: "App Store Connect에 입력할 주소가 필요합니다.",
      },
      {
        status: "warn",
        title: "수집 데이터 확인",
        copy: "계정, 위치, 연락처 등 수집하는 데이터를 App Store에 표시해야 합니다.",
      },
    ],
    changePreview:
      "앱 정보 파일\n+ NSCameraUsageDescription\n+ NSPhotoLibraryUsageDescription\n\nApp Store Connect\n+ 개인정보 처리방침 URL 필요",
    actionKey: "store-items",
  },
  {
    id: "capabilities",
    index: 4,
    title: "Apple 기능",
    summary: "Push, Apple Login, Domains",
    status: "done",
    eyebrow: "Capabilities",
    heading: "Apple 기능을 켤지 선택할게요.",
    helper:
      "푸시 알림, Apple 로그인, 웹사이트 링크를 앱으로 열기 같은 기능을 켤지 선택합니다. 필요한 경우 Apple 계정 쪽 설정도 안내합니다.",
    badge: "계정 설정 필요",
    explain:
      "Apple 기능은 앱이 Apple 서비스를 사용할 수 있게 해주는 권한입니다. 일부 기능은 Xcode 설정만으로 끝나지 않고 Apple 웹사이트에서도 추가 설정이 필요합니다.",
    fields: [
      {
        kind: "choices",
        multi: true,
        choices: [
          {
            title: "Apple 로그인 사용",
            copy: "Apple로 로그인 버튼이 있는 앱이면 켜야 합니다.",
            active: true,
          },
          {
            title: "웹사이트 링크 연결",
            copy: "웹 링크를 누르면 앱으로 열리게 할 때 사용합니다.",
            active: true,
          },
          {
            title: "Push 알림",
            copy: "서버에서 사용자에게 알림을 보낼 때 필요합니다.",
          },
        ],
      },
      {
        kind: "text",
        label: "앱과 연결할 웹사이트 주소",
        value: "applinks:prideofmisfits.com",
        helper: "Domains",
      },
      {
        kind: "note",
        value:
          "Apple 기능은 앱 안의 버튼만 보고 결정하면 안 됩니다. 웹사이트 파일, 서버 알림 인증서, Apple 계정 설정까지 같이 필요한 기능이 있습니다.",
      },
    ],
    targets: [
      ["저장 위치", "권한 파일"],
      ["Xcode 탭", "Capabilities"],
      ["Apple 사이트", "Identifiers"],
    ],
    preview: {
      phoneName: "P.O.MFS",
      alertTitle: "Apple 로그인과 웹 링크 기능이 켜져 있습니다",
      alertCopy:
        "사용자는 Apple 계정으로 로그인하고, 지원되는 웹 링크는 앱으로 열 수 있습니다.",
      storeRows: [
        ["Apple 기능", "Login · Domains"],
        ["추가 확인", "Apple 웹사이트 설정"],
        ["Push 알림", "선택 전"],
      ],
    },
    checks: [
      {
        status: "ok",
        title: "Apple 로그인 권한 연결됨",
        copy: "권한 파일에 Apple 로그인 항목이 반영됩니다.",
      },
      {
        status: "warn",
        title: "웹사이트 파일 확인",
        copy: "Associated Domains는 웹사이트에도 Apple 확인 파일이 필요합니다.",
      },
    ],
    changePreview:
      "Apple 기능 권한 파일\n+ com.apple.developer.applesignin\n+ com.apple.developer.associated-domains\n\nApple Developer\n+ Identifier 기능 확인 필요",
    actionKey: "apple-connect",
  },
  {
    id: "store",
    index: 5,
    title: "App Store 심사",
    summary: "상품 정보, 심사 메모, 데모 계정",
    status: "warning",
    eyebrow: "App Store Review",
    heading: "심사자가 앱을 확인할 수 있게 준비할게요.",
    helper:
      "로그인 앱은 데모 계정, 유료 기능은 설명, 웹뷰 앱은 앱의 네이티브 가치와 개인정보 안내가 필요합니다.",
    badge: "제출 전 확인",
    explain:
      "이 항목들은 앱 파일 안에 저장되지 않는 것도 많지만, App Store 제출 단계에서 빠지면 심사가 늦어지거나 반려될 수 있습니다.",
    fields: [
      {
        kind: "textarea",
        label: "App Store에 보일 앱 설명",
        value: "P.O.MFS 커뮤니티를 위한 콘텐츠와 멤버 경험을 제공합니다.",
      },
      {
        kind: "text",
        label: "심사용 데모 계정",
        placeholder: "review@example.com / password",
        helper: "로그인 앱",
      },
      {
        kind: "choices",
        choices: [
          {
            title: "스크린샷 준비 중",
            copy: "iPhone 화면 크기별 이미지가 필요합니다.",
            active: true,
          },
          {
            title: "수동 출시",
            copy: "심사 통과 후 원하는 시점에 출시합니다.",
          },
          {
            title: "무료 앱",
            copy: "가격과 출시 국가를 App Store Connect에서 정합니다.",
          },
        ],
      },
      {
        kind: "note",
        value:
          "App Store Connect는 앱스토어 상품 페이지와 심사 제출 공간입니다. Xcode 프로젝트 파일만 만들어서는 출시 준비가 끝나지 않습니다.",
      },
    ],
    targets: [
      ["저장 위치", "App Store Connect"],
      ["Xcode 탭", "Organizer"],
      ["App Store", "심사 제출"],
    ],
    preview: {
      phoneName: "P.O.MFS",
      alertTitle: "심사자는 데모 계정으로 앱을 확인합니다",
      alertCopy:
        "로그인이 필요한 앱은 Apple 심사자가 접근할 수 있는 계정을 제공해야 합니다.",
      storeRows: [
        ["상품 설명", "초안 있음"],
        ["스크린샷", "준비 필요"],
        ["데모 계정", "입력 필요"],
      ],
    },
    checks: [
      {
        status: "ok",
        title: "앱 설명 초안 있음",
        copy: "상품 페이지에 넣을 설명을 다듬을 수 있습니다.",
      },
      {
        status: "warn",
        title: "데모 계정 필요",
        copy: "로그인 앱이면 심사용 계정을 반드시 입력해야 합니다.",
      },
      {
        status: "warn",
        title: "스크린샷 필요",
        copy: "출시할 기기 크기에 맞는 스크린샷을 준비해야 합니다.",
      },
    ],
    changePreview:
      "App Store Connect\n+ 앱 설명 초안\n+ 심사용 데모 계정 필요\n+ 스크린샷 필요\n\nXcode\n+ Archive 후 업로드할 빌드 선택",
    actionKey: "store-items",
  },
  {
    id: "generate",
    index: 6,
    title: "프로젝트 만들기",
    summary: "Xcode에서 열 파일 생성",
    status: "pending",
    eyebrow: "Generate",
    heading: "이제 Xcode에서 열 프로젝트 파일을 만들 준비가 됐습니다.",
    helper:
      "버튼을 누르면 현재 앱 폴더를 확인하고, Xcode에서 열 수 있는 프로젝트 파일을 만듭니다. 그 다음 무엇이 바뀌었는지 쉬운 말로 보여줍니다.",
    badge: "최종 단계",
    explain:
      "프로젝트 파일을 만든 뒤에는 Xcode에서 Archive를 만들고 TestFlight 또는 App Store 업로드를 진행합니다.",
    fields: [
      {
        kind: "note",
        value:
          "이 MVP 화면에서는 실제 파일을 만들지 않습니다. 실제 제품에서는 먼저 백업을 만들고, 미리 점검 결과를 보여준 뒤 사용자가 확인하면 Xcode 프로젝트 파일을 생성합니다.",
      },
      {
        kind: "choices",
        choices: [
          {
            title: "1. 미리 점검",
            copy: "파일을 만들기 전 빠진 항목과 위험한 설정을 확인합니다.",
            active: true,
          },
          {
            title: "2. 프로젝트 만들기",
            copy: "설정 파일을 기준으로 Xcode에서 열 파일을 만듭니다.",
          },
          {
            title: "3. Xcode에서 열기",
            copy: "생성된 프로젝트를 열고 Archive로 제출 준비를 이어갑니다.",
          },
        ],
      },
      {
        kind: "text",
        label: "자동 백업 위치",
        value: "앱 폴더 안의 .release-assistant-backups",
      },
    ],
    targets: [
      ["실행 도구", "XcodeGen"],
      ["생성 파일", ".xcodeproj"],
      ["다음 단계", "Archive"],
    ],
    preview: {
      phoneName: "P.O.MFS",
      alertTitle: "프로젝트 생성 전 마지막 점검",
      alertCopy:
        "백업을 만든 뒤 Xcode에서 열 수 있는 프로젝트 파일을 생성합니다.",
      storeRows: [
        ["생성 예정", "P.O.MFS.xcodeproj"],
        ["백업", "자동 생성"],
        ["다음", "Xcode Archive"],
      ],
    },
    checks: [
      {
        status: "ok",
        title: "설정 파일 준비됨",
        copy: "XcodeGen이 읽을 설정 파일이 있습니다.",
      },
      {
        status: "ok",
        title: "GitHub 계정 불필요",
        copy: "로컬 앱 폴더만 있어도 사용할 수 있습니다.",
      },
      {
        status: "warn",
        title: "생성 전 백업 필요",
        copy: "기존 Xcode 프로젝트가 있으면 덮어쓸 수 있으므로 백업이 먼저입니다.",
      },
    ],
    changePreview:
      "실행 전\n+ 현재 앱 폴더 확인\n+ 자동 백업 생성\n+ 변경 예정 목록 표시\n\n실행 후\n+ P.O.MFS.xcodeproj 생성\n+ Xcode에서 열기 버튼 표시",
    actionKey: "generate-project",
  },
];
