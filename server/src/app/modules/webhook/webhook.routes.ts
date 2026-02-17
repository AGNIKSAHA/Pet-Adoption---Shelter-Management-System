import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware";
import * as webhookController from "./webhook.controller";
import { body, validationResult } from "express-validator";

// Validation middleware
const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }
  next();
};

const router = Router();

// All webhook routes require authentication
router.use(authenticate);

// Create webhook
router.post(
  "/",
  [
    body("url").isURL().withMessage("Valid URL is required"),
    body("events")
      .isArray({ min: 1 })
      .withMessage("At least one event must be specified"),
    body("events.*").isString().withMessage("Event must be a string"),
    validate,
  ],
  webhookController.createWebhook,
);

// Get all webhooks for current user
router.get("/", webhookController.getWebhooks);

// Update webhook
router.patch(
  "/:id",
  [
    body("url").optional().isURL().withMessage("Valid URL is required"),
    body("events")
      .optional()
      .isArray({ min: 1 })
      .withMessage("At least one event must be specified"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean"),
    validate,
  ],
  webhookController.updateWebhook,
);

// Delete webhook
router.delete("/:id", webhookController.deleteWebhook);

export default router;
