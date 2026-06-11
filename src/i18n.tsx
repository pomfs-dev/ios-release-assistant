import { createContext, useContext, useMemo, type ReactNode } from "react";

export type Language = "ko" | "en";

type I18nContextValue = {
  language: Language;
  text: (value?: string | null) => string;
  block: (value?: string | null) => string;
  choose: (ko: string, en: string) => string;
};

const english: Record<string, string> = {
  "앱 출시 전 설정을 대신 정리해주는 쉬운 도우미":
    "A simple assistant for iOS release setup",
  "현재 앱 폴더:": "Current app folder:",
  "로컬 변경 없음": "No local changes",
  "만든 이야기": "About",
  "보기 모드": "View mode",
  "쉬운 설정": "Easy setup",
  "자세히": "Advanced",
  "언어 선택": "Language",
  "한국어": "Korean",
  "영어": "English",

  Start: "Start",
  "앱 폴더를 불러오면 출시 준비 상태를 먼저 읽어드릴게요.":
    "Load an app folder and the assistant will read its release readiness first.",
  "이미 바이브 코딩으로 만든 앱 폴더를 불러오거나, 폴더 연결 전에 출시 답변을 먼저 정리할 수 있습니다. Apple 정보 연결은 선택 사항이며, 연결하지 않아도 기본 설정 도우미는 사용할 수 있습니다.":
    "Load an existing app folder, or answer release questions before connecting a folder. Apple connection is optional; the basic setup assistant works without it.",
  "첫 화면 시안": "First-screen draft",
  "시작 방법 선택": "Choose how to start",
  "앱 폴더나 project.yml 경로를 직접 입력하거나, 이 Mac에서 찾아 선택합니다. project.yml을 선택하면 상위 폴더를 앱 루트로 읽습니다.":
    "Enter an app folder or project.yml path, or choose one on this Mac. If you choose project.yml, its parent folder is treated as the app root.",
  "앱 폴더 또는 project.yml 경로": "App folder or project.yml path",
  "/Users/me/MyApp 또는 /Users/me/MyApp/project.yml":
    "/Users/me/MyApp or /Users/me/MyApp/project.yml",
  "앱 폴더 읽는 중...": "Reading app folder...",
  "Finder에서 앱 폴더 선택": "Choose app folder in Finder",
  "설정 파일 읽는 중...": "Reading settings file...",
  "Finder에서 project.yml 선택": "Choose project.yml in Finder",
  "출시 답변 먼저 작성": "Answer release questions first",
  "파일 업로드가 아니라 로컬 경로 입력 방식입니다. project.yml 경로를 넣으면 그 파일의 상위 폴더를 앱 루트로 읽습니다.":
    "This uses a local path, not file upload. If you enter a project.yml path, its parent folder is read as the app root.",
  "불러온 앱에서 찾은 정보": "Information found in the app",
  "읽는 중": "Reading",
  "읽기 완료": "Read complete",
  "오류": "Error",
  "대기 중": "Waiting",
  "앱 이름": "App name",
  "앱 고유 주소": "Bundle ID",
  "project.yml에서 확인 필요": "Needs project.yml review",
  "Xcode 프로젝트": "Xcode project",
  ".xcodeproj 없음": "No .xcodeproj",
  "Info.plist 확인 필요": "Info.plist needs review",
  "Apple 기능": "Apple capabilities",
  "읽은 기능 없음": "No capabilities found",
  "Entitlements 확인 필요": "Entitlements need review",
  "Apple 로그인, 링크 열기, 알림 사용 중":
    "Apple Sign-In, universal links, and notifications enabled",
  "개인정보 준비": "Privacy readiness",
  "개인정보 처리방침 주소 확인 필요": "Privacy Policy URL needs review",
  "Review & Confirm으로 이동": "Go to Review & Confirm",
  "Apple 정보 연결": "Connect Apple information",
  "선택 사항입니다. App Store Connect API Key로 실제 앱 조회를 확인하고, 제출 항목 점검 단계와 연결합니다.":
    "Optional. Use an App Store Connect API key to verify the real app and connect that evidence to submission checks.",
  "연결 상태": "Connection status",
  "필요한 것": "Required",
  "비밀번호 입력": "Password input",
  "요구하지 않음": "Not required",
  "Apple 정보 연결하기": "Connect Apple information",
  "Apple ID 비밀번호를 입력받지 않습니다. private key는 저장하지 않고 세션 입력 흐름과 이 Mac의 local bridge 메모리에서만 확인합니다.":
    "This tool never asks for an Apple ID password. The private key is not saved and is only used in the current session and this Mac's local bridge memory.",
  "세션 준비됨": "Session ready",
  "입력 확인 필요": "Input needs review",
  "연결 확인 중": "Checking connection",
  "입력 중": "Editing",
  "연결 안 됨": "Not connected",

  "출시 준비 진행률": "Release readiness",
  완료: "Done",
  대기: "Waiting",
  "전체 확인 항목": "All review items",
  "이 단계 확인 항목": "This step's review items",
  닫기: "Close",
  "이 단계에서 확인할 항목이 없습니다.": "There are no review items for this step.",
  "출시 준비 단계": "Release preparation steps",

  "다음 설정": "Next setup",
  "다음으로 이동": "Move next",
  "지금 할 일": "Do now",
  "그 다음 순서": "Next sequence",
  "다음 작업 순서": "Next task order",
  "이 설정이 의미하는 것": "What this setting means",
  "앱 아이콘": "App icon",
  "자세히 보기: 실제 파일에는 이렇게 기록됩니다":
    "Advanced view: how this is written into files",
  "쉬운 질문에 답하면 아래처럼 Xcode용 설정 파일에 안전하게 변환됩니다.":
    "Answers are safely converted into Xcode configuration like this.",
  이전: "Back",
  "질문 건너뛰기": "Skip question",
  "Review & Confirm 열기": "Open Review & Confirm",

  General: "General",
  Signing: "Signing",
  Privacy: "Privacy",
  Capabilities: "Capabilities",
  "App Store Review": "App Store Review",
  Generate: "Generate",
  "앱 기본 정보": "Basic app information",
  "이름, 앱 고유 주소, 버전": "Name, Bundle ID, version",
  "앱의 이름과 고유 ID를 확인할게요.": "Let's confirm the app name and unique ID.",
  "사용자가 보는 앱 이름과 App Store에 등록할 앱의 고유 주소를 정합니다. 한 번 출시하면 바꾸기 어려운 값이라 처음에 안전하게 정하는 것이 중요합니다.":
    "Set the app name users see and the unique app ID registered with App Store. These values are hard to change after release, so they should be checked early.",
  "출시 영향 높음": "High release impact",
  "앱 이름은 홈 화면과 App Store 제품 페이지에서 보입니다. 앱 고유 주소는 사용자에게 직접 보이지 않지만, iPhone과 App Store가 이 앱을 구분하는 내부 ID입니다.":
    "The app name appears on the Home Screen and App Store product page. The Bundle ID is not shown to users, but iPhone and App Store use it as the app's internal ID.",
  "예: com.company.app": "Example: com.company.app",
  "대부분의 새 앱에 적합합니다. App Store에서 범용 앱처럼 보입니다.":
    "Best for most new apps. It appears as a universal app on the App Store.",
  "iPhone 화면만 준비된 앱이면 안전한 선택입니다.":
    "A safe choice when only iPhone screens are ready.",
  "Mac Catalyst 포함": "Include Mac Catalyst",
  "iPad 앱을 Mac에서도 배포할 때 사용합니다.":
    "Use this when distributing the iPad app on Mac too.",
  "앱 고유 주소는 App Store에 앱을 등록할 때 쓰는 ID와 반드시 같아야 합니다. 첫 빌드를 올린 뒤에는 바꾸기 어렵기 때문에 회사나 서비스 이름을 넣은 형식을 추천합니다.":
    "The Bundle ID must match the ID registered in App Store. It is hard to change after the first build upload, so use a company or service-name format.",
  "저장 위치": "Save location",
  "설정 파일": "Settings file",
  "Xcode 탭": "Xcode tab",
  "앱 정보": "App information",
  "앱 고유 주소 설정됨": "Bundle ID is set",
  "App Store에 앱을 등록할 때 입력하는 ID와 맞춰야 합니다.":
    "This must match the ID entered when registering the app on App Store.",
  "버전 1.0 준비됨": "Version 1.0 is ready",
  "처음 출시 버전으로 사용할 수 있습니다.": "This can be used as the first release version.",
  "Privacy Policy URL 필요": "Privacy Policy URL needed",
  "App Store 제출 전에 반드시 입력해야 합니다.": "This must be entered before App Store submission.",
  "Demo account 확인": "Demo account review",
  "로그인이 필요한 앱은 심사용 계정을 준비해야 합니다.":
    "Apps that require login need a review demo account.",

  "서명과 배포": "Signing and distribution",
  "Apple 계정, 배포 준비": "Apple account, distribution readiness",
  "어떤 Apple 계정으로 앱을 배포할까요?": "Which Apple account will distribute the app?",
  "iPhone에 직접 설치하거나 TestFlight, App Store에 올리려면 Apple Developer 계정이 필요합니다. 처음에는 Xcode가 자동으로 관리하는 방식을 추천합니다.":
    "You need an Apple Developer account to install on devices, use TestFlight, or submit to App Store. Xcode automatic management is recommended at first.",
  "실기기 빌드 필수": "Required for device builds",
  "이 설정은 앱을 누가 배포하는지 Apple에 증명하는 단계입니다. 사용자는 직접 인증서 파일을 이해하지 않아도 되도록 자동 설정을 기본으로 둡니다.":
    "This proves to Apple who distributes the app. Automatic signing is the default so users do not need to understand certificate files first.",
  "Apple Developer 계정 상태": "Apple Developer account status",
  "유료 Apple Developer Program 가입 완료": "Paid Apple Developer Program active",
  "아직 가입 전": "Not enrolled yet",
  "다른 사람이 계정을 관리함": "Someone else manages the account",
  "Apple 개발자 팀 ID": "Apple Developer Team ID",
  "Apple 계정": "Apple account",
  "Xcode 자동 관리": "Xcode automatic management",
  "처음 배포하는 사용자에게 가장 안전합니다.": "Safest for first-time distribution.",
  "직접 관리": "Manual management",
  "인증서와 프로필을 아는 사용자만 선택합니다.":
    "Choose only if you understand certificates and profiles.",
  "나중에 연결": "Connect later",
  "지금은 설정만 저장하고 Xcode에서 다시 확인합니다.":
    "Save the setting now and review it again in Xcode.",
  "이 도구는 Apple ID 비밀번호를 묻지 않습니다. Xcode 또는 App Store Connect API Key로만 연결합니다.":
    "This tool does not ask for an Apple ID password. It only connects through Xcode or App Store Connect API keys.",
  "Apple 사이트": "Apple site",
  "이 앱은 Apple 개발자 계정으로 서명됩니다":
    "This app will be signed with an Apple Developer account",
  "TestFlight와 App Store 제출 전에 Apple 팀 ID가 현재 앱과 맞는지 확인합니다.":
    "Before TestFlight and App Store submission, confirm that the Apple Team ID matches the current app.",
  "Apple 팀": "Apple team",
  "서명 방식": "Signing method",
  "배포 대상": "Distribution target",
  "Apple 팀 ID 입력됨": "Apple Team ID entered",
  "현재 설정 파일에 팀 ID가 들어갑니다.": "The Team ID will be written into the settings file.",
  "Apple Developer 가입 확인": "Confirm Apple Developer enrollment",
  "유료 개발자 계정이 아니면 App Store 제출이 불가능합니다.":
    "App Store submission is not possible without a paid developer account.",

  "권한과 개인정보": "Permissions and privacy",
  "권한 문구, 개인정보": "Permission copy, privacy",
  "사용자 권한 팝업에 들어갈 문구를 준비할게요.":
    "Let's prepare the copy shown in permission prompts.",
  "카메라, 마이크, 위치, 사진 같은 민감한 권한은 사용자가 이해할 수 있는 설명 문구가 필요합니다. 이 문구는 iPhone 권한 팝업에 그대로 표시됩니다.":
    "Sensitive permissions such as camera, microphone, location, and photos need user-readable explanations. This copy appears directly in iPhone permission prompts.",
  "심사 리스크": "Review risk",
  "권한 문구가 비어 있거나 실제 사용 목적과 다르면 심사에서 문제가 될 수 있습니다. 개인정보 처리 내용도 App Store 제출 전에 함께 확인해야 합니다.":
    "Missing or inaccurate permission copy can cause review issues. Privacy handling should also be checked before App Store submission.",
  "카메라 권한 문구": "Camera permission copy",
  "프로필 사진을 촬영하기 위해 카메라 접근이 필요합니다.":
    "Camera access is needed to take a profile photo.",
  "사진 보관함 권한 문구": "Photo library permission copy",
  "프로필 이미지를 선택하고 저장하기 위해 사진 접근이 필요합니다.":
    "Photo access is needed to choose and save profile images.",
  "개인정보 처리방침 주소": "Privacy Policy URL",
  필수: "Required",
  "권한 문구는 왜 필요한지를 사용자가 이해할 수 있게 써야 합니다. 막연한 문구는 심사에서 약합니다.":
    "Permission copy should clearly explain why access is needed. Vague wording is weak during review.",
  "앱 정보 파일": "App info file",
  "개인정보": "Privacy",
  "권한 문구": "Permission copy",
  "카메라 · 사진": "Camera · Photos",
  "URL 입력 필요": "URL needed",
  "심사 영향": "Review impact",
  높음: "High",
  "카메라 문구 있음": "Camera copy present",
  "권한 팝업에 표시할 문구가 준비되었습니다.":
    "Copy for the permission prompt is ready.",
  "App Store Connect에 입력할 주소가 필요합니다.":
    "A URL must be entered in App Store Connect.",
  "수집 데이터 확인": "Review collected data",
  "계정, 위치, 연락처 등 수집하는 데이터를 App Store에 표시해야 합니다.":
    "Collected data such as account, location, and contacts must be disclosed on App Store.",

  "Apple 기능을 켤지 선택할게요.": "Choose which Apple capabilities to enable.",
  "푸시 알림, Apple 로그인, 웹사이트 링크를 앱으로 열기 같은 기능을 켤지 선택합니다. 필요한 경우 Apple 계정 쪽 설정도 안내합니다.":
    "Choose capabilities such as push notifications, Sign in with Apple, and opening website links in the app. The assistant also points out Apple account-side setup when needed.",
  "계정 설정 필요": "Account setup required",
  "Apple 기능은 앱이 Apple 서비스를 사용할 수 있게 해주는 권한입니다. 일부 기능은 Xcode 설정만으로 끝나지 않고 Apple 웹사이트에서도 추가 설정이 필요합니다.":
    "Apple capabilities allow the app to use Apple services. Some require Apple Developer website setup in addition to Xcode settings.",
  "Apple 로그인 사용": "Use Sign in with Apple",
  "Apple로 로그인 버튼이 있는 앱이면 켜야 합니다.":
    "Enable this if the app has a Sign in with Apple button.",
  "웹사이트 링크 연결": "Connect website links",
  "웹 링크를 누르면 앱으로 열리게 할 때 사용합니다.":
    "Use this when web links should open in the app.",
  "Push 알림": "Push notifications",
  "서버에서 사용자에게 알림을 보낼 때 필요합니다.":
    "Required when the server sends notifications to users.",
  "앱과 연결할 웹사이트 주소": "Website address connected to the app",
  "Apple 기능은 앱 안의 버튼만 보고 결정하면 안 됩니다. 웹사이트 파일, 서버 알림 인증서, Apple 계정 설정까지 같이 필요한 기능이 있습니다.":
    "Apple capabilities should not be decided only by in-app buttons. Some also need website files, server notification certificates, and Apple account settings.",
  "권한 파일": "Entitlements file",
  "Apple 로그인과 웹 링크 기능이 켜져 있습니다":
    "Sign in with Apple and web link capabilities are enabled",
  "사용자는 Apple 계정으로 로그인하고, 지원되는 웹 링크는 앱으로 열 수 있습니다.":
    "Users can sign in with Apple, and supported web links can open in the app.",
  "추가 확인": "Extra review",
  "Apple 웹사이트 설정": "Apple website setup",
  "선택 전": "Not selected",
  "Apple 로그인 권한 연결됨": "Apple Sign-In entitlement connected",
  "권한 파일에 Apple 로그인 항목이 반영됩니다.":
    "The Sign in with Apple entitlement is reflected in the entitlement file.",
  "웹사이트 파일 확인": "Review website file",
  "Associated Domains는 웹사이트에도 Apple 확인 파일이 필요합니다.":
    "Associated Domains also require an Apple verification file on the website.",

  "App Store 심사": "App Store review",
  "상품 정보, 심사 메모, 데모 계정": "Product info, review notes, demo account",
  "심사자가 앱을 확인할 수 있게 준비할게요.":
    "Prepare what reviewers need to inspect the app.",
  "로그인 앱은 데모 계정, 유료 기능은 설명, 웹뷰 앱은 앱의 네이티브 가치와 개인정보 안내가 필요합니다.":
    "Login apps need a demo account, paid features need explanation, and webview apps need native value and privacy guidance.",
  "제출 전 확인": "Pre-submission review",
  "이 항목들은 앱 파일 안에 저장되지 않는 것도 많지만, App Store 제출 단계에서 빠지면 심사가 늦어지거나 반려될 수 있습니다.":
    "Many of these are not saved inside app files, but missing them during App Store submission can slow review or cause rejection.",
  "App Store에 보일 앱 설명": "App Store description",
  "P.O.MFS 커뮤니티를 위한 콘텐츠와 멤버 경험을 제공합니다.":
    "Provides content and member experiences for the P.O.MFS community.",
  "심사용 데모 계정": "Review demo account",
  "로그인 필요 시": "If login is required",
  "심사 접근 방식": "Review access method",
  "로그인 필요": "Login required",
  "심사자가 앱 기능을 보려면 계정이 필요합니다.":
    "Reviewers need an account to view app features.",
  "로그인 필요 없음": "Login not required",
  "계정 없이도 심사자가 핵심 기능을 확인할 수 있습니다.":
    "Reviewers can inspect core features without an account.",
  "App Store 미디어 자산": "App Store media assets",
  "스크린샷 준비 완료": "Screenshots ready",
  "App Store Connect에 올릴 스크린샷을 최소 1장 준비했습니다.":
    "At least one screenshot is ready for App Store Connect.",
  "iPad 스크린샷 준비 완료": "iPad screenshots ready",
  "iPad도 지원하는 앱이라면 iPad용 스크린샷도 준비했습니다.":
    "If the app supports iPad, iPad screenshots are also ready.",
  "앱 미리보기 영상 준비": "App preview video ready",
  "선택 사항인 앱 미리보기 영상을 준비할 계획입니다.":
    "An optional app preview video is planned.",
  "App Store Connect는 앱스토어 상품 페이지와 심사 제출 공간입니다. Xcode 프로젝트 파일만 만들어서는 출시 준비가 끝나지 않습니다.":
    "App Store Connect is where the App Store product page and review submission live. Creating the Xcode project alone does not complete release preparation.",
  "심사 제출": "Review submission",
  "심사자는 데모 계정으로 앱을 확인합니다": "Reviewers inspect the app with a demo account",
  "로그인이 필요한 앱은 Apple 심사자가 접근할 수 있는 계정을 제공해야 합니다.":
    "Apps that require login must provide an account Apple reviewers can access.",
  "상품 설명": "Product description",
  "초안 있음": "Draft exists",
  스크린샷: "Screenshots",
  "준비 필요": "Needs preparation",
  "데모 계정": "Demo account",
  "입력 필요": "Input needed",
  "앱 설명 초안 있음": "App description draft exists",
  "상품 페이지에 넣을 설명을 다듬을 수 있습니다.":
    "You can refine the description for the product page.",
  "데모 계정 필요": "Demo account needed",
  "로그인 앱이면 심사용 계정을 반드시 입력해야 합니다.":
    "If the app requires login, a review account must be entered.",
  "스크린샷 필요": "Screenshots needed",
  "출시할 기기 크기에 맞는 스크린샷을 준비해야 합니다.":
    "Prepare screenshots for the device sizes you plan to release.",

  "프로젝트 만들기": "Generate project",
  "Xcode에서 열 파일 생성": "Create files for Xcode",
  "이제 Xcode에서 열 프로젝트 파일을 만들 준비가 됐습니다.":
    "The project file is ready to be generated for Xcode.",
  "버튼을 누르면 현재 앱 폴더를 확인하고, Xcode에서 열 수 있는 프로젝트 파일을 만듭니다. 그 다음 무엇이 바뀌었는지 쉬운 말로 보여줍니다.":
    "The button checks the current app folder, creates a project file Xcode can open, and explains what changed in plain language.",
  "최종 단계": "Final step",
  "프로젝트 파일을 만든 뒤에는 Xcode에서 Archive를 만들고 TestFlight 또는 App Store 업로드를 진행합니다.":
    "After creating the project file, create an Archive in Xcode and upload to TestFlight or App Store.",
  "실제 파일 저장과 xcodegen generate는 Review & Confirm에서 백업, 저장 적용, 프로젝트 생성 승인을 각각 받은 뒤 실행합니다.":
    "Actual file writes and xcodegen generate only run after separate approval for backup, save, and project generation in Review & Confirm.",
  "1. 미리 점검": "1. Preflight check",
  "파일을 만들기 전 빠진 항목과 위험한 설정을 확인합니다.":
    "Check missing items and risky settings before creating files.",
  "2. 프로젝트 만들기": "2. Generate project",
  "설정 파일을 기준으로 Xcode에서 열 파일을 만듭니다.":
    "Create files Xcode can open from the settings file.",
  "3. Xcode에서 열기": "3. Open in Xcode",
  "생성된 프로젝트를 열고 Archive로 제출 준비를 이어갑니다.":
    "Open the generated project and continue to Archive.",
  "자동 백업 위치": "Automatic backup location",
  "앱 폴더 안의 .release-assistant-backups": ".release-assistant-backups inside the app folder",
  "실행 도구": "Run tool",
  "생성 파일": "Generated file",
  "다음 단계": "Next step",
  "프로젝트 생성 전 마지막 점검": "Final check before project generation",
  "백업을 만든 뒤 Xcode에서 열 수 있는 프로젝트 파일을 생성합니다.":
    "After creating a backup, generate a project file Xcode can open.",
  "생성 예정": "Will generate",
  백업: "Backup",
  "자동 생성": "Created automatically",
  다음: "Next",
  "설정 파일 준비됨": "Settings file ready",
  "XcodeGen이 읽을 설정 파일이 있습니다.": "There is a settings file XcodeGen can read.",
  "GitHub 계정 불필요": "GitHub account not required",
  "로컬 앱 폴더만 있어도 사용할 수 있습니다.":
    "You can use this with only a local app folder.",
  "생성 전 백업 필요": "Backup required before generation",
  "기존 Xcode 프로젝트가 있으면 덮어쓸 수 있으므로 백업이 먼저입니다.":
    "If an Xcode project already exists, it may be overwritten, so backup comes first.",

  "사용자가 보게 되는 위치": "Where users will see this",
  미리보기: "Preview",
  "심사 준비": "Review readiness",
  "전체 점검": "All checks",
  "단계 점검": "Step checks",
  "스크린샷 선택": "Choose screenshot",
  "확인 완료": "Mark reviewed",
  "변경 준비": "Ready changes",
  확인: "Review",
  막힘: "Blocked",
  준비됨: "Ready",
  "변경 없음": "No change",
  "계획 중": "Planning",
  "계획 준비": "Plan ready",
  "백업 중": "Backing up",
  "백업 완료": "Backup complete",
  "저장 중": "Saving",
  "저장 완료": "Save complete",
  "생성 중": "Generating",
  "생성 완료": "Generation complete",
  "쓰기 계획": "Write plan",
  "저장 전에 변경 목록을 먼저 만듭니다.": "Create the change list before saving.",
  "원본 백업": "Source backup",
  "원본 파일을 앱 폴더 안 백업 위치에 복사합니다.":
    "Copy source files into the backup location inside the app folder.",
  "저장 후 검증": "Post-save verification",
  "재스캔 검증 통과": "Rescan verification passed",
  "재스캔 확인 필요": "Rescan needs review",
  "저장 후 다시 스캔해 바뀐 값을 확인합니다.":
    "Scan again after saving to verify changed values.",
  "기존 Xcode 프로젝트를 백업한 뒤 xcodegen generate를 실행합니다.":
    "Back up the existing Xcode project, then run xcodegen generate.",
  "현재": "Current",
  "예정": "Planned",
  "입력하기": "Enter value",
  "해당 상태의 항목이 없습니다. 다른 숫자 버튼을 누르거나 현재 필터를 해제하세요.":
    "No items have this status. Choose another count button or clear the current filter.",
  "파일에 저장할 변경이 없습니다. 확인 필요 항목을 먼저 입력하거나 수동 처리 항목을 완료하세요.":
    "There are no file changes to save. Fill in review items or complete manual items first.",
  "실제 저장은 write plan 생성, 원본 백업, 저장 후 재스캔 검증 순서로만 진행합니다.":
    "Actual saving only runs in this order: write plan, source backup, post-save rescan verification.",
  "Safe write 진행 순서": "Safe write order",
  통과: "Passed",
  "변경 예정 파일과 값을 확인했습니다.": "I reviewed the files and values that will change.",
  "백업 ID와 저장 대상을 확인했습니다.": "I reviewed the backup ID and write targets.",
  "xcodegen generate 실행과 기존 Xcode 프로젝트 백업을 승인합니다.":
    "I approve running xcodegen generate and backing up the existing Xcode project.",
  "Xcode 프로젝트 생성 완료": "Xcode project generation complete",
  "계획 만드는 중...": "Creating plan...",
  "쓰기 계획 만들기": "Create write plan",
  "백업 만드는 중...": "Creating backup...",
  "백업 만들기": "Create backup",
  "저장 적용 중...": "Applying save...",
  "저장 적용 완료": "Save applied",
  "저장 적용": "Apply save",
  "프로젝트 생성 중...": "Generating project...",
  "프로젝트 생성 완료": "Project generated",
  "Xcode 프로젝트 생성": "Generate Xcode project",

  "App Store Connect": "App Store Connect",
  "앱스토어에 올릴 상품 정보와 심사 정보를 같이 준비합니다.":
    "Prepare product page and review information for App Store together.",
  "Xcode 프로젝트 파일은 앱을 빌드하기 위한 준비이고, App Store Connect 정보는 앱스토어 상품 페이지와 심사 제출을 위한 준비입니다. 이 도구는 둘을 따로 보지 않고 출시 전 체크리스트로 함께 관리합니다.":
    "Xcode project files prepare the app for building; App Store Connect information prepares the product page and review submission. This tool keeps both in one release checklist.",
  "제출 준비": "Submission ready",
  "앱스토어 기본 정보": "App Store basic information",
  "앱 이름, 부제, 앱 고유 주소, 카테고리, 고객지원 주소를 준비합니다.":
    "Prepare app name, subtitle, Bundle ID, category, and support URL.",
  "App Store용 1024x1024 아이콘을 확인했습니다.":
    "Confirmed the 1024x1024 App Store icon.",
  "Xcode asset catalog에 App Store용 1024x1024 아이콘이 들어있는지 확인합니다.":
    "Check that the Xcode asset catalog contains a 1024x1024 App Store icon.",
  "개인정보와 처리방침": "Privacy and policy",
  "개인정보 처리방침 주소를 제출 준비 항목에 연결했습니다.":
    "Connected the Privacy Policy URL to submission readiness.",
  "개인정보 처리방침 주소, 수집하는 데이터 종류, 사용자 선택 안내 주소를 확인합니다.":
    "Review Privacy Policy URL, collected data types, and user choice guidance.",
  "스크린샷과 앱 미리보기": "Screenshots and app previews",
  "App Store Connect에 올릴 스크린샷 준비 상태를 확인했습니다.":
    "Checked screenshot readiness for App Store Connect.",
  "iPhone/iPad 스크린샷, 선택 사항인 앱 미리보기 영상을 제출 형식에 맞게 준비합니다.":
    "Prepare iPhone/iPad screenshots and optional app preview videos in submission format.",
  "심사용 정보": "Review information",
  "심사용 접근 방식과 데모 계정 정보를 준비했습니다.":
    "Prepared review access method and demo account information.",
  "로그인이 필요한 앱이면 심사용 계정, 연락처, 심사자에게 남길 설명을 준비합니다.":
    "For login-required apps, prepare a review account, contact information, and reviewer notes.",
  "가격과 출시 국가": "Pricing and availability",
  "무료/유료 여부, 출시 국가, 예약 주문 여부, 수동 출시 여부를 선택합니다.":
    "Choose free/paid status, release countries, pre-order, and manual release options.",
  "업로드할 빌드 선택": "Select uploaded build",
  "Xcode에서 Archive 후 올린 빌드를 App Store Connect에서 선택해 심사에 제출합니다.":
    "After uploading an Archive from Xcode, select the build in App Store Connect and submit it for review.",
  "Apple 정보 세션 연결": "Connect Apple information session",
  "App Store Connect API Key로 Apple API에 실제 앱 조회 요청을 보냅니다. private key는 파일에 저장하지 않고 연결 확인 후 입력칸에서 비웁니다.":
    "Use an App Store Connect API key to query the real app through Apple APIs. The private key is not written to files and is cleared after connection.",
  ".p8 Private Key": ".p8 Private Key",
  "Apple API 확인 중...": "Checking Apple API...",
  "Apple API로 연결 확인": "Verify with Apple API",
  "제출 항목 입력": "Enter submission items",
  "Apple 정보를 연결하면 App Store Connect의 앱 존재 여부를 확인합니다. 상품 페이지 입력과 심사 제출 값은 Review & Confirm에서 수동 처리 항목으로 분리해 확인합니다.":
    "Connecting Apple information verifies that the app exists in App Store Connect. Product page and review submission values are separated as manual Review & Confirm items.",
  "App Store 제출 항목 열기": "Open App Store submission items",
  "private key 원문은 입력칸에 남기지 않았습니다.":
    "The raw private key was cleared from the input field.",
  "준비 전": "Not ready",

  "현재 답변을 저장하고 다음 출시 준비 질문으로 이동합니다.":
    "Save the current answers and move to the next release question.",
  "질문 하나가 끝날 때마다 오른쪽 미리보기와 출시 준비 체크리스트가 같이 업데이트됩니다.":
    "After each question, the right-side preview and release checklist update together.",
  "질문 이동": "Question navigation",
  "다음에 보일 것": "What comes next",
  "현재 단계 다음에는 Apple 배포 계정, 권한 문구, 개인정보, App Store 제출 항목을 순서대로 확인합니다.":
    "After this step, the assistant reviews Apple distribution account, permission copy, privacy, and App Store submission items in order.",
  "현재 답변 저장": "Save current answers",
  "앱 이름과 앱 고유 주소를 설정 파일에 반영할 준비를 합니다.":
    "Prepare to reflect app name and Bundle ID in the settings file.",
  "위험도 확인": "Review risk",
  "나중에 바꾸기 어려운 값인지 알려줍니다.": "Shows whether a value will be hard to change later.",
  "다음 질문 표시": "Show next question",
  "Apple 계정과 배포 준비 단계로 이동합니다.":
    "Move to Apple account and distribution readiness.",
  "저장 예정": "Will save",
  "앱 이름, 앱 고유 주소": "App name, Bundle ID",
  "배포 계정": "Distribution account",
  "진행률": "Progress",
  "다음 단계로 이동": "Move to next step",
  "답변은 즉시 파일에 쓰지 않고 Review & Confirm의 변경 목록에 모아 백업 승인 뒤 적용합니다.":
    "Answers are not written immediately. They are collected in Review & Confirm and applied after backup approval.",

  "앱 폴더 불러오기": "Load app folder",
  "앱 폴더를 선택하면 필요한 파일을 자동으로 찾습니다.":
    "Choose an app folder and the assistant automatically finds required files.",
  "사용자는 앱 폴더만 고르면 됩니다. 도구가 설정 파일, 앱 정보 파일, Apple 기능 권한 파일, 아이콘 폴더를 찾아서 현재 상태를 읽습니다.":
    "You only need to choose the app folder. The tool finds settings files, app info, Apple entitlements, and icon folders to read the current state.",
  "파일 선택": "File selection",
  "사용자가 해야 할 일": "What the user should do",
  "이 Mac에서 앱 폴더나 project.yml을 한 번 선택합니다. GitHub 계정이나 Apple 계정 연결은 필요하지 않습니다.":
    "Choose the app folder or project.yml once on this Mac. A GitHub account or Apple account connection is not required.",
  "폴더 선택창 열기": "Open folder picker",
  "예: MyVibeApp 폴더를 선택합니다.": "For example, choose the MyVibeApp folder.",
  "앱 정보 읽기": "Read app information",
  "앱 이름, 앱 고유 주소, 버전, 권한 문구를 찾아옵니다.":
    "Find app name, Bundle ID, version, and permission copy.",
  "부족한 항목 표시": "Show missing items",
  "출시 전에 채워야 하는 항목을 쉬운 체크리스트로 보여줍니다.":
    "Shows items to fill before release as an easy checklist.",
  "찾은 앱 이름": "Found app name",
  "찾은 앱 고유 주소": "Found Bundle ID",
  "확인 필요": "Needs review",
  "Finder 선택창이나 직접 경로 입력으로 앱 폴더 안의 설정 파일을 읽습니다.":
    "Read settings files inside the app folder through Finder or direct path input.",
  "앱 폴더 경로 확인": "Check app folder path",

  "설정 파일 불러오기": "Load settings file",
  "project.yml 파일만 선택해도 앱 루트를 찾아서 읽습니다.":
    "Choose only project.yml and the assistant will find and read the app root.",
  "업로드가 아니라 로컬 project.yml 또는 project.yaml 파일 경로를 입력합니다. 도구가 그 파일의 상위 폴더를 앱 루트로 보고 Info.plist와 Entitlements까지 함께 확인합니다.":
    "Enter a local project.yml or project.yaml path, not an upload. The parent folder becomes the app root and Info.plist and Entitlements are checked too.",
  "경로 입력": "Path input",
  "왼쪽 경로 입력칸에 project.yml 또는 project.yaml 파일 경로를 넣고 설정 파일 읽기를 누릅니다.":
    "Enter a project.yml or project.yaml path in the left path field and read the settings file.",
  "project.yml 경로 입력": "Enter project.yml path",
  "예: /Users/me/MyVibeApp/project.yml 파일 경로를 입력합니다.":
    "For example, enter /Users/me/MyVibeApp/project.yml.",
  "앱 루트 계산": "Resolve app root",
  "선택한 설정 파일의 상위 폴더를 앱 폴더로 사용합니다.":
    "Use the selected settings file's parent folder as the app folder.",
  "연결 파일 스캔": "Scan connected files",
  "Info.plist, Entitlements, Xcode project 존재 여부까지 함께 읽습니다.":
    "Also read whether Info.plist, Entitlements, and Xcode project exist.",
  "상태": "Status",
  "수정 가능": "Editable",
  "project.yml 파일 경로만 입력해도 이후 Review & Confirm과 백업 저장 흐름은 같은 안전 게이트를 사용합니다.":
    "Even if you enter only a project.yml path, Review & Confirm and backup-safe write use the same safety gate.",
  "project.yml 경로로 읽기": "Read project.yml path",

  "폴더 연결 전에 앱 이름과 고유 주소 답변을 먼저 입력합니다.":
    "Enter app name and Bundle ID answers before connecting a folder.",
  "기존 폴더를 선택하지 않은 사용자도 앱 이름, bundle id, Apple 팀, 권한 문구를 먼저 정리할 수 있습니다. 파일 저장은 앱 폴더와 Review & Confirm을 거친 뒤에만 진행합니다.":
    "Users who have not selected an existing folder can still prepare app name, Bundle ID, Apple team, and permission copy first. Files are saved only after app folder scan and Review & Confirm.",
  "답변 준비": "Answer preparation",
  "다음 입력": "Next input",
  "기본 정보 단계로 이동해 앱 이름과 앱 고유 주소를 입력합니다. 이후 기존 앱 폴더를 연결하면 답변이 변경 계획에 반영됩니다.":
    "Move to Basic Information and enter app name and Bundle ID. When an app folder is connected later, the answers are reflected in the change plan.",
  "기본값 채우기": "Fill defaults",
  "앱 이름과 bundle id 입력칸으로 바로 이동합니다.":
    "Jump directly to app name and Bundle ID fields.",
  "출시 질문 이어가기": "Continue release questions",
  "서명, 권한 문구, App Store 제출 정보를 순서대로 작성합니다.":
    "Fill signing, permission copy, and App Store submission information in order.",
  "폴더 연결 후 저장": "Save after connecting folder",
  "실제 파일 쓰기는 앱 폴더 스캔과 백업 승인 뒤에만 가능합니다.":
    "Actual file writes are only possible after app folder scan and backup approval.",
  "지원 기기": "Supported devices",
  "iPhone + iPad": "iPhone + iPad",
  "파일 생성": "File generation",
  "폴더 연결 후 승인": "Approve after connecting folder",
  "이 흐름은 새 프로젝트를 즉시 생성하지 않습니다. 백업 가능한 앱 폴더가 확인된 뒤에만 파일 저장과 generate를 실행합니다.":
    "This flow does not generate a new project immediately. File save and generate only run after a backup-capable app folder is verified.",
  "앱 이름 입력하기": "Enter app name",

  "App Store Connect API Key를 세션 전용으로 입력합니다.":
    "Enter an App Store Connect API key for this session only.",
  "Issuer ID, Key ID, private key 내용을 세션에서만 받아 Apple API 연결을 확인합니다. 입력값은 파일에 저장하지 않고, 화면 로그에도 남기지 않습니다.":
    "Issuer ID, Key ID, and private key text are used only in the session to verify Apple API connection. Inputs are not saved to files or shown in screen logs.",
  "세션 연결": "Session connection",
  "입력할 정보": "Information to enter",
  "App Store Connect에서 발급한 Issuer ID, Key ID, .p8 private key, 그리고 확인할 앱 ID 또는 bundle id를 입력합니다.":
    "Enter Issuer ID, Key ID, .p8 private key, and the app ID or Bundle ID to verify.",
  "API Key 입력": "Enter API key",
  "Apple ID 비밀번호가 아니라 App Store Connect API Key만 사용합니다.":
    "Use only an App Store Connect API key, not an Apple ID password.",
  "세션 준비": "Prepare session",
  "private key 원문은 연결 준비 후 입력칸에서 비웁니다.":
    "The raw private key is cleared from the field after connection preparation.",
  "앱 조회 확인": "Verify app lookup",
  "Apple API에서 앱 이름과 Bundle ID를 확인합니다.":
    "Confirm app name and Bundle ID through Apple APIs.",
  "필요 없음": "Not needed",
  "가져올 정보": "Information to fetch",
  "앱 이름, 앱 ID, 빌드": "App name, app ID, builds",
  "연결 방식": "Connection method",
  "공식 API Key": "Official API key",
  "연결 버튼은 App Store Connect API로 앱 조회까지 확인합니다. 상품 페이지 값은 Review & Confirm에서 수동 처리 항목으로 분리합니다.":
    "The connection button verifies app lookup through App Store Connect APIs. Product page values are separated as manual Review & Confirm items.",
  "API Key 입력하기": "Enter API key",

  "App Store 제출 항목": "App Store submission items",
  "앱스토어 상품 페이지와 심사 제출에 필요한 정보를 작성합니다.":
    "Fill in information needed for the App Store product page and review submission.",
  "Xcode 프로젝트 설정과 별도로, App Store에 보일 앱 설명, 앱 아이콘, 스크린샷, 개인정보 처리방침, 심사용 계정도 준비해야 합니다.":
    "Separate from Xcode project settings, prepare App Store description, app icon, screenshots, Privacy Policy, and review account.",
  "여기에 저장되는 정보": "Information prepared here",
  "일부는 앱 파일이 아니라 App Store Connect에 직접 입력해야 합니다. 이 도구는 빠진 항목을 체크하고 복사 가능한 형태로 정리합니다.":
    "Some information must be entered directly in App Store Connect, not app files. This tool checks missing items and organizes them in copyable form.",
  "상품 페이지 정보": "Product page information",
  "앱 이름, 부제, 설명, 키워드, 카테고리, 고객지원 주소를 준비합니다.":
    "Prepare app name, subtitle, description, keywords, category, and support URL.",
  "미디어 자산": "Media assets",
  "앱 아이콘과 App Store Connect에 올릴 스크린샷을 확인합니다.":
    "Review app icon and screenshots for App Store Connect.",
  "개인정보 정보": "Privacy information",
  "개인정보 처리방침 주소와 수집 데이터 종류를 확인합니다.":
    "Review Privacy Policy URL and collected data types.",
  "데모 계정, 리뷰 메모, 연락처, 가격과 출시 국가를 정리합니다.":
    "Prepare demo account, review notes, contact details, pricing, and availability.",
  "빌드 포함": "Included in build",
  "필수 가능": "May be required",
  "로그인 앱": "Login app",
  "App Store Connect API 연결 시 앱 조회가 가능하며, 상품 페이지 입력 값은 Review & Confirm에서 수동 처리 항목으로 확인합니다.":
    "With App Store Connect API connection, app lookup is available and product page values are reviewed as manual items in Review & Confirm.",
  "심사 항목 입력": "Enter review items",

  "미리 점검": "Preflight",
  "프로젝트를 만들기 전에 위험한 부분을 먼저 확인합니다.":
    "Review risky parts before creating the project.",
  "파일을 만들기 전에 부족한 항목과 바뀔 내용을 먼저 보여줍니다. Git을 몰라도 자동 백업 안내를 제공합니다.":
    "Before files are created, the assistant shows missing items and planned changes. It provides automatic backup guidance even if you do not know Git.",
  "안전 점검": "Safety check",
  "검사 항목": "Checks",
  "필수 값 누락, 권한 문구 누락, Apple 정보 불일치, App Store 제출 항목 누락을 확인합니다.":
    "Check missing required values, permission copy, Apple information mismatches, and App Store submission gaps.",
  "현재 폴더 확인": "Check current folder",
  "앱 폴더와 기존 파일이 있는지 확인합니다.": "Check whether app folder and existing files are present.",
  "출시 필수 항목 검사": "Check release-required items",
  "앱 고유 주소, 버전, 권한 문구, 개인정보 항목을 검사합니다.":
    "Check Bundle ID, version, permission copy, and privacy items.",
  "바뀔 내용 미리보기": "Preview planned changes",
  "프로젝트 만들기 전에 변경 목록을 쉬운 말로 보여줍니다.":
    "Show the change list in plain language before project generation.",
  "결과": "Result",
  "2개 확인 필요": "2 checks needed",
  "파일 변경": "File changes",
  "계획 전": "Before plan",
  "미리 점검을 통과하거나 사용자가 수동 확인을 완료한 뒤에만 저장과 프로젝트 생성을 실행합니다.":
    "Saving and project generation only run after preflight passes or manual checks are completed.",

  "저장하거나 실행하기 전에 변경 예정 목록을 먼저 확인합니다.":
    "Review planned changes before saving or running commands.",
  "이 단계는 데모 미리보기가 아니라 실제 파일 저장, App Store Connect 제출 준비, 로컬 명령 실행 전에 필요한 안전 게이트입니다.":
    "This is not a demo preview. It is a safety gate before file writes, App Store Connect preparation, and local command execution.",
  "승인 게이트": "Approval gate",
  "오른쪽에서 확인할 것": "What to check on the right",
  "파일 변경, App Store Connect에 쓸 항목, 백업과 xcodegen 실행 순서를 나눠서 확인합니다.":
    "Review file changes, App Store Connect items, backup, and xcodegen execution as separate steps.",
  "파일 변경 확인": "Review file changes",
  "project.yml, Info.plist, Entitlements에 들어갈 값을 봅니다.":
    "Review values going into project.yml, Info.plist, and Entitlements.",
  "제출 준비 확인": "Review submission readiness",
  "App Store Connect에서 처리할 항목과 파일 변경 항목을 나눕니다.":
    "Separate App Store Connect tasks from file changes.",
  "명령 실행 승인": "Approve command execution",
  "백업, 저장, xcodegen generate는 별도 승인 뒤에만 실행합니다.":
    "Backup, save, and xcodegen generate run only after separate approvals.",
  "ASC 항목": "ASC items",
  "승인 전": "Before approval",
  "쓰기 계획을 만든 뒤 체크박스로 백업, 저장 적용, xcodegen generate를 각각 승인해 실행합니다.":
    "After creating a write plan, approve backup, save, and xcodegen generate separately with checkboxes.",

  "Xcode 프로젝트 만들기": "Generate Xcode project",
  "Xcode에서 열 수 있는 프로젝트 파일을 만듭니다.":
    "Create a project file that Xcode can open.",
  "마지막 단계입니다. 먼저 백업을 만들고, 설정 파일을 저장한 뒤, XcodeGen으로 Xcode 프로젝트 파일을 생성합니다.":
    "This is the final step. First create a backup, save the settings file, then generate the Xcode project with XcodeGen.",
  "실행 단계": "Execution step",
  "실행 후 보여줄 것": "What is shown after running",
  "성공 여부, 바뀐 파일, 다음에 Xcode에서 눌러야 할 메뉴를 단계별로 안내합니다.":
    "Shows success state, changed files, and the next Xcode menus step by step.",
  "자동 백업 만들기": "Create automatic backup",
  "문제가 생기면 이전 상태로 돌아갈 수 있게 합니다.":
    "Allows you to return to the previous state if something goes wrong.",
  "다음 안내 표시": "Show next guidance",
  "Xcode 열기, Archive 만들기, App Store 업로드 순서를 보여줍니다.":
    "Shows the order: open Xcode, create Archive, upload to App Store.",
  "다음 버튼": "Next button",
  "Xcode에서 열기": "Open in Xcode",
  "성공 화면 표시": "Show success screen",
  "xcodegen generate는 이 Mac의 local bridge에서 실행됩니다. 실행 전 기존 Xcode 프로젝트와 workspace를 백업합니다.":
    "xcodegen generate runs through this Mac's local bridge. Existing Xcode projects and workspaces are backed up before running.",
  "Review & Confirm으로 돌아가기": "Return to Review & Confirm",

  "쓰기 계획을 만들고 있습니다.": "Creating the write plan.",
  "현재 입력값과 스캔 결과를 비교해 실제로 바뀔 파일 목록을 계산하는 중입니다.":
    "Comparing current answers and scan results to calculate which files will actually change.",
  "쓰기 계획 생성 중": "Creating write plan",
  "project.yml, Info.plist, Entitlements 변경 후보를 계산합니다.":
    "Calculating candidate changes for project.yml, Info.plist, and Entitlements.",
  "변경 목록 확인": "Review change list",
  "계획이 준비되면 파일 작업 수와 대상 파일을 보여줍니다.":
    "When the plan is ready, file operation counts and target files are shown.",
  "승인 후 실행": "Run after approval",
  "백업, 저장 적용, xcodegen generate는 각각 승인 뒤 실행합니다.":
    "Backup, save apply, and xcodegen generate each run after approval.",
  "계산 중": "Calculating",
  "계획 결과 확인": "Review plan result",
  "잠시만 기다려 주세요. 완료되면 Backup + Safe Write 영역으로 이동합니다.":
    "Please wait. When complete, the page moves to Backup + Safe Write.",
  "쓰기 계획이 준비됐습니다.": "The write plan is ready.",
  "이제 변경 예정 파일을 확인하고, 백업과 저장 적용을 각각 승인할 수 있습니다.":
    "You can now review planned file changes and approve backup and save separately.",
  "파일 작업": "File operations",
  "백업 승인": "Backup approval",
  "프로젝트 생성 승인": "Project generation approval",
  "파일 변경이 있으면 원본 백업을 먼저 만듭니다.":
    "If files will change, create a source backup first.",
  "저장 또는 생성 실행": "Run save or generation",
  "저장 적용과 xcodegen generate를 별도 승인 후 실행합니다.":
    "Save apply and xcodegen generate run after separate approvals.",
  "아래 또는 오른쪽의 Backup + Safe Write에서 체크박스를 확인한 뒤 다음 실행 버튼을 누릅니다.":
    "In Backup + Safe Write below or on the right, check the boxes, then press the next run button.",
  "승인 단계 보기": "View approval steps",
  "쓰기 계획을 만들지 못했습니다.": "Could not create the write plan.",
  "local bridge 요청이 실패했습니다. 다시 시도해 주세요.":
    "The local bridge request failed. Please try again.",
  "오류 확인": "Review error",
  "Backup + Safe Write 영역에 표시된 오류를 확인합니다.":
    "Review the error shown in Backup + Safe Write.",
  "입력값 확인": "Review inputs",
  "앱 폴더 경로와 현재 질문 값을 확인합니다.":
    "Check the app folder path and current question values.",
  "다시 시도": "Try again",
  "문제가 정리되면 쓰기 계획을 다시 만듭니다.":
    "After resolving the issue, create the write plan again.",
  실패: "Failed",
  "오류가 계속되면 앱 폴더를 다시 읽은 뒤 Review & Confirm을 다시 열어 주세요.":
    "If the error continues, rescan the app folder and reopen Review & Confirm.",
  "앱 폴더 읽는 중": "Reading app folder",
  "입력한 경로에서 출시 준비 파일을 읽고 있습니다.":
    "Reading release preparation files from the entered path.",
  "project.yml, Info.plist, Entitlements와 Xcode 프로젝트 파일을 찾은 뒤 다음 확인 항목을 보여드립니다.":
    "Finding project.yml, Info.plist, Entitlements, and Xcode project files, then showing the next review items.",
  "앱 정보 읽는 중": "Reading app information",
  "경로 안의 설정 파일과 앱 정보 파일을 확인합니다.":
    "Checking settings and app information files in the path.",
  "결과 정리": "Organize results",
  "찾은 값과 확인이 필요한 항목을 나눕니다.":
    "Separate found values and items that need review.",
  "다음 확인 항목 안내": "Guide next review item",
  "사용자가 바로 처리할 수 있는 질문으로 이동합니다.":
    "Move to a question the user can handle immediately.",
  대상: "Target",
  "앱 폴더": "App folder",
  "확인 항목 표시": "Show review items",
  "스캔이 끝나면 다음 버튼이 확인 항목 이동으로 바뀝니다.":
    "When scanning finishes, the next button changes to review item navigation.",
  "앱 폴더 읽기 완료": "App folder read complete",
  "앱 정보를 읽었습니다. 이제 확인이 필요한 항목으로 이동합니다.":
    "App information was read. Move to items that need review.",
  "앱 정보를 읽었습니다. 변경 전에 Review & Confirm으로 이동합니다.":
    "App information was read. Move to Review & Confirm before changes.",
  "기본 점검이 통과했습니다. 파일을 저장하기 전 변경 예정 목록과 백업 단계를 확인합니다.":
    "Basic checks passed. Review planned changes and backup before saving files.",
  "다음 액션": "Next action",
  "다음에 할 일": "What to do next",
  "Review & Confirm에서 파일 변경, 백업, 실행 계획을 확인합니다.":
    "Review file changes, backups, and execution plan in Review & Confirm.",
  "저장 전 변경 예정 목록과 백업 순서를 확인합니다.":
    "Review planned changes and backup order before saving.",
  "질문에 답하기": "Answer question",
  "필요한 입력칸으로 바로 이동해 값을 채우거나 확인합니다.":
    "Jump to the required field to fill or review the value.",
  "변경 확인": "Review changes",
  "모든 확인 항목을 처리한 뒤 쓰기 계획과 백업을 검토합니다.":
    "After resolving review items, review the write plan and backup.",
  "읽은 앱": "Read app",
  "다음 위치": "Next location",
  "스캔은 완료됐습니다. 이제 다음 확인 항목으로 이동해 실제 출시 준비 값을 채웁니다.":
    "Scan is complete. Move to the next review item and fill in real release values.",
  "다음 확인 항목으로 이동": "Move to next review item",
  "이 경로로 앱 읽기": "Read app from this path",
  "입력한 경로에서 project.yml, Info.plist, Entitlements를 읽습니다.":
    "Read project.yml, Info.plist, and Entitlements from the entered path.",
  "앱 정보 정리": "Organize app information",
  "찾은 앱 이름, 앱 고유 주소, Xcode 프로젝트 상태를 표시합니다.":
    "Show found app name, Bundle ID, and Xcode project status.",
  "부족한 항목이 있으면 바로 처리할 질문으로 연결합니다.":
    "If anything is missing, connect it to a question the user can handle.",
  "경로를 입력했으면 이 버튼으로 앱 폴더 스캔을 시작합니다.":
    "If a path is entered, this button starts scanning the app folder.",
  "먼저 왼쪽 Start 카드에 앱 폴더 또는 project.yml 경로를 입력합니다.":
    "First enter an app folder or project.yml path in the Start card on the left.",
  "앱 폴더 경로 입력": "Enter app folder path",
  "선택이 취소됐습니다.": "Selection was canceled.",
  "Finder 선택창을 열지 못했습니다.": "Could not open the Finder picker.",
  "앱 폴더를 읽지 못했습니다.": "Could not read the app folder.",
  "project.yml 또는 project.yaml 파일의 전체 경로를 입력한 뒤 다시 눌러주세요. 업로드가 아니라 로컬 파일 경로를 읽습니다.":
    "Enter the full path to project.yml or project.yaml, then try again. This reads a local file path; it is not an upload.",
  "전체 앱 폴더 경로를 입력칸에 붙여넣고 Enter를 눌러주세요.":
    "Paste the full app folder path into the input field and press Enter.",
  "project.yml 전체 경로를 입력칸에 붙여넣고 Enter를 눌러주세요.":
    "Paste the full project.yml path into the input field and press Enter.",
  "App Store에 사용할 실제 스크린샷 파일을 선택하거나, 수동으로 준비 완료를 표시해주세요.":
    "Choose the actual screenshot file for App Store, or manually mark screenshots as ready.",
  "App Store Connect 연결에 실패했습니다.": "Could not connect to App Store Connect.",
  "먼저 앱 폴더를 스캔해야 쓰기 계획을 만들 수 있습니다.":
    "Scan the app folder before creating a write plan.",
  "백업을 만들지 못했습니다.": "Could not create the backup.",
  "저장 후 재검증에서 일부 값이 맞지 않았습니다.":
    "Some values did not match during post-save verification.",
  "저장 적용에 실패했습니다.": "Could not apply the save.",
  "Xcode 프로젝트 생성에 실패했습니다.": "Could not generate the Xcode project.",

  "이 도구를 만드는 이유": "Why this tool exists",
  "누구를 위한 것인가요?": "Who is it for?",
  "어떻게 동작하나요?": "How does it work?",
  라이선스: "License",
  "MIT License로 공개합니다. 이 도구는 Apple 공식 도구가 아닙니다.":
    "Published under the MIT License. This is not an official Apple tool.",
};

const exactPrefixes: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
  [/^(\d+)% 완료$/, (match) => `${match[1]}% complete`],
  [/^(\d+)개 확인 필요$/, (match) => `${match[1]} checks needed`],
  [/^(\d+)개 확인$/, (match) => `${match[1]} checks`],
  [/^(\d+)개$/, (match) => `${match[1]}`],
  [/^(\d+)개 확인 항목 보기$/, (match) => `View ${match[1]} review items`],
  [/^(\d+)개 파일 작업$/, (match) => `${match[1]} file operations`],
  [/^(\d+)개 값$/, (match) => `${match[1]} values`],
  [/^(\d+)장 찾음$/, (match) => `${match[1]} screenshots found`],
  [/^(.+) · (\d+)개 권한 문구$/, (match) => `${match[1]} · ${match[2]} permission strings`],
  [/^(.+)에서 (\d+)개 확인 항목을 찾았습니다\. 버튼을 누르면 가장 먼저 처리할 질문으로 이동합니다\.$/, (match) => `Found ${match[2]} review items in ${match[1]}. Press the button to move to the first question to handle.`],
  [/^(.+) 항목을 먼저 확인합니다\.$/, (match) => `Review ${match[1]} first.`],
  [/^(\d+)개 파일 작업을 Backup \+ Safe Write 영역에서 확인합니다\.$/, (match) => `Review ${match[1]} file operations in Backup + Safe Write.`],
  [/^권한 문구 (\d+)개 읽음$/, (match) => `${match[1]} permission strings found`],
  [/^Apple 기능 (\d+)개 읽음$/, (match) => `${match[1]} Apple capabilities found`],
  [/^(.+) 파일에서 권한 문구를 읽었습니다\. 개인정보 처리방침 URL은 App Store Connect에 별도로 입력해야 합니다\.$/, (match) => `${match[1]} was scanned for permission text. The Privacy Policy URL still needs to be entered in App Store Connect.`],
  [/^(.+) 파일에서 Apple 기능 권한을 읽었습니다\. 일부 기능은 Apple Developer 사이트 설정도 함께 필요합니다\.$/, (match) => `${match[1]} was scanned for Apple capabilities. Some capabilities also require Apple Developer website setup.`],
  [/^(.+)에서 App Store용 1024x1024 아이콘을 찾았습니다\.$/, (match) => `Found a 1024x1024 App Store icon in ${match[1]}.`],
  [/^(.+)에서 App Store용 1024x1024 아이콘을 확인했습니다\.$/, (match) => `Confirmed a 1024x1024 App Store icon in ${match[1]}.`],
  [/^(.+)은 찾았지만 App Store용 1024x1024 아이콘을 확인해야 합니다\.$/, (match) => `${match[1]} was found, but the 1024x1024 App Store icon still needs review.`],
  [/^App Store Connect API로 (.+) 정보를 확인했습니다\.$/, (match) => `Verified ${match[1]} through the App Store Connect API.`],
];

const lineReplacements: Array<[string, string]> = [
  ["설정 파일", "Settings file"],
  ["앱 정보 파일", "App info file"],
  ["Apple 기능 권한 파일", "Apple capabilities file"],
  ["실행 전", "Before running"],
  ["실행 후", "After running"],
  ["읽은 설정", "Scanned settings"],
  ["현재 앱 폴더 확인", "Confirm current app folder"],
  ["자동 백업 생성", "Create automatic backup"],
  ["변경 예정 목록 표시", "Show planned changes"],
  ["Xcode에서 열기 버튼 표시", "Show Open in Xcode button"],
  ["개인정보 처리방침 URL 필요", "Privacy Policy URL needed"],
  ["Identifier 기능 확인 필요", "Identifier capabilities need review"],
  ["Archive 후 업로드할 빌드 선택", "Select uploaded build after Archive"],
  ["심사용 데모 계정 필요", "Review demo account needed"],
  ["스크린샷 필요", "Screenshots needed"],
  ["앱 설명 초안", "App description draft"],
  ["권한 문구 확인 필요", "Permission text needs review"],
  ["확인 필요", "Needs review"],
  ["없음", "None"],
];

export function chooseText(language: Language, ko: string, en: string) {
  return language === "en" ? en : ko;
}

export function translateText(language: Language, value?: string | null) {
  if (!value) return "";
  if (language === "ko") return value;

  const exact = english[value];
  if (exact) return exact;

  for (const [pattern, replacement] of exactPrefixes) {
    const match = value.match(pattern);
    if (match) return replacement(match);
  }

  return value;
}

export function translateBlock(language: Language, value?: string | null) {
  if (!value) return "";
  if (language === "ko") return value;

  return value
    .split("\n")
    .map((line) => {
      const exact = translateText(language, line);
      if (exact !== line) return exact;

      let nextLine = line;
      for (const [from, to] of lineReplacements) {
        nextLine = nextLine.replaceAll(from, to);
      }
      nextLine = nextLine
        .replaceAll("앱 이름", "App name")
        .replaceAll("앱 고유 주소", "Bundle ID")
        .replaceAll("Xcode 프로젝트", "Xcode project")
        .replaceAll("파일:", "File:")
        .replaceAll("자동 백업", "Automatic backup")
        .replaceAll("후보", "candidates")
        .replaceAll("최소 1장, 최대 10장", "minimum 1, maximum 10")
        .replaceAll("앱 미리보기 영상: 선택 사항", "App preview video: optional")
        .replaceAll("심사용 데모 계정 필요 여부 확인", "Review whether a demo account is needed");

      return nextLine;
    })
    .join("\n");
}

const I18nContext = createContext<I18nContextValue>({
  language: "ko",
  text: (value) => value ?? "",
  block: (value) => value ?? "",
  choose: (ko) => ko,
});

export function I18nProvider({
  children,
  language,
}: {
  children: ReactNode;
  language: Language;
}) {
  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      text: (input) => translateText(language, input),
      block: (input) => translateBlock(language, input),
      choose: (ko, en) => chooseText(language, ko, en),
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
