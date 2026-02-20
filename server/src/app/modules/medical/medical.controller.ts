import { Request, Response } from "express";
import { catchAsync } from "../../common/middlewares/catch.middleware";
import { AppError } from "../../common/middlewares/error.middleware";
import * as medicalService from "./medical.service";
export const createMedicalRecord = catchAsync(async (req: Request, res: Response) => {
    const record = await medicalService.createMedicalRecordInDB(req.params.petId, req.body, req.user!.id, req.user!.role, req.ip, req.get("user-agent"));
    res.status(201).json({
        success: true,
        message: "Medical record created",
        data: { record },
    });
});
export const createVaccinationCorrection = catchAsync(async (req: Request, res: Response) => {
    const record = await medicalService.createVaccinationCorrectionInDB(req.params.petId, req.params.recordId, req.body, req.user!.id, req.user!.role, req.ip, req.get("user-agent"));
    res.status(201).json({
        success: true,
        message: "Correction record created",
        data: { record },
    });
});
export const updateMedicalRecord = catchAsync(async (req: Request, res: Response) => {
    const record = await medicalService.updateMedicalRecordInDB(req.params.id, req.body, req.user!.id, req.user!.role, req.ip, req.get("user-agent"));
    res.json({
        success: true,
        message: "Medical record updated",
        data: { record },
    });
});
export const deleteMedicalRecord = catchAsync(async (req: Request, res: Response) => {
    await medicalService.deleteMedicalRecordInDB(req.params.id, req.user!.id, req.user!.role, req.ip, req.get("user-agent"));
    res.json({
        success: true,
        message: "Medical record deleted",
    });
});
export const getMedicalTimeline = catchAsync(async (req: Request, res: Response) => {
    const timeline = await medicalService.getMedicalTimelineFromDB(req.params.petId, req.user!.id, req.user!.role);
    res.json({
        success: true,
        data: timeline,
    });
});
export const uploadMedicalReport = catchAsync(async (req: Request, res: Response) => {
    if (!req.file) {
        throw new AppError(400, "PDF report file is required");
    }
    const fileUrl = `/uploads/medical-reports/${req.file.filename}`;
    res.status(201).json({
        success: true,
        message: "Medical report uploaded",
        data: {
            url: fileUrl,
            filename: req.file.originalname,
        },
    });
});
