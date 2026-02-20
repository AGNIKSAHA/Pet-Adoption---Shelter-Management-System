import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import petRoutes from "../modules/pet/pet.routes";
import applicationRoutes from "../modules/application/application.routes";
import userRoutes from "../modules/user/user.routes";
import dashboardRoutes from "../modules/dashboard/dashboard.routes";
import fosterRoutes from "../modules/foster/foster.routes";
import favoriteRoutes from "../modules/favorite/favorite.routes";
import adminRoutes from "../modules/admin/admin.routes";
import messageRoutes from "../modules/message/message.routes";
import notificationRoutes from "../modules/notification/notification.routes";
import { shelterRoutes } from "../modules/shelter/shelter.routes";
import webhookRoutes from "../modules/webhook/webhook.routes";
import medicalRoutes from "../modules/medical/medical.routes";

const router = Router();
router.use("/notifications", notificationRoutes);

router.use("/auth", authRoutes);
router.use("/pets", petRoutes);
router.use("/shelters", shelterRoutes);
router.use("/applications", applicationRoutes);
router.use("/users", userRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/fosters", fosterRoutes);
router.use("/favorites", favoriteRoutes);
router.use("/admin", adminRoutes);
router.use("/messages", messageRoutes);
router.use("/medical", medicalRoutes);
router.use("/webhooks", webhookRoutes);

// Health check
router.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
  });
});

export default router;
