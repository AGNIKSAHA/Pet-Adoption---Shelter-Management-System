import { Request, Response } from "express";
import { catchAsync } from "../../common/middlewares/catch.middleware";
import * as notificationService from "./notification.service";
export const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const notifications = await notificationService.getMyNotificationsFromDB(userId);
    res.json({
        success: true,
        data: notifications,
    });
});
export const markAsRead = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const notification = await notificationService.markAsReadInDB(id, userId);
    res.json({
        success: true,
        data: notification,
    });
});
export const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    await notificationService.markAllAsReadInDB(userId);
    res.json({
        success: true,
        message: "All notifications marked as read",
    });
});
export const deleteNotification = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    await notificationService.deleteNotificationFromDB(id, userId);
    res.json({
        success: true,
        message: "Notification deleted successfully",
    });
});
