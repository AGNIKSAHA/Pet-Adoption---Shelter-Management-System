import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware";
import * as webhookController from "./webhook.controller";
import { body, validationResult } from "express-validator";
const validate = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
    }
    next();
};
const router = Router();
router.use(authenticate);
router.post("/", [
    body("url").isURL().withMessage("Valid URL is required"),
    body("events")
        .isArray({ min: 1 })
        .withMessage("At least one event must be specified"),
    body("events.*").isString().withMessage("Event must be a string"),
    validate,
], webhookController.createWebhook);
router.get("/", webhookController.getWebhooks);
router.patch("/:id", [
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
], webhookController.updateWebhook);
router.delete("/:id", webhookController.deleteWebhook);
export default router;
