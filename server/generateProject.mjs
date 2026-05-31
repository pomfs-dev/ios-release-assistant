import { execFile } from "node:child_process";
import crypto from "node:crypto";
import { cp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { redactSecrets } from "./bridge/redaction.mjs";
import { scanFolder } from "./scanFolder.mjs";

const execFileAsync = promisify(execFile);
export const GENERATE_CONFIRMATION_TOKEN = "CONFIRM_GENERATE";

function httpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function nowStamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "");
}

function normalizeRelativePath(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function resolveInside(rootPath, relativePath) {
  if (!relativePath || path.isAbsolute(relativePath)) {
    throw httpError("상대 파일 경로만 generate 백업에 사용할 수 있습니다.");
  }

  const resolved = path.resolve(rootPath, relativePath);
  const rootWithSeparator = `${path.resolve(rootPath)}${path.sep}`;
  if (resolved !== path.resolve(rootPath) && !resolved.startsWith(rootWithSeparator)) {
    throw httpError("앱 폴더 밖의 파일은 generate 백업에 사용할 수 없습니다.", 403);
  }

  return resolved;
}

function safeOutput(value) {
  if (!value) return "";
  const redacted = redactSecrets({ output: String(value) });
  return redacted.output.slice(-12_000);
}

async function sha256File(filePath) {
  const content = await readFile(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function createGenerateBackup(scanResult, planId) {
  const backupId = `${nowStamp()}-generate`;
  const backupRoot = path.join(scanResult.folder.path, ".release-assistant-backups", backupId);
  const entries = [
    scanResult.files.projectSpec,
    ...scanResult.files.xcodeProjects,
    ...scanResult.files.workspaces,
  ].filter(Boolean);
  const files = [];

  await mkdir(backupRoot, { recursive: true });

  for (const entry of entries) {
    const sourcePath = resolveInside(scanResult.folder.path, entry.relativePath);
    const sourceStats = await stat(sourcePath);
    const backupRelativePath = normalizeRelativePath(path.join("files", entry.relativePath));
    const backupPath = path.join(backupRoot, backupRelativePath);
    await mkdir(path.dirname(backupPath), { recursive: true });
    await cp(sourcePath, backupPath, { recursive: true });
    files.push({
      relativePath: entry.relativePath,
      originalPath: sourcePath,
      backupRelativePath,
      sha256: sourceStats.isFile() ? await sha256File(sourcePath) : null,
    });
  }

  const manifest = {
    backupId,
    writePlanId: planId,
    createdAt: new Date().toISOString(),
    rootPath: scanResult.folder.path,
    backupPath: backupRoot,
    files,
    purpose: "xcodegen-generate",
  };

  await writeFile(path.join(backupRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export async function generateXcodeProject(plan, confirmationToken, options = {}) {
  if (confirmationToken !== GENERATE_CONFIRMATION_TOKEN) {
    throw httpError("generate 승인 토큰이 올바르지 않습니다.", 403);
  }

  if (!plan?.rootPath) throw httpError("generate에 사용할 write plan이 없습니다.", 404);
  if (plan.operationCount > 0 && !plan.applyResult?.ok) {
    throw httpError("파일 변경이 있는 write plan은 백업과 저장 적용을 완료한 뒤 generate할 수 있습니다.", 409);
  }

  const beforeScan = await scanFolder(plan.rootPath);
  const projectSpec = beforeScan.files.projectSpec;
  if (!projectSpec) {
    throw httpError("xcodegen generate를 실행할 project.yml 또는 project.yaml을 찾지 못했습니다.", 400);
  }

  const backup = await createGenerateBackup(beforeScan, plan.id);
  const command = options.command ?? process.env.XCODEGEN_BIN ?? "xcodegen";
  const args = ["generate", "--spec", projectSpec.relativePath];
  let stdout = "";
  let stderr = "";

  try {
    const result = await execFileAsync(command, args, {
      cwd: beforeScan.folder.path,
      env: {
        ...process.env,
        XCODEGEN_DISABLE_VERSION_CHECK: "1",
      },
      maxBuffer: 1024 * 1024,
      timeout: options.timeoutMs ?? 120_000,
    });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (error) {
    error.statusCode = error.code === "ENOENT" ? 503 : 500;
    error.generateResult = {
      ok: false,
      error: safeOutput(error.stderr || error.message) || "xcodegen generate를 실행하지 못했습니다.",
      generatedAt: new Date().toISOString(),
      writePlanId: plan.id,
      command: `${command} ${args.join(" ")}`,
      cwd: beforeScan.folder.path,
      backup,
      stdout: safeOutput(error.stdout),
      stderr: safeOutput(error.stderr || error.message),
    };
    throw error;
  }

  const scanResult = await scanFolder(plan.rootPath);

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    writePlanId: plan.id,
    command: `${command} ${args.join(" ")}`,
    cwd: beforeScan.folder.path,
    backup,
    stdout: safeOutput(stdout),
    stderr: safeOutput(stderr),
    scanResult,
  };
}
