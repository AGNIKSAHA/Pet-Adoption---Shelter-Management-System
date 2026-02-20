import { Router } from "express";
import * as adminController from "./admin.controller";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";

const router = Router();

// All admin routes require authenticated admin role
router.use(authenticate, authorize("admin"));

// User Management
router.get("/users", adminController.getAllUsers);
router.patch("/users/:id/status", adminController.updateUserStatus);
router.delete("/users/:id", adminController.deleteUser);

// Shelter Management
router.get("/shelters", adminController.getAllShelters);
router.post("/shelters", adminController.createShelter);
router.patch("/shelters/:id", adminController.updateShelter);
router.delete("/shelters/:id", adminController.deleteShelter);

// Shelter Staff Approval
router.get("/shelter-requests", adminController.getPendingShelterRequests);
router.patch(
  "/shelter-requests/:id/approve",
  adminController.approveShelterRequest,
);
router.patch(
  "/shelter-requests/:id/reject",
  adminController.rejectShelterRequest,
);

export default router;
