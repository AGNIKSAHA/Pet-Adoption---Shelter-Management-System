import { Router } from "express";
import * as dashboardController from "./dashboard.controller";
import {
  authenticate,
  authorize,
} from "../../common/middlewares/auth.middleware";

const router = Router();

router.get(
  "/shelter",
  authenticate,
  authorize("shelter_staff", "admin"),
  dashboardController.getShelterDashboardStats,
);

router.get(
  "/adopter",
  authenticate,
  authorize("adopter"),
  dashboardController.getAdopterDashboardStats,
);

router.get(
  "/admin",
  authenticate,
  authorize("admin"),
  dashboardController.getAdminDashboardStats,
);

export default router;
