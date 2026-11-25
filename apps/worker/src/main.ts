function log(event: string, fields: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ time: new Date().toISOString(), service: "worker", event, ...fields }));
}

async function main() {
  if (!process.env.REDIS_URL) {
    log("idle", {
      queue: "fulfillment",
      reason: "REDIS_URL is unset. Instant demo delivery runs inside the API process. Start Redis to attach this worker.",
    });
    await new Promise(() => {});
    return;
  }

  const { Worker } = await import("bullmq");
  const url = new URL(process.env.REDIS_URL);
  const connection = { host: url.hostname, port: Number(url.port || 6379), maxRetriesPerRequest: null };
  const worker = new Worker(
    "fulfillment",
    async (job) => {
      log("job.received", {
        id: job.id,
        name: job.name,
        attempts: job.attemptsMade,
        note: "No shared Postgres session is connected. The job is acknowledged and not used to reveal inventory.",
      });
    },
    { connection, concurrency: 2 },
  );
  worker.on("failed", (job, error) => log("job.failed", { id: job?.id, message: error.message }));
  log("started", { queue: "fulfillment", redis: url.host, mode: "mock" });
}

void main();
