# iOS Release Assistant Hypatia Critical Audit

**Date**: 2026-06-10
**Category**: audits
**Slug**: ios-release-assistant-hypatia-critical-audit
**Scope**: `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant` 전체, `/Users/pomfs_agent/POMFS/POMFS-iOS-App` iOS 앱 저장소, `release-history` 근거, Apple App Store Connect / xcodebuild 공식 제약

## Summary

현재 iOS Release Assistant는 "출시 준비 체크리스트 + 일부 로컬 쓰기 + 일부 App Store Connect mutation" 단계까지 왔지만, 글로벌 전문 릴리즈 도구 기준의 "release assistant"라고 부르기에는 핵심 증거 게이트가 없다.

가장 큰 결함은 App Store 제출의 필수 체인인 `full Xcode 설치 확인 -> build settings resolve -> archive -> export/upload -> ASC build processing -> build 선택 -> metadata/privacy/media 검증 -> review submission`을 제품 모델로 강제하지 않는다는 점이다. 현재 구현은 `xcodegen generate`, Info.plist/project.yml 수정, ASC metadata PATCH, media upload, review submit endpoint를 개별 기능으로 제공하지만, 이 기능들이 하나의 검증된 release evidence ledger로 묶이지 않는다.

테스트도 현재 통과하지 않는다. `npm run build`는 통과하지만 `npm test`는 39개 중 3개 실패했다. 또한 현재 로컬 개발자 디렉터리는 `/Library/Developer/CommandLineTools`라서 `xcodebuild -version` 및 `xcodebuild -help`가 Xcode 부재 오류로 실패한다. 이 상태에서 "출시 준비 완료" 또는 "심사 제출 가능"을 표시하면 거짓 양성이다.

결론: 현재 기준 P0/P1은 미해결이다. PRD에는 단순 UI 체크리스트 확장이 아니라 release evidence gate, secure local bridge, Apple 공식 요구사항 동기화, POMFS release-history 연계, 테스트 통과 조건을 출시 차단 조건으로 넣어야 한다.

## Findings

### P0-1. 실제 App Store 제출 필수 체인이 없다

현재 preflight는 bundle id, Info.plist, privacy URL, icon, screenshot 후보 같은 입력/스캔 상태를 계산한다. 그러나 `xcodebuild -showBuildSettings`, archive, exportOptions, signing/provisioning, upload, ASC build processing, appStoreVersion-build 연결을 검증하지 않는다.

근거:

- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/src/data/preflightChecks.ts:147` 이후 preflight checks는 local metadata와 manual confirmation 중심이다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/generateProject.mjs:92`는 `xcodegen generate`만 실행한다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/appStoreConnect.mjs:1032` 이후 review submission plan은 App Store version id만으로 제출 계획을 만든다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/release-history/releases/2026-05-22_r1_50_1_ios_payment_webview.json:31` 및 `/Users/pomfs_agent/POMFS/POMFS-iOS-App/release-history/releases/2026-05-22_r1_50_3_ios_scoped_location_webview.json:33`은 최근 iOS 변경이 `partial` verification이고 full Xcode build가 없었다고 명시한다.
- 현재 환경도 `xcode-select --print-path`가 `/Library/Developer/CommandLineTools`이고 `xcodebuild -version`은 "requires Xcode" 오류로 실패한다.

Apple 공식 근거:

- App Store Connect에 빌드를 업로드하면 bundle ID와 version number가 앱/버전 레코드 연결에 쓰이고, 빌드는 Apple 시스템에서 처리된 뒤 나타난다: https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/
- 심사 제출 전 required metadata 제공과 build 선택이 필요하다: https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app/
- 2026-04-28 이후 App Store Connect 업로드 앱은 Xcode 26 이상 및 iOS 26 계열 SDK로 빌드되어야 한다: https://developer.apple.com/news/upcoming-requirements/

반박할 순진한 해결책:

- "preflight checklist에 Archive 안내 문구를 추가한다"는 해결이 아니다. 안내가 아니라 `xcodebuild archive`/export/upload/build processing 증거를 수집하고 gate로 막아야 한다.
- "ASC submit endpoint가 성공하면 제출된 것"도 틀렸다. build가 선택되지 않았거나 처리 중이면 Apple 쪽에서 실패하거나 거짓 완료 상태가 된다.

최종 PRD에 추가할 문장:

> Release Assistant는 `xcodegen generate` 성공을 출시 준비 완료로 간주하지 않는다. 출시 가능 상태는 full Xcode 설치 확인, Xcode/SDK 최소 요구사항 확인, build settings resolve, archive/export 성공, App Store Connect 업로드 및 build processing 완료, appStoreVersion에 정확한 build 연결까지 모두 evidence ledger에 기록된 경우에만 성립한다.

### P0-2. Review submission이 build 선택/처리 완료와 독립적으로 실행될 수 있다

현재 review submission plan은 editable appStoreVersion만 찾으면 만들어진다. appStoreVersion에 연결된 build id, build processing status, version/build string 정합성, export compliance, age rating, privacy responses, price/availability 같은 선행조건이 plan 모델에 없다.

근거:

- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/appStoreConnect.mjs:1048` `createReviewSubmitPlan`은 `metadata.appStoreVersion`과 state만 본다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/appStoreConnect.mjs:1492` `submitForReview`는 기존 submission을 읽거나 appStoreVersionSubmission을 POST한다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/src/components/StoreConnectPanel.tsx:641` UI는 "심사 제출" 버튼을 제공하지만 build 선택 상태를 보여주지 않는다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/bridge/bridgeApi.test.mjs:2406` 테스트도 build 없이 submission 생성만 검증한다.

Apple 공식 근거:

- 앱 제출 전 해당 version에 업로드된 build를 선택해야 하며, version당 하나의 build만 연결된다: https://developer.apple.com/help/app-store-connect/manage-builds/choose-a-build-to-submit/
- submit app 문서는 Build section에서 올바른 build가 추가되었는지 확인하라고 한다: https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app/

반박할 순진한 해결책:

- "사용자가 체크박스로 확인했다"는 gate가 아니다. ASC API에서 실제 build relationship과 상태를 읽고 plan이 그 build id를 고정해야 한다.
- "오류가 나면 Apple이 막아준다"는 제품 품질 기준이 아니다. 초보자용 도구는 Apple 오류를 사후 표시하는 것이 아니라 사전 차단해야 한다.

최종 PRD에 추가할 문장:

> `submit-review` mutation은 선택된 build id, uploadedDate, processing state, versionString/buildVersion, export compliance 상태, required metadata completion을 evidence로 가진 `ReviewSubmissionPlan`에서만 허용한다. 하나라도 없으면 제출 버튼은 렌더링하지 않고 차단 사유를 표시한다.

### P0-3. Local bridge mutation 보안 모델이 정적 토큰과 넓은 loopback 신뢰에 기대고 있다

민감한 mutation confirmation token이 서버와 클라이언트에 상수로 박혀 있다. `/api/bridge/pair`도 별도 사용자 행위 없이 token을 발급한다. CORS는 allowlist 외에도 모든 loopback origin을 허용한다. 로컬 브리지는 사용자 파일과 ASC private key를 다루므로 "localhost라 안전하다"는 가정은 성립하지 않는다.

근거:

- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/src/api/bridge.ts:21`부터 `CONFIRM_*` 상수가 클라이언트에 노출된다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/writePlan.mjs:12`부터 백업/쓰기/generate confirmation token이 상수다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/appStoreConnect.mjs:6`부터 ASC mutation confirmation token이 상수다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/local-server.mjs:143`은 pair 요청에 pairing token을 반환한다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/bridge/policy.mjs:223`은 origin이 없으면 허용하고, `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/bridge/policy.mjs:227`은 allowlist에 없어도 loopback origin이면 허용한다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/appStoreConnect.mjs:1338` 이후 private key를 bridge 메모리에 보관한다.

반박할 순진한 해결책:

- "버튼 클릭 전에 체크박스를 둔다"는 보안이 아니다. 공격자는 API를 직접 호출한다.
- "localhost only"는 충분하지 않다. 같은 사용자의 브라우저, 로컬 dev server, 악성 로컬 페이지가 loopback endpoint를 호출할 수 있다.

최종 PRD에 추가할 문장:

> 모든 bridge mutation은 user-visible plan digest, one-time nonce, short TTL, action-specific confirmation, origin pinning, same-device pairing proof를 요구한다. confirmation token은 정적 문자열이나 클라이언트 번들 상수가 될 수 없으며, 재사용과 plan mismatch는 감사 로그와 함께 403으로 차단한다.

### P0-4. 현재 테스트가 실패한다

현재 `npm run build`는 통과하지만 `npm test`가 실패한다. failing area는 ASC metadata update plan, review detail fallback, mixed media upload result이다. ASC 관련 핵심 기능이므로 출시/PRD 기준에서는 P0이다.

근거:

- `npm test`: 3 failed, 36 passed, 총 39개. 실패 항목:
  - `builds and applies an App Store Connect draft metadata update plan`
  - `adds 심사 메모 as a manual item when App Store review detail is missing`
  - `builds and uploads mixed App Store Connect screenshot + app preview media plans`
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/appStoreConnect.mjs:797` 및 `:820`에서 `addAscOperation` 호출 시 `operations` 인자가 빠져 있다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/bridge/bridgeApi.test.mjs:831` 이후 테스트는 privacy choices/text update plan을 기대한다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/bridge/bridgeApi.test.mjs:1430` 이후 테스트는 review note만 manual item으로 기대하지만 실제는 demo-account manual item까지 나온다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/bridge/bridgeApi.test.mjs:2374` 이후 테스트는 app preview state를 `UPLOAD_COMPLETE`로 기대하지만 실제 구현은 `READY`를 반환한다.

반박할 순진한 해결책:

- "테스트 기대값만 바꾼다"는 미봉이다. Apple asset processing state 모델을 명확히 정하고, product UI/SLO/acceptance가 그 모델과 일치해야 한다.
- "build가 통과하니 괜찮다"는 틀렸다. 이 도구의 위험면은 타입 빌드가 아니라 ASC mutation과 release gate다.

최종 PRD에 추가할 문장:

> PRD 승인 조건은 `npm run build` 통과가 아니라 ASC mutation, media upload, review submission, bridge policy, safe write, generate, release evidence ledger 테스트가 모두 통과하는 것이다. 어떤 test failure도 릴리즈 도우미의 "ready" 상태를 차단한다.

### P0-5. POMFS release-history를 release gate로 쓰지 않는다

POMFS iOS 앱의 최근 release-history는 Xcode build 미실행을 명시한다. 그러나 Release Assistant는 release-history JSON을 읽어 "source-ready but not archive/upload verified" 상태를 차단하지 않는다.

근거:

- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/release-history/releases/2026-05-22_r1_50_1_ios_payment_webview.json:31`은 verification `partial`, `xcodebuild was not run`을 기록한다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/release-history/releases/2026-05-22_r1_50_3_ios_scoped_location_webview.json:33`도 동일하게 partial verification과 Xcode 부재를 기록한다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/README.md:20`은 도구가 POMFS iOS repo 내부에서 drafting 중이라고 말하지만 release-history 연계 기능은 없다.

반박할 순진한 해결책:

- "새 보고서에 수동으로 적는다"는 릴리즈 도구의 기능이 아니다. 도구가 release-history를 입력 근거로 삼아 이전 예외가 해결됐는지 자동으로 판단해야 한다.

최종 PRD에 추가할 문장:

> POMFS 모드에서는 `release-history/releases/*.json`을 읽어 마지막 iOS release의 verification/rollout/exceptions를 release evidence ledger에 병합한다. 이전 release에 `xcodebuild was not run`, `source-ready`, `requires local Xcode pull/build/install` 예외가 있으면 새 릴리즈는 archive/upload evidence가 생기기 전까지 차단한다.

### P1-1. Info.plist build setting 변수를 concrete value로 덮어쓸 수 있다

POMFS iOS 앱의 Info.plist는 `$(PRODUCT_BUNDLE_IDENTIFIER)`, `$(MARKETING_VERSION)`, `$(CURRENT_PROJECT_VERSION)`를 사용한다. 그런데 write plan은 사용자가 bundle id를 입력하면 Info.plist의 `CFBundleIdentifier`까지 concrete value로 쓸 수 있다. 이는 Xcode build setting source of truth를 깨뜨린다.

근거:

- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/P.O.MFS/Info.plist:18`은 `$(PRODUCT_BUNDLE_IDENTIFIER)`를 사용한다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/P.O.MFS/Info.plist:26`은 `$(MARKETING_VERSION)`를 사용한다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/P.O.MFS/Info.plist:44`은 `$(CURRENT_PROJECT_VERSION)`를 사용한다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/writePlan.mjs:157`부터 `CFBundleDisplayName`, `CFBundleName`, `CFBundleIdentifier`를 Info.plist operation으로 추가한다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/writePlan.mjs:316`은 `CFBundleIdentifier`를 실제 값으로 쓴다.

최종 PRD에 추가할 문장:

> build setting placeholder를 사용하는 plist key는 기본적으로 concrete value로 덮어쓰지 않는다. tool은 resolved build settings와 raw plist를 분리 표시하고, source of truth가 XcodeGen/build settings인 경우 plist placeholder 보존을 acceptance criterion으로 삼는다.

### P1-2. 멀티 타깃/워크스페이스/후보 파일 선택 규칙이 구현과 문서가 다르다

문서는 multiple targets/files가 있으면 사용자 선택을 요구한다고 하지만 구현은 first application target 또는 첫 번째 후보 파일로 fallback한다. 범용 도구라면 잘못된 target/Info.plist/entitlements를 수정할 수 있다.

근거:

- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/docs/architecture-plan.md:261`은 multiple app targets/candidate files가 있으면 selection 전 write 금지라고 한다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/writePlan.mjs:81`은 첫 application target 또는 첫 target을 고른다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/writePlan.mjs:89`는 path match가 없으면 files[0]으로 fallback한다.

최종 PRD에 추가할 문장:

> 후보 target, Info.plist, entitlements, asset catalog가 2개 이상이면 write/generate/ASC plan은 `blocked`가 되어야 하며, 사용자가 선택한 target identity를 plan digest에 포함한다.

### P1-3. media validation이 Apple 규격보다 얕다

현재 media upload validation은 확장자와 파일 크기 중심이다. Apple은 screenshots 개수/형식/디바이스별 pixel size, app preview format/codec/length/poster frame/processing time 제약을 둔다. 업로드 후 상태도 Apple processing을 기다려야 한다.

근거:

- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/appStoreConnect.mjs:561`은 file 존재/size/extension만 검증한다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/appStoreConnect.mjs:16`은 screenshot 최대 10개, app preview 최대 3개만 상수로 둔다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/src/components/StoreConnectPanel.tsx:138`은 display type 선택지를 제공하지만 실제 pixel dimension validation은 없다.

Apple 공식 근거:

- screenshots는 1-10장, jpeg/jpg/png 형식이어야 한다: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
- app previews는 mov/m4v/mp4, poster frame, processing may take up to 24 hours 등의 제약이 있다: https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots/

최종 PRD에 추가할 문장:

> media upload plan은 파일 확장자만으로 ready가 될 수 없다. 각 asset은 target display type, pixel dimensions, orientation, count, file size, video duration, codec, poster frame, localization, ASC processing status를 검증하고, processing이 완료되기 전에는 review submission gate를 열지 않는다.

### P1-4. privacy/compliance 모델이 privacy URL 수준에 머문다

도구는 Info.plist usage description과 privacy URL은 다루지만, App Store privacy data types, tracking, third-party SDK privacy manifest/signature, age rating, export compliance를 release gate로 다루지 않는다.

근거:

- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/src/data/preflightChecks.ts:195`은 privacy policy URL만 input으로 본다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/src/data/preflightChecks.ts:223`은 App Store privacy 기본 항목을 URL 여부와 연결한다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/P.O.MFS/Info.plist`에는 `NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`, `NSMicrophoneUsageDescription`, `NSAllowsArbitraryLoads` 등이 있지만 tool은 실제 data collection/ATS risk를 gate로 만들지 않는다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/P.O.MFS/Entitlements/Entitlements.plist`에는 production APNs, Apple Sign In, Associated Domains가 있다. Developer Portal/provisioning/backend readiness 검증이 없다.

Apple 공식 근거:

- privacy policy URL은 모든 앱에 required이고, data types는 앱 또는 third-party partners가 수집하는 데이터 타입이다: https://developer.apple.com/help/app-store-connect/reference/app-information/app-privacy/
- third-party SDK privacy manifest/signature 요구가 있으며 listed SDK를 포함하면 제출 시 manifest/signature가 필요하다: https://developer.apple.com/support/third-party-SDK-requirements/
- 2026-01-31 이후 age rating question 업데이트 요구가 있다: https://developer.apple.com/news/upcoming-requirements/

최종 PRD에 추가할 문장:

> privacy readiness는 privacy URL 입력 여부가 아니다. Release Assistant는 Info.plist permission usage, native/web feature inventory, third-party SDK inventory/privacy manifests, App Store privacy data types, tracking declaration, age rating, export compliance를 하나의 compliance matrix로 만들고 미완료 항목은 P1 release blocker로 표시한다.

### P1-5. App Store Connect API key 처리 정책이 제품 신뢰를 충분히 설명하지 않는다

private key는 입력 후 UI에서 지우지만, bridge 메모리 session의 수명, clear/rotation, crash dump/log redaction, API role 최소권한, key revocation 안내가 release gate로 강제되지 않는다.

근거:

- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/src/App.tsx:794`은 연결 성공 후 privateKeyInput을 빈 문자열로 만든다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/appStoreConnect.mjs:1363`은 privateKey object를 session에 저장한다.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/bridge/redaction.mjs:1`은 redaction pattern을 두지만 structured audit와 negative tests coverage는 더 필요하다.

Apple 공식 근거:

- API key는 private이고 한 번만 다운로드 가능하며, 분실/노출 시 즉시 revoke해야 한다: https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api/

최종 PRD에 추가할 문장:

> ASC credential session은 explicit TTL, manual clear, automatic clear on tab close/server stop, no-disk guarantee, log redaction negative tests, minimum role checklist, revocation guidance를 갖춘다. private key가 response, logs, screenshots, report, test fixture에 나타나면 P0 incident로 처리한다.

## Release Blockers

- `npm test` 전체 통과 전까지 release assistant ASC 기능은 ready로 표시 금지.
- `xcodebuild -version`이 full Xcode 26+ 및 required SDK를 증명하지 못하면 archive/export/upload gate 진입 금지.
- `xcodebuild -showBuildSettings`, `xcodebuild clean build`, `xcodebuild archive`, `xcodebuild -exportArchive` 또는 Transporter upload evidence가 없으면 "submission-ready" 금지.
- ASC에서 processed build를 읽고 target appStoreVersion에 정확히 연결했다는 evidence가 없으면 review submission plan 생성 금지.
- static confirmation token이 남아 있으면 local bridge mutation release 금지.
- multiple target/candidate file ambiguity가 resolved target identity 없이 plan을 만들면 write 금지.
- media assets가 Apple screenshot/app preview specs 및 processing status를 만족하지 않으면 review submission 금지.
- privacy/compliance matrix가 required items를 모두 resolved하지 않으면 review submission 금지.
- release-history에 남은 `xcodebuild was not run`/`source-ready` 예외가 새 evidence로 해소되지 않으면 POMFS mode release 금지.

## SLO

- **Secret leakage SLO**: bridge response, browser state summary, logs, test output, report artifacts에서 raw private key/token/password leakage 0건.
- **Plan integrity SLO**: mutation request의 plan id, digest, selected target, action, confirmation nonce mismatch 차단률 100%.
- **Write verification SLO**: apply 후 targeted fields expected/actual 일치율 100%, mismatch 1건이면 auto-rollback 또는 blocked state.
- **Release evidence SLO**: release-ready 상태의 100%가 Xcode/SDK version, build settings, archive/export/upload/build processing/build selection/submission state evidence를 갖는다.
- **ASC state freshness SLO**: review submission 직전 ASC build/version/media/privacy state 재조회 age 60초 이하.
- **Media processing SLO**: uploaded media가 `READY` 또는 Apple-documented final accepted state가 되기 전 review submission gate open 0건.
- **Test SLO**: main branch 기준 `npm run build`, `npm test`, bridge security regression, release evidence E2E가 모두 통과해야 release candidate.

## Acceptance Criteria

- `npm test` 0 failed, `npm run build` 0 failed.
- failing ASC metadata update plan은 privacyChoicesUrl/privacyPolicyText path까지 통과하고 regression test가 추가되어야 한다.
- review note fallback expected behavior가 product decision과 일치하도록 code/test/docs가 정렬된다.
- app preview upload state model이 Apple asset/video processing state와 일치하고 UI가 `uploaded`와 `processing-ready`를 구분한다.
- POMFS iOS app dry-run에서 `project.yml`, Info.plist placeholder, entitlements, AppIcon, screenshots, release-history exceptions를 모두 읽고 evidence ledger를 만든다.
- full Xcode 26+ 환경에서 POMFS iOS app의 archive/export dry-run 또는 실제 upload dry-run evidence가 생성된다.
- review submission plan이 processed build relationship 없이는 생성되지 않는 negative test가 통과한다.
- local bridge pair/mutation이 static token 없이 one-time nonce/digest 기반으로 동작하고 replay/origin mismatch negative tests가 통과한다.
- CODEX_REPORTS 또는 release-history에 no-secret sanitized evidence summary가 자동 저장된다.

## PRD Insertions

아래 문장은 최종 PRD에 그대로 들어가야 한다.

1. "Submission-ready는 UI 체크리스트 완료가 아니라 evidence ledger 상태다. evidence ledger에는 full Xcode/SDK version, build settings resolve, archive/export 결과, upload/build processing, selected build, metadata/privacy/media completion, review submission state가 포함된다."
2. "Review submission mutation은 build relationship과 compliance completion을 검증하지 못하면 생성되지 않는다. 이 차단은 UI 비활성화가 아니라 bridge API 409로도 강제된다."
3. "Local bridge는 localhost 신뢰를 보안 모델로 사용하지 않는다. 모든 mutation은 one-time, action-scoped, plan-digest-bound nonce를 요구하며 정적 confirmation token은 금지한다."
4. "POMFS mode는 `release-history` 예외를 release blocker로 승격한다. 이전 iOS release가 source-ready 또는 xcodebuild-not-run 상태라면 새 release는 archive/upload evidence 없이는 완료될 수 없다."
5. "Info.plist placeholder와 XcodeGen/build setting source-of-truth는 보존 대상이다. tool은 resolved value와 raw source value를 분리하고, placeholder를 concrete value로 덮어쓰지 않는다."
6. "Media readiness는 extension/size check가 아니다. screenshots/app previews는 Apple 공식 device/display specs, localization, duration/codec/poster frame, processing state를 검증해야 한다."
7. "Privacy readiness는 privacy policy URL 하나로 완료되지 않는다. data types, tracking, SDK privacy manifest/signature, age rating, export compliance를 compliance matrix로 검증한다."
8. "모든 release decision은 test evidence가 있어야 한다. failing test가 하나라도 있으면 release assistant는 ready/submission-ready/submitted 상태를 표시할 수 없다."

## Evidence

- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/package.json:11` — build/test scripts.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/README.md:20` — current implementation claims local bridge, safe write, ASC update/media/review submission.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/docs/product-plan.md:50` — MVP scope includes ASC, backup, xcodegen generate, checklist.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/docs/architecture-plan.md:64` — submission-ready definition lacks archive/export/upload/build selection evidence.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/local-server.mjs:369` — ASC connect route.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/local-server.mjs:510` — review submission route.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/appStoreConnect.mjs:1048` — review submit plan built from appStoreVersion state.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/appStoreConnect.mjs:1492` — appStoreVersionSubmission creation.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/writePlan.mjs:400` — write plan built from scan and answers.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant/server/generateProject.mjs:92` — xcodegen generate only.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/project.yml:53` — CODE_SIGN_ENTITLEMENTS.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/project.yml:54` — automatic code signing.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/project.yml:56` — DEVELOPMENT_TEAM empty.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/project.yml:63` — POMFS bundle identifier.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/P.O.MFS/Info.plist` — build setting placeholders, permissions, ATS arbitrary loads, WKAppBoundDomains.
- `/Users/pomfs_agent/POMFS/POMFS-iOS-App/P.O.MFS/Entitlements/Entitlements.plist` — production APNs, Sign in with Apple, associated domains.
- `npm run build` — passed on 2026-06-10.
- `npm test` — failed 3/39 on 2026-06-10.
- `xcode-select --print-path` — `/Library/Developer/CommandLineTools`.
- `xcodebuild -version` — failed because active developer directory is Command Line Tools, not full Xcode.
- Apple Upload builds — https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/
- Apple Submit an app — https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app/
- Apple Choose a build to submit — https://developer.apple.com/help/app-store-connect/manage-builds/choose-a-build-to-submit/
- Apple Screenshot specifications — https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
- Apple Upload app previews and screenshots — https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots/
- Apple App privacy — https://developer.apple.com/help/app-store-connect/reference/app-information/app-privacy/
- Apple App Store Connect API keys — https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api/
- Apple Third-party SDK requirements — https://developer.apple.com/support/third-party-SDK-requirements/
- Apple Upcoming Requirements — https://developer.apple.com/news/upcoming-requirements/

## Risks / Gaps

- 실제 App Store Connect 계정/API 호출은 수행하지 않았다. 공식 문서와 local mocked tests, 구현 코드를 기준으로 감사했다.
- full Xcode가 현재 active developer directory에 없어서 실제 archive/export 검증은 실행하지 못했다.
- 이 보고서는 Critical Audit 산출물이다. P0/P1 제거 PRD 본문은 별도 leader synthesis 단계에서 작성해야 한다.

## Follow-Up

1. 먼저 failing tests 3건을 제품 의사결정과 맞춰 고친다.
2. release evidence ledger PRD를 작성한다.
3. local bridge threat model과 mutation nonce/digest 설계를 PRD P0로 승격한다.
4. POMFS mode release-history ingestion을 설계한다.
5. full Xcode 26+ runner 또는 로컬 환경에서 POMFS iOS archive/export/upload evidence gate를 구현 대상으로 잡는다.

## 현재 기준 P0/P1 미해결

### P0

- P0-1 actual release chain 부재: archive/export/upload/build processing/build selection evidence 없음.
- P0-2 build 연결 검증 없이 review submission 가능.
- P0-3 local bridge mutation 보안이 정적 confirmation token과 loopback 신뢰에 의존.
- P0-4 `npm test` 실패 3건.
- P0-5 POMFS release-history의 Xcode 미실행 예외를 release gate로 쓰지 않음.

### P1

- P1-1 Info.plist build setting placeholder를 concrete value로 덮어쓸 수 있음.
- P1-2 multi target/candidate file ambiguity를 사용자 선택 없이 fallback할 수 있음.
- P1-3 media validation이 Apple screenshot/app preview specs 및 processing state보다 얕음.
- P1-4 privacy/compliance가 privacy URL 중심이고 data types/SDK manifest/age rating/export compliance가 없음.
- P1-5 ASC API key lifecycle/role/revocation/no-leak policy가 release gate 수준이 아님.

## P0/P1 제거 조건

### P0 제거 조건

- `npm test`와 `npm run build`가 모두 통과한다.
- full Xcode 26+ 및 iOS 26 SDK evidence가 수집된다.
- POMFS iOS app 기준 archive/export 또는 upload dry-run evidence가 release ledger에 저장된다.
- App Store Connect에서 processed build를 읽고 appStoreVersion에 선택/연결하는 gate가 구현된다.
- review submission plan은 build/compliance/media/privacy evidence가 모두 충족될 때만 생성된다.
- static confirmation token이 제거되고 one-time plan digest/nonce mutation model이 negative tests로 검증된다.
- POMFS release-history exceptions가 자동 ingestion되어 이전 Xcode 미실행 예외를 차단한다.

### P1 제거 조건

- Info.plist placeholder 보존 policy와 regression tests가 추가된다.
- multi target/candidate file selection이 required UI/API gate로 구현된다.
- screenshot/app preview dimensions, count, codec/duration/poster frame, localization, processing state 검증이 구현된다.
- privacy/compliance matrix가 data types, tracking, third-party SDK manifests/signatures, age rating, export compliance까지 포함한다.
- ASC API key session TTL/clear/revocation/role guidance/no-leak negative tests가 구현된다.
