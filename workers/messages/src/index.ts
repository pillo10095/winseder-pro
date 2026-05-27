import { QueueEvents, Worker } from "bullmq";
import dotenv from "dotenv";

dotenv.config();

const redisConnection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD
};

const MESSAGE_QUEUE = process.env.BULLMQ_MESSAGE_QUEUE ?? "message:dispatch";

const queueEvents = new QueueEvents(MESSAGE_QUEUE, { connection: redisConnection });
queueEvents.on("completed", ({ jobId }) => {
  console.info(`[messages] job ${jobId} completado`);
});

queueEvents.on("failed", ({ jobId, failedReason }) => {
  console.error(`[messages] job ${jobId} falló: ${failedReason}`);
});

const worker = new Worker(
  MESSAGE_QUEUE,
  async (job) => {
    console.log(`Despachando mensaje ${job.id}`, job.data);
    // TODO: implementar estrategia anti-ban y envíos reales en Fase 5
    await job.updateProgress(100);
  },
  { connection: redisConnection }
);

worker.on("closed", () => {
  console.info("Worker mensajes cerrado");
});

process.on("SIGTERM", async () => {
  await worker.close();
  await queueEvents.close();
  process.exit(0);
});
