import { useEffect } from "react";
import { socket } from "../lib/socket";
import { useAppSelector } from "../store/store";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Notification } from "../types";

export default function SocketHandler() {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (!socket.connected) {
        socket.connect();
      }

      socket.emit("join", user.id || user._id);

      const handleNotification = (notification: Notification) => {
        // Refresh notifications query
        queryClient.invalidateQueries({ queryKey: ["notifications"] });

        // Show a toast
        toast.success(notification.title, {
          icon: "🔔",
          duration: 4000,
        });
      };

      const handleChatMessage = () => {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["messages"] });
      };

      socket.on("notification", handleNotification);
      socket.on("chat_message", handleChatMessage);

      return () => {
        socket.off("notification", handleNotification);
        socket.off("chat_message", handleChatMessage);
      };
    } else {
      socket.disconnect();
    }
  }, [isAuthenticated, user, queryClient]);

  return null;
}
