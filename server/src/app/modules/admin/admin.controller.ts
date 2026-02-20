import { Request, Response } from "express";
import { catchAsync } from "../../common/middlewares/catch.middleware";
import { AppError } from "../../common/middlewares/error.middleware";
import * as adminService from "./admin.service";
export const getAllUsers = catchAsync(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, role, search } = req.query;
    const result = await adminService.getAllUsersFromDB(Number(page), Number(limit), role as string, search as string);
    res.json({
        success: true,
        data: result,
    });
});
export const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await adminService.updateUserStatusInDB(id, req.body);
    res.json({
        success: true,
        message: "User updated successfully",
        data: user,
    });
});
export const deleteUser = catchAsync(async (_req: Request, _res: Response) => {
    throw new AppError(403, "User deletion is disabled. Please suspend users instead.");
});
export const getAllShelters = catchAsync(async (_req: Request, res: Response) => {
    const shelters = await adminService.getAllSheltersFromDB();
    res.json({
        success: true,
        data: shelters,
    });
});
export const createShelter = catchAsync(async (req: Request, res: Response) => {
    const shelter = await adminService.createShelterInDB(req.body, req.user!.id);
    res.status(201).json({
        success: true,
        message: "Shelter created successfully",
        data: shelter,
    });
});
export const updateShelter = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const shelter = await adminService.updateShelterInDB(id, req.body, req.user!.id);
    res.json({
        success: true,
        message: "Shelter updated successfully",
        data: shelter,
    });
});
export const deleteShelter = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    await adminService.deleteShelterFromDB(id, req.user!.id);
    res.json({
        success: true,
        message: "Shelter deleted successfully",
    });
});
export const getPendingShelterRequests = catchAsync(async (req: Request, res: Response) => {
    const requests = await adminService.getPendingShelterRequestsFromDB(req.user!.id);
    res.json({
        success: true,
        data: requests,
    });
});
export const approveShelterRequest = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await adminService.approveShelterRequestInDB(id, req.user!.id);
    res.json({
        success: true,
        message: "Shelter request approved successfully",
        data: user,
    });
});
export const rejectShelterRequest = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await adminService.rejectShelterRequestInDB(id, req.user!.id);
    res.json({
        success: true,
        message: "Shelter request rejected",
        data: user,
    });
});
