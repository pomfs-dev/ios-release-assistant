# Contributing

## 한국어

기여 전에 아래 항목을 확인해 주세요.

### 기본 검증

```bash
npm test
npm run build
git diff --check
```

### 커밋 전 점검

로컬 환경 파일, App Store Connect key, provisioning profile, 빌드 산출물, Xcode 사용자 상태는 커밋하지 않습니다.

```bash
git status --short --ignored
git ls-files | rg -i '(\.env|\.p8|\.pem|private|secret|token|mobileprovision|xcuserdata|xcarchive|ipa)'
```

두 번째 명령에는 `.env.example`과 의도한 테스트 fixture만 나와야 합니다.

### 보안 원칙

- Apple ID 비밀번호를 입력하거나 저장하지 않습니다.
- App Store Connect `.p8` private key는 로컬 세션에서만 사용합니다.
- 실제 private key, JWT, demo account password, provisioning profile은 fixture나 문서에 넣지 않습니다.
- 파일 변경은 write plan, 백업, 사용자 승인 뒤에만 진행합니다.

---

## English

Please check the following before contributing.

### Basic validation

```bash
npm test
npm run build
git diff --check
```

### Before committing

Do not commit local environment files, App Store Connect keys, provisioning profiles, build artifacts, or Xcode user state.

```bash
git status --short --ignored
git ls-files | rg -i '(\.env|\.p8|\.pem|private|secret|token|mobileprovision|xcuserdata|xcarchive|ipa)'
```

Only `.env.example` and intentional test fixtures should appear in the second command.

### Security principles

- Do not ask for or store Apple ID passwords.
- Use App Store Connect `.p8` private keys only for the local session.
- Do not put real private keys, JWTs, demo account passwords, or provisioning profiles in fixtures or documentation.
- Apply file changes only after a write plan, backup, and explicit user approval.
