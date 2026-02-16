import { Router } from "express";
import * as petController from "./pet.controller";
import { validate } from "../../common/middlewares/validate.middleware";
import {
  authenticate,
  authorize,
} from "../../common/middlewares/auth.middleware";
import {
  createPetValidation,
  updatePetValidation,
  updateStatusValidation,
  searchPetsValidation,
} from "./pet.validation";

const router = Router();

// Protected routes - Shelter staff and Admin only
router.get(
  "/stats",
  authenticate,
  authorize("shelter_staff", "admin"),
  petController.getPetStats,
);

// Public routes
router.get("/", validate(searchPetsValidation), petController.getPets);
router.get("/nearby", petController.searchNearby);
router.get("/:id", petController.getPetById);

router.post(
  "/",
  authenticate,
  authorize("shelter_staff", "admin"),
  validate(createPetValidation),
  petController.createPet,
);

router.patch(
  "/:id",
  authenticate,
  authorize("shelter_staff", "admin"),
  validate(updatePetValidation),
  petController.updatePet,
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("shelter_staff", "admin"),
  validate(updateStatusValidation),
  petController.updatePetStatus,
);

router.delete(
  "/:id",
  authenticate,
  authorize("shelter_staff", "admin"),
  petController.deletePet,
);

export default router;
