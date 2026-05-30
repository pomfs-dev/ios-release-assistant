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
