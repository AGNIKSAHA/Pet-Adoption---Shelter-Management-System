import { Router } from "express";
import * as userController from "./user.controller";
import { authenticate } from "../../common/middlewares/auth.middleware";

const router = Router();

router.patch("/profile", authenticate, userController.updateProfile);

export default router;
