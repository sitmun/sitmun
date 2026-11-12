export interface MbtilesStatusResponse {
  status?: number;
  data?: {
    status?: string;
    processedTiles?: number;
    totalTiles?: number;
  };
}

const FAILED_STATUSES = new Set([
  "FAILED",
  "STOPPED",
  "ABANDONED",
  "UNKNOWN",
]);

export function pollMbtilesJob(
  check: () => Promise<MbtilesStatusResponse>,
  options: {
    intervalMs: number;
    timeoutMs: number;
    onProgress?: (value: number) => void;
  },
): Promise<"completed" | "failed"> {
  const deadline = Date.now() + options.timeoutMs;

  const step = async (): Promise<"completed" | "failed"> => {
    let response: MbtilesStatusResponse;
    try {
      response = await check();
    } catch {
      return "failed";
    }
    const httpStatus = response?.status ?? 0;
    const status = response?.data?.status;
    if (httpStatus >= 400 || !status) {
      return "failed";
    }
    const processed = response.data?.processedTiles;
    const total = response.data?.totalTiles;
    if (processed && total) {
      options.onProgress?.(processed / total);
    }
    if (status === "COMPLETED") {
      return "completed";
    }
    if (FAILED_STATUSES.has(status) || Date.now() >= deadline) {
      return "failed";
    }
    await new Promise((resolve) => setTimeout(resolve, options.intervalMs));
    return step();
  };

  return step();
}
