import { Router } from "express";
import * as applicationController from "./application.controller";
import {
  authenticate,
  authorize,
} from "../../common/middlewares/auth.middleware";

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post("/", authorize("adopter"), applicationController.createApplication);
router.get("/", applicationController.getApplications);
router.get("/:id", applicationController.getApplicationById);

router.patch(
  "/:id/status",
  authorize("shelter_staff", "admin"),
  applicationController.updateApplicationStatus,
);

router.patch(
  "/:id/withdraw",
  authorize("adopter"),
  applicationController.withdrawApplication,
);

export default router;
