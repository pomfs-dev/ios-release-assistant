import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import YAML from "yaml";
import { scanFolder } from "./scanFolder.mjs";

const execFileAsync = promisify(execFile);
const BACKUP_DIR_NAME = ".release-assistant-backups";

const PRIVACY_LABEL_TO_KEY = {
  "Apple Music": "NSAppleMusicUsageDescription",
  Bluetooth: "NSBluetoothAlwaysUsageDescription",
  "Face ID": "NSFaceIDUsageDescription",
  "건강 정보 읽기": "NSHealthShareUsageDescription",
  "건강 정보 쓰기": "NSHealthUpdateUsageDescription",
  "동작 및 피트니스": "NSMotionUsageDescription",
  "미리 알림": "NSRemindersUsageDescription",
  "사용 중 위치": "NSLocationWhenInUseUsageDescription",
  "사진 보관함": "NSPhotoLibraryUsageDescription",
  "사진 저장": "NSPhotoLibraryAddUsageDescription",
  "앱 추적": "NSUserTrackingUsageDescription",
  "연락처": "NSContactsUsageDescription",
  "음성 인식": "NSSpeechRecognitionUsageDescription",
  "카메라": "NSCameraUsageDescription",
  "캘린더": "NSCalendarsUsageDescription",
  "항상 위치": "NSLocationAlwaysAndWhenInUseUsageDescription",
  "마이크": "NSMicrophoneUsageDescription",
};

function httpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function nowStamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "");
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function textAnswer(answers, stepId, key) {
  const value = answers?.[stepId]?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function choiceAnswers(answers, stepId) {
  const stepAnswers = answers?.[stepId];
  if (!isPlainObject(stepAnswers)) return null;

  const choiceValue = Object.values(stepAnswers).find((value) => Array.isArray(value));
  return Array.isArray(choiceValue) ? choiceValue : null;
}

function normalizeRelativePath(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function resolveInside(rootPath, relativePath) {
  if (!relativePath || path.isAbsolute(relativePath)) {
    throw httpError("상대 파일 경로만 write plan에 사용할 수 있습니다.");
  }

  const resolved = path.resolve(rootPath, relativePath);
  const rootWithSeparator = `${path.resolve(rootPath)}${path.sep}`;
  if (resolved !== path.resolve(rootPath) && !resolved.startsWith(rootWithSeparator)) {
    throw httpError("앱 폴더 밖의 파일은 수정할 수 없습니다.", 403);
  }

  return resolved;
}

function firstApplicationTarget(scanResult) {
  return (
    scanResult.project?.targets.find((target) => target.type === "application") ??
    scanResult.project?.targets[0] ??
    null
  );
}

function fileForPath(files, expectedPath) {
  if (!expectedPath) return files[0] ?? null;
  const normalizedExpected = normalizeRelativePath(expectedPath);
  return (
    files.find((file) => {
      const candidate = normalizeRelativePath(file.relativePath);
      return (
        candidate === normalizedExpected ||
        candidate.endsWith(`/${normalizedExpected}`) ||
        normalizedExpected.endsWith(`/${candidate}`)
      );
    }) ??
    files[0] ??
    null
  );
}

function addChange(changes, key, currentValue, proposedValue) {
  if (!proposedValue || currentValue === proposedValue) return;
  changes.push({
    key,
    currentValue: currentValue ?? "",
    proposedValue,
  });
}

function parseAssociatedDomainsAnswer(answer, currentDomains = []) {
  const tokens = answer
    .split(/[\s,]+/)
    .map((domain) => domain.trim())
    .filter(Boolean);
  const hasCollapsedDisplayToken = tokens.some((token) => token === "외" || /^\d+개$/.test(token));
  const domains = tokens.filter((token) => token.includes(":") && token !== "외" && !/^\d+개$/.test(token));

  if (hasCollapsedDisplayToken && currentDomains.length > domains.length) {
    return currentDomains;
  }

  return domains;
}

function buildProjectOperation(scanResult, answers) {
  const target = firstApplicationTarget(scanResult);
  const projectSpec = scanResult.files.projectSpec;
  if (!target || !projectSpec) return null;

  const values = {
    targetName: target.name,
    productName: textAnswer(answers, "basic", "앱 이름"),
    bundleId: textAnswer(answers, "basic", "앱 고유 주소"),
    developmentTeam: textAnswer(answers, "signing", "Apple 개발자 팀 ID"),
  };
  const changes = [];

  addChange(changes, "productName", target.productName, values.productName);
  addChange(changes, "PRODUCT_BUNDLE_IDENTIFIER", target.bundleId, values.bundleId);
  addChange(changes, "DEVELOPMENT_TEAM", target.developmentTeam, values.developmentTeam);
  if (changes.length === 0) return null;

  return {
    id: "update-project-yml",
    kind: "update-project-yml",
    title: "XcodeGen 설정 파일 업데이트",
    relativePath: projectSpec.relativePath,
    absolutePath: projectSpec.absolutePath,
    changes,
    values,
  };
}

function buildInfoPlistOperation(scanResult, answers) {
  const target = firstApplicationTarget(scanResult);
  const infoFile = fileForPath(scanResult.files.infoPlists, target?.infoPlist);
  if (!infoFile) return null;

  const parsed = infoFile.parsed ?? {};
  const values = {
    bundleDisplayName: textAnswer(answers, "basic", "앱 이름"),
    bundleIdentifier: textAnswer(answers, "basic", "앱 고유 주소"),
    privacyUsage: {},
  };
  const changes = [];

  addChange(changes, "CFBundleDisplayName", parsed.bundleDisplayName, values.bundleDisplayName);
  addChange(changes, "CFBundleName", parsed.bundleName, values.bundleDisplayName);
  addChange(changes, "CFBundleIdentifier", parsed.bundleIdentifier, values.bundleIdentifier);

  for (const privacyKey of parsed.privacyKeys ?? []) {
    const proposed = textAnswer(answers, "privacy", `${privacyKey.label} 권한 문구`);
    if (!proposed || proposed === privacyKey.value) continue;
    values.privacyUsage[privacyKey.key] = proposed;
    changes.push({
      key: privacyKey.key,
      currentValue: privacyKey.value,
      proposedValue: proposed,
    });
  }

  for (const [label, key] of Object.entries(PRIVACY_LABEL_TO_KEY)) {
    const proposed = textAnswer(answers, "privacy", `${label} 권한 문구`);
    if (!proposed || values.privacyUsage[key] || parsed.privacyKeys?.some((item) => item.key === key)) {
      continue;
    }
    values.privacyUsage[key] = proposed;
    changes.push({
      key,
      currentValue: "",
      proposedValue: proposed,
    });
  }

  if (changes.length === 0) return null;

  return {
    id: "update-info-plist",
    kind: "update-info-plist",
    title: "Info.plist 업데이트",
    relativePath: infoFile.relativePath,
    absolutePath: infoFile.absolutePath,
    changes,
    values,
  };
}

function buildEntitlementsOperation(scanResult, answers) {
  const target = firstApplicationTarget(scanResult);
  const entitlementsFile = fileForPath(scanResult.files.entitlements, target?.entitlements);
  if (!entitlementsFile) return null;

  const selectedCapabilities = choiceAnswers(answers, "capabilities");
  const associatedDomainAnswer = textAnswer(answers, "capabilities", "앱과 연결할 웹사이트 주소");
  const parsed = entitlementsFile.parsed ?? {};
  const changes = [];
  const values = {
    appleSignIn: null,
    associatedDomains: null,
  };

  if (selectedCapabilities) {
    const nextAppleSignIn = selectedCapabilities.includes("Apple 로그인 사용");
    const currentAppleSignIn = (parsed.appleSignIn ?? []).length > 0;
    values.appleSignIn = nextAppleSignIn;
    if (currentAppleSignIn !== nextAppleSignIn) {
      changes.push({
        key: "com.apple.developer.applesignin",
        currentValue: currentAppleSignIn ? "켜짐" : "꺼짐",
        proposedValue: nextAppleSignIn ? "켜짐" : "꺼짐",
      });
    }
  }

  if (associatedDomainAnswer) {
    const currentDomains = parsed.associatedDomains ?? [];
    const nextDomains = parseAssociatedDomainsAnswer(associatedDomainAnswer, currentDomains);
    values.associatedDomains = nextDomains;

    if (currentDomains.join(",") !== nextDomains.join(",")) {
      changes.push({
        key: "com.apple.developer.associated-domains",
        currentValue: currentDomains.join(", "),
        proposedValue: nextDomains.join(", "),
      });
    }
  }

  if (changes.length === 0) return null;

  return {
    id: "update-entitlements",
    kind: "update-entitlements",
    title: "Entitlements 업데이트",
    relativePath: entitlementsFile.relativePath,
    absolutePath: entitlementsFile.absolutePath,
    changes,
    values,
  };
}

async function sha256File(filePath) {
  const content = await readFile(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function readPlistJson(filePath) {
  const { stdout } = await execFileAsync(
    "/usr/bin/plutil",
    ["-convert", "json", "-o", "-", filePath],
    { maxBuffer: 1024 * 1024 },
  );
  return JSON.parse(stdout);
}

async function writePlistJson(filePath, value) {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "ios-release-assistant-plist-"));
  const jsonPath = path.join(tmpDir, "plist.json");

  try {
    await writeFile(jsonPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await execFileAsync("/usr/bin/plutil", ["-convert", "xml1", "-o", filePath, jsonPath], {
      maxBuffer: 1024 * 1024,
    });
  } finally {
    await rm(tmpDir, { force: true, recursive: true });
  }
}

async function writeProjectYaml(operation) {
  const source = await readFile(operation.absolutePath, "utf8");
  const document = YAML.parse(source) ?? {};
  const target =
    document.targets?.[operation.values.targetName] ??
    Object.values(document.targets ?? {}).find((candidate) => isPlainObject(candidate));

  if (!target) throw httpError("project.yml에서 앱 target을 찾지 못했습니다.");

  target.settings = isPlainObject(target.settings) ? target.settings : {};
  target.settings.base = isPlainObject(target.settings.base) ? target.settings.base : {};

  if (operation.values.productName) {
    target.productName = operation.values.productName;
    target.settings.base.PRODUCT_NAME = operation.values.productName;
  }
  if (operation.values.bundleId) {
    target.settings.base.PRODUCT_BUNDLE_IDENTIFIER = operation.values.bundleId;
  }
  if (operation.values.developmentTeam) {
    target.settings.base.DEVELOPMENT_TEAM = operation.values.developmentTeam;
  }

  await writeFile(operation.absolutePath, YAML.stringify(document), "utf8");
}

async function writeInfoPlist(operation) {
  const plist = await readPlistJson(operation.absolutePath);

  if (operation.values.bundleDisplayName) {
    plist.CFBundleDisplayName = operation.values.bundleDisplayName;
    plist.CFBundleName = operation.values.bundleDisplayName;
  }
  if (operation.values.bundleIdentifier) {
    plist.CFBundleIdentifier = operation.values.bundleIdentifier;
  }
  for (const [key, value] of Object.entries(operation.values.privacyUsage ?? {})) {
    plist[key] = value;
  }

  await writePlistJson(operation.absolutePath, plist);
}

async function writeEntitlements(operation) {
  const plist = await readPlistJson(operation.absolutePath);

  if (operation.values.appleSignIn === true) {
    plist["com.apple.developer.applesignin"] = ["Default"];
  } else if (operation.values.appleSignIn === false) {
    delete plist["com.apple.developer.applesignin"];
  }

  if (Array.isArray(operation.values.associatedDomains)) {
    if (operation.values.associatedDomains.length > 0) {
      plist["com.apple.developer.associated-domains"] = operation.values.associatedDomains;
    } else {
      delete plist["com.apple.developer.associated-domains"];
    }
  }

  await writePlistJson(operation.absolutePath, plist);
}

function verifyOperation(operation, scanResult) {
  const target = firstApplicationTarget(scanResult);

  if (operation.kind === "update-project-yml") {
    const failedChanges = operation.changes.filter((change) => {
      if (change.key === "productName") return target?.productName !== change.proposedValue;
      if (change.key === "PRODUCT_BUNDLE_IDENTIFIER") {
        return target?.bundleId !== change.proposedValue;
      }
      if (change.key === "DEVELOPMENT_TEAM") return target?.developmentTeam !== change.proposedValue;
      return false;
    });

    return { ok: failedChanges.length === 0, failedChanges };
  }

  if (operation.kind === "update-info-plist") {
    const infoFile = fileForPath(scanResult.files.infoPlists, operation.relativePath);
    const parsed = infoFile?.parsed;
    const failedChanges = operation.changes.filter((change) => {
      if (change.key === "CFBundleDisplayName") {
        return parsed?.bundleDisplayName !== change.proposedValue;
      }
      if (change.key === "CFBundleName") return parsed?.bundleName !== change.proposedValue;
      if (change.key === "CFBundleIdentifier") {
        return parsed?.bundleIdentifier !== change.proposedValue;
      }
      const privacyKey = parsed?.privacyKeys.find((item) => item.key === change.key);
      return privacyKey?.value !== change.proposedValue;
    });

    return { ok: failedChanges.length === 0, failedChanges };
  }

  if (operation.kind === "update-entitlements") {
    const entitlementsFile = fileForPath(scanResult.files.entitlements, operation.relativePath);
    const parsed = entitlementsFile?.parsed;
    const failedChanges = operation.changes.filter((change) => {
      if (change.key === "com.apple.developer.applesignin") {
        const current = (parsed?.appleSignIn ?? []).length > 0 ? "켜짐" : "꺼짐";
        return current !== change.proposedValue;
      }
      if (change.key === "com.apple.developer.associated-domains") {
        return (parsed?.associatedDomains ?? []).join(", ") !== change.proposedValue;
      }
      return false;
    });

    return { ok: failedChanges.length === 0, failedChanges };
  }

  return { ok: false, failedChanges: operation.changes };
}

export async function buildWritePlan(inputPath, answers = {}) {
  const scanResult = await scanFolder(inputPath);
  const operations = [
    buildProjectOperation(scanResult, answers),
    buildInfoPlistOperation(scanResult, answers),
    buildEntitlementsOperation(scanResult, answers),
  ].filter(Boolean);

  return {
    ok: true,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    rootPath: scanResult.folder.path,
    folderName: scanResult.folder.name,
    operations,
    operationCount: operations.length,
    requiresBackup: operations.length > 0,
  };
}

export async function createBackupForPlan(plan) {
  if (!plan.operations.length) {
    throw httpError("백업할 파일 변경 작업이 없습니다.");
  }

  const backupId = nowStamp();
  const backupRoot = path.join(plan.rootPath, BACKUP_DIR_NAME, backupId);
  const filesRoot = path.join(backupRoot, "files");
  const files = [];
  const uniqueOperations = Array.from(
    new Map(plan.operations.map((operation) => [operation.relativePath, operation])).values(),
  );

  for (const operation of uniqueOperations) {
    const absolutePath = resolveInside(plan.rootPath, operation.relativePath);
    await stat(absolutePath);

    const backupRelativePath = normalizeRelativePath(path.join("files", operation.relativePath));
    const backupFilePath = path.join(backupRoot, backupRelativePath);
    await mkdir(path.dirname(backupFilePath), { recursive: true });
    await cp(absolutePath, backupFilePath, { recursive: true });

    files.push({
      relativePath: operation.relativePath,
      originalPath: absolutePath,
      backupRelativePath,
      sha256: await sha256File(absolutePath),
    });
  }

  const manifest = {
    backupId,
    writePlanId: plan.id,
    createdAt: new Date().toISOString(),
    rootPath: plan.rootPath,
    backupPath: backupRoot,
    files,
    operations: plan.operations.map((operation) => ({
      id: operation.id,
      kind: operation.kind,
      relativePath: operation.relativePath,
      changeCount: operation.changes.length,
    })),
  };

  await mkdir(backupRoot, { recursive: true });
  await writeFile(path.join(backupRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  return {
    ok: true,
    manifest,
  };
}

export async function applyWritePlan(plan) {
  if (!plan.backupManifest) {
    throw httpError("백업 manifest가 없는 write plan은 적용할 수 없습니다.", 409);
  }

  for (const operation of plan.operations) {
    resolveInside(plan.rootPath, operation.relativePath);

    if (operation.kind === "update-project-yml") await writeProjectYaml(operation);
    if (operation.kind === "update-info-plist") await writeInfoPlist(operation);
    if (operation.kind === "update-entitlements") await writeEntitlements(operation);
  }

  const scanResult = await scanFolder(plan.rootPath);
  const verification = plan.operations.map((operation) => ({
    operationId: operation.id,
    relativePath: operation.relativePath,
    ...verifyOperation(operation, scanResult),
  }));
  const ok = verification.every((item) => item.ok);

  return {
    ok,
    appliedAt: new Date().toISOString(),
    writePlanId: plan.id,
    backupId: plan.backupManifest.backupId,
    verification,
    scanResult,
  };
}

export function createWritePlanManager() {
  const plans = new Map();

  return {
    async buildAndStore(inputPath, answers) {
      const plan = await buildWritePlan(inputPath, answers);
      plans.set(plan.id, plan);
      return plan;
    },
    async backup(planId) {
      const plan = plans.get(planId);
      if (!plan) throw httpError("write plan을 찾지 못했습니다.", 404);
      const result = await createBackupForPlan(plan);
      plan.backupManifest = result.manifest;
      plans.set(plan.id, plan);
      return result;
    },
    async apply(planId) {
      const plan = plans.get(planId);
      if (!plan) throw httpError("write plan을 찾지 못했습니다.", 404);
      const result = await applyWritePlan(plan);
      plan.applyResult = result;
      plans.set(plan.id, plan);
      return result;
    },
    get(planId) {
      return plans.get(planId) ?? null;
    },
  };
}
