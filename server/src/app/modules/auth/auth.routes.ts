import { Router } from "express";
import * as authController from "./auth.controller";
import { validate } from "../../common/middlewares/validate.middleware";
import { authenticate } from "../../common/middlewares/auth.middleware";
import {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} from "./auth.validation";

const router = Router();

router.post("/register", validate(registerValidation), authController.register);
router.post("/login", validate(loginValidation), authController.login);
router.post("/logout", authController.logout);
router.post("/verify-email", authController.verifyEmail);
router.post(
  "/forgot-password",
  validate(forgotPasswordValidation),
  authController.forgotPassword,
);
router.post(
  "/reset-password",
  validate(resetPasswordValidation),
  authController.resetPassword,
);
router.post("/refresh", authController.refreshAccessToken);
router.get("/me", authenticate, authController.getMe);

export default router;
