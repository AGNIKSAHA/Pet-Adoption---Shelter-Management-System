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

router.patch(
  "/:id/active",
  authorize("shelter_staff", "adopter", "admin"),
  fosterController.toggleFosterActive,
);

router.delete(
  "/:id",
  authorize("shelter_staff", "admin"),
  fosterController.deleteFoster,
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

router.patch(
  "/assignments/:id/complete",
  authorize("shelter_staff"),
  fosterController.takeBackPetFromFoster,
);

router.post("/apply", authorize("adopter"), fosterController.applyToBeFoster);

router.get(
  "/my-status",
  authorize("adopter"),
  fosterController.getAdopterFosterStatus,
);

router.get(
  "/my-shelters",
  authorize("adopter"),
  fosterController.getAdopterFosterShelters,
);

router.patch(
  "/update-profile",
  authorize("adopter"),
  fosterController.updateFosterProfile,
);

router.patch(
  "/:id/preferences",
  authorize("adopter"),
  fosterController.updateAdopterFosterPreferencesById,
);

router.get(
  "/my-assignments",
  authorize("adopter"),
  fosterController.getAdopterAssignments,
);

export default router;
