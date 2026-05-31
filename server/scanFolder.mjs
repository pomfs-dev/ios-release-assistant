import { execFile, spawn } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { promisify } from "node:util";
import YAML from "yaml";

const execFileAsync = promisify(execFile);

const IGNORED_DIRS = new Set([
  ".git",
  ".release-assistant-backups",
  ".build",
  "build",
  "DerivedData",
  "dist",
  "node_modules",
  "Pods",
]);

const PRIVACY_USAGE_LABELS = {
  NSAppleMusicUsageDescription: "Apple Music",
  NSBluetoothAlwaysUsageDescription: "Bluetooth",
  NSBluetoothPeripheralUsageDescription: "Bluetooth",
  NSCalendarsUsageDescription: "캘린더",
  NSCameraUsageDescription: "카메라",
  NSContactsUsageDescription: "연락처",
  NSFaceIDUsageDescription: "Face ID",
  NSHealthShareUsageDescription: "건강 정보 읽기",
  NSHealthUpdateUsageDescription: "건강 정보 쓰기",
  NSLocationAlwaysAndWhenInUseUsageDescription: "항상 위치",
  NSLocationAlwaysUsageDescription: "항상 위치",
  NSLocationWhenInUseUsageDescription: "사용 중 위치",
  NSMicrophoneUsageDescription: "마이크",
  NSMotionUsageDescription: "동작 및 피트니스",
  NSPhotoLibraryAddUsageDescription: "사진 저장",
  NSPhotoLibraryUsageDescription: "사진 보관함",
  NSRemindersUsageDescription: "미리 알림",
  NSSpeechRecognitionUsageDescription: "음성 인식",
  NSUserTrackingUsageDescription: "앱 추적",
};

const ENTITLEMENT_LABELS = {
  "aps-environment": "Push 알림",
  "com.apple.developer.applesignin": "Apple 로그인",
  "com.apple.developer.associated-domains": "웹사이트 링크",
  "com.apple.developer.icloud-container-identifiers": "iCloud",
  "com.apple.developer.in-app-payments": "Apple Pay",
  "com.apple.developer.networking.wifi-info": "Wi-Fi 정보",
  "com.apple.security.application-groups": "App Groups",
  "keychain-access-groups": "Keychain 공유",
};

const MAX_ICON_PREVIEW_BYTES = 5 * 1024 * 1024;
const MAX_SCREEN_PREVIEW_BYTES = 8 * 1024 * 1024;
const WEB_PREVIEW_TIMEOUT_MS = 8_000;
const WEB_PREVIEW_RENDER_WAIT_MS = 6_000;
const WEB_PREVIEW_WIDTH = 430;
const WEB_PREVIEW_HEIGHT = 932;
const WEB_PREVIEW_DEVICE_SCALE_FACTOR = 1;
const WEB_PREVIEW_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 PWAShell";
const CHROME_CANDIDATES = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter(Boolean);
const webPreviewCache = new Map();

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function expandHome(inputPath) {
  if (inputPath === "~") return os.homedir();
  if (inputPath.startsWith("~/")) return path.join(os.homedir(), inputPath.slice(2));
  return inputPath;
}

async function exists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function findEntries(rootPath, predicate, maxDepth = 4) {
  const matches = [];

  async function walk(currentPath, depth) {
    if (depth > maxDepth) return;

    let entries = [];
    try {
      entries = await readdir(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(rootPath, entryPath);
      const normalizedRelativePath = relativePath || entry.name;
      const info = {
        absolutePath: entryPath,
        name: entry.name,
        relativePath: normalizedRelativePath,
        isDirectory: entry.isDirectory(),
      };

      if (predicate(info)) matches.push(info);

      if (!entry.isDirectory()) continue;
      if (IGNORED_DIRS.has(entry.name)) continue;
      if (/\.(xcodeproj|xcworkspace|xcassets)$/i.test(entry.name)) continue;

      await walk(entryPath, depth + 1);
    }
  }

  await walk(rootPath, 0);
  return matches;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringOrNull(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function firstString(...values) {
  for (const value of values) {
    const normalized = stringOrNull(value);
    if (normalized) return normalized;
  }
  return null;
}

function stringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" && item.trim().length > 0);
}

function readablePlistValue(value) {
  if (Array.isArray(value)) return value.map(readablePlistValue).join(", ");
  if (typeof value === "boolean") return value ? "켜짐" : "꺼짐";
  if (value === null || value === undefined) return "";
  if (isPlainObject(value)) return `${Object.keys(value).length}개 설정`;
  return String(value);
}

function normalizeDeploymentTarget(targetDeployment, optionsDeployment) {
  if (typeof targetDeployment === "string") return targetDeployment;
  if (isPlainObject(targetDeployment)) return firstString(targetDeployment.iOS, targetDeployment.ios);
  if (typeof optionsDeployment === "string") return optionsDeployment;
  if (isPlainObject(optionsDeployment)) return firstString(optionsDeployment.iOS, optionsDeployment.ios);
  return null;
}

function summarizeXcodeGenSpec(spec) {
  if (!spec || typeof spec !== "object") return null;

  const targets = spec.targets && typeof spec.targets === "object" ? spec.targets : {};
  const targetSummaries = Object.entries(targets).map(([targetName, target]) => {
    const settingsBase = target?.settings?.base ?? {};
    return {
      name: targetName,
      type: target?.type ?? null,
      platform: target?.platform ?? spec.options?.defaultConfig ?? null,
      deploymentTarget: normalizeDeploymentTarget(
        target?.deploymentTarget,
        spec.options?.deploymentTarget,
      ),
      productName: firstString(target?.productName, settingsBase.PRODUCT_NAME),
      bundleId: firstString(settingsBase.PRODUCT_BUNDLE_IDENTIFIER),
      developmentTeam: firstString(settingsBase.DEVELOPMENT_TEAM),
      infoPlist: firstString(settingsBase.INFOPLIST_FILE),
      entitlements: firstString(settingsBase.CODE_SIGN_ENTITLEMENTS),
      marketingVersion: firstString(settingsBase.MARKETING_VERSION),
      currentProjectVersion: firstString(settingsBase.CURRENT_PROJECT_VERSION),
      sourceCount: Array.isArray(target?.sources) ? target.sources.length : 0,
      resourceCount: Array.isArray(target?.resources) ? target.resources.length : 0,
    };
  });

  return {
    name: spec.name ?? null,
    options: spec.options ?? {},
    targetCount: targetSummaries.length,
    targets: targetSummaries,
  };
}

async function readPlistJson(filePath) {
  const { stdout } = await execFileAsync(
    "/usr/bin/plutil",
    ["-convert", "json", "-o", "-", filePath],
    { maxBuffer: 1024 * 1024 },
  );
  return JSON.parse(stdout);
}

function summarizeInfoPlist(plist) {
  const privacyKeys = Object.entries(PRIVACY_USAGE_LABELS)
    .filter(([key]) => plist[key] !== undefined)
    .map(([key, label]) => ({
      key,
      label,
      value: readablePlistValue(plist[key]),
    }));

  return {
    bundleDisplayName: stringOrNull(plist.CFBundleDisplayName),
    bundleName: stringOrNull(plist.CFBundleName),
    bundleIdentifier: stringOrNull(plist.CFBundleIdentifier),
    version: stringOrNull(plist.CFBundleShortVersionString),
    build: stringOrNull(plist.CFBundleVersion),
    privacyKeys,
    appBoundDomains: stringArray(plist.WKAppBoundDomains),
    backgroundModes: stringArray(plist.UIBackgroundModes),
  };
}

function summarizeEntitlements(plist) {
  const capabilities = Object.entries(plist)
    .filter(([key]) => ENTITLEMENT_LABELS[key])
    .map(([key, value]) => ({
      key,
      label: ENTITLEMENT_LABELS[key],
      value: readablePlistValue(value),
    }));

  return {
    capabilities,
    associatedDomains: stringArray(plist["com.apple.developer.associated-domains"]),
    appleSignIn: stringArray(plist["com.apple.developer.applesignin"]),
    pushEnvironment: stringOrNull(plist["aps-environment"]),
    applicationGroups: stringArray(plist["com.apple.security.application-groups"]),
  };
}

function imageMimeType(filename) {
  const extension = path.extname(filename).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  return "image/png";
}

async function iconPreviewDataUrl(iconSetPath, icon) {
  if (!icon?.filename || !icon.exists) return null;

  const iconPath = path.join(iconSetPath, icon.filename);
  const iconStats = await stat(iconPath).catch(() => null);
  if (!iconStats?.isFile() || iconStats.size > MAX_ICON_PREVIEW_BYTES) return null;

  const content = await readFile(iconPath);
  return `data:${imageMimeType(icon.filename)};base64,${content.toString("base64")}`;
}

async function imageFileDataUrl(filePath, filename, maxBytes) {
  const imageStats = await stat(filePath).catch(() => null);
  if (!imageStats?.isFile() || imageStats.size > maxBytes) return null;

  const content = await readFile(filePath);
  return `data:${imageMimeType(filename)};base64,${content.toString("base64")}`;
}

async function summarizeAppIconContents(contents, iconSetPath) {
  const images = Array.isArray(contents.images) ? contents.images : [];
  const imageSummaries = images.map((image) => {
    const filename = stringOrNull(image?.filename);
    return {
      filename,
      idiom: stringOrNull(image?.idiom),
      scale: stringOrNull(image?.scale),
      size: stringOrNull(image?.size),
      exists: filename ? exists(path.join(iconSetPath, filename)) : Promise.resolve(false),
    };
  });

  const resolvedImages = await Promise.all(
    imageSummaries.map(async (image) => ({ ...image, exists: await image.exists })),
  );
  const referencedImages = resolvedImages.filter((image) => image.filename);
  const marketingIcon =
    resolvedImages.find(
      (image) =>
        image.idiom === "ios-marketing" ||
        (image.size === "1024x1024" && image.scale === "1x"),
    ) ?? null;
  const previewDataUrl = await iconPreviewDataUrl(iconSetPath, marketingIcon);

  return {
    imageCount: images.length,
    referencedImageCount: referencedImages.length,
    existingImageCount: referencedImages.filter((image) => image.exists).length,
    hasMarketingIcon: Boolean(marketingIcon?.filename && marketingIcon.exists),
    marketingIcon,
    previewDataUrl,
    missingFilenames: referencedImages
      .filter((image) => !image.exists && image.filename)
      .map((image) => image.filename),
  };
}

async function parsePlistFile(entry, summarize) {
  const summary = fileSummary(entry);

  try {
    const plist = await readPlistJson(entry.absolutePath);
    return {
      ...summary,
      parsed: summarize(plist),
      parseError: null,
    };
  } catch (error) {
    return {
      ...summary,
      parsed: null,
      parseError: error instanceof Error ? error.message : "plist 파일을 읽지 못했습니다.",
    };
  }
}

async function parseAppIconSet(entry) {
  const summary = fileSummary(entry);
  const contentsPath = path.join(entry.absolutePath, "Contents.json");

  try {
    const contents = JSON.parse(await readFile(contentsPath, "utf8"));
    return {
      ...summary,
      parsed: await summarizeAppIconContents(contents, entry.absolutePath),
      parseError: null,
    };
  } catch (error) {
    return {
      ...summary,
      parsed: null,
      parseError: error instanceof Error ? error.message : "AppIcon Contents.json을 읽지 못했습니다.",
    };
  }
}

function fileSummary(entry) {
  return {
    name: entry.name,
    relativePath: entry.relativePath,
    absolutePath: entry.absolutePath,
  };
}

function isImageFile(entry) {
  return !entry.isDirectory && /\.(png|jpe?g|webp)$/i.test(entry.name);
}

function isScreenshotCandidate(entry) {
  if (!isImageFile(entry)) return false;

  const normalized = entry.relativePath.replaceAll("\\", "/").toLowerCase();
  if (/\.appiconset\//.test(normalized)) return false;
  if (/launch(icon|screen)?/.test(normalized)) return false;
  if (/\/icons?\//.test(normalized)) return false;
  if (/\/assets\.xcassets\/[^/]+\.imageset\//.test(normalized)) return false;

  return (
    /(^|\/)(screenshots?|app-store|appstore|store-assets?|metadata)(\/|$)/.test(normalized) ||
    /(screenshot|screen-shot|appstore|app-store|preview)/.test(normalized)
  );
}

function screenshotScore(entry) {
  const normalized = entry.relativePath.replaceAll("\\", "/").toLowerCase();
  let score = 0;
  if (/screenshots?/.test(normalized)) score += 20;
  if (/fastlane\/metadata/.test(normalized)) score += 20;
  if (/app-store|appstore/.test(normalized)) score += 10;
  if (/iphone|ios/.test(normalized)) score += 6;
  if (/ipad/.test(normalized)) score += 4;
  if (/preview/.test(normalized)) score += 2;
  return score;
}

async function summarizeScreenshot(entry) {
  return {
    ...fileSummary(entry),
    source: "local-image",
    previewDataUrl: await imageFileDataUrl(
      entry.absolutePath,
      entry.name,
      MAX_SCREEN_PREVIEW_BYTES,
    ),
  };
}

function rootUrlFromSwift(source) {
  const rootUrlMatch = source.match(
    /\b(?:let|var)\s+rootUrl\s*=\s*URL\s*\(\s*string:\s*"([^"]+)"/,
  );
  return rootUrlMatch?.[1] ?? null;
}

function validPreviewUrl(url) {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

async function findChromeBinary() {
  for (const candidate of CHROME_CANDIDATES) {
    const binaryStats = await stat(candidate).catch(() => null);
    if (binaryStats?.isFile()) return candidate;
  }
  return null;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

async function waitForCdp(port) {
  const endpoint = `http://127.0.0.1:${port}/json/version`;
  const deadline = Date.now() + WEB_PREVIEW_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      await fetchJson(endpoint);
      return;
    } catch {
      await wait(100);
    }
  }

  throw new Error("Chrome DevTools endpoint did not start.");
}

function createCdpClient(webSocketUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(webSocketUrl);
    const pending = new Map();
    let nextId = 0;

    ws.onopen = () => {
      resolve({
        send(method, params = {}) {
          const id = ++nextId;
          ws.send(JSON.stringify({ id, method, params }));
          return new Promise((sendResolve, sendReject) => {
            pending.set(id, { resolve: sendResolve, reject: sendReject });
          });
        },
        close() {
          ws.close();
        },
      });
    };

    ws.onerror = () => {
      reject(new Error("Chrome DevTools WebSocket connection failed."));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) return;

      const { resolve, reject: rejectPending } = pending.get(message.id);
      pending.delete(message.id);

      if (message.error) {
        rejectPending(new Error(message.error.message ?? "Chrome DevTools command failed."));
      } else {
        resolve(message.result);
      }
    };
  });
}

async function captureWebPreviewWithDeviceEmulation(chromeBin, url, profileDir) {
  if (typeof WebSocket !== "function") {
    throw new Error("Chrome DevTools WebSocket is not available.");
  }

  const port = 10_000 + Math.floor(Math.random() * 20_000);
  const chrome = spawn(
    chromeBin,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDir}`,
      `--window-size=${WEB_PREVIEW_WIDTH},${WEB_PREVIEW_HEIGHT}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  const chromeExit = new Promise((resolve) => {
    chrome.once("exit", resolve);
  });
  let client = null;

  try {
    await waitForCdp(port);
    const target = await fetchJson(
      `http://127.0.0.1:${port}/json/new?${encodeURIComponent("about:blank")}`,
      { method: "PUT" },
    );
    client = await createCdpClient(target.webSocketDebuggerUrl);

    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: WEB_PREVIEW_WIDTH,
      height: WEB_PREVIEW_HEIGHT,
      deviceScaleFactor: WEB_PREVIEW_DEVICE_SCALE_FACTOR,
      mobile: true,
      screenWidth: WEB_PREVIEW_WIDTH,
      screenHeight: WEB_PREVIEW_HEIGHT,
    });
    await client.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 5,
    });
    await client.send("Emulation.setUserAgentOverride", {
      userAgent: WEB_PREVIEW_USER_AGENT,
      platform: "iPhone",
    });
    await client.send("Page.navigate", { url });
    await wait(WEB_PREVIEW_RENDER_WAIT_MS);

    const screenshot = await client.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
      fromSurface: true,
    });
    if (Buffer.byteLength(screenshot.data, "base64") > MAX_SCREEN_PREVIEW_BYTES) {
      return null;
    }

    return `data:image/png;base64,${screenshot.data}`;
  } finally {
    client?.close();
    chrome.kill("SIGTERM");
    await Promise.race([chromeExit, wait(1_000)]);
  }
}

async function captureWebPreviewDataUrl(url) {
  if (process.env.IOS_RELEASE_ASSISTANT_CAPTURE_WEB_PREVIEW !== "1") {
    return {
      previewDataUrl: null,
      previewError:
        "자동 웹 캡처는 기본 비활성화되어 있습니다. 실제 스크린샷 파일을 App Store 미리보기로 사용합니다.",
    };
  }
  const cachedPreview = webPreviewCache.get(url);
  if (cachedPreview) return cachedPreview;

  const chromeBin = await findChromeBinary();
  if (!chromeBin) {
    return { previewDataUrl: null, previewError: "Chrome headless 실행 파일을 찾지 못했습니다." };
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "ios-release-assistant-web-preview-"));
  const profileDir = path.join(tempDir, "chrome-profile");

  try {
    const result = {
      previewDataUrl: await captureWebPreviewWithDeviceEmulation(chromeBin, url, profileDir),
      previewError: null,
    };
    if (result.previewDataUrl) webPreviewCache.set(url, result);
    return result;
  } catch (error) {
    return {
      previewDataUrl: null,
      previewError:
        error instanceof Error ? "웹 미리보기 캡처에 실패했습니다." : "웹 미리보기를 만들지 못했습니다.",
    };
  } finally {
    await rm(tempDir, { force: true, maxRetries: 5, recursive: true, retryDelay: 100 });
  }
}

async function detectWebAppPreview(rootPath) {
  const swiftFiles = await findEntries(
    rootPath,
    (entry) => !entry.isDirectory && entry.name.endsWith(".swift"),
    5,
  );

  for (const swiftFile of swiftFiles) {
    const source = await readFile(swiftFile.absolutePath, "utf8").catch(() => "");
    const rootUrl = validPreviewUrl(rootUrlFromSwift(source));
    if (!rootUrl) continue;

    const capture = await captureWebPreviewDataUrl(rootUrl);
    return {
      rootUrl,
      sourceFile: fileSummary(swiftFile),
      ...capture,
    };
  }

  return null;
}

function makeChecklist({
  projectSpec,
  xcodeProjects,
  workspaces,
  infoPlists,
  entitlements,
  assetCatalogs,
  appIconSets,
}) {
  const firstInfoPlist = infoPlists.find((file) => file.parsed) ?? infoPlists[0];
  const firstEntitlements = entitlements.find((file) => file.parsed) ?? entitlements[0];
  const firstAppIconSet = appIconSets.find((file) => file.parsed) ?? appIconSets[0];
  const privacyCount = firstInfoPlist?.parsed?.privacyKeys.length ?? 0;
  const capabilityCount = firstEntitlements?.parsed?.capabilities.length ?? 0;
  const hasMarketingIcon = firstAppIconSet?.parsed?.hasMarketingIcon ?? false;

  return [
    {
      status: projectSpec ? "found" : "missing",
      title: "XcodeGen 설정 파일",
      copy: projectSpec
        ? `${projectSpec.relativePath} 파일을 찾았습니다.`
        : "project.yml 또는 project.yaml 파일을 찾지 못했습니다.",
    },
    {
      status: xcodeProjects.length > 0 ? "found" : "missing",
      title: "Xcode 프로젝트",
      copy:
        xcodeProjects.length > 0
          ? `${xcodeProjects[0].relativePath} 파일을 찾았습니다.`
          : ".xcodeproj 파일을 찾지 못했습니다.",
    },
    {
      status: infoPlists.length > 0 ? "found" : "warning",
      title: "앱 정보 파일",
      copy:
        infoPlists.length > 0
          ? `${infoPlists.length}개의 Info.plist 후보를 찾았습니다.${privacyCount > 0 ? ` 권한 문구 ${privacyCount}개를 읽었습니다.` : ""}`
          : "Info.plist 후보를 찾지 못했습니다.",
    },
    {
      status: entitlements.length > 0 ? "found" : "warning",
      title: "Apple 기능 권한 파일",
      copy:
        entitlements.length > 0
          ? `${entitlements.length}개의 entitlements 파일을 찾았습니다.${capabilityCount > 0 ? ` Apple 기능 ${capabilityCount}개를 읽었습니다.` : ""}`
          : "entitlements 파일을 찾지 못했습니다.",
    },
    {
      status: hasMarketingIcon ? "found" : assetCatalogs.length > 0 ? "warning" : "missing",
      title: "앱 아이콘/이미지 폴더",
      copy: hasMarketingIcon
        ? `${firstAppIconSet.relativePath}에서 App Store용 1024x1024 아이콘을 찾았습니다.`
        : firstAppIconSet
          ? `${firstAppIconSet.relativePath}에서 App Store용 1024x1024 아이콘을 확인해야 합니다.`
          : assetCatalogs.length > 0
            ? `${assetCatalogs.length}개의 asset catalog를 찾았습니다. AppIcon.appiconset을 확인해야 합니다.`
            : "Assets.xcassets 후보를 찾지 못했습니다.",
    },
  ];
}

export async function scanFolder(inputPath) {
  if (!inputPath || typeof inputPath !== "string") {
    const error = new Error("앱 폴더 경로를 입력해야 합니다.");
    error.statusCode = 400;
    throw error;
  }

  const inputRootPath = path.resolve(expandHome(inputPath));
  const rootStats = await stat(inputRootPath).catch(() => null);
  let rootPath = inputRootPath;
  let projectSpec = null;

  if (rootStats?.isFile() && /^project\.ya?ml$/i.test(path.basename(inputRootPath))) {
    rootPath = path.dirname(inputRootPath);
    projectSpec = {
      name: path.basename(inputRootPath),
      relativePath: path.basename(inputRootPath),
      absolutePath: inputRootPath,
    };
  } else if (!rootStats?.isDirectory()) {
    const error = new Error("입력한 경로가 폴더가 아니거나 존재하지 않습니다.");
    error.statusCode = 400;
    throw error;
  }

  const directProjectYml = path.join(rootPath, "project.yml");
  const directProjectYaml = path.join(rootPath, "project.yaml");

  if (projectSpec) {
    // The user selected project.yml/project.yaml directly.
  } else if (await exists(directProjectYml)) {
    projectSpec = {
      name: "project.yml",
      relativePath: "project.yml",
      absolutePath: directProjectYml,
    };
  } else if (await exists(directProjectYaml)) {
    projectSpec = {
      name: "project.yaml",
      relativePath: "project.yaml",
      absolutePath: directProjectYaml,
    };
  } else {
    const specs = await findEntries(
      rootPath,
      (entry) => !entry.isDirectory && /^project\.ya?ml$/i.test(entry.name),
      3,
    );
    projectSpec = specs[0] ? fileSummary(specs[0]) : null;
  }

  let parsedProject = null;
  let projectParseError = null;

  if (projectSpec) {
    try {
      const rawProjectSpec = await readFile(projectSpec.absolutePath, "utf8");
      parsedProject = summarizeXcodeGenSpec(YAML.parse(rawProjectSpec));
    } catch (error) {
      projectParseError = error instanceof Error ? error.message : "설정 파일을 읽지 못했습니다.";
    }
  }

  const [xcodeProjects, workspaces, infoPlists, entitlements, assetCatalogs, screenshots] = await Promise.all([
    findEntries(rootPath, (entry) => entry.isDirectory && entry.name.endsWith(".xcodeproj"), 3),
    findEntries(rootPath, (entry) => entry.isDirectory && entry.name.endsWith(".xcworkspace"), 3),
    findEntries(rootPath, (entry) => !entry.isDirectory && entry.name === "Info.plist", 5),
    findEntries(
      rootPath,
      (entry) =>
        !entry.isDirectory &&
        (entry.name.endsWith(".entitlements") ||
          (/entitlements/i.test(entry.relativePath) && entry.name.endsWith(".plist"))),
      5,
    ),
    findEntries(rootPath, (entry) => entry.isDirectory && entry.name.endsWith(".xcassets"), 5),
    findEntries(rootPath, isScreenshotCandidate, 5),
  ]);

  const appIconSetEntries = (
    await Promise.all(
      assetCatalogs.map((assetCatalog) =>
        findEntries(
          assetCatalog.absolutePath,
          (entry) => entry.isDirectory && entry.name.toLowerCase().endsWith(".appiconset"),
          3,
        ),
      ),
    )
  ).flat().map((entry) => ({
    ...entry,
    relativePath: path.relative(rootPath, entry.absolutePath),
  }));

  const screenshotEntries = screenshots
    .sort((a, b) => screenshotScore(b) - screenshotScore(a))
    .slice(0, 10);

  const [parsedInfoPlists, parsedEntitlements, parsedAppIconSets, screenPreviews, webApp] = await Promise.all([
    Promise.all(infoPlists.map((entry) => parsePlistFile(entry, summarizeInfoPlist))),
    Promise.all(entitlements.map((entry) => parsePlistFile(entry, summarizeEntitlements))),
    Promise.all(appIconSetEntries.map((entry) => parseAppIconSet(entry))),
    Promise.all(screenshotEntries.map((entry) => summarizeScreenshot(entry))),
    detectWebAppPreview(rootPath),
  ]);

  const files = {
    projectSpec,
    xcodeProjects: xcodeProjects.map(fileSummary),
    workspaces: workspaces.map(fileSummary),
    infoPlists: parsedInfoPlists,
    entitlements: parsedEntitlements,
    assetCatalogs: assetCatalogs.map(fileSummary),
    appIconSets: parsedAppIconSets,
    screenshots: screenPreviews,
    webApp,
  };

  return {
    ok: true,
    folder: {
      name: path.basename(rootPath),
      path: rootPath,
    },
    files,
    project: parsedProject,
    projectParseError,
    checklist: makeChecklist({
      projectSpec,
      xcodeProjects: files.xcodeProjects,
      workspaces: files.workspaces,
      infoPlists: files.infoPlists,
      entitlements: files.entitlements,
      assetCatalogs: files.assetCatalogs,
      appIconSets: files.appIconSets,
    }),
  };
}
