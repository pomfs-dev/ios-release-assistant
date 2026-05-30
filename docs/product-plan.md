# iOS Release Assistant Product Plan

## 한 줄 정의

iOS Release Assistant는 Xcode를 처음 쓰는 사용자가 바이브 코딩으로 만든 iOS 앱을 App Store 제출 준비 상태까지 가져갈 수 있도록 돕는 웹 UI 기반 설정 도우미입니다.

## 확정된 결정 사항

1. 프로젝트 이름은 `iOS Release Assistant`로 확정합니다.
2. 첫 버전부터 특정 앱 전용이 아니라 범용 iOS 앱 도구로 만듭니다.
3. 사용 방식은 두 가지로 제공합니다.
   - 로컬 설치판: 오픈소스로 내려받아 설치하면 사용자의 Mac에서 앱 폴더를 읽고 `xcodegen generate`까지 실행할 수 있습니다.
   - 온라인판: 누구나 웹에서 접근해 설정 도우미, 문서화, `project.yml` 작성, App Store Connect 점검을 사용할 수 있게 합니다.
4. App Store Connect API 연결은 MVP에 포함합니다.
5. 오픈소스 라이선스는 MIT License로 확정합니다.
6. 초기 개발은 POMFS iOS 앱 저장소 안의 `ios-release-assistant/` 폴더에서 진행합니다.
7. 공개 배포는 별도 GitHub 저장소 `ios-release-assistant`를 만들어 저장합니다.

## 왜 만드는가

앱을 만드는 진입 장벽은 낮아졌지만, iOS 앱을 실제로 출시하려면 Xcode의 General, Signing & Capabilities, Info, Build Settings, Build Phases, App Store Connect 제출 정보까지 이해해야 합니다. 이 영역은 초보자에게 낯선 용어가 많고, 어떤 값이 앱 화면, iPhone 권한 팝업, App Store 상품 페이지, 심사 제출 정보 중 어디에 영향을 주는지 직관적으로 알기 어렵습니다.

이 도구의 목적은 Xcode 설정 이름을 먼저 보여주는 것이 아니라, 사용자가 이해할 수 있는 질문으로 바꾸는 것입니다. 사용자는 “앱 이름이 무엇인가요?”, “카메라를 왜 쓰나요?”, “로그인이 필요한 앱인가요?” 같은 질문에 답하고, 도구는 그 답을 `project.yml`, 앱 정보 파일, 권한 파일, App Store 제출 체크리스트로 연결합니다.

## 누구를 위한 도구인가

주 사용자는 개발 언어를 모르거나 Xcode를 거의 사용해본 적이 없는 앱 제작자입니다. 특히 AI 도구나 바이브 코딩으로 앱을 만들었지만, 출시 직전에 Xcode 프로젝트 설정과 App Store 제출 준비에서 막히는 사용자를 대상으로 합니다.

보조 사용자는 초보자를 도와주는 지인, 외주 개발자, 오픈소스 기여자입니다. 이들은 고급 모드에서 실제 XcodeGen 설정 이름, 파일 경로, 변경 diff를 확인하고 검토할 수 있어야 합니다.

## 제품 원칙

1. 초보자에게는 전문 용어보다 실제 의미를 먼저 보여줍니다.
2. 파일을 바꾸기 전에는 항상 미리 점검과 변경 미리보기를 제공합니다.
3. GitHub 계정이나 원격 저장소가 없어도 사용할 수 있어야 합니다.
4. Apple ID 비밀번호를 직접 받지 않습니다.
5. Xcode와 App Store Connect에서 실제로 필요한 항목을 분리해서 설명합니다.
6. 고급 사용자는 실제 파일명, 설정명, diff를 확인할 수 있어야 합니다.
7. 실수하면 되돌릴 수 있도록 자동 백업을 기본 흐름에 포함합니다.

## 해결할 문제

- Xcode의 General 설정에서 앱 이름, 앱 고유 주소, 버전이 무엇을 의미하는지 모름
- Signing & Capabilities에서 Apple 계정, 인증서, 기능 권한이 왜 필요한지 모름
- Info.plist 권한 문구가 iPhone 팝업에 그대로 나온다는 점을 모름
- Build Settings와 project.yml의 관계를 이해하기 어려움
- App Store Connect에 앱 설명, 개인정보, 스크린샷, 데모 계정, 빌드를 따로 준비해야 한다는 점을 놓침
- XcodeGen을 실행하면 기존 `.xcodeproj`가 다시 생성될 수 있다는 위험을 모름

## MVP 범위

첫 버전부터 범용 iOS 앱 도구로 만듭니다. 기본 대상은 기존 iOS 앱 폴더가 있고, XcodeGen의 `project.yml` 또는 변환 가능한 Xcode 프로젝트 설정을 사용해 `.xcodeproj`를 만들거나 점검하려는 사용자입니다.

MVP에서 지원할 기능:

- 기존 `project.yml` 또는 `project.yaml` 불러오기
- 기존 Xcode 프로젝트에서 읽을 수 있는 기본 설정 스캔
- 앱 이름, 앱 고유 주소, 버전, 빌드 번호 수정
- Apple 개발자 팀 ID와 자동 서명 설정
- 카메라, 사진, 위치, 마이크 권한 문구 작성
- Apple Login, Associated Domains, Push 같은 주요 Apple 기능 선택
- App Store Connect 제출 체크리스트 작성
- App Store Connect API Key 연결
- App Store Connect에 등록된 앱 정보, 빌드, 제출 상태 읽기
- 로컬 앱 설정과 App Store Connect 등록 정보 비교
- 개인정보 처리방침 URL과 수집 데이터 확인 항목 관리
- 심사용 데모 계정, 리뷰 메모, 스크린샷 준비 상태 관리
- 생성 전 미리 점검
- 자동 백업 생성
- 로컬 설치판에서 `xcodegen generate` 실행
- 온라인판에서 설정 파일 생성, 검토, 내보내기
- 생성 후 바뀐 파일과 다음 Xcode 작업 안내

## MVP에서 하지 않을 것

- Xcode를 완전히 대체하지 않습니다.
- Apple ID 비밀번호를 입력받지 않습니다.
- App Store 심사 제출 버튼까지 자동으로 누르지 않습니다.
- 모든 Xcode Build Settings를 처음부터 전부 지원하지 않습니다.
- 복잡한 멀티 타깃, 워크스페이스, 패키지 설정을 첫 버전에서 완전 지원하지 않습니다.
- 온라인판에서 사용자의 Mac 로컬 명령을 직접 실행하지 않습니다.
- 온라인판에서 사용자의 전체 앱 소스코드 업로드를 기본 흐름으로 요구하지 않습니다.
- 법률 자문, 개인정보 처리방침 자동 작성, 심사 통과 보장을 제공하지 않습니다.

## 초보자 모드

초보자 모드는 사용자가 앱 출시 흐름을 이해하도록 돕는 질문 중심 UI입니다.

주요 화면:

- 시작: 앱 폴더 불러오기, 설정 파일 불러오기, 새 설정 만들기
- 앱 기본 정보: 앱 이름, 앱 고유 주소, 지원 기기, 버전
- 서명과 배포: Apple Developer 계정, 팀 ID, 자동 서명
- 권한과 개인정보: 권한 문구, 개인정보 처리방침, 수집 데이터
- Apple 기능: Apple Login, Push, Associated Domains
- App Store 심사: 앱 설명, 스크린샷, 데모 계정, 리뷰 메모
- 프로젝트 만들기: 미리 점검, 백업, Generate, 다음 단계 안내

초보자 모드에서는 `PRODUCT_BUNDLE_IDENTIFIER` 같은 이름을 먼저 보여주지 않고 “앱 고유 주소”라고 설명합니다. 필요한 경우 “자세히 보기”에서 전문 이름을 함께 보여줍니다.

## 고급 모드

고급 모드는 초보자 도우미 역할을 하는 개발자나 오픈소스 기여자를 위한 확인 화면입니다.

지원할 정보:

- 실제 XcodeGen YAML 경로
- Xcode Build Settings 이름
- Info.plist 키 이름
- Entitlements 키 이름
- 변경 전후 diff
- 실행될 명령
- 백업 위치
- 검증 로그

## 브라우저에서 가능한 것과 한계

브라우저 화면만으로는 사용자의 Mac에서 `xcodegen generate` 같은 로컬 명령을 직접 실행할 수 없습니다. 따라서 실제 제품은 로컬 설치판과 온라인판을 분리해서 설계합니다.

로컬 설치판 권장 구조:

- UI: Vite + React + TypeScript
- 로컬 서버: Node.js
- 설정 파일 파서: YAML parser
- 실행 도구: XcodeGen CLI
- 검증: `xcodegen generate`, `xcodebuild -list`, 필요 시 `plutil`

사용자는 로컬에서 도구를 실행하고 브라우저에서 화면을 조작합니다. 브라우저 UI는 로컬 서버에 요청하고, 로컬 서버가 앱 폴더 읽기, 백업 생성, 설정 파일 저장, XcodeGen 실행을 담당합니다.

온라인판 권장 구조:

- UI: Vite + React + TypeScript
- 서버: Node.js API 또는 serverless API
- 저장: 사용자 선택 기반 임시 세션 또는 계정 기반 저장
- 지원 기능: Q&A 설정 도우미, `project.yml` 작성, 설정 검토, App Store Connect API 점검, 문서/체크리스트 생성
- 제한 기능: 사용자의 Mac 안에 있는 앱 폴더 직접 수정, 로컬 `xcodegen generate`, Xcode 실행

온라인판에서 실제 프로젝트 생성을 하려면 선택지가 필요합니다. 하나는 사용자가 앱 폴더를 압축해 업로드하는 방식이고, 다른 하나는 온라인 UI가 로컬 설치판과 연결되는 방식입니다. 초보자와 보안 측면에서는 로컬 설치판 연결 방식을 기본 후보로 둡니다.

## 배포 방식

### 로컬 설치판

로컬 설치판은 전체 기능을 제공합니다. 사용자의 Mac에서 직접 앱 폴더를 읽고, 백업을 만들고, 설정 파일을 저장하고, XcodeGen을 실행합니다.

사용 흐름:

1. GitHub에서 프로젝트를 내려받습니다.
2. 설치 명령을 실행합니다.
3. 브라우저가 로컬 주소로 열립니다.
4. 앱 폴더를 선택합니다.
5. 설정을 수정하고 미리 점검합니다.
6. Generate를 눌러 `.xcodeproj`를 만듭니다.

### 온라인판

온라인판은 누구나 접근할 수 있는 공개 웹 도구입니다. 설치 없이 앱 출시 준비 항목을 이해하고, 설정 파일을 만들고, App Store Connect 정보를 점검할 수 있습니다.

온라인판에서 가능한 기능:

- 새 iOS 앱용 설정 파일 작성
- 기존 `project.yml` 업로드 후 수정
- App Store Connect API Key로 앱 등록 정보 확인
- 출시 준비 체크리스트 작성
- 초보자용 설명과 고급 설정 매핑 확인
- 로컬 설치판으로 이어지는 안내 제공

온라인판에서 제한되는 기능:

- 사용자의 Mac 파일 시스템 직접 접근
- 로컬 XcodeGen 실행
- Xcode 프로젝트 직접 열기
- 사용자가 명시적으로 업로드하지 않은 소스코드 분석

## 핵심 사용자 흐름

1. 사용자가 앱 폴더를 선택합니다.
2. 도구가 `project.yml`, `.xcodeproj`, Info.plist, Entitlements, Assets를 찾습니다.
3. 현재 설정을 쉬운 말로 요약합니다.
4. 부족한 항목을 출시 준비 진행률로 보여줍니다.
5. 사용자가 질문에 답하면서 설정을 수정합니다.
6. 도구가 변경 예정 내용을 파일별로 보여줍니다.
7. 사용자가 미리 점검을 누릅니다.
8. 도구가 자동 백업을 만듭니다.
9. 사용자가 Xcode 프로젝트 만들기를 누릅니다.
10. 도구가 XcodeGen을 실행해 `.xcodeproj`를 생성합니다.
11. 도구가 Xcode에서 열기, Archive, App Store Connect 업로드 순서를 안내합니다.

## 설정 항목 매핑

| 쉬운 이름 | 전문 이름 | 저장 위치 | 사용자가 보는 위치 |
| --- | --- | --- | --- |
| 앱 이름 | `CFBundleDisplayName` 또는 product name | Info.plist / Build Settings | 홈 화면, App Store |
| 앱 고유 주소 | `PRODUCT_BUNDLE_IDENTIFIER` | Build Settings / project.yml | 사용자에게 직접 보이지 않음, App Store 등록과 연결 |
| 앱 버전 | `MARKETING_VERSION` | Build Settings | App Store 버전 |
| 빌드 번호 | `CURRENT_PROJECT_VERSION` | Build Settings | App Store Connect 빌드 선택 |
| Apple 개발자 팀 | `DEVELOPMENT_TEAM` | Build Settings | Signing & Capabilities |
| 카메라 권한 문구 | `NSCameraUsageDescription` | Info.plist | iPhone 권한 팝업 |
| 사진 권한 문구 | `NSPhotoLibraryUsageDescription` | Info.plist | iPhone 권한 팝업 |
| Apple 로그인 | `com.apple.developer.applesignin` | Entitlements | Apple 로그인 기능 |
| 웹 링크 앱 연결 | `com.apple.developer.associated-domains` | Entitlements | 웹 링크를 앱으로 열기 |
| Push 알림 | Push Notifications capability | Entitlements / Apple Developer | iPhone 알림 |
| 개인정보 처리방침 | Privacy Policy URL | App Store Connect | App Store 상품 페이지 |
| 심사용 계정 | Review information | App Store Connect | Apple 심사자용 |

## App Store Connect 준비 범위

App Store Connect는 앱스토어 상품 페이지, TestFlight, 빌드 선택, 심사 제출을 관리하는 Apple 웹 서비스입니다. 이 도구는 App Store Connect 자체를 대체하지 않고, 제출 전에 필요한 항목을 빠뜨리지 않도록 준비하고 안내합니다.

지원할 체크리스트:

- 앱 이름, 부제, 설명, 키워드
- 카테고리와 연령 등급
- 개인정보 처리방침 URL
- 수집 데이터와 추적 여부
- 스크린샷과 앱 미리보기 영상
- 고객지원 URL, 마케팅 URL
- 심사용 데모 계정
- 리뷰 메모
- 가격과 출시 국가
- 업로드한 빌드 선택
- 수동 출시 또는 자동 출시 선택

## App Store Connect API 연결

App Store Connect API 연결은 MVP에 포함합니다. 다만 연결하지 않아도 기본 설정 도우미와 체크리스트는 사용할 수 있어야 합니다.

연결할 경우 목표:

- App Store Connect에 등록된 앱 이름과 앱 고유 주소 확인
- 업로드된 빌드 목록 확인
- 현재 앱 설정과 App Store 등록 정보 비교
- 누락된 제출 정보 표시
- TestFlight와 심사 제출 전 상태 요약
- API로 직접 처리할 수 없는 작업은 App Store Connect에서 해야 할 일로 안내

보안 원칙:

- Apple ID 비밀번호는 입력받지 않습니다.
- App Store Connect API Key 방식만 고려합니다.
- 로컬 설치판에서는 키 파일을 사용자의 Mac 안에서만 사용합니다.
- 온라인판에서는 키 파일 업로드 대신 가능한 한 사용자가 직접 입력한 Key ID, Issuer ID, 제한된 권한의 private key를 세션 단위로 처리하고 장기 저장하지 않는 방식을 우선 검토합니다.
- API Key는 최소 권한으로 만들도록 안내합니다.
- 사용자가 어떤 정보가 읽히는지 명확히 확인할 수 있어야 합니다.

Apple 공식 문서 기준으로 App Store Connect API는 JWT 인증을 사용하며, API Key는 App Store Connect에서 생성합니다. API는 App Store Connect 작업 자동화에 사용할 수 있지만, 새 앱 생성이나 빌드 업로드에는 제한이 있으므로 MVP에서는 “읽기, 비교, 제출 준비 점검”을 우선 범위로 둡니다.

## 위험 요소

- XcodeGen이 기존 `.xcodeproj`를 다시 생성하면서 수동 변경이 사라질 수 있습니다.
- project.yml이 실제 Xcode 프로젝트와 100% 일치하지 않으면 생성 결과가 달라질 수 있습니다.
- App Store Connect 항목과 API는 Apple 정책 및 API 변경에 영향을 받습니다.
- 개인정보와 심사 기준은 앱의 실제 동작에 따라 달라지므로 자동으로 보장할 수 없습니다.
- 브라우저만으로 로컬 파일 시스템과 명령 실행을 안전하게 다루기 어렵습니다.
- 온라인판에서 App Store Connect API Key를 다루는 경우 보안 설계가 제품 신뢰도에 직접 영향을 줍니다.

## 안전장치

- Generate 전 자동 백업 필수
- Generate 전 변경 예정 목록 표시
- 기존 `.xcodeproj`와 XcodeGen 생성 결과 비교
- `project.yml` 문법 검사
- 필수 항목 누락 시 실행 막기 또는 강한 경고
- Apple 계정 비밀번호 입력 금지
- App Store Connect API Key 최소 권한 안내
- 온라인판 API Key 장기 저장 금지
- 초보자 모드에서는 위험한 고급 설정 숨김

## 성공 기준

MVP 성공 기준:

- 사용자가 일반적인 iOS 앱 폴더를 불러올 수 있다.
- 현재 앱 이름, 앱 고유 주소, 버전, 권한 문구를 읽어올 수 있다.
- 초보자 질문을 통해 `project.yml` 값을 수정할 수 있다.
- Generate 전 어떤 파일이 바뀌는지 볼 수 있다.
- 백업 후 XcodeGen으로 `.xcodeproj`를 다시 만들 수 있다.
- App Store Connect API Key를 연결해 등록된 앱 정보와 빌드 상태를 읽을 수 있다.
- 로컬 앱 설정과 App Store Connect 등록 정보 차이를 보여줄 수 있다.
- App Store 제출 전 필수 체크리스트를 확인할 수 있다.

## 오픈소스 공개 준비

GitHub 공개 전 필요한 파일:

- `README.md`
- `LICENSE`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- 예시 `project.yml`
- 스크린샷
- 개발 노트
- 보안 안내
- “Apple 공식 도구가 아님” 고지

라이선스:

- MIT License로 확정합니다.
- README와 앱 내부 정보 화면에 라이선스와 “Apple 공식 도구가 아님” 고지를 함께 표시합니다.

저장소 전략:

- 현재 작업 위치는 POMFS iOS 앱 저장소의 `ios-release-assistant/` 폴더입니다.
- 이 폴더는 나중에 별도 GitHub 저장소로 분리할 수 있도록 독립 프로젝트 구조를 유지합니다.
- 공개용 새 저장소 이름은 `ios-release-assistant`를 기본값으로 사용합니다.
- 공개 전에는 POMFS 앱 고유 정보, 개인 계정 정보, Apple API Key, 실제 인증 정보가 포함되지 않았는지 확인합니다.

## 참고할 공식 문서

- [Adding capabilities to your app](https://developer.apple.com/documentation/xcode/adding-capabilities-to-your-app)
- [Build settings reference](https://developer.apple.com/documentation/xcode/build-settings-reference)
- [Customizing the build phases of a target](https://developer.apple.com/documentation/xcode/customizing-the-build-phases-of-a-target)
- [Managing your app’s information property list values](https://developer.apple.com/documentation/bundleresources/managing-your-app-s-information-property-list)
- [Capabilities overview](https://developer.apple.com/help/account/capabilities/capabilities-overview/)
- [Certificates overview](https://developer.apple.com/help/account/certificates/certificates-overview/)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)
- [App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi/)
- [Get started with the App Store Connect API](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api)
- [Creating API Keys for App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi/creating_api_keys_for_app_store_connect_api)
- [Submit an app](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app)
- [Manage app privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)
- [App privacy details on the App Store](https://developer.apple.com/app-store/app-privacy-details/)

## 구현 전 추가 결정 사항

1. 온라인판에서 App Store Connect API Key를 서버로 전달할지, 브라우저 세션에서만 처리할지 결정합니다.
2. 온라인판에서 앱 소스 압축 업로드를 허용할지, 로컬 설치판 연결만 허용할지 결정합니다.
3. 범용 iOS 앱 지원 범위를 XcodeGen 프로젝트부터 시작할지, 기존 `.xcodeproj` 역분석까지 MVP에 포함할지 결정합니다.
4. GitHub 새 저장소를 어느 계정 또는 조직에 만들지 결정합니다.
5. GitHub 새 저장소를 public으로 만들지 private으로 먼저 만들지 결정합니다.
6. 로컬 설치 명령을 `npm` 기반으로 제공할지, 패키지된 데스크톱 앱까지 제공할지 결정합니다.
