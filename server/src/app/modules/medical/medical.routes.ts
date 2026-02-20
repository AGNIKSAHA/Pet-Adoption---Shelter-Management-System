import { Router } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import {
  authenticate,
  authorize,
} from "../../common/middlewares/auth.middleware";
import { env } from "../../common/config/env";
import { AppError } from "../../common/middlewares/error.middleware";
import * as medicalController from "./medical.controller";

const router = Router();
const medicalReportsDir = path.join(env.UPLOAD_DIR, "medical-reports");
fs.mkdirSync(medicalReportsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, medicalReportsDir),
  filename: (_req, file, cb) => {
    const safeBase = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9-_]/g, "_");
    cb(null, `${Date.now()}-${safeBase}.pdf`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const isPdf =
      file.mimetype === "application/pdf" || /\.pdf$/i.test(file.originalname);
    if (!isPdf) {
      cb(new AppError(400, "Only PDF files are allowed"));
      return;
    }
    cb(null, true);
  },
});

router.post(
  "/upload-report",
  authenticate,
  authorize("shelter_staff", "admin"),
  upload.single("report"),
  medicalController.uploadMedicalReport,
);

router.get(
  "/pets/:petId/timeline",
  authenticate,
  authorize("shelter_staff", "admin"),
  medicalController.getMedicalTimeline,
);

router.post(
  "/pets/:petId/records",
  authenticate,
  authorize("shelter_staff", "admin"),
  medicalController.createMedicalRecord,
);

router.post(
  "/pets/:petId/records/:recordId/corrections",
  authenticate,
  authorize("shelter_staff", "admin"),
  medicalController.createVaccinationCorrection,
);

router.patch(
  "/records/:id",
  authenticate,
  authorize("shelter_staff", "admin"),
  medicalController.updateMedicalRecord,
);

router.delete(
  "/records/:id",
  authenticate,
  authorize("shelter_staff", "admin"),
  medicalController.deleteMedicalRecord,
);

export default router;
