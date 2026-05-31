import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DEFAULT_PICKER_TIMEOUT_MS = 120_000;
const MAX_SCREENSHOT_PREVIEW_BYTES = 8 * 1024 * 1024;
const SCREENSHOT_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function localPickerUnsupportedError() {
  const error = new Error("Finder 선택창은 macOS local bridge에서만 지원됩니다.");
  error.statusCode = 501;
  return error;
}

function userCanceledError() {
  const error = new Error("선택이 취소됐습니다.");
  error.statusCode = 499;
  error.canceled = true;
  return error;
}

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function pickerBusyError() {
  const error = new Error("이미 Finder 선택창이 열려 있습니다. 기존 선택창을 완료하거나 취소해주세요.");
  error.statusCode = 409;
  return error;
}

function pickerTimeoutError() {
  const error = new Error(
    "Finder 선택 시간이 초과됐습니다. 선택창이 보이지 않으면 Dock의 Finder나 osascript 창을 확인하거나, 전체 경로를 입력하고 Enter를 눌러주세요.",
  );
  error.statusCode = 504;
  return error;
}

async function runOsaScript(script, { timeoutMs }) {
  if (process.platform !== "darwin") throw localPickerUnsupportedError();

  try {
    const { stdout } = await execFileAsync("osascript", ["-e", script], {
      maxBuffer: 1024 * 1024,
      timeout: timeoutMs,
    });
    return stdout.trim();
  } catch (error) {
    if (error?.killed || error?.signal === "SIGTERM") throw pickerTimeoutError();

    const message = `${error.stderr ?? ""} ${error.message ?? ""}`;
    if (/USER_CANCELED|user canceled|사용자가 취소|-128/i.test(message)) throw userCanceledError();
    const pickerError = new Error(
      "Finder 선택창에서 선택한 경로를 읽지 못했습니다. 앱 폴더 또는 project.yml 전체 경로를 입력하고 Enter를 눌러주세요.",
    );
    pickerError.statusCode = 500;
    throw pickerError;
  }
}

async function validateDirectory(selectedPath) {
  const fileStats = await stat(selectedPath).catch(() => null);
  if (!fileStats?.isDirectory()) {
    throw validationError("선택한 경로가 폴더가 아닙니다.");
  }
}

async function validateProjectSpec(selectedPath) {
  const fileStats = await stat(selectedPath).catch(() => null);
  if (!fileStats?.isFile()) {
    throw validationError("선택한 경로가 파일이 아닙니다.");
  }

  if (!/^project\.ya?ml$/i.test(path.basename(selectedPath))) {
    throw validationError("project.yml 또는 project.yaml 파일만 선택할 수 있습니다.");
  }
}

function imageMimeType(filename) {
  const extension = path.extname(filename).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  return "image/png";
}

async function summarizeScreenshot(selectedPath) {
  const fileStats = await stat(selectedPath).catch(() => null);
  if (!fileStats?.isFile()) {
    throw validationError("선택한 경로가 이미지 파일이 아닙니다.");
  }

  const extension = path.extname(selectedPath).toLowerCase();
  if (!SCREENSHOT_EXTENSIONS.has(extension)) {
    throw validationError("png, jpg, jpeg, webp 스크린샷 파일만 선택할 수 있습니다.");
  }

  if (fileStats.size > MAX_SCREENSHOT_PREVIEW_BYTES) {
    throw validationError("미리보기용 스크린샷은 8MB 이하 파일만 선택할 수 있습니다.");
  }

  const content = await readFile(selectedPath);
  const name = path.basename(selectedPath);
  return {
    ok: true,
    path: selectedPath,
    kind: "screenshot",
    name,
    relativePath: selectedPath,
    absolutePath: selectedPath,
    source: "local-image",
    previewDataUrl: `data:${imageMimeType(name)};base64,${content.toString("base64")}`,
  };
}

export function createFilePicker({
  chooseFolderScript = 'tell application "Finder" to activate\nPOSIX path of (choose folder with prompt "iOS 앱 폴더를 선택하세요")',
  chooseProjectSpecScript = 'tell application "Finder" to activate\nPOSIX path of (choose file with prompt "project.yml 또는 project.yaml 파일을 선택하세요")',
  chooseScreenshotScript = 'tell application "Finder" to activate\nPOSIX path of (choose file with prompt "App Store에 사용할 앱 스크린샷 이미지를 선택하세요")',
  timeoutMs = DEFAULT_PICKER_TIMEOUT_MS,
} = {}) {
  let activePicker = null;

  async function runSinglePicker(script, options = {}) {
    if (activePicker) throw pickerBusyError();

    activePicker = runOsaScript(script, { timeoutMs, ...options });

    try {
      return await activePicker;
    } finally {
      activePicker = null;
    }
  }

  return {
    async selectFolder() {
      const selectedPath = await runSinglePicker(chooseFolderScript);
      await validateDirectory(selectedPath);
      return { ok: true, path: selectedPath, kind: "folder" };
    },

    async selectProjectSpec() {
      const selectedPath = await runSinglePicker(chooseProjectSpecScript);
      await validateProjectSpec(selectedPath);
      return { ok: true, path: selectedPath, kind: "project-spec" };
    },

    async selectScreenshot() {
      const selectedPath = await runSinglePicker(chooseScreenshotScript);
      return summarizeScreenshot(selectedPath);
    },
  };
}
