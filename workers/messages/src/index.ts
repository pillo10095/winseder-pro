import { QueueEvents, Worker } from "bullmq";
import dotenv from "dotenv";

dotenv.config();

const redisConnection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
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
    const { campaignId, contactId, phone, messageBody } = job.data;
    console.log(`[messages] Enviando a ${phone}: "${messageBody.substring(0, 50)}..."`);

    // TODO: Integrar con BaileysClientService para envío real
    // Por ahora simulamos el envío
    const delay = Math.floor(Math.random() * 3000) + 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    await job.updateProgress(100);
  },
  { connection: redisConnection, concurrency: 3 }
);

worker.on("closed", () => {
  console.info("Worker mensajes cerrado");
});

process.on("SIGTERM", async () => {
  await worker.close();
  await queueEvents.close();
  process.exit(0);
});
