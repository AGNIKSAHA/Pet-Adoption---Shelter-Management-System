import crypto from "crypto";
import axios from "axios";
import { Webhook, IWebhook } from "./webhook.model";
import { FilterQuery } from "mongoose";

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Trigger webhooks for a specific event
 */
export const triggerWebhooks = async (
  event: string,
  data: Record<string, unknown>,
  userId?: string,
) => {
  try {
    const query: FilterQuery<IWebhook> = {
      isActive: true,
      events: event,
    };

    // If userId is provided, only trigger webhooks for that user
    if (userId) {
      query.userId = userId;
    }

    const webhooks = await Webhook.find(query);

    if (webhooks.length === 0) {
      return;
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    // Trigger all webhooks in parallel
    const promises = webhooks.map((webhook) =>
      sendWebhook(webhook, payload).catch((error) => {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`Failed to send webhook ${webhook._id}:`, message);
      }),
    );

    await Promise.allSettled(promises);
  } catch (error) {
    console.error("Error triggering webhooks:", error);
  }
};

/**
 * Send a webhook to a specific URL
 */
const sendWebhook = async (webhook: IWebhook, payload: WebhookPayload) => {
  try {
    const signature = generateSignature(payload, webhook.secret);

    const response = await axios.post(webhook.url, payload, {
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": payload.event,
        "User-Agent": "PetAdoption-Webhook/1.0",
      },
      timeout: 10000, // 10 second timeout
    });

    // Update webhook on success
    webhook.lastTriggeredAt = new Date();
    webhook.failureCount = 0;
    await webhook.save();

    return response.data;
  } catch (error) {
    // Increment failure count
    webhook.failureCount += 1;

    // Disable webhook after 10 consecutive failures
    if (webhook.failureCount >= 10) {
      webhook.isActive = false;
    }

    webhook.lastTriggeredAt = new Date();
    await webhook.save();

    throw error;
  }
};

/**
 * Generate HMAC signature for webhook payload
 */
const generateSignature = (payload: WebhookPayload, secret: string): string => {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest("hex");
};

/**
 * Verify webhook signature
 */
export const verifyWebhookSignature = (
  payload: string,
  signature: string,
  secret: string,
): boolean => {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
};

/**
 * Create a new webhook
 */
export const createWebhook = async (
  userId: string,
  url: string,
  events: string[],
) => {
  // Generate a random secret for signing
  const secret = crypto.randomBytes(32).toString("hex");

  const webhook = await Webhook.create({
    userId,
    url,
    events,
    secret,
  });

  return webhook;
};

/**
 * Get all webhooks for a user
 */
export const getUserWebhooks = async (userId: string) => {
  return Webhook.find({ userId }).sort({ createdAt: -1 });
};

/**
 * Delete a webhook
 */
export const deleteWebhook = async (webhookId: string, userId: string) => {
  const webhook = await Webhook.findOne({ _id: webhookId, userId });

  if (!webhook) {
    throw new Error("Webhook not found");
  }

  await webhook.deleteOne();
  return webhook;
};

/**
 * Update webhook
 */
export const updateWebhook = async (
  webhookId: string,
  userId: string,
  updates: { url?: string; events?: string[]; isActive?: boolean },
) => {
  const webhook = await Webhook.findOne({ _id: webhookId, userId });

  if (!webhook) {
    throw new Error("Webhook not found");
  }

  if (updates.url) webhook.url = updates.url;
  if (updates.events) webhook.events = updates.events;
  if (typeof updates.isActive === "boolean")
    webhook.isActive = updates.isActive;

  await webhook.save();
  return webhook;
};
