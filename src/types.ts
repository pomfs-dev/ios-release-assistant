export type StepStatus = "done" | "warning" | "pending";

export type CheckStatus = "ok" | "warn" | "error";

export type FieldKind = "text" | "textarea" | "select" | "choices" | "note";

export type FieldDefinition = {
  kind: FieldKind;
  label?: string;
  value?: string;
  placeholder?: string;
  helper?: string;
  options?: string[];
  choices?: {
    title: string;
    copy: string;
    active?: boolean;
  }[];
  multi?: boolean;
};

export type StepDefinition = {
  id: string;
  index: number;
  title: string;
  summary: string;
  status: StepStatus;
  eyebrow: string;
  heading: string;
  helper: string;
  badge: string;
  explain: string;
  fields: FieldDefinition[];
  targets: [string, string][];
  preview: {
    appIconDataUrl?: string | null;
    screenImageDataUrl?: string | null;
    screenImageLabel?: string | null;
    phoneName: string;
    alertTitle: string;
    alertCopy: string;
    storeRows: [string, string][];
  };
  checks: {
    status: CheckStatus;
    title: string;
    copy: string;
  }[];
  changePreview: string;
  actionKey: string;
};

export type ActionView = {
  eyebrow: string;
  title: string;
  copy: string;
  tag: string;
  sideTitle: string;
  sideCopy: string;
  steps: [string, string][];
  facts: [string, string][];
  footer: string;
  footerActionLabel?: string;
};

export type AppleCredentialDraft = {
  issuerId: string;
  keyId: string;
  appAppleId: string;
  bundleId: string;
  privateKeyInput: string;
};

export type AppleConnectionState = {
  status: "idle" | "editing" | "connecting" | "ready" | "error";
  issuerId?: string;
  keyId?: string;
  appAppleId?: string;
  bundleId?: string;
  app?: AppStoreConnectAppSummary | null;
  resolvedBy?: "appAppleId" | "bundleId";
  sessionId?: string;
  privateKeyLoaded?: boolean;
  error?: string | null;
  updatedAt?: string | null;
};

export type AppStoreConnectAppSummary = {
  id: string;
  name: string | null;
  bundleId: string | null;
  sku: string | null;
  primaryLocale: string | null;
};

export type AppStoreConnectConnectionResult = {
  ok: true;
  connectedAt: string;
  issuerId: string;
  keyId: string;
  resolvedBy: "appAppleId" | "bundleId";
  sessionId: string;
  app: AppStoreConnectAppSummary;
};

export type AppStoreConnectReadResult = {
  ok: true;
  readAt: string;
  sessionId: string;
  app: AppStoreConnectAppSummary;
};

export type AppStoreConnectUpdateOperation = {
  id: string;
  kind: "update-app-info-localization" | "update-app-store-version-localization";
  title: string;
  resourceId: string;
  resourceType: "appInfoLocalizations" | "appStoreVersionLocalizations";
  locale: string;
  attribute: "privacyPolicyUrl" | "description";
  currentValue: string;
  proposedValue: string;
  appStoreVersionId?: string | null;
  appStoreState?: string | null;
};

export type AppStoreConnectManualItem = {
  id: string;
  title: string;
  reason: string;
};

export type AppStoreConnectUpdatePlan = {
  ok: true;
  id: string;
  app: AppStoreConnectAppSummary;
  createdAt: string;
  locale: string;
  operations: AppStoreConnectUpdateOperation[];
  operationCount: number;
  manualItems: AppStoreConnectManualItem[];
};

export type AppStoreConnectUpdateResult = {
  ok: true;
  planId: string;
  updatedAt: string;
  operationCount: number;
  results: Array<{
    operationId: string;
    ok: boolean;
    resourceId: string;
    resourceType: string;
    value: string;
  }>;
  manualItems: AppStoreConnectManualItem[];
};

export type FolderScanChecklistItem = {
  status: "found" | "warning" | "missing";
  title: string;
  copy: string;
};

export type ScanFileSummary = {
  name: string;
  relativePath: string;
  absolutePath: string;
};

export type InfoPlistPrivacyKey = {
  key: string;
  label: string;
  value: string;
};

export type InfoPlistSummary = {
  bundleDisplayName: string | null;
  bundleName: string | null;
  bundleIdentifier: string | null;
  version: string | null;
  build: string | null;
  privacyKeys: InfoPlistPrivacyKey[];
  appBoundDomains: string[];
  backgroundModes: string[];
};

export type EntitlementCapability = {
  key: string;
  label: string;
  value: string;
};

export type EntitlementsSummary = {
  capabilities: EntitlementCapability[];
  associatedDomains: string[];
  appleSignIn: string[];
  pushEnvironment: string | null;
  applicationGroups: string[];
};

export type AppIconImageSummary = {
  filename: string | null;
  idiom: string | null;
  scale: string | null;
  size: string | null;
  exists: boolean;
};

export type AppIconSetSummary = {
  imageCount: number;
  referencedImageCount: number;
  existingImageCount: number;
  hasMarketingIcon: boolean;
  marketingIcon: AppIconImageSummary | null;
  previewDataUrl: string | null;
  missingFilenames: string[];
};

export type AppScreenPreviewSummary = ScanFileSummary & {
  source: "local-image";
  previewDataUrl: string | null;
};

export type WebAppPreviewSummary = {
  rootUrl: string;
  sourceFile: ScanFileSummary;
  previewDataUrl: string | null;
  previewError: string | null;
};

export type ParsedScanFile<TParsed> = ScanFileSummary & {
  parsed: TParsed | null;
  parseError: string | null;
};

export type FolderScanResult = {
  ok: true;
  folder: {
    name: string;
    path: string;
  };
  files: {
    projectSpec: ScanFileSummary | null;
    xcodeProjects: ScanFileSummary[];
    workspaces: ScanFileSummary[];
    infoPlists: Array<ParsedScanFile<InfoPlistSummary>>;
    entitlements: Array<ParsedScanFile<EntitlementsSummary>>;
    assetCatalogs: ScanFileSummary[];
    appIconSets: Array<ParsedScanFile<AppIconSetSummary>>;
    screenshots: AppScreenPreviewSummary[];
    webApp: WebAppPreviewSummary | null;
  };
  project: null | {
    name: string | null;
    targetCount: number;
    targets: Array<{
      name: string;
      type: string | null;
      platform: string | null;
      deploymentTarget: string | null;
      productName: string | null;
      bundleId: string | null;
      developmentTeam: string | null;
      infoPlist: string | null;
      entitlements: string | null;
      marketingVersion: string | null;
      currentProjectVersion: string | null;
      sourceCount: number;
      resourceCount: number;
    }>;
  };
  projectParseError: string | null;
  checklist: FolderScanChecklistItem[];
};

export type FolderScanState =
  | { status: "idle"; result: null; error: null }
  | { status: "loading"; result: null; error: null }
  | { status: "success"; result: FolderScanResult; error: null }
  | { status: "error"; result: null; error: string };

export type LocalPathSelection = {
  ok: true;
  path: string;
  kind: "folder" | "project-spec";
};

export type LocalScreenshotSelection = AppScreenPreviewSummary & {
  ok: true;
  path: string;
  kind: "screenshot";
};

export type ServerBrowserEntry = {
  name: string;
  path: string;
  kind: "directory" | "project-spec" | "file";
  selectable: boolean;
  hasProjectSpec: boolean;
  hasXcodeProject: boolean;
};

export type ServerBrowserLocation = {
  name: string;
  path: string;
};

export type ServerBrowserListing = {
  ok: true;
  roots: ServerBrowserLocation[];
  root: ServerBrowserLocation;
  current: ServerBrowserLocation & {
    relativePath: string;
  };
  parentPath: string | null;
  entries: ServerBrowserEntry[];
};

export type ReleaseStepId =
  | "basic"
  | "signing"
  | "privacy"
  | "capabilities"
  | "store"
  | "generate";

export type PreflightCheck = {
  id: string;
  stepId: ReleaseStepId;
  status: CheckStatus;
  title: string;
  copy: string;
  resolution?: "system" | "input" | "manual";
};

export type PreflightSummary = {
  checks: PreflightCheck[];
  checksByStep: Partial<Record<ReleaseStepId, PreflightCheck[]>>;
  progress: number;
  okCount: number;
  reviewCount: number;
  errorCount: number;
  totalCount: number;
};

export type UserAnswerValue = string | string[];

export type UserAnswerState = Record<string, Record<string, UserAnswerValue>>;

export type ChangeReviewItemStatus = "ready" | "unchanged" | "needs-review" | "blocked";

export type ChangeReviewSectionId =
  | "fileChanges"
  | "appStoreConnectUpdates"
  | "commandActions";

export type ChangeReviewItem = {
  id: string;
  title: string;
  target: string;
  currentValue: string;
  proposedValue: string;
  status: ChangeReviewItemStatus;
  action?: {
    label: string;
    stepId: ReleaseStepId;
    fieldLabel?: string;
  };
};

export type ChangeReviewSection = {
  id: ChangeReviewSectionId;
  title: string;
  summary: string;
  items: ChangeReviewItem[];
};

export type ChangeReviewSummary = {
  sections: ChangeReviewSection[];
  totalCount: number;
  readyCount: number;
  unchangedCount: number;
  reviewCount: number;
  blockedCount: number;
};

export type WritePlanChange = {
  key: string;
  currentValue: string;
  proposedValue: string;
};

export type WritePlanOperation = {
  id: string;
  kind: "update-project-yml" | "update-info-plist" | "update-entitlements";
  title: string;
  relativePath: string;
  absolutePath: string;
  changes: WritePlanChange[];
};

export type WritePlan = {
  ok: true;
  id: string;
  createdAt: string;
  rootPath: string;
  folderName: string;
  operations: WritePlanOperation[];
  operationCount: number;
  requiresBackup: boolean;
};

export type BackupManifest = {
  backupId: string;
  writePlanId: string;
  createdAt: string;
  rootPath: string;
  backupPath: string;
  files: Array<{
    relativePath: string;
    originalPath: string;
    backupRelativePath: string;
    sha256: string | null;
  }>;
};

export type BackupResult = {
  ok: true;
  manifest: BackupManifest;
};

export type ApplyWritePlanResult = {
  ok: boolean;
  appliedAt: string;
  writePlanId: string;
  backupId: string;
  verification: Array<{
    operationId: string;
    relativePath: string;
    ok: boolean;
    failedChanges: WritePlanChange[];
  }>;
  scanResult: FolderScanResult;
};

export type GenerateProjectResult = {
  ok: boolean;
  generatedAt: string;
  writePlanId: string;
  command: string;
  cwd: string;
  backup: BackupManifest & {
    purpose: "xcodegen-generate";
  };
  stdout: string;
  stderr: string;
  error?: string;
  scanResult?: FolderScanResult;
};

export type SafeWriteState = {
  status:
    | "idle"
    | "planning"
    | "planned"
    | "backing-up"
    | "backed-up"
    | "applying"
    | "applied"
    | "generating"
    | "generated"
    | "error";
  plan: WritePlan | null;
  backup: BackupResult | null;
  result: ApplyWritePlanResult | null;
  generateResult: GenerateProjectResult | null;
  error: string | null;
};
