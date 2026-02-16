import { Notification } from "../../modules/notification/notification.model";
import { io } from "../../../index";

export const createNotification = async (data: {
  userId: string;
  type: "application_update" | "message" | "pet_update" | "system";
  title: string;
  message: string;
  link?: string;
}) => {
  try {
    const notification = await Notification.create(data);

    // Emit real-time notification if socket is available
    if (io) {
      io.to(data.userId.toString()).emit("notification", notification);
    }

    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return undefined;
  }
};
