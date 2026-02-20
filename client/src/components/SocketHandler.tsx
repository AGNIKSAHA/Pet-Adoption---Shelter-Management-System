import { useEffect } from "react";
import { socket } from "../lib/socket";
import { useAppSelector, useAppDispatch } from "../store/store";
import { setUser } from "../store/slices/authSlice";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Notification } from "../types";
import api from "../lib/api";
export default function SocketHandler() {
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const dispatch = useAppDispatch();
    const queryClient = useQueryClient();
    useEffect(() => {
        if (isAuthenticated && user) {
            if (!socket.connected) {
                socket.connect();
            }
            socket.emit("join", user.id || user._id);
            const handleNotification = async (notification: Notification) => {
                queryClient.invalidateQueries({ queryKey: ["notifications"] });
                if (notification.type === "system") {
                    try {
                        const response = await api.get("/auth/me");
                        dispatch(setUser(response.data.data.user));
                    }
                    catch {
                    }
                }
                toast.success(notification.title, {
                    icon: "🔔",
                    duration: 4000,
                });
            };
            const handleChatMessage = () => {
                queryClient.invalidateQueries({ queryKey: ["conversations"] });
                queryClient.invalidateQueries({ queryKey: ["messages"] });
            };
            const handleConversationHandoff = () => {
                queryClient.invalidateQueries({ queryKey: ["conversations"] });
                queryClient.invalidateQueries({ queryKey: ["messages"] });
            };
            socket.on("notification", handleNotification);
            socket.on("chat_message", handleChatMessage);
            socket.on("conversation_handoff", handleConversationHandoff);
            return () => {
                socket.off("notification", handleNotification);
                socket.off("chat_message", handleChatMessage);
                socket.off("conversation_handoff", handleConversationHandoff);
            };
        }
        else {
            socket.disconnect();
        }
    }, [isAuthenticated, user, queryClient, dispatch]);
    return null;
}
