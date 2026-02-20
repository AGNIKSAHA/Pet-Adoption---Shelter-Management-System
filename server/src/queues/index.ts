import Bull from "bull";
import { sendApplicationStatusEmail } from "../app/common/utils/mail";
import { createNotification } from "../app/common/utils/notification.util";
import { processOutboxEmailById } from "../app/common/utils/email-outbox.util";

// Create queues for background jobs
export const emailQueue = new Bull("email-notifications", {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
});

export const notificationQueue = new Bull("notifications", {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
});

// Process email queue
emailQueue.process(async (job) => {
  const { outboxId, email, petName, status } = job.data;
  console.log(`Processing email job: ${job.id}`);

  try {
    if (outboxId) {
      return await processOutboxEmailById(outboxId);
    }

    // Legacy fallback path for old queued jobs.
    await sendApplicationStatusEmail(email, petName, status);
    console.log(`Email sent successfully to ${email}`);
    return { success: true, email };
  } catch (error) {
    console.error(`Failed to send email:`, error);
    throw error;
  }
});

// Process notification queue
notificationQueue.process(async (job) => {
  const { userId, type, title, message, link } = job.data;
  console.log(`Processing notification job: ${job.id}`);

  try {
    await createNotification({ userId, type, title, message, link });
    console.log(`Notification created for user ${userId}`);
    return { success: true, userId };
  } catch (error) {
    console.error(`Failed to create notification:`, error);
    throw error;
  }
});

// Event listeners for monitoring
emailQueue.on("completed", (job) => {
  console.log(`Email job ${job.id} completed`);
});

emailQueue.on("failed", (job, err) => {
  console.error(`Email job ${job?.id} failed:`, err);
});

notificationQueue.on("completed", (job) => {
  console.log(`Notification job ${job.id} completed`);
});

notificationQueue.on("failed", (job, err) => {
  console.error(`Notification job ${job?.id} failed:`, err);
});
