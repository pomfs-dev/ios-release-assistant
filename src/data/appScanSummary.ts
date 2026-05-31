import type {
  AppIconSetSummary,
  EntitlementCapability,
  EntitlementsSummary,
  FolderScanResult,
  InfoPlistPrivacyKey,
  InfoPlistSummary,
  ParsedScanFile,
  ScanFileSummary,
} from "../types";

type ProjectTarget = NonNullable<FolderScanResult["project"]>["targets"][number];

export type AppScanSummary = {
  folderName: string;
  folderPath: string;
  appName: string;
  targetName: string | null;
  bundleId: string | null;
  version: string | null;
  build: string | null;
  developmentTeam: string | null;
  projectSpec: string | null;
  xcodeProject: string | null;
  infoPlist: string | null;
  entitlements: string | null;
  appIconSet: string | null;
  hasMarketingAppIcon: boolean;
  appIconImageCount: number;
  appIconPreviewDataUrl: string | null;
  screenPreviewDataUrl: string | null;
  screenPreviewLabel: string | null;
  screenshotCount: number;
  webPreviewUrl: string | null;
  privacyKeys: InfoPlistPrivacyKey[];
  capabilities: EntitlementCapability[];
  associatedDomains: string[];
  hasInfoPlist: boolean;
  hasEntitlements: boolean;
};

const buildSettingPattern = /\$\([^)]+\)/;

function usableValue(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || buildSettingPattern.test(trimmed)) return null;
  return trimmed;
}

function preferredTarget(result: FolderScanResult): ProjectTarget | null {
  return (
    result.project?.targets.find((target) => target.type === "application") ??
    result.project?.targets[0] ??
    null
  );
}

function normalizePath(path: string | null | undefined) {
  return path?.replaceAll("\\", "/") ?? null;
}

function fileForPath<TParsed>(
  files: Array<ParsedScanFile<TParsed>>,
  expectedPath: string | null | undefined,
) {
  const normalizedExpected = normalizePath(expectedPath);
  if (!normalizedExpected) return files[0] ?? null;

  return (
    files.find((file) => {
      const candidate = normalizePath(file.relativePath);
      return (
        candidate === normalizedExpected ||
        candidate?.endsWith(`/${normalizedExpected}`) ||
        normalizedExpected.endsWith(`/${candidate}`)
      );
    }) ??
    files[0] ??
    null
  );
}

function firstFile(files: ScanFileSummary[]) {
  return files[0]?.relativePath ?? null;
}

function parsedInfo(file: ParsedScanFile<InfoPlistSummary> | null) {
  return file?.parsed ?? null;
}

function parsedEntitlements(file: ParsedScanFile<EntitlementsSummary> | null) {
  return file?.parsed ?? null;
}

function parsedAppIconSet(file: ParsedScanFile<AppIconSetSummary> | null) {
  return file?.parsed ?? null;
}

export function getAppScanSummary(result: FolderScanResult | null | undefined): AppScanSummary | null {
  if (!result) return null;

  const target = preferredTarget(result);
  const infoFile = fileForPath(result.files.infoPlists, target?.infoPlist);
  const entitlementFile = fileForPath(result.files.entitlements, target?.entitlements);
  const appIconFile =
    result.files.appIconSets.find((file) => file.name.toLowerCase() === "appicon.appiconset") ??
    result.files.appIconSets[0] ??
    null;
  const info = parsedInfo(infoFile);
  const entitlements = parsedEntitlements(entitlementFile);
  const appIcon = parsedAppIconSet(appIconFile);
  const screenshot = result.files.screenshots[0] ?? null;
  const screenPreviewDataUrl = screenshot?.previewDataUrl ?? null;
  const screenPreviewLabel = screenshot?.relativePath ?? null;

  const appName =
    usableValue(info?.bundleDisplayName) ??
    usableValue(result.project?.name) ??
    usableValue(target?.productName) ??
    usableValue(info?.bundleName) ??
    result.folder.name;

  return {
    folderName: result.folder.name,
    folderPath: result.folder.path,
    appName,
    targetName: target?.name ?? null,
    bundleId: usableValue(target?.bundleId) ?? usableValue(info?.bundleIdentifier),
    version: usableValue(target?.marketingVersion) ?? usableValue(info?.version),
    build: usableValue(target?.currentProjectVersion) ?? usableValue(info?.build),
    developmentTeam: usableValue(target?.developmentTeam),
    projectSpec: result.files.projectSpec?.relativePath ?? null,
    xcodeProject: firstFile(result.files.xcodeProjects),
    infoPlist: infoFile?.relativePath ?? null,
    entitlements: entitlementFile?.relativePath ?? null,
    appIconSet: appIconFile?.relativePath ?? null,
    hasMarketingAppIcon: Boolean(appIcon?.hasMarketingIcon),
    appIconImageCount: appIcon?.existingImageCount ?? 0,
    appIconPreviewDataUrl: appIcon?.previewDataUrl ?? null,
    screenPreviewDataUrl,
    screenPreviewLabel,
    screenshotCount: result.files.screenshots.length,
    webPreviewUrl: result.files.webApp?.rootUrl ?? null,
    privacyKeys: info?.privacyKeys ?? [],
    capabilities: entitlements?.capabilities ?? [],
    associatedDomains: entitlements?.associatedDomains ?? [],
    hasInfoPlist: Boolean(infoFile),
    hasEntitlements: Boolean(entitlementFile),
  };
}

export function formatScanList(values: string[], empty = "확인 필요", limit = 3) {
  if (values.length === 0) return empty;
  const visible = values.slice(0, limit).join(" · ");
  const hiddenCount = values.length - limit;
  return hiddenCount > 0 ? `${visible} 외 ${hiddenCount}개` : visible;
}
