import { Router } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import * as petController from "./pet.controller";
import { validate } from "../../common/middlewares/validate.middleware";
import { authenticate, authorize, checkShelterAccess, } from "../../common/middlewares/auth.middleware";
import { env } from "../../common/config/env";
import { AppError } from "../../common/middlewares/error.middleware";
import { createPetValidation, createPetTransferValidation, requestVetSignoffValidation, respondPetTransferValidation, updatePetValidation, updateStatusValidation, searchPetsValidation, } from "./pet.validation";
const router = Router();
const petImagesDir = path.join(env.UPLOAD_DIR, "pet-images");
fs.mkdirSync(petImagesDir, { recursive: true });
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, petImagesDir),
    filename: (_req, file, cb) => {
        const extension = path.extname(file.originalname) || ".jpg";
        const safeBase = path
            .basename(file.originalname, extension)
            .replace(/[^a-zA-Z0-9-_]/g, "_");
        cb(null, `${Date.now()}-${safeBase}${extension}`);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: env.MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            cb(new AppError(400, "Only image files are allowed"));
            return;
        }
        cb(null, true);
    },
});
router.get("/stats", authenticate, authorize("shelter_staff", "admin"), checkShelterAccess(), petController.getPetStats);
router.get("/", validate(searchPetsValidation), petController.getPets);
router.get("/nearby", petController.searchNearby);
router.post("/transfers", authenticate, authorize("shelter_staff"), validate(createPetTransferValidation), petController.createPetTransferRequest);
router.get("/transfers/my-requests", authenticate, authorize("shelter_staff"), petController.getMyPetTransferRequests);
router.patch("/transfers/:id/respond", authenticate, authorize("shelter_staff"), validate(respondPetTransferValidation), petController.respondPetTransferRequest);
router.post("/upload-image", authenticate, authorize("shelter_staff", "admin"), upload.single("image"), petController.uploadPetImage);
router.get("/:id", petController.getPetById);
router.post("/", authenticate, authorize("shelter_staff", "admin"), checkShelterAccess("shelter_staff"), validate(createPetValidation), petController.createPet);
router.patch("/:id", authenticate, authorize("shelter_staff", "admin"), checkShelterAccess("shelter_staff"), validate(updatePetValidation), petController.updatePet);
router.patch("/:id/status", authenticate, authorize("shelter_staff", "admin"), checkShelterAccess("shelter_staff"), validate(updateStatusValidation), petController.updatePetStatus);
router.post("/:id/request-vet-signoff", authenticate, authorize("shelter_staff", "admin"), checkShelterAccess("shelter_staff"), validate(requestVetSignoffValidation), petController.requestVetMedicalRelease);
router.get("/vet-approvals/:token/:decision", petController.processVetMedicalRelease);
router.delete("/:id", authenticate, authorize("shelter_staff", "admin"), checkShelterAccess("shelter_staff"), petController.deletePet);
export default router;
