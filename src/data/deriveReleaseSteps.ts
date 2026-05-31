import type { FieldDefinition, FolderScanResult, StepDefinition, StepStatus } from "../types";
import { formatScanList, getAppScanSummary } from "./appScanSummary";
import { releaseSteps } from "./releaseSteps";

function statusFrom(found: boolean): StepStatus {
  return found ? "done" : "warning";
}

function updateTextField(
  fields: FieldDefinition[],
  label: string,
  value: string | null,
  helper?: string,
) {
  return fields.map((field) =>
    field.label === label ? { ...field, value: value ?? "", helper: helper ?? field.helper } : field,
  );
}

function readablePath(path: string | null, missing: string) {
  return path ?? missing;
}

function privacyFields(summary: NonNullable<ReturnType<typeof getAppScanSummary>>) {
  const permissionFields: FieldDefinition[] =
    summary.privacyKeys.length > 0
      ? summary.privacyKeys.slice(0, 5).map((permission) => ({
          kind: "textarea",
          label: `${permission.label} 권한 문구`,
          value: permission.value,
          helper: permission.key,
        }))
      : [
          {
            kind: "textarea",
            label: "권한 문구",
            placeholder: "Info.plist에서 권한 문구를 찾지 못했습니다.",
            helper: "확인 필요",
          },
        ];

  return [
    ...permissionFields,
    {
      kind: "text",
      label: "개인정보 처리방침 주소",
      placeholder: "https://example.com/privacy",
      helper: "필수",
    },
    {
      kind: "note",
      value: summary.infoPlist
        ? `${summary.infoPlist} 파일에서 권한 문구를 읽었습니다. 개인정보 처리방침 URL은 App Store Connect에 별도로 입력해야 합니다.`
        : "Info.plist를 찾지 못했습니다. 권한 팝업 문구는 앱 정보 파일에 있어야 합니다.",
    },
  ] satisfies FieldDefinition[];
}

function capabilityFields(summary: NonNullable<ReturnType<typeof getAppScanSummary>>) {
  const hasAppleSignIn = summary.capabilities.some(
    (capability) => capability.key === "com.apple.developer.applesignin",
  );
  const hasAssociatedDomains = summary.capabilities.some(
    (capability) => capability.key === "com.apple.developer.associated-domains",
  );
  const hasPush = summary.capabilities.some((capability) => capability.key === "aps-environment");

  return [
    {
      kind: "choices",
      multi: true,
      choices: [
        {
          title: "Apple 로그인 사용",
          copy: hasAppleSignIn
            ? "Entitlements 파일에서 Apple 로그인 권한을 찾았습니다."
            : "Apple로 로그인 버튼이 있는 앱이면 켜야 합니다.",
          active: hasAppleSignIn,
        },
        {
          title: "웹사이트 링크 연결",
          copy: hasAssociatedDomains
            ? formatScanList(summary.associatedDomains, "Associated Domains 값 확인 필요", 2)
            : "웹 링크를 누르면 앱으로 열리게 할 때 사용합니다.",
          active: hasAssociatedDomains,
        },
        {
          title: "Push 알림",
          copy: hasPush
            ? "Entitlements 파일에서 Push 알림 환경을 찾았습니다."
            : "서버에서 사용자에게 알림을 보낼 때 필요합니다.",
          active: hasPush,
        },
      ],
    },
    {
      kind: "text",
      label: "앱과 연결할 웹사이트 주소",
      value: formatScanList(summary.associatedDomains, "", 1),
      placeholder: "applinks:example.com",
      helper: "Domains",
    },
    {
      kind: "note",
      value: summary.entitlements
        ? `${summary.entitlements} 파일에서 Apple 기능 권한을 읽었습니다. 일부 기능은 Apple Developer 사이트 설정도 함께 필요합니다.`
        : "Entitlements 파일을 찾지 못했습니다. Apple 로그인, Associated Domains, Push 알림 사용 여부를 확인해야 합니다.",
    },
  ] satisfies FieldDefinition[];
}

function capabilityChangePreview(summary: NonNullable<ReturnType<typeof getAppScanSummary>>) {
  if (summary.capabilities.length === 0) {
    return `Apple 기능 권한 파일\n+ ${readablePath(summary.entitlements, "Entitlements 파일 없음")}\n+ 읽은 Apple 기능 없음`;
  }

  return [
    "Apple 기능 권한 파일",
    `+ 파일: ${summary.entitlements}`,
    ...summary.capabilities.map((capability) => `+ ${capability.key}: ${capability.value}`),
  ].join("\n");
}

function storeFields(summary: NonNullable<ReturnType<typeof getAppScanSummary>>) {
  const usesAppleSignIn = summary.capabilities.some(
    (capability) => capability.key === "com.apple.developer.applesignin",
  );
  const iconCopy = summary.hasMarketingAppIcon
    ? `${summary.appIconSet}에서 App Store용 1024x1024 아이콘을 찾았습니다.`
    : summary.appIconSet
      ? `${summary.appIconSet}은 찾았지만 App Store용 1024x1024 아이콘을 확인해야 합니다.`
      : "AppIcon.appiconset을 찾지 못했습니다. Xcode asset catalog에 앱 아이콘이 필요합니다.";

  return [
    {
      kind: "textarea",
      label: "App Store에 보일 앱 설명",
      value: "P.O.MFS 커뮤니티를 위한 콘텐츠와 멤버 경험을 제공합니다.",
    },
    {
      kind: "text",
      label: "심사용 데모 계정",
      placeholder: "review@example.com / password",
      helper: "로그인 필요 시",
    },
    {
      kind: "choices",
      label: "심사 접근 방식",
      choices: [
        {
          title: "로그인 필요",
          copy: "심사자가 앱 기능을 보려면 계정이 필요합니다.",
          active: usesAppleSignIn,
        },
        {
          title: "로그인 필요 없음",
          copy: "계정 없이도 심사자가 핵심 기능을 확인할 수 있습니다.",
        },
      ],
    },
    {
      kind: "choices",
      label: "App Store 미디어 자산",
      multi: true,
      choices: [
        {
          title: "스크린샷 준비 완료",
          copy: "App Store Connect에 올릴 스크린샷을 최소 1장 준비했습니다.",
        },
        {
          title: "iPad 스크린샷 준비 완료",
          copy: "iPad도 지원하는 앱이라면 iPad용 스크린샷도 준비했습니다.",
        },
        {
          title: "앱 미리보기 영상 준비",
          copy: "선택 사항인 앱 미리보기 영상을 준비할 계획입니다.",
        },
      ],
    },
    {
      kind: "note",
      value: `${iconCopy} 스크린샷과 앱 미리보기는 앱 파일이 아니라 App Store Connect 상품 페이지에 업로드하는 자산입니다.`,
    },
  ] satisfies FieldDefinition[];
}

export function deriveReleaseSteps(scanResult: FolderScanResult | null): StepDefinition[] {
  const summary = getAppScanSummary(scanResult);
  if (!summary) return releaseSteps;

  return releaseSteps.map((step) => {
    if (step.id === "basic") {
      const fieldsWithName = updateTextField(step.fields, "앱 이름", summary.appName);
      const fields = updateTextField(
        fieldsWithName,
        "앱 고유 주소",
        summary.bundleId,
        "project.yml",
      );

      return {
        ...step,
        status: statusFrom(Boolean(summary.bundleId && summary.xcodeProject && summary.infoPlist)),
        fields,
        targets: [
          ["설정 파일", readablePath(summary.projectSpec, "project.yml 없음")],
          ["Xcode 프로젝트", readablePath(summary.xcodeProject, ".xcodeproj 없음")],
          ["앱 정보 파일", readablePath(summary.infoPlist, "Info.plist 없음")],
        ],
        preview: {
          ...step.preview,
          appIconDataUrl: summary.appIconPreviewDataUrl,
          screenImageDataUrl: summary.screenPreviewDataUrl,
          screenImageLabel: summary.screenPreviewLabel,
          phoneName: summary.appName,
          alertTitle: `"${summary.appName}" 앱 이름을 확인했습니다`,
          alertCopy: summary.bundleId
            ? `앱 고유 주소는 ${summary.bundleId}입니다.`
            : "앱 고유 주소를 project.yml 또는 Info.plist에서 확인해야 합니다.",
          storeRows: [
            ["App Store 이름", summary.appName],
            ["앱 고유 주소", summary.bundleId ?? "확인 필요"],
            ["버전", `${summary.version ?? "확인 필요"} · build ${summary.build ?? "확인 필요"}`],
          ],
        },
        checks: [
          {
            status: summary.bundleId ? "ok" : "warn",
            title: summary.bundleId ? "앱 고유 주소 읽음" : "앱 고유 주소 확인 필요",
            copy: summary.bundleId ?? "project.yml 또는 Info.plist에 bundle id가 필요합니다.",
          },
          {
            status: summary.xcodeProject ? "ok" : "warn",
            title: summary.xcodeProject ? "Xcode 프로젝트 찾음" : "Xcode 프로젝트 없음",
            copy: readablePath(summary.xcodeProject, ".xcodeproj 파일을 찾지 못했습니다."),
          },
          {
            status: summary.infoPlist ? "ok" : "warn",
            title: summary.infoPlist ? "Info.plist 찾음" : "Info.plist 확인 필요",
            copy: readablePath(summary.infoPlist, "앱 정보 파일 후보를 찾지 못했습니다."),
          },
        ],
        changePreview: [
          "읽은 설정",
          `+ 앱 이름: ${summary.appName}`,
          `+ PRODUCT_BUNDLE_IDENTIFIER: ${summary.bundleId ?? "확인 필요"}`,
          `+ Xcode 프로젝트: ${summary.xcodeProject ?? "없음"}`,
          `+ Info.plist: ${summary.infoPlist ?? "없음"}`,
        ].join("\n"),
      };
    }

    if (step.id === "privacy") {
      const firstPrivacy = summary.privacyKeys[0];
      const privacyLabels = summary.privacyKeys.map((permission) => permission.label);

      return {
        ...step,
        status: statusFrom(Boolean(summary.infoPlist && summary.privacyKeys.length > 0)),
        fields: privacyFields(summary),
        targets: [
          ["저장 위치", readablePath(summary.infoPlist, "Info.plist 없음")],
          ["Xcode 탭", "Info"],
          ["App Store", "개인정보"],
        ],
        preview: {
          ...step.preview,
          appIconDataUrl: summary.appIconPreviewDataUrl,
          screenImageDataUrl: summary.screenPreviewDataUrl,
          screenImageLabel: summary.screenPreviewLabel,
          phoneName: summary.appName,
          alertTitle: firstPrivacy
            ? `"${summary.appName}"에서 ${firstPrivacy.label}에 접근하려고 합니다`
            : `"${summary.appName}" 권한 문구를 확인해야 합니다`,
          alertCopy: firstPrivacy?.value ?? "Info.plist에 사용자 권한 팝업 문구가 필요합니다.",
          storeRows: [
            ["권한 문구", formatScanList(privacyLabels)],
            ["앱 정보 파일", readablePath(summary.infoPlist, "확인 필요")],
            ["개인정보", "URL 입력 필요"],
          ],
        },
        checks: [
          {
            status: summary.infoPlist ? "ok" : "warn",
            title: summary.infoPlist ? "Info.plist 찾음" : "Info.plist 확인 필요",
            copy: readablePath(summary.infoPlist, "앱 정보 파일 후보를 찾지 못했습니다."),
          },
          {
            status: summary.privacyKeys.length > 0 ? "ok" : "warn",
            title:
              summary.privacyKeys.length > 0
                ? `권한 문구 ${summary.privacyKeys.length}개 읽음`
                : "권한 문구 확인 필요",
            copy:
              summary.privacyKeys.length > 0
                ? formatScanList(privacyLabels, "권한 문구 있음", 5)
                : "카메라, 사진, 위치 같은 권한을 쓰면 설명 문구가 필요합니다.",
          },
          {
            status: "warn",
            title: "Privacy Policy URL 필요",
            copy: "App Store Connect에 입력할 주소가 필요합니다.",
          },
        ],
        changePreview: [
          "앱 정보 파일",
          `+ 파일: ${summary.infoPlist ?? "없음"}`,
          ...(summary.privacyKeys.length > 0
            ? summary.privacyKeys.map((permission) => `+ ${permission.key}: ${permission.value}`)
            : ["+ 권한 문구 확인 필요"]),
        ].join("\n"),
      };
    }

    if (step.id === "capabilities") {
      const capabilityLabels = summary.capabilities.map((capability) => capability.label);

      return {
        ...step,
        status: statusFrom(Boolean(summary.entitlements && summary.capabilities.length > 0)),
        fields: capabilityFields(summary),
        targets: [
          ["저장 위치", readablePath(summary.entitlements, "Entitlements 파일 없음")],
          ["Xcode 탭", "Capabilities"],
          ["Apple 사이트", "Identifiers"],
        ],
        preview: {
          ...step.preview,
          appIconDataUrl: summary.appIconPreviewDataUrl,
          screenImageDataUrl: summary.screenPreviewDataUrl,
          screenImageLabel: summary.screenPreviewLabel,
          phoneName: summary.appName,
          alertTitle:
            summary.capabilities.length > 0
              ? `${formatScanList(capabilityLabels, "Apple 기능", 3)} 기능을 찾았습니다`
              : "Apple 기능 권한 파일을 확인해야 합니다",
          alertCopy: summary.entitlements
            ? `${summary.entitlements} 파일 기준으로 표시합니다.`
            : "Entitlements 파일을 찾지 못했습니다.",
          storeRows: [
            ["Apple 기능", formatScanList(capabilityLabels)],
            ["권한 파일", readablePath(summary.entitlements, "확인 필요")],
            ["웹사이트 링크", formatScanList(summary.associatedDomains, "선택 전", 1)],
          ],
        },
        checks: [
          {
            status: summary.entitlements ? "ok" : "warn",
            title: summary.entitlements ? "Entitlements 파일 찾음" : "Entitlements 파일 없음",
            copy: readablePath(summary.entitlements, "Apple 기능 권한 파일을 찾지 못했습니다."),
          },
          {
            status: summary.capabilities.length > 0 ? "ok" : "warn",
            title:
              summary.capabilities.length > 0
                ? `Apple 기능 ${summary.capabilities.length}개 읽음`
                : "Apple 기능 확인 필요",
            copy: formatScanList(capabilityLabels, "권한 파일 안에서 켜진 기능을 찾지 못했습니다."),
          },
          {
            status: summary.associatedDomains.length > 0 ? "warn" : "ok",
            title:
              summary.associatedDomains.length > 0
                ? "웹사이트 파일 확인"
                : "Associated Domains 선택 전",
            copy:
              summary.associatedDomains.length > 0
                ? "Associated Domains는 웹사이트에도 Apple 확인 파일이 필요합니다."
                : "웹사이트 링크 기능을 쓰지 않으면 추가 사이트 검증은 필요하지 않습니다.",
          },
        ],
        changePreview: capabilityChangePreview(summary),
      };
    }

    if (step.id === "store") {
      return {
        ...step,
        status: "warning",
        fields: storeFields(summary),
        targets: [
          ["앱 아이콘", readablePath(summary.appIconSet, "AppIcon.appiconset 없음")],
          ["App Store", "스크린샷 1-10장"],
          ["심사 제출", "데모 계정 · 리뷰 메모"],
        ],
        preview: {
          ...step.preview,
          appIconDataUrl: summary.appIconPreviewDataUrl,
          screenImageDataUrl: summary.screenPreviewDataUrl,
          screenImageLabel: summary.screenPreviewLabel,
          phoneName: summary.appName,
          alertTitle: summary.hasMarketingAppIcon
            ? "App Store 아이콘은 빌드에 포함됩니다"
            : "App Store 아이콘을 확인해야 합니다",
          alertCopy: summary.hasMarketingAppIcon
            ? `${summary.appIconSet}에서 1024x1024 아이콘을 찾았습니다.`
            : "Xcode asset catalog에 App Store용 1024x1024 아이콘이 필요합니다.",
          storeRows: [
            ["앱 아이콘", summary.hasMarketingAppIcon ? "1024x1024 확인" : "확인 필요"],
            [
              "스크린샷",
              summary.screenshotCount > 0 ? `${summary.screenshotCount}장 찾음` : "1-10장 준비",
            ],
            ["앱 미리보기", "선택 사항"],
          ],
        },
        checks: [
          {
            status: summary.hasMarketingAppIcon ? "ok" : "warn",
            title: summary.hasMarketingAppIcon ? "App Store 아이콘 찾음" : "App Store 아이콘 확인 필요",
            copy: summary.hasMarketingAppIcon
              ? `${summary.appIconSet}에 1024x1024 아이콘이 있습니다.`
              : readablePath(summary.appIconSet, "AppIcon.appiconset을 찾지 못했습니다."),
          },
          {
            status: summary.screenshotCount > 0 ? "ok" : "warn",
            title: summary.screenshotCount > 0 ? "스크린샷 후보 찾음" : "스크린샷 필요",
            copy:
              summary.screenshotCount > 0
                ? `${summary.screenPreviewLabel} 등 ${summary.screenshotCount}개 이미지 후보를 찾았습니다.`
                : "App Store Connect에 올릴 기기별 스크린샷을 준비해야 합니다.",
          },
          {
            status: "warn",
            title: "데모 계정 확인",
            copy: "로그인이 필요한 앱이면 심사용 계정과 리뷰 메모를 준비해야 합니다.",
          },
        ],
        changePreview: [
          "App Store Connect",
          `+ 앱 아이콘: ${summary.hasMarketingAppIcon ? summary.appIconSet : "확인 필요"}`,
          `+ 스크린샷: ${
            summary.screenshotCount > 0 ? `${summary.screenshotCount}장 후보` : "최소 1장, 최대 10장"
          }`,
          "+ 앱 미리보기 영상: 선택 사항",
          "+ 심사용 데모 계정 필요 여부 확인",
        ].join("\n"),
      };
    }

    return step;
  });
}
