import { Request, Response } from "express";
import { catchAsync } from "../../common/middlewares/catch.middleware";
import * as shelterService from "./shelter.service";
export const createShelter = catchAsync(async (req: Request, res: Response) => {
    const shelter = await shelterService.createShelterInDB(req.body, req.user!.id, req.ip, req.get("user-agent"));
    res.status(201).json({
        success: true,
        message: "Shelter created successfully",
        data: { shelter },
    });
});
export const getShelters = catchAsync(async (_req: Request, res: Response) => {
    const shelters = await shelterService.getSheltersFromDB();
    res.json({
        success: true,
        data: shelters,
    });
});
export const applyToShelter = catchAsync(async (req: Request, res: Response) => {
    const user = await shelterService.applyToShelterInDB(req.user!.id, req.body.shelterId, req.ip, req.get("user-agent"));
    res.json({
        success: true,
        message: "Application submitted successfully",
        data: user,
    });
});
export const approveStaff = catchAsync(async (req: Request, res: Response) => {
    const application = await shelterService.approveStaffInDB(req.user!.id, req.params.id, req.ip, req.get("user-agent"));
    res.json({
        success: true,
        message: "Staff application approved successfully",
        data: application,
    });
});
export const rejectStaff = catchAsync(async (req: Request, res: Response) => {
    const application = await shelterService.rejectStaffInDB(req.user!.id, req.params.id, req.ip, req.get("user-agent"));
    res.json({
        success: true,
        message: "Staff application rejected",
        data: application,
    });
});
export const leaveShelter = catchAsync(async (req: Request, res: Response) => {
    const result = await shelterService.leaveShelterInDB(req.user!.id, req.params.shelterId, req.ip, req.get("user-agent"));
    res.json({
        success: true,
        message: "Left shelter successfully",
        data: result,
    });
});
