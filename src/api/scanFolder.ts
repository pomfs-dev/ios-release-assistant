import type { FolderScanResult } from "../types";

const SCAN_TIMEOUT_MS = 35_000;

function scanEndpointCandidates() {
  const endpoints = ["/api/scan-folder"];
  const { hostname, port, protocol } = window.location;

  if (protocol === "http:" && hostname === "localhost" && port) {
    endpoints.push(`http://127.0.0.1:${port}/api/scan-folder`);
  }

  return endpoints;
}

function isNetworkFetchError(error: unknown) {
  return error instanceof TypeError && /fetch/i.test(error.message);
}

async function requestScanFolder(endpoint: string, path: string) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ path }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("앱 폴더 읽기 시간이 초과됐습니다. 더 좁은 앱 폴더를 선택해주세요.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error ?? "앱 폴더를 읽지 못했습니다.");
  }

  return payload as FolderScanResult;
}

export async function scanFolder(path: string): Promise<FolderScanResult> {
  let networkError: unknown = null;

  for (const endpoint of scanEndpointCandidates()) {
    try {
      return await requestScanFolder(endpoint, path);
    } catch (error) {
      if (!isNetworkFetchError(error)) throw error;
      networkError = error;
    }
  }

  throw new Error(
    networkError instanceof Error
      ? `${networkError.message}. local server가 열려 있는 127.0.0.1 주소로 새로고침한 뒤 다시 시도해주세요.`
      : "local server에 연결하지 못했습니다. 127.0.0.1 주소로 새로고침한 뒤 다시 시도해주세요.",
  );
}
