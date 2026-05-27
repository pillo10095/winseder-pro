import { QueueEvents, Worker } from "bullmq";
import dotenv from "dotenv";

dotenv.config();

const redisConnection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD
};

const CAMPAIGN_QUEUE = process.env.BULLMQ_CAMPAIGN_QUEUE ?? "campaign:dispatch";

const queueEvents = new QueueEvents(CAMPAIGN_QUEUE, { connection: redisConnection });
queueEvents.on("completed", ({ jobId }) => {
  console.info(`[campaigns] job ${jobId} completado`);
});

queueEvents.on("failed", ({ jobId, failedReason }) => {
  console.error(`[campaigns] job ${jobId} falló: ${failedReason}`);
});

const worker = new Worker(
  CAMPAIGN_QUEUE,
  async (job) => {
    console.log(`Procesando campaña ${job.name}`, job.data);
    // TODO: implementar lógica real de campañas en Fase 5
    await job.updateProgress(100);
  },
  { connection: redisConnection }
);

worker.on("closed", () => {
  console.info("Worker campañas cerrado");
});

process.on("SIGTERM", async () => {
  await worker.close();
  await queueEvents.close();
  process.exit(0);
});
