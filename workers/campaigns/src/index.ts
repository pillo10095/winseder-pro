import { Queue, QueueEvents, Worker } from "bullmq";
import dotenv from "dotenv";

dotenv.config();

const redisConnection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
};

const CAMPAIGN_QUEUE = process.env.BULLMQ_CAMPAIGN_QUEUE ?? "campaign:dispatch";
const MESSAGE_QUEUE = process.env.BULLMQ_MESSAGE_QUEUE ?? "message:dispatch";

const messageQueue = new Queue(MESSAGE_QUEUE, { connection: redisConnection });

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
    const { campaignId, contacts, templateBody, variablesMap } = job.data;
    console.info(`[campaigns] Procesando campaña ${campaignId}: ${contacts.length} contactos`);

    let sent = 0;
    for (const contact of contacts) {
      let messageBody = templateBody;
      if (variablesMap?.[contact.id]) {
        for (const [key, value] of Object.entries(variablesMap[contact.id])) {
          messageBody = messageBody.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value as string);
        }
      }

      await messageQueue.add("send", {
        campaignId,
        contactId: contact.id,
        phone: contact.phone,
        messageBody,
      });

      sent++;
      await job.updateProgress(Math.round((sent / contacts.length) * 100));
    }

    console.info(`[campaigns] Campaña ${campaignId}: ${sent} mensajes encolados`);
  },
  { connection: redisConnection, concurrency: 5 }
);

worker.on("closed", () => {
  console.info("Worker campañas cerrado");
});

process.on("SIGTERM", async () => {
  await worker.close();
  await queueEvents.close();
  await messageQueue.close();
  process.exit(0);
});
