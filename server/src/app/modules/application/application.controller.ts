import { Request, Response } from "express";
import { catchAsync } from "../../common/middlewares/catch.middleware";
import * as applicationService from "./application.service";

export const createApplication = catchAsync(
  async (req: Request, res: Response) => {
    const application = await applicationService.createApplicationInDB(
      req.body,
      req.user!.id,
      req.ip || "",
      req.get("user-agent"),
    );

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: { application },
    });
  },
);

export const getApplications = catchAsync(
  async (req: Request, res: Response) => {
    const result = await applicationService.getApplicationsFromDB(
      req.user!.id,
      req.user!.role,
      req.user!.shelterId,
      req.query,
    );

    res.json({
      success: true,
      data: result,
    });
  },
);

export const getApplicationById = catchAsync(
  async (req: Request, res: Response) => {
    const application = await applicationService.getApplicationByIdFromDB(
      req.params.id,
      req.user!.id,
      req.user!.role,
      req.user!.shelterId,
    );

    res.json({
      success: true,
      data: { application },
    });
  },
);

export const updateApplicationStatus = catchAsync(
  async (req: Request, res: Response) => {
    const application = await applicationService.updateApplicationStatusInDB(
      req.params.id,
      req.body,
      req.user!.id,
      req.user!.role,
      req.user!.shelterId,
      req.ip,
      req.get("user-agent"),
    );

    res.json({
      success: true,
      message: "Application status updated successfully",
      data: { application },
    });
  },
);

export const withdrawApplication = catchAsync(
  async (req: Request, res: Response) => {
    await applicationService.withdrawApplicationInDB(
      req.params.id,
      req.user!.id,
      req.ip,
      req.get("user-agent"),
    );

    res.json({
      success: true,
      message: "Application withdrawn successfully",
    });
  },
);
