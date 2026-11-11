import { pollMbtilesJob } from "./mbtiles-job-poll";

describe("pollMbtilesJob", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("resolves completed and reports tile progress", async () => {
    const onProgress = jest.fn();
    const check = jest
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        data: { status: "STARTED", processedTiles: 1, totalTiles: 4 },
      })
      .mockResolvedValueOnce({
        status: 200,
        data: { status: "COMPLETED", processedTiles: 4, totalTiles: 4 },
      });

    const pending = pollMbtilesJob(check, {
      intervalMs: 3000,
      timeoutMs: 60000,
      onProgress,
    });
    await jest.advanceTimersByTimeAsync(3000);

    await expect(pending).resolves.toBe("completed");
    expect(onProgress).toHaveBeenCalledWith(0.25);
    expect(onProgress).toHaveBeenCalledWith(1);
  });

  it.each(["FAILED", "STOPPED", "ABANDONED", "UNKNOWN"])(
    "resolves failed when the job status is %s",
    async (status) => {
      const pending = pollMbtilesJob(
        async () => ({ status: 200, data: { status } }),
        { intervalMs: 3000, timeoutMs: 60000 },
      );

      await expect(pending).resolves.toBe("failed");
    },
  );

  it("resolves failed when the status request is an HTTP error", async () => {
    const pending = pollMbtilesJob(
      async () => ({ status: 500, data: { status: "STARTED" } }),
      { intervalMs: 3000, timeoutMs: 60000 },
    );

    await expect(pending).resolves.toBe("failed");
  });

  it("resolves failed when the body has no status", async () => {
    const pending = pollMbtilesJob(async () => ({ status: 200, data: {} }), {
      intervalMs: 3000,
      timeoutMs: 60000,
    });

    await expect(pending).resolves.toBe("failed");
  });

  it("resolves failed when the status request throws", async () => {
    const pending = pollMbtilesJob(
      async () => {
        throw new Error("offline");
      },
      { intervalMs: 3000, timeoutMs: 60000 },
    );

    await expect(pending).resolves.toBe("failed");
  });

  it("resolves failed when the wait runs out", async () => {
    const check = jest.fn().mockResolvedValue({
      status: 200,
      data: { status: "STARTED", processedTiles: 1, totalTiles: 10 },
    });
    const pending = pollMbtilesJob(check, { intervalMs: 3000, timeoutMs: 3000 });
    await jest.advanceTimersByTimeAsync(3000);

    await expect(pending).resolves.toBe("failed");
  });
});
