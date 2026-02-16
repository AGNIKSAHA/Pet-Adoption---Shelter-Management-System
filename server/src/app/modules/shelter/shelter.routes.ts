import { Router } from "express";
import {
  authenticate,
  authorize,
} from "../../common/middlewares/auth.middleware";
import { validate } from "../../common/middlewares/validate.middleware";
import * as shelterController from "./shelter.controller";
import * as shelterValidation from "./shelter.validation";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("admin"),
  validate(shelterValidation.createShelterValidation),
  shelterController.createShelter,
);

router.get("/", shelterController.getShelters);

router.post(
  "/apply",
  authenticate,
  authorize("shelter_staff"),
  validate(shelterValidation.applyToShelterValidation),
  shelterController.applyToShelter,
);

router.patch(
  "/staff/:id/approve",
  authenticate,
  authorize("admin"),
  shelterController.approveStaff,
);

router.patch(
  "/staff/:id/reject",
  authenticate,
  authorize("admin"),
  shelterController.rejectStaff,
);

export const shelterRoutes = router;
