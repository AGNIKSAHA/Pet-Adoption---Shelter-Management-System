import { Request, Response } from "express";
import { catchAsync } from "../../common/middlewares/catch.middleware";
import * as webhookService from "./webhook.service";

export const createWebhook = catchAsync(async (req: Request, res: Response) => {
  const { url, events } = req.body;
  const userId = req.user!.id;

  const webhook = await webhookService.createWebhook(userId, url, events);

  res.status(201).json({
    success: true,
    message: "Webhook created successfully",
    data: {
      webhook: {
        id: webhook._id,
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret,
        isActive: webhook.isActive,
        createdAt: webhook.createdAt,
      },
    },
  });
});

export const getWebhooks = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const webhooks = await webhookService.getUserWebhooks(userId);

  res.json({
    success: true,
    data: {
      webhooks: webhooks.map((w) => ({
        id: w._id,
        url: w.url,
        events: w.events,
        isActive: w.isActive,
        lastTriggeredAt: w.lastTriggeredAt,
        failureCount: w.failureCount,
        createdAt: w.createdAt,
      })),
    },
  });
});

export const updateWebhook = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const updates = req.body;

  const webhook = await webhookService.updateWebhook(id, userId, updates);

  res.json({
    success: true,
    message: "Webhook updated successfully",
    data: { webhook },
  });
});

export const deleteWebhook = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  await webhookService.deleteWebhook(id, userId);

  res.json({
    success: true,
    message: "Webhook deleted successfully",
  });
});
