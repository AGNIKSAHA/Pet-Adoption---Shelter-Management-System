import { Router } from "express";
import * as messageController from "./message.controller";
import { authenticate } from "../../common/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/conversations", messageController.getConversations);
router.get("/chatable-users", messageController.getChatableUsers);
router.get("/:userId", messageController.getMessagesBetweenUsers);
router.post("/", messageController.sendMessage);
router.patch("/:userId/read", messageController.markAsRead);

export default router;
