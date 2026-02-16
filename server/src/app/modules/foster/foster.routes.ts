import { Router } from "express";
import * as fosterController from "./foster.controller";
import {
  authenticate,
  authorize,
} from "../../common/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  authorize("shelter_staff", "admin"),
  fosterController.getFosters,
);

router.patch(
  "/:id/status",
  authorize("shelter_staff", "admin"),
  fosterController.updateFosterStatus,
);

router.get(
  "/assignments",
  authorize("shelter_staff", "admin"),
  fosterController.getFosterAssignments,
);

router.post(
  "/assignments",
  authorize("shelter_staff"),
  fosterController.assignPetToFoster,
);

router.post("/apply", authorize("adopter"), fosterController.applyToBeFoster);

router.get(
  "/my-status",
  authorize("adopter"),
  fosterController.getAdopterFosterStatus,
);

router.get(
  "/my-assignments",
  authorize("adopter"),
  fosterController.getAdopterAssignments,
);

export default router;
