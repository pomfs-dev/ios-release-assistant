import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import YAML from "yaml";

const IGNORED_DIRS = new Set([
  ".git",
  ".build",
  "build",
  "DerivedData",
  "dist",
  "node_modules",
  "Pods",
]);

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

function summarizeXcodeGenSpec(spec) {
  if (!spec || typeof spec !== "object") return null;

  const targets = spec.targets && typeof spec.targets === "object" ? spec.targets : {};
  const targetSummaries = Object.entries(targets).map(([targetName, target]) => {
    const settingsBase = target?.settings?.base ?? {};
    return {
      name: targetName,
      type: target?.type ?? null,
      platform: target?.platform ?? spec.options?.defaultConfig ?? null,
      deploymentTarget: target?.deploymentTarget ?? target?.deploymentTarget?.iOS ?? null,
      bundleId: settingsBase.PRODUCT_BUNDLE_IDENTIFIER ?? null,
      developmentTeam: settingsBase.DEVELOPMENT_TEAM ?? null,
      entitlements: settingsBase.CODE_SIGN_ENTITLEMENTS ?? null,
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

function fileSummary(entry) {
  return {
    name: entry.name,
    relativePath: entry.relativePath,
    absolutePath: entry.absolutePath,
  };
}

function makeChecklist({ projectSpec, xcodeProjects, workspaces, infoPlists, entitlements, assetCatalogs }) {
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
          ? `${infoPlists.length}개의 Info.plist 후보를 찾았습니다.`
          : "Info.plist 후보를 찾지 못했습니다.",
    },
    {
      status: entitlements.length > 0 ? "found" : "warning",
      title: "Apple 기능 권한 파일",
      copy:
        entitlements.length > 0
          ? `${entitlements.length}개의 entitlements 파일을 찾았습니다.`
          : "entitlements 파일을 찾지 못했습니다.",
    },
    {
      status: assetCatalogs.length > 0 ? "found" : "warning",
      title: "앱 아이콘/이미지 폴더",
      copy:
        assetCatalogs.length > 0
          ? `${assetCatalogs.length}개의 asset catalog를 찾았습니다.`
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

  const rootPath = path.resolve(expandHome(inputPath));
  const rootStats = await stat(rootPath).catch(() => null);

  if (!rootStats?.isDirectory()) {
    const error = new Error("입력한 경로가 폴더가 아니거나 존재하지 않습니다.");
    error.statusCode = 400;
    throw error;
  }

  const directProjectYml = path.join(rootPath, "project.yml");
  const directProjectYaml = path.join(rootPath, "project.yaml");
  let projectSpec = null;

  if (await exists(directProjectYml)) {
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

  const [xcodeProjects, workspaces, infoPlists, entitlements, assetCatalogs] = await Promise.all([
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
  ]);

  const files = {
    projectSpec,
    xcodeProjects: xcodeProjects.map(fileSummary),
    workspaces: workspaces.map(fileSummary),
    infoPlists: infoPlists.map(fileSummary),
    entitlements: entitlements.map(fileSummary),
    assetCatalogs: assetCatalogs.map(fileSummary),
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
      xcodeProjects,
      workspaces,
      infoPlists,
      entitlements,
      assetCatalogs,
    }),
  };
}
