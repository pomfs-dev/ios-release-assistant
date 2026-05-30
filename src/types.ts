export type StepStatus = "done" | "warning" | "pending";

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
    phoneName: string;
    alertTitle: string;
    alertCopy: string;
    storeRows: [string, string][];
  };
  checks: {
    status: "ok" | "warn" | "error";
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
  mock: [string, string][];
  footer: string;
};

export type FolderScanChecklistItem = {
  status: "found" | "warning" | "missing";
  title: string;
  copy: string;
};

export type FolderScanResult = {
  ok: true;
  folder: {
    name: string;
    path: string;
  };
  files: {
    projectSpec: null | {
      name: string;
      relativePath: string;
      absolutePath: string;
    };
    xcodeProjects: Array<{ name: string; relativePath: string; absolutePath: string }>;
    workspaces: Array<{ name: string; relativePath: string; absolutePath: string }>;
    infoPlists: Array<{ name: string; relativePath: string; absolutePath: string }>;
    entitlements: Array<{ name: string; relativePath: string; absolutePath: string }>;
    assetCatalogs: Array<{ name: string; relativePath: string; absolutePath: string }>;
  };
  project: null | {
    name: string | null;
    targetCount: number;
    targets: Array<{
      name: string;
      type: string | null;
      platform: string | null;
      deploymentTarget: string | null;
      bundleId: string | null;
      developmentTeam: string | null;
      entitlements: string | null;
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
