import { sendApplicationStatusEmail } from "./mail";
import { EmailOutbox } from "../../modules/notification/email-outbox.model";

const EMAIL_JOB_ATTEMPTS = 5;

export const buildApplicationStatusDedupKey = (
  applicationId: string,
  status: string,
) => `application-status:${applicationId}:${status.toLowerCase()}`;

export const enqueueApplicationStatusEmail = async (params: {
  dedupKey: string;
  to: string;
  petName: string;
  status: string;
}) => {
  const { dedupKey, to, petName, status } = params;

  const outbox = await EmailOutbox.findOneAndUpdate(
    { dedupKey },
    {
      $setOnInsert: {
        dedupKey,
        type: "application_status",
        to,
        payload: { petName, status },
        status: "pending",
        attempts: 0,
      },
    },
    { upsert: true, new: true },
  );

  // Already sent => no-op, keep idempotent.
  if (outbox.status === "sent") {
    return outbox;
  }

  const { emailQueue } = await import("../../../queues");
  await emailQueue.add(
    { outboxId: outbox._id.toString() },
    {
      jobId: `outbox:${outbox._id.toString()}`,
      attempts: EMAIL_JOB_ATTEMPTS,
      backoff: { type: "exponential", delay: 1500 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  );

  return outbox;
};

export const processOutboxEmailById = async (outboxId: string) => {
  const outbox = await EmailOutbox.findById(outboxId);
  if (!outbox) {
    return { success: true, skipped: true, reason: "missing_outbox" };
  }

  // Idempotent guard: once sent, never send again.
  if (outbox.status === "sent") {
    return { success: true, skipped: true, reason: "already_sent" };
  }

  // If another worker already started sending, skip to avoid duplicates.
  if (outbox.status === "sending") {
    return { success: true, skipped: true, reason: "in_flight" };
  }

  const claim = await EmailOutbox.findOneAndUpdate(
    { _id: outboxId, status: { $in: ["pending", "failed"] } },
    { $set: { status: "sending", sendingAt: new Date() } },
    { new: true },
  );

  if (!claim) {
    return { success: true, skipped: true, reason: "not_claimed" };
  }

  try {
    if (claim.type === "application_status") {
      const petName = String(claim.payload?.petName || "");
      const status = String(claim.payload?.status || "");
      await sendApplicationStatusEmail(claim.to, petName, status);
    }

    await EmailOutbox.updateOne(
      { _id: claim._id, status: "sending" },
      {
        $set: {
          status: "sent",
          sentAt: new Date(),
          lastError: undefined,
        },
        $inc: { attempts: 1 },
      },
    );

    return { success: true, outboxId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error";
    await EmailOutbox.updateOne(
      { _id: claim._id },
      {
        $set: {
          status: "failed",
          lastError: message,
        },
        $inc: { attempts: 1 },
      },
    );
    throw error;
  }
};
