import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const DEFAULT_ENTRY_LIMIT = 200;
const IGNORED_NAMES = new Set([
  ".git",
  ".release-assistant-backups",
  ".build",
  "build",
  "DerivedData",
  "dist",
  "node_modules",
  "Pods",
  "__pycache__",
]);

function httpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function defaultRoots() {
  return [path.resolve(process.cwd(), "../..")];
}

function parseRoots(inputRoots = process.env.BRIDGE_BROWSER_ROOTS) {
  const rawRoots = Array.isArray(inputRoots)
    ? inputRoots
    : typeof inputRoots === "string"
      ? inputRoots.split(",")
      : defaultRoots();

  return Array.from(
    new Set(
      rawRoots
        .map((root) => path.resolve(String(root).trim()))
        .filter(Boolean),
    ),
  );
}

function normalizeRelativePath(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function rootSummary(rootPath) {
  return {
    name: path.basename(rootPath) || rootPath,
    path: rootPath,
  };
}

function assertInsideRoots(targetPath, roots) {
  const resolvedTarget = path.resolve(targetPath);
  const matchingRoot =
    roots.find((root) => {
      const resolvedRoot = path.resolve(root);
      return (
        resolvedTarget === resolvedRoot ||
        resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)
      );
    }) ?? null;

  if (!matchingRoot) {
    throw httpError("허용된 로컬 폴더 밖은 탐색할 수 없습니다.", 403);
  }

  return {
    root: matchingRoot,
    path: resolvedTarget,
  };
}

async function directoryHints(directoryPath) {
  const [projectYml, projectYaml, xcodeProject] = await Promise.all([
    stat(path.join(directoryPath, "project.yml")).catch(() => null),
    stat(path.join(directoryPath, "project.yaml")).catch(() => null),
    readdir(directoryPath, { withFileTypes: true })
      .then((entries) => entries.some((entry) => entry.isDirectory() && entry.name.endsWith(".xcodeproj")))
      .catch(() => false),
  ]);

  return {
    hasProjectSpec: Boolean(projectYml?.isFile() || projectYaml?.isFile()),
    hasXcodeProject: Boolean(xcodeProject),
  };
}

async function entrySummary(parentPath, entry) {
  const entryPath = path.join(parentPath, entry.name);
  const isDirectory = entry.isDirectory();
  const isProjectSpec = entry.isFile() && /^project\.ya?ml$/i.test(entry.name);
  const hints = isDirectory ? await directoryHints(entryPath) : null;

  return {
    name: entry.name,
    path: entryPath,
    kind: isDirectory ? "directory" : isProjectSpec ? "project-spec" : "file",
    selectable: isDirectory || isProjectSpec,
    hasProjectSpec: Boolean(hints?.hasProjectSpec),
    hasXcodeProject: Boolean(hints?.hasXcodeProject),
  };
}

export function createFolderBrowser({ roots: inputRoots, entryLimit = DEFAULT_ENTRY_LIMIT } = {}) {
  const roots = parseRoots(inputRoots);

  if (roots.length === 0) {
    throw new Error("로컬 폴더 브라우저 루트가 설정되지 않았습니다.");
  }

  return {
    async browse(inputPath) {
      const requestedPath = inputPath ? String(inputPath) : roots[0];
      const { root, path: currentPath } = assertInsideRoots(requestedPath, roots);
      const currentStats = await stat(currentPath).catch(() => null);

      if (!currentStats?.isDirectory()) {
        throw httpError("탐색할 로컬 경로가 폴더가 아닙니다.");
      }

      const parentPath = currentPath === root ? null : path.dirname(currentPath);
      const rawEntries = await readdir(currentPath, { withFileTypes: true });
      const entries = (
        await Promise.all(
          rawEntries
            .filter((entry) => !entry.name.startsWith("."))
            .filter((entry) => !IGNORED_NAMES.has(entry.name))
            .filter(
              (entry) =>
                entry.isDirectory() ||
                (entry.isFile() && /^project\.ya?ml$/i.test(entry.name)),
            )
            .slice(0, entryLimit)
            .map((entry) => entrySummary(currentPath, entry)),
        )
      ).sort((a, b) => {
        if (a.kind === "directory" && b.kind !== "directory") return -1;
        if (a.kind !== "directory" && b.kind === "directory") return 1;
        return a.name.localeCompare(b.name, "ko");
      });

      return {
        ok: true,
        roots: roots.map(rootSummary),
        root: rootSummary(root),
        current: {
          name: path.basename(currentPath) || currentPath,
          path: currentPath,
          relativePath: normalizeRelativePath(path.relative(root, currentPath)),
        },
        parentPath,
        entries,
      };
    },
  };
}
