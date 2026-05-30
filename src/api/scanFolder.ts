import type { FolderScanResult } from "../types";

export async function scanFolder(path: string): Promise<FolderScanResult> {
  const response = await fetch("/api/scan-folder", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ path }),
  });

  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error ?? "앱 폴더를 읽지 못했습니다.");
  }

  return payload as FolderScanResult;
}
