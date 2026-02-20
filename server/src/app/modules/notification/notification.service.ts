import { Notification } from "./notification.model";
import { AppError } from "../../common/middlewares/error.middleware";
export const getMyNotificationsFromDB = async (userId: string) => {
    return await Notification.find({ userId }).sort({ createdAt: -1 }).limit(50);
};
export const markAsReadInDB = async (id: string, userId: string) => {
    const notification = await Notification.findOneAndUpdate({ _id: id, userId }, { isRead: true }, { new: true });
    if (!notification) {
        throw new AppError(404, "Notification not found");
    }
    return notification;
};
export const markAllAsReadInDB = async (userId: string) => {
    return await Notification.updateMany({ userId, isRead: false }, { isRead: true });
};
export const deleteNotificationFromDB = async (id: string, userId: string) => {
    const notification = await Notification.findOneAndDelete({ _id: id, userId });
    if (!notification) {
        throw new AppError(404, "Notification not found");
    }
    return notification;
};
