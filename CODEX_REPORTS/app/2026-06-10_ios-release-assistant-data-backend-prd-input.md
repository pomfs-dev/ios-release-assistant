# iOS Release Assistant Data/Backend PRD 입력안

**Date**: 2026-06-10
**Category**: app
**Slug**: ios-release-assistant-data-backend-prd-input
**Scope**: `/Users/pomfs_agent/POMFS/POMFS-iOS-App/ios-release-assistant`의 App Store Connect API, 릴리스 계획 데이터, 파일 스캔, 프로젝트 생성 도메인 모델 분석
**Role**: Feynman, Data / Backend
**Code Change**: 없음. 제품 코드는 수정하지 않았고 보고서만 생성했다.

## Summary

iOS Release Assistant는 이미 `scan -> write plan -> backup -> apply -> rescan -> generate`와 `ASC connect -> plan -> apply/upload/submit` 흐름을 갖고 있다. 그러나 현재 데이터 모델은 "정상 경로의 메모리 plan"에 치우쳐 있으며, App Store Connect 상태 전이, 멱등성, 부분 성공, 재시도, 미디어 asset processing, 리뷰 제출 gate를 별도 도메인으로 모델링하지 않는다.

PRD의 Data/Backend 방향은 다음과 같다.

- `FolderScanResult`는 관측 모델, `ReleasePlan`은 사용자 의사결정 모델, `MutationRun`은 실행 이력 모델로 분리한다.
- 모든 쓰기/ASC/업로드/제출 작업은 `planId + idempotencyKey + operationId + runId`를 가져야 한다.
- ASC draft/app version/media/review submission은 Apple 상태와 로컬 gate 상태를 함께 표현하는 상태머신으로 관리한다.
- P0 제거 기준은 `npm test` 통과만이 아니라 실패 주입, 부분 성공 재개, 중복 실행 방지, submit 전 hard gate 증거까지 포함해야 한다.

## Findings

### 1. 현재 Domain Model / Data Model

#### 1.1 Local Project Scan 도메인

현재 스캔 모델은 `scanFolder(inputPath)`가 생성하는 `FolderScanResult` 하나로 귀결된다.

- `FolderScanResult.folder`: 앱 루트 이름과 절대 경로.
- `FolderScanResult.files`: `projectSpec`, `.xcodeproj`, workspace, `Info.plist`, entitlements, asset catalog, `AppIcon.appiconset`, screenshot 후보, web app preview.
- `FolderScanResult.project`: XcodeGen `project.yml`에서 파생한 project/target 요약.
- `FolderScanResult.checklist`: 스캔 레벨 발견/경고/누락 체크.

근거:

- `server/scanFolder.mjs:687-824`는 입력 경로를 폴더 또는 `project.yml/project.yaml`로 해석하고, 프로젝트/Info.plist/entitlements/asset/screenshot/web preview를 찾아 `ok: true` 결과로 반환한다.
- `src/types.ts:352-390`은 `FolderScanResult` 타입을 서버 결과와 같은 구조로 선언한다.
- `server/scanFolder.mjs:168-200`은 XcodeGen target 요약을 만든다.
- `server/scanFolder.mjs:211-248`은 Info.plist와 entitlements에서 권한/기능 데이터를 추출한다.
- `server/scanFolder.mjs:276-312`는 App Store 마케팅 아이콘 존재 여부를 `Contents.json` 기준으로 요약한다.
- `server/scanFolder.mjs:365-401`은 screenshot 후보를 파일명/경로 패턴으로 고르고 preview data URL을 만든다.

PRD 반영 모델:

```text
LocalProject
- rootPath, folderName
- projectSpec: ProjectSpecFile | null
- projectTargets: ProjectTarget[]
- appInfoFiles: ParsedFile<InfoPlistSummary>[]
- entitlementFiles: ParsedFile<EntitlementsSummary>[]
- assetCatalogs: AssetCatalog[]
- appIconSets: ParsedFile<AppIconSetSummary>[]
- mediaCandidates: ScreenshotCandidate[]
- scanSnapshotId: sha256(rootPath + normalized file list + selected file hashes)
- scannedAt
```

`scanSnapshotId`가 필요하다. 현재는 스캔 결과가 시간/파일 fingerprint 없이 바로 plan에 쓰이므로, 파일 변경 후 오래된 plan을 적용해도 서버가 선제 차단할 근거가 없다.

#### 1.2 Release Planning 도메인

현재 프론트 데이터 계층은 스캔 결과를 사용자 이해용 요약과 preflight/review gate로 변환한다.

- `AppScanSummary`: 앱 이름, bundle id, version/build, team, project spec, plist, entitlements, icon, screenshot, privacy/capability 요약.
- `PreflightSummary`: `ok/warn/error` 체크와 진행률.
- `ChangeReviewSummary`: `fileChanges`, `appStoreConnectUpdates`, `commandActions` 섹션.
- `UserAnswerState`: step/field label 기반 답변 map.

근거:

- `src/data/appScanSummary.ts:100-150`은 `FolderScanResult`에서 앱 요약을 파생한다.
- `src/data/preflightChecks.ts:120-303`은 privacy URL, demo account, screenshots, manual confirmation 등을 체크한다.
- `src/data/changeReviewSummary.ts:92-414`는 파일 변경, ASC 업데이트, 명령 실행 항목을 review gate로 구성한다.
- `src/data/releaseSteps.ts:3-557`은 기본 질문/기본값/체크리스트 UI 모델을 정의한다.
- `src/data/userAnswers.ts:3-113`은 기본값과 명시 입력값을 구분한다.

PRD 반영 모델:

```text
ReleasePlan
- planId: deterministic hash
- sourceScanSnapshotId
- answersRevisionId
- fileMutations: FileMutation[]
- ascDraftMutations: AscDraftMutation[]
- mediaUploadIntents: MediaUploadIntent[]
- reviewSubmissionIntent: ReviewSubmissionIntent | null
- gates: GateResult[]
- status: planned | blocked | approved | executing | partially_succeeded | succeeded | failed | superseded
```

현재 `ChangeReviewSummary`는 사용자 표시용으로 충분하지만 실행 보증 모델은 아니다. PRD에서는 표시용 review summary와 실행용 `ReleasePlan`을 분리해야 한다.

#### 1.3 File Write / Project Generate 도메인

현재 write/generate는 plan과 backup을 갖지만 지속성/재개성은 없다.

- `WritePlan`: 파일별 operation, confirmation token, backup 필요 여부.
- `BackupManifest`: 백업 파일과 sha256.
- `ApplyWritePlanResult`: apply 후 rescan verification.
- `GenerateProjectResult`: xcodegen 실행 전 백업, stdout/stderr redaction, 후속 scan.

근거:

- `server/writePlan.mjs:400-423`은 scan 결과와 answers에서 `WritePlan`을 만든다.
- `server/writePlan.mjs:425-477`은 `.release-assistant-backups/<timestamp>/manifest.json`을 만든다.
- `server/writePlan.mjs:479-508`은 backup manifest가 있는 plan만 적용하고, 재스캔 후 expected/proposed 값을 검증한다.
- `server/writePlan.mjs:510-547`은 plan을 메모리 `Map`에 저장한다.
- `server/generateProject.mjs:92-155`는 generate 전 project/workspace/spec backup을 만들고 `xcodegen generate --spec`을 실행한다.

PRD 반영 모델:

```text
FileMutation
- operationId
- kind: update-project-yml | update-info-plist | update-entitlements
- targetFile
- precondition: { sha256, mtimeMs, parsedValueHash }
- changes[]
- status: planned | backed_up | applied | verified | failed | rolled_back

ProjectGenerateRun
- runId
- writePlanId
- precondition: writePlan applied or operationCount=0
- command, cwd, timeoutMs
- backupManifestId
- status: planned | running | generated | failed
```

P0 수용 기준: 파일 mutation은 apply 직전 `precondition`을 확인해야 하며, 불일치 시 409로 중단하고 새 scan/plan을 요구한다.

#### 1.4 App Store Connect 도메인

현재 `createAppStoreConnectManager()`는 세션과 세 종류의 plan을 메모리 `Map`으로 관리한다.

- `AscSession`: 앱 요약, issuer/key/privateKey, resolvedBy, sessionId. private key는 메모리 전용.
- `AppStoreConnectUpdatePlan`: app info localization, app store version localization, review detail PATCH operation.
- `AppStoreConnectMediaUploadPlan`: screenshot/app preview 파일, display type/preview type/frame time, appStoreVersionLocalizationId.
- `AppStoreConnectReviewSubmissionPlan`: appStoreVersionId와 appStoreState.

근거:

- `server/appStoreConnect.mjs:604-619`은 `session`, `updatePlans`, `mediaUploadPlans`, `reviewSubmissionPlans`를 메모리에 둔다.
- `server/appStoreConnect.mjs:648-667`은 appAppleId 또는 bundleId로 앱을 조회한다.
- `server/appStoreConnect.mjs:680-709`은 appInfo, appStoreVersions, localizations, review detail을 읽는다.
- `server/appStoreConnect.mjs:711-1030`은 ASC draft metadata update plan을 만든다.
- `server/appStoreConnect.mjs:1083-1151`은 media upload plan을 만든다.
- `server/appStoreConnect.mjs:1430-1451`, `1454-1490`, `1492-1530`은 draft update/media upload/review submit을 실행한다.

PRD 반영 모델:

```text
AscWorkspace
- sessionId
- appId, bundleId, primaryLocale
- credentialScope: memory-only
- fetchedAt

AscSnapshot
- appInfoLocalization
- appStoreVersion
- appStoreVersionLocalization
- reviewDetail
- screenshotSets[]
- previewSets[]
- currentSubmission
- snapshotId

AscMutationRun
- runId
- planId
- idempotencyKey
- operationResults[]
- status: pending | running | partially_succeeded | succeeded | failed | retry_wait | stale
```

현재 plan은 실행 후 삭제/종료 상태가 없고, 같은 plan을 재실행하면 API PATCH/POST/upload가 다시 호출될 수 있다. PRD에서는 실행 결과를 `MutationRun`으로 남겨 동일 idempotency key 요청은 기존 결과를 반환하게 해야 한다.

### 2. API Contract

#### 2.1 현재 Local Bridge Contract

공통:

- 인증: pairing token 필요. 일부 mutation은 `planId`와 `confirmationToken`이 필요하다.
- 성공: `{ ok: true, ... }`.
- 실패: `{ ok: false, error: string }`.
- redaction: bridge 응답은 기본적으로 `redactSecrets()`를 거친다.

근거:

- `server/bridge/policy.mjs:4-177`은 endpoint별 pairing/plan/confirmation/mutation 정책을 선언한다.
- `server/local-server.mjs:43-50`은 JSON 응답과 redaction을 수행한다.
- `server/local-server.mjs:79-89`은 `planId`와 confirmation token 필수 여부를 검사한다.
- `src/api/bridge.ts:93-123`은 프론트 bridge POST와 pairing 재시도를 구현한다.

주요 endpoint:

```text
POST /api/bridge/scan-folder
input: { path }
output: FolderScanResult

POST /api/bridge/build-write-plan
input: { path, answers }
output: WritePlan

POST /api/bridge/backup
input: { planId, confirmationToken }
output: BackupResult

POST /api/bridge/apply-write-plan
input: { planId, confirmationToken }
output: ApplyWritePlanResult

POST /api/bridge/generate
input: { planId, confirmationToken }
output: GenerateProjectResult

POST /api/bridge/asc/connect
input: { issuerId, keyId, appAppleId?, bundleId?, privateKeyInput, confirmationToken }
output: AppStoreConnectConnectionResult

POST /api/bridge/asc/read
input: {}
output: AppStoreConnectReadResult

POST /api/bridge/asc/build-update-plan
input: { answers, appIconPath?, appName?, appDescription?, ... }
output: AppStoreConnectUpdatePlan

POST /api/bridge/asc/update-draft
input: { planId, confirmationToken }
output: AppStoreConnectUpdateResult

POST /api/bridge/asc/build-media-upload-plan
input: { screenshotPaths?, appPreviewPaths?, screenshotDisplayType?, previewType?, previewFrameTimeCode?, locale? }
output: AppStoreConnectMediaUploadPlan

POST /api/bridge/asc/upload-media
input: { planId, confirmationToken }
output: AppStoreConnectMediaUploadResult

POST /api/bridge/asc/build-review-submit-plan
input: {}
output: AppStoreConnectReviewSubmissionPlan

POST /api/bridge/asc/submit-review
input: { planId, confirmationToken }
output: AppStoreConnectReviewSubmissionResult
```

P1 계약 불일치: `server/bridge/policy.mjs:142-177`에는 media/review endpoint가 있지만, `server/bridge/capabilities.mjs:3-109`의 capability 목록에는 `/api/bridge/asc/build-media-upload-plan`, `/api/bridge/asc/upload-media`, `/api/bridge/asc/build-review-submit-plan`, `/api/bridge/asc/submit-review`가 없다. UI/클라이언트가 capabilities를 신뢰하면 기능 탐지가 거짓 음성이 될 수 있다.

#### 2.2 제안 API Contract

공통 오류 계약:

```json
{
  "ok": false,
  "error": {
    "code": "ASC_RATE_LIMITED",
    "message": "사용자 표시 메시지",
    "retryable": true,
    "retryAfterMs": 60000,
    "operationId": "update-whats-new",
    "runId": "run_...",
    "safeDetails": {}
  }
}
```

모든 mutation endpoint는 다음 필드를 입력으로 받는다.

```json
{
  "planId": "plan_...",
  "confirmationToken": "CONFIRM_...",
  "idempotencyKey": "sha256(client-intent)",
  "expectedPlanRevision": 3
}
```

모든 mutation result는 다음 필드를 포함한다.

```json
{
  "ok": true,
  "runId": "run_...",
  "planId": "plan_...",
  "idempotencyKey": "sha256(client-intent)",
  "status": "succeeded",
  "operationResults": [
    {
      "operationId": "update-support-url",
      "status": "succeeded",
      "resourceType": "appStoreVersionLocalizations",
      "resourceId": "version-loc-1",
      "attemptCount": 1,
      "verifiedAt": "2026-06-10T..."
    }
  ]
}
```

### 3. Idempotency 설계

#### 3.1 현재 상태

- `WritePlan.id`, `asc-plan-*`, `asc-media-*`, `asc-review-*`는 UUID 기반이다.
- `plans`, `updatePlans`, `mediaUploadPlans`, `reviewSubmissionPlans`는 프로세스 메모리 `Map`이다.
- `submitForReview()`는 기존 submission을 GET 후 없으면 POST하므로 제한적 멱등성 단서가 있다.
- `uploadMedia()`는 같은 plan을 두 번 실행하면 새 asset reservation과 upload가 반복될 수 있다.
- `updateDraft()`는 동일 PATCH 반복은 대개 같은 값이면 결과적으로 동일하지만, 부분 성공 후 실패/재시도 상태를 모델링하지 않는다.

근거:

- `server/writePlan.mjs:410`은 random UUID plan id를 만든다.
- `server/appStoreConnect.mjs:1017`, `1123`, `1069`는 ASC plan id를 random UUID로 만든다.
- `server/appStoreConnect.mjs:1439-1442`는 operation을 순차 적용하며 실패 시 중간 결과를 반환하지 못한다.
- `server/appStoreConnect.mjs:1465-1481`은 media asset을 매번 reservation/upload/commit한다.
- `server/appStoreConnect.mjs:1502-1518`은 기존 submission을 조회하고 없을 때 생성한다.

#### 3.2 제안 상태

멱등성 키:

```text
idempotencyKey = sha256(
  actionKind + appId + appStoreVersionId + appStoreVersionLocalizationId +
  canonicalizedOperations + localFileFingerprints + userApprovalNonce
)
```

서버 저장소:

- 로컬 bridge는 secret을 저장하지 않는 `RunLedger`를 둔다.
- 위치 후보: `~/.ios-release-assistant/ledger/<sessionId>/runs/*.json`.
- 저장 항목: plan hash, operation statuses, sanitized request/response ids, retry schedule, terminal result.
- 저장 금지: private key 원문, demo account password 원문, upload URL의 sensitive query가 있다면 전체 URL 대신 host/path hash.

반복 호출 처리:

- 같은 `idempotencyKey`와 같은 `planHash`가 `succeeded`이면 기존 terminal result 반환.
- 같은 key가 `running`이면 409 또는 202 + `runId` 반환.
- 같은 key지만 다른 `planHash`이면 409 `IDEMPOTENCY_CONFLICT`.
- 부분 성공이면 `resume=true`일 때 pending/failed retryable operation만 재실행한다.

수용 기준:

- 같은 `/asc/update-draft` 요청 2회는 ASC PATCH를 두 번 호출하지 않는다.
- 같은 `/asc/upload-media` 요청 2회는 동일 checksum asset이 이미 ready이면 reservation/upload를 반복하지 않고 `already_uploaded` 결과를 반환한다.
- 서버 재시작 후에도 완료된 run은 조회 가능하고, secret은 ledger에 존재하지 않는다.

### 4. Draft/App Version 상태머신

#### 4.1 현재 상태

현재 `EDITABLE_APP_STORE_STATES`는 update/media/submit guard에 함께 쓰인다.

```text
DEVELOPER_REJECTED
INVALID_BINARY
METADATA_REJECTED
PREPARE_FOR_SUBMISSION
REJECTED
WAITING_FOR_EXPORT_COMPLIANCE
```

근거:

- `server/appStoreConnect.mjs:61-68`은 editable state set을 정의한다.
- `server/appStoreConnect.mjs:281-287`은 editable state가 있으면 그 버전을 선택하고, 없으면 첫 버전을 선택한다.
- `server/appStoreConnect.mjs:1057-1065`는 review submit plan에서 editable set 밖의 상태만 막는다.
- `server/appStoreConnect.mjs:1089-1092`는 media upload도 같은 editable set으로 막는다.

문제:

- `READY_FOR_REVIEW`가 set에 없다. Apple 도움말은 Ready for Review를 required metadata를 입력했고 아직 제출 전인 상태로 설명한다.
- `INVALID_BINARY`나 `WAITING_FOR_EXPORT_COMPLIANCE`를 review submit 가능 상태로 취급하는 것은 너무 넓다.
- App metadata edit 가능, media edit 가능, review submit 가능은 서로 다른 권한/상태다.

Apple 근거:

- Apple App Store Connect Help는 Prepare for Submission, Ready for Review, Invalid Binary, Waiting for Review 등 상태를 분리하고, Waiting for Review에서는 screenshot/app preview 업로드나 편집이 불가능하다고 설명한다.
- Apple App Review 문서는 review 정보가 누락되면 심사가 지연되거나 통과하지 못할 수 있고, 로그인 기능이 있으면 유효한 demo account를 제공해야 한다고 설명한다.

#### 4.2 제안 상태머신

ASC version 상태를 다음 capability로 정규화한다.

```text
AscVersionCapability
- canEditAppInfo
- canEditVersionLocalization
- canUploadScreenshots
- canUploadAppPreviews
- canAttachBuild
- canSubmitForReview
- canRemoveFromReview
```

정규화 규칙:

```text
PREPARE_FOR_SUBMISSION:
  canEditAppInfo=true
  canEditVersionLocalization=true
  canUploadMedia=true
  canSubmitForReview=false until ReviewGate.ready=true

READY_FOR_REVIEW:
  canEditAppInfo=true
  canEditVersionLocalization=true
  canUploadMedia=true
  canSubmitForReview=true when ReviewGate.ready=true

METADATA_REJECTED | REJECTED | DEVELOPER_REJECTED:
  canEditAppInfo=true
  canEditVersionLocalization=true
  canUploadMedia=true subject to ASC response
  canSubmitForReview=true only after rejection issues are acknowledged/resolved

INVALID_BINARY:
  canEditMetadata=true
  canSubmitForReview=false until a valid build is attached

WAITING_FOR_EXPORT_COMPLIANCE:
  canEdit limited metadata only
  canUploadMedia=false
  canSubmitForReview=false

WAITING_FOR_REVIEW | IN_REVIEW | ACCEPTED | PENDING_* | READY_FOR_DISTRIBUTION:
  canUploadMedia=false
  canSubmitForReview=false
```

수용 기준:

- build update plan, media upload plan, review submit plan은 동일 `EDITABLE_APP_STORE_STATES`를 공유하지 않는다.
- `/asc/build-review-submit-plan`은 `ReviewGate.ready=false` 또는 `canSubmitForReview=false`면 409와 blockers를 반환한다.
- `/asc/build-media-upload-plan`은 Waiting for Review/In Review 상태에서 409를 반환한다.

### 5. ASC API 실패 / 부분성공 / 재시도

#### 5.1 현재 상태

- `requestJson()`은 응답 JSON 파싱 후 `!ok`이면 단일 Error를 throw한다.
- `ascApiError()`는 첫 번째 Apple error만 사용자 메시지로 만든다.
- `updateDraft()`는 operation을 순차 적용하고 첫 실패에서 throw되어 이미 성공한 operation을 응답으로 돌려주지 못한다.
- `uploadMedia()`는 screenshot들을 처리한 뒤 appPreview들을 처리한다. 중간 실패 시 이미 예약/업로드/commit된 asset 결과가 손실된다.
- `uploadAssetPart()`는 upload operation 실패 시 generic error만 반환한다.

근거:

- `server/appStoreConnect.mjs:620-634`, `189-197`, `636-645`, `1439-1442`, `1470-1481`.

#### 5.2 제안 실패 분류

```text
AuthPermanent:
  401, 403. 재시도 금지. credential/role 안내.

InputPermanent:
  400, 422. 재시도 금지. field-level validation 반환.

StateConflict:
  404 stale resource, 409 conflict. ASC snapshot refetch 후 plan 재생성.

RateLimited:
  429. Retry-After 또는 Apple rate limit headers를 우선 사용. 없으면 exponential backoff+jitter.

Transient:
  408, 425, 500, 502, 503, 504, network reset/timeout. bounded retry.

UploadTransient:
  upload operation URL PUT 실패. part 단위 retry 후 asset 상태 확인.
```

HTTP 429는 과도한 요청을 의미하며 `Retry-After`가 포함될 수 있으므로, 재시도 스케줄은 header를 우선해야 한다.

#### 5.3 제안 부분성공 모델

```text
OperationResult
- operationId
- status: pending | running | succeeded | failed_retryable | failed_terminal | skipped
- attemptCount
- lastErrorCode
- resourceId
- verifyStatus: not_checked | verified | mismatch
- startedAt, finishedAt
```

수용 기준:

- ASC draft update 중 11개 operation 중 7개 성공 후 8번째 500이면 API는 500 단일 error가 아니라 `partially_succeeded`와 성공 7개/실패 1개/pending 3개를 반환한다.
- `resume=true` 재시도는 성공 7개를 재호출하지 않는다.
- 모든 mutation 완료 후 `fetchEditableMetadata()`를 다시 호출해 실제 ASC 값이 proposed value와 일치하는지 검증한다.

### 6. Media Upload Checksum / Asset State

#### 6.1 현재 상태

- plan 생성 시 파일 존재/크기/확장자를 검증한다.
- upload 실행 시 App Screenshot/App Preview asset reservation을 만들고, `uploadOperations`의 offset/length를 읽어 PUT한다.
- 파일 MD5를 계산해 `sourceFileChecksum`으로 commit한다.
- 결과 state는 screenshot의 `assetDeliveryState` 또는 preview의 `videoDeliveryState/assetDeliveryState`에서 가져온다.

근거:

- `server/appStoreConnect.mjs:561-577`은 파일 검증을 수행한다.
- `server/appStoreConnect.mjs:1248-1260`은 uploadOperations를 순차 실행한다.
- `server/appStoreConnect.mjs:1271-1292`은 screenshot upload 후 MD5 checksum으로 commit한다.
- `server/appStoreConnect.mjs:1303-1327`은 app preview upload 후 checksum과 frame time으로 commit한다.
- `server/bridge/bridgeApi.test.mjs:1580-1835`는 screenshot checksum/commit을 검증한다.
- `server/bridge/bridgeApi.test.mjs:2082-2404`는 screenshot+preview 혼합 업로드를 검증한다.

#### 6.2 현재 결함과 리스크

- plan 생성 후 upload 전 파일이 바뀌어도 감지하지 못한다.
- `readFileRange()`가 요청된 `length`보다 적게 읽어도 실패하지 않는다.
- 같은 파일/같은 checksum 재업로드 시 기존 asset을 재사용하지 않고 중복 생성할 수 있다.
- asset commit 후 state가 `UPLOAD_COMPLETE` 또는 `READY`인지에 대한 통합 상태 모델이 없다.
- 현재 테스트는 app preview의 `videoDeliveryState: READY`를 raw로 반환하는 코드와 `UPLOAD_COMPLETE`를 기대하는 테스트가 충돌한다.

#### 6.3 제안 MediaAsset 상태머신

```text
MediaAssetPlan
- assetPlanId
- kind: screenshot | appPreview
- localFile: { path, fileName, size, md5, sha256, mtimeMs }
- ascSet: { type, id, displayType | previewType }
- replacementPolicy: skip_if_same_checksum | require_user_choice | delete_and_replace
- status:
  planned
  existing_ready
  reserved
  uploading_parts
  uploaded_parts
  committed
  processing
  ready
  failed_retryable
  failed_terminal
```

수용 기준:

- plan 생성 시 MD5/sha256/size/mtime를 저장하고 upload 직전 다시 비교한다.
- upload operation의 `bytesRead !== length`이면 commit하지 않고 `failed_retryable` 또는 `file_changed`로 중단한다.
- 기존 set의 included assets에 같은 `sourceFileChecksum`과 terminal ready state가 있으면 `existing_ready`로 skip한다.
- commit 후 terminal state가 아니면 polling job을 생성하고 `processing`을 반환한다.
- screenshot은 `assetDeliveryState`, app preview는 `videoDeliveryState`와 `assetDeliveryState`를 모두 raw로 보존하고, UI용 `normalizedState`를 별도 계산한다.

### 7. Review Submission Gate

#### 7.1 현재 상태

현재 review submit plan은 metadata의 `appStoreVersion` 존재와 state set만 확인하고, 실제 제출 필수 조건은 gate로 검증하지 않는다.

근거:

- `server/appStoreConnect.mjs:1048-1080`은 version 존재와 state만 보고 review plan을 만든다.
- `server/appStoreConnect.mjs:1492-1530`은 planId/confirmation만 있으면 기존 submission 조회 후 없을 때 생성한다.
- `src/data/preflightChecks.ts:147-282`는 privacy URL, icon, screenshots, demo account, backup 등을 사용자 체크리스트로 다루지만 ASC snapshot과 연결되지 않는다.
- `src/data/changeReviewSummary.ts:206-353`은 ASC 제출 준비 항목을 표시하지만 hard gate는 아니다.

#### 7.2 제안 ReviewGate 모델

```text
ReviewSubmissionGate
- gateId
- appId
- appStoreVersionId
- scanSnapshotId
- ascSnapshotId
- status: blocked | needs_manual_confirmation | ready
- hardBlockers[]
- warnings[]
- manualAssertions[]
- evidence:
  - buildAttachedAndProcessed
  - appInfoLocalizationComplete
  - versionLocalizationComplete
  - privacyPolicyUrlReachable
  - supportUrlReachable
  - screenshotsReadyByDisplayType
  - appPreviewReadyIfSelected
  - reviewDetailComplete
  - demoAccountValidWhenRequired
  - exportComplianceResolvedOrNotRequired
  - contentRights/ageRating/pricing/manual evidence
```

수용 기준:

- `/asc/build-review-submit-plan`은 `ReviewSubmissionGate.status === ready`인 `gateId`를 요구한다.
- 로그인 필요인데 demo account name/password가 없으면 P0 hard blocker다.
- screenshot/app preview upload run이 `processing`이면 submit 불가다.
- ASC snapshot을 gate 생성 후 다시 읽어 `appStoreVersionId`, state, localization, media state가 변하지 않았는지 확인한다.
- 제출 직전 `readExistingSubmission()` 결과가 있으면 새 submission을 만들지 않고 기존 submission state를 반환한다.

### 8. Existing Tests: 검증되는 것

#### 8.1 파일 스캔 / 릴리스 데이터

- `src/data/appScanSummary.test.ts:16-44`: scan 결과에서 앱 이름, bundle id, version/build, team, plist, entitlements, app icon, screenshot, privacy/capabilities를 요약한다.
- `src/data/appScanSummary.test.ts:46-68`: 자동 web capture를 App Store screenshot preview로 쓰지 않는다.
- `src/data/appScanSummary.test.ts:72-100`: Info.plist 누락은 error, entitlements 누락은 warn, marketing icon 누락은 warn이다.
- `src/data/appScanSummary.test.ts:102-174`: 명시 답변/수동 확인으로 preflight check를 닫을 수 있고, 로그인 필요 없음이면 demo account를 요구하지 않는다.
- `src/data/appScanSummary.test.ts:177-203`: scan 값이 release steps의 basic/privacy/capabilities/store에 반영된다.

#### 8.2 Review Summary

- `src/data/changeReviewSummary.test.ts:20-76`: review gate가 file/ASC/command 섹션으로 나뉜다.
- `src/data/changeReviewSummary.test.ts:78-93`: demo account 세부 내용은 summary에 노출하지 않는다.
- `src/data/changeReviewSummary.test.ts:95-118`: review notes를 ASC summary에 포함한다.
- `src/data/changeReviewSummary.test.ts:120-145`: 현재값과 제안값이 같으면 unchanged이며 샘플 기본값을 사용자 변경으로 취급하지 않는다.
- `src/data/changeReviewSummary.test.ts:147-164`: privacy policy URL 같은 필수 제출 필드는 입력 전 blocked다.

#### 8.3 Bridge / Write / Generate

- `server/bridge/bridgeApi.test.mjs:299-339`: pairing 후 fixture folder scan이 project/privacy/entitlements/icon을 반환한다.
- `server/bridge/bridgeApi.test.mjs:341-371`: `project.yml` 직접 경로도 앱 루트로 처리한다.
- `server/bridge/bridgeApi.test.mjs:373-413`: private key/API key/token/demo password 형태 redaction.
- `server/bridge/bridgeApi.test.mjs:415-506`: write plan 생성, confirmation 없는 backup reject, backup 생성, apply 후 rescan verification.
- `server/bridge/bridgeApi.test.mjs:508-564`: generate confirmation, generate backup, xcodegen 실행 결과.

#### 8.4 App Store Connect 정상 경로

- `server/bridge/bridgeApi.test.mjs:566-672`: ASC connect/read, JWT header/payload, private key 비노출.
- `server/bridge/bridgeApi.test.mjs:674-1026`: draft metadata update plan/apply 정상 경로를 기대한다. 단, 현 작업트리에서는 실패한다.
- `server/bridge/bridgeApi.test.mjs:1028-1234`: review account required/name/password update와 password redaction.
- `server/bridge/bridgeApi.test.mjs:1236-1428`: review memo update.
- `server/bridge/bridgeApi.test.mjs:1430-1578`: review detail 누락 시 review notes manual item.
- `server/bridge/bridgeApi.test.mjs:1580-1835`: screenshot media plan/upload/checksum/commit.
- `server/bridge/bridgeApi.test.mjs:1837-2080`: invalid/valid app preview frame time.
- `server/bridge/bridgeApi.test.mjs:2082-2404`: screenshot+appPreview 혼합 upload.
- `server/bridge/bridgeApi.test.mjs:2406-2619`: review submission plan과 submit payload.

### 9. Existing Tests: 비는 것

P0/P1로 채워야 할 테스트 공백:

- ASC API 429/5xx/network timeout 재시도, `Retry-After`, exponential backoff, retry budget.
- 401/403/400/422/409/404 분류와 사용자 메시지/재시도 금지 여부.
- updateDraft 부분 성공 후 실패 응답과 resume.
- 동일 idempotency key 반복 호출 시 외부 API 중복 호출 방지.
- 서버 재시작 후 plan/run 조회 또는 안전한 만료 처리.
- non-editable/submittable state별 build/update/media/submit gate.
- media upload 중 part upload 실패, commit 실패, asset state `PROCESSING`/`FAILED`/non-terminal polling.
- plan 생성 후 파일 변경, short read, checksum mismatch.
- 기존 screenshot/appPreview set에 같은 checksum이 있을 때 skip.
- bridge capabilities와 policy endpoint 목록 동기화.
- scan symlink loop, permission denied, 다중 application target, 다중 localization, malformed plist/yaml.
- Info.plist 권한 key 존재 여부뿐 아니라 앱 코드 사용 API와 purpose string 일치성.
- icon/screenshot 실제 픽셀 크기/기기 타입 검증.
- write apply 중간 실패 시 rollback/restore 안내.
- review submission gate: build selected/processed, required metadata, privacy/support URL reachability, demo account validity, media terminal state.

### 10. 현 작업트리 테스트 결과

실행:

```text
npm test
```

결과:

```text
Test Files  1 failed | 2 passed (3)
Tests       3 failed | 36 passed (39)
```

실패:

- `server/bridge/bridgeApi.test.mjs:861`: App Store Connect draft metadata update plan이 200을 기대하지만 500을 반환했다.
- `server/bridge/bridgeApi.test.mjs:1544`: review detail 누락 시 기대 manual item은 `review-notes` 하나인데 현재 `demo-account`도 추가된다.
- `server/bridge/bridgeApi.test.mjs:2374`: mixed media upload에서 app preview state 기대값은 `UPLOAD_COMPLETE`인데 현재 반환은 `READY`다.

P0 해석:

- `server/appStoreConnect.mjs:797-807`과 `820-830`에서 `addAscOperation()` 호출 시 첫 번째 인자인 `operations` 배열이 빠져 있다. 이 경로는 privacy choices/text가 포함된 update plan을 500으로 만들 수 있다.
- review detail이 없을 때 demo account manual item을 언제 추가해야 하는지 조건이 테스트 기대와 구현 사이에서 불명확하다.
- app preview의 `videoDeliveryState`와 `assetDeliveryState`를 어떤 normalized state로 반환할지 계약이 없다.

### 11. P0/P1 Risks and Acceptance Criteria

#### P0-1. ASC draft update plan이 특정 privacy 입력에서 500을 낸다

근거:

- `server/appStoreConnect.mjs:797-807`, `820-830`의 `addAscOperation()` 호출이 `operations` 배열 없이 실행된다.
- `npm test`에서 `server/bridge/bridgeApi.test.mjs:861` 실패.

수용 기준:

- privacy choices URL과 privacy policy text가 포함된 `/api/bridge/asc/build-update-plan`이 200을 반환한다.
- 해당 operation이 `operationCount`와 `operations[]`에 포함된다.
- `npm test`가 통과한다.

#### P0-2. ASC mutation 부분 성공이 사용자에게 손실된다

근거:

- `server/appStoreConnect.mjs:1439-1442`는 순차 PATCH 중 첫 실패에서 throw되어 성공한 operation 기록을 응답하지 못한다.
- media upload도 중간 실패 시 이미 생성/commit된 asset 결과를 잃는다.

수용 기준:

- 모든 ASC mutation은 `AscMutationRun`으로 실행되고 per-operation result를 반환한다.
- 실패 주입 테스트에서 `partially_succeeded`와 성공/실패/pending 목록이 보인다.
- retry는 성공한 operation을 재호출하지 않는다.

#### P0-3. Media upload가 중복/손상/비완료 asset을 만들 수 있다

근거:

- `server/appStoreConnect.mjs:1248-1260`은 `uploadOperations`를 수행하지만 short read 검증이 없다.
- `server/appStoreConnect.mjs:1272`, `1304`는 upload 실행 시점에 checksum을 계산하므로 plan 후 파일 변경을 선제 차단하지 못한다.
- 기존 set의 included asset checksum 재사용/skip 모델이 없다.

수용 기준:

- plan에 파일 fingerprint가 저장되고 upload 직전 불일치 시 409로 중단한다.
- short read, upload part 실패, commit 실패 테스트가 모두 실패 상태를 구조화해 반환한다.
- 동일 checksum의 ready asset은 skip하고 중복 reservation을 만들지 않는다.
- app preview/screenshot raw state와 normalized state가 모두 반환된다.

#### P0-4. Review submission gate가 실제 제출 준비를 보장하지 못한다

근거:

- `server/appStoreConnect.mjs:1048-1080`은 appStoreVersion 존재와 state만으로 submit plan을 만든다.
- `src/data/preflightChecks.ts:147-282`는 사용자의 체크리스트이며 ASC remote state와 결합되지 않는다.
- Apple App Review 문서는 incomplete information, broken links, demo account 누락이 review 지연/실패 원인이 될 수 있다고 설명한다.

수용 기준:

- submit endpoint는 `ReviewSubmissionGate.ready` 없이는 실행되지 않는다.
- hard blockers: build 미선택/미처리, required metadata 누락, privacy/support URL 미검증, 로그인 필요 demo account 누락, media processing 미완료, App Store state 불가.
- gate 증거는 ASC snapshot id와 scan snapshot id를 포함한다.

#### P0-5. App Store state capability가 너무 거칠다

근거:

- `EDITABLE_APP_STORE_STATES` 하나가 update/media/submit에 공통 사용된다.
- Apple status 문서는 Waiting for Review 상태에서 screenshot/app preview 업로드/편집이 불가능하다고 설명한다.

수용 기준:

- `canEditMetadata`, `canUploadMedia`, `canSubmitForReview`를 분리한다.
- state별 unit test가 PREPARE/READY/WAITING/IN_REVIEW/REJECTED/INVALID_BINARY를 커버한다.

#### P1-1. Bridge capabilities가 실제 구현 endpoint와 불일치한다

근거:

- `server/bridge/policy.mjs:142-177`에는 media/review endpoint가 존재한다.
- `server/bridge/capabilities.mjs:3-109`에는 해당 endpoint가 빠져 있다.

수용 기준:

- capabilities 목록과 policy 목록이 단일 소스에서 생성되거나 snapshot test로 동기화된다.

#### P1-2. Plan/Run이 메모리 전용이다

근거:

- `server/writePlan.mjs:510-547`, `server/appStoreConnect.mjs:615-618`은 `Map`만 사용한다.

수용 기준:

- secret 없는 plan/run ledger가 도입된다.
- 만료 정책과 재시작 후 UX가 명시된다.

#### P1-3. 오류 응답이 API 계약으로 충분하지 않다

근거:

- `server/local-server.mjs:369-530`은 대부분 `{ ok:false, error:string }`만 반환한다.

수용 기준:

- `error.code`, `retryable`, `retryAfterMs`, `operationId`, `safeDetails`를 포함한다.

#### P1-4. Scan 모델이 첫 target/localization에 의존한다

근거:

- `src/data/appScanSummary.ts:51-56`과 `server/writePlan.mjs:81-86`은 첫 application target 또는 첫 target을 선택한다.
- `src/data/appScanSummary.ts:63-81`은 경로 매칭 실패 시 첫 파일을 사용한다.

수용 기준:

- target selection이 명시적이고, 다중 target/다중 plist/다중 entitlements fixture 테스트가 있다.

#### P1-5. Store media 품질 검증이 파일 후보 수준이다

근거:

- `server/scanFolder.mjs:365-401`은 경로/파일명 패턴으로 screenshot 후보를 찾는다.
- `server/appStoreConnect.mjs:561-577`은 확장자/크기만 검사한다.

수용 기준:

- screenshot pixel dimensions, app preview duration/codec/size, icon 1024x1024 실제 픽셀 검증을 별도 validator로 둔다.

### 12. PRD Acceptance Criteria

최종 PRD에 포함할 Data/Backend 수용 기준:

- `npm test` 통과.
- ASC 실패 주입 테스트 20개 이상: 401/403/404/409/422/429/5xx/network/upload URL failure.
- idempotency 테스트: update/media/submit 각각 동일 key 재호출 시 외부 API 중복 없음.
- partial success 테스트: update와 media에서 성공/실패/pending operation이 구조화되어 반환되고 resume 가능.
- media checksum 테스트: file changed, short read, duplicate checksum, non-terminal state polling.
- review gate 테스트: blocker별 409, ready gate 성공, stale snapshot 거부.
- state machine 테스트: 각 ASC state별 update/media/submit capability.
- ledger redaction 테스트: private key/demo password/upload secret URL 원문이 저장되지 않음.
- capabilities-policy sync 테스트.
- scan 다중 target/localization/path traversal/permission/malformed file 테스트.

## Evidence

- `server/appStoreConnect.mjs:61-68` - 현재 editable state set.
- `server/appStoreConnect.mjs:604-619` - ASC session과 plan Map이 메모리 전용.
- `server/appStoreConnect.mjs:680-709` - editable metadata snapshot 수집.
- `server/appStoreConnect.mjs:711-1030` - draft metadata update plan 생성.
- `server/appStoreConnect.mjs:797-807`, `820-830` - 현 작업트리 P0: `addAscOperation()` 인자 누락.
- `server/appStoreConnect.mjs:1083-1151` - media upload plan 생성.
- `server/appStoreConnect.mjs:1248-1327` - asset reservation/upload/commit/checksum.
- `server/appStoreConnect.mjs:1430-1530` - update/upload/submit 실행.
- `server/scanFolder.mjs:687-824` - folder scan 결과 생성.
- `server/writePlan.mjs:400-547` - write plan, backup, apply, in-memory manager.
- `server/generateProject.mjs:92-155` - xcodegen generate 실행.
- `src/types.ts:352-599` - 프론트/서버 공유 도메인 타입.
- `src/data/appScanSummary.ts:100-150` - scan summary read model.
- `src/data/preflightChecks.ts:120-303` - preflight gate.
- `src/data/changeReviewSummary.ts:92-414` - review summary.
- `server/bridge/policy.mjs:4-177` - endpoint policy.
- `server/bridge/capabilities.mjs:3-109` - capability 목록, media/review 누락.
- `npm test` - 3 failed, 36 passed, 2026-06-10 실행.

## References

- Apple Developer, App Store Connect API: https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api/
- Apple Developer, App and submission statuses: https://developer.apple.com/help/app-store-connect/reference/app-information/app-and-submission-statuses/
- Apple Developer, Uploading Assets to App Store Connect: https://developer.apple.com/documentation/appstoreconnectapi/uploading-assets-to-app-store-connect
- Apple Developer, Identifying Rate Limits: https://developer.apple.com/documentation/appstoreconnectapi/identifying-rate-limits
- MDN, 429 Too Many Requests: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429

## Risks / Gaps

- 이 문서는 Feynman/Data Backend 전문 분석안이다. `goal-pomfsdev-prd-plan`의 전체 리더 합성 PRD가 되려면 Security/SRE, Client/PWA, Critical Audit 결과와 통합해야 한다.
- Apple 문서의 일부 App Store Connect API 페이지는 JS 렌더링 문서라 상세 필드는 검색 결과/공식 Help 문서와 현재 코드의 API 사용 형태를 함께 근거로 삼았다.
- 현 작업트리는 이미 dirty 상태였으며, 제품 코드 변경 없이 현재 파일 내용 기준으로 분석했다.

## Follow-Up

- P0-1의 현 테스트 실패를 먼저 제거한 뒤, idempotency/partial success/media state/review gate 설계를 구현 PRD의 milestone 1로 둔다.
- 이후 P1인 capabilities sync, persistent ledger, scan target selection, media dimension validation을 milestone 2로 둔다.
- 전체 goal PRD에는 이 보고서를 Data/Backend 섹션의 원문 근거로 편입하고, Hypatia audit에서 P0/P1 gate 문구를 재검증한다.
