import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useAppSelector } from "../../store/store";
import api from "../../lib/api";
import { socket } from "../../lib/socket";
import ConversationSidebar from "./components/messages/ConversationSidebar";
import ChatWindow from "./components/messages/ChatWindow";
interface Message {
    _id: string;
    conversationId?: string;
    senderId: {
        _id: string;
        firstName: string;
        lastName: string;
    };
    receiverId: {
        _id: string;
        firstName: string;
        lastName: string;
    };
    content: string;
    isRead: boolean;
    createdAt: string;
    senderStaffId?: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
}
interface Conversation {
    _id: string;
    counterpart: {
        _id: string;
        firstName: string;
        lastName: string;
        role: string;
        email: string;
    };
    adopter: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    shelter: {
        _id: string;
        name: string;
        email: string;
    };
    assignedStaff?: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
}
interface StaffOption {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
}
const extractObjectId = (value: unknown): string | null => {
    if (!value)
        return null;
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (/^[a-f0-9]{24}$/i.test(trimmed))
            return trimmed;
        const match = trimmed.match(/[a-f0-9]{24}/i);
        return match ? match[0] : null;
    }
    if (typeof value === "object") {
        const obj = value as {
            _id?: unknown;
            id?: unknown;
        };
        return extractObjectId(obj._id ?? obj.id);
    }
    return null;
};
export default function Messages() {
    const { user: currentUser, activeShelterId, activeRole } = useAppSelector((state) => state.auth);
    const [searchParams] = useSearchParams();
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const queryClient = useQueryClient();
    const effectiveRole = activeRole || currentUser?.role;
    const isAdopter = effectiveRole === "adopter" ||
        currentUser?.role === "adopter" ||
        (currentUser?.roles || []).includes("adopter");
    const allowUserSearch = false;
    const isAuthReady = !!(currentUser && (currentUser.id || currentUser._id));
    const lastAutoStartKeyRef = useRef<string | null>(null);
    const { data: conversations, isLoading: loadingConversations } = useQuery({
        queryKey: ["conversations"],
        queryFn: async () => {
            const response = await api.get("/messages/conversations");
            return response.data.data;
        },
        enabled: isAuthReady,
        refetchInterval: isAuthReady ? 5000 : false,
    });
    const { data: messages, isLoading: loadingMessages } = useQuery({
        queryKey: ["messages", selectedConversationId],
        queryFn: async () => {
            if (!selectedConversationId)
                return [];
            const response = await api.get(`/messages/conversations/${selectedConversationId}/messages`);
            return response.data.data;
        },
        enabled: isAuthReady && !!selectedConversationId,
    });
    const { data: searchResults } = useQuery({
        queryKey: ["chat-search", searchTerm],
        queryFn: async () => {
            if (!searchTerm)
                return [];
            const response = await api.get(`/messages/chatable-users`, {
                params: { search: searchTerm },
            });
            return response.data.data;
        },
        enabled: isAuthReady && allowUserSearch && searchTerm.length > 2,
    });
    const markReadMutation = useMutation({
        mutationFn: (conversationId: string) => api.patch(`/messages/conversations/${conversationId}/read`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
    });
    const startConversationMutation = useMutation({
        mutationFn: async ({ userId, shelterId, }: {
            userId?: string;
            shelterId?: string;
        }) => {
            if (!userId && !shelterId) {
                throw new Error("Missing conversation target");
            }
            const response = await api.post("/messages/conversations/start", {
                receiverId: userId,
                shelterId: shelterId || activeShelterId || undefined,
            });
            return response.data.data as Conversation;
        },
        onSuccess: (conversation) => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            setSelectedConversationId(conversation._id);
            setSearchTerm("");
        },
    });
    const sendMessageMutation = useMutation({
        mutationFn: async (data: {
            conversationId: string;
            content: string;
        }) => {
            const response = await api.post(`/messages/conversations/${data.conversationId}/messages`, { content: data.content });
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["messages", selectedConversationId],
            });
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            setNewMessage("");
        },
    });
    const handoffMutation = useMutation({
        mutationFn: async (toStaffId: string) => {
            if (!selectedConversationId)
                return null;
            const response = await api.patch(`/messages/conversations/${selectedConversationId}/handoff`, { toStaffId, reason: "Shift handoff" });
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            queryClient.invalidateQueries({
                queryKey: ["staff-options", selectedConversationId],
            });
        },
    });
    const { data: staffOptions } = useQuery({
        queryKey: ["staff-options", selectedConversationId],
        queryFn: async () => {
            if (!selectedConversationId)
                return [];
            const response = await api.get(`/messages/conversations/${selectedConversationId}/staff-options`);
            return response.data.data as StaffOption[];
        },
        enabled: isAuthReady &&
            !!selectedConversationId &&
            (currentUser?.role === "shelter_staff" || currentUser?.role === "admin"),
    });
    useEffect(() => {
        if (!isAuthReady)
            return;
        const userId = extractObjectId(searchParams.get("userId"));
        const shelterId = extractObjectId(searchParams.get("shelterId"));
        if (isAdopter && shelterId) {
            const key = `shelter:${shelterId}`;
            if (lastAutoStartKeyRef.current === key)
                return;
            lastAutoStartKeyRef.current = key;
            startConversationMutation.mutate({ shelterId });
            return;
        }
        if (userId) {
            const key = `user:${userId}`;
            if (lastAutoStartKeyRef.current === key)
                return;
            lastAutoStartKeyRef.current = key;
            startConversationMutation.mutate({ userId });
        }
    }, [searchParams, isAuthReady, isAdopter]);
    useEffect(() => {
        if (!isAuthReady)
            return;
        const handleChatMessage = (msg: Message) => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            queryClient.invalidateQueries({ queryKey: ["messages"] });
            if (selectedConversationId &&
                msg.conversationId &&
                msg.conversationId === selectedConversationId) {
                markReadMutation.mutate(selectedConversationId);
            }
        };
        const handleConversationHandoff = () => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            queryClient.invalidateQueries({ queryKey: ["messages"] });
        };
        socket.on("chat_message", handleChatMessage);
        socket.on("conversation_handoff", handleConversationHandoff);
        return () => {
            socket.off("chat_message", handleChatMessage);
            socket.off("conversation_handoff", handleConversationHandoff);
        };
    }, [queryClient, selectedConversationId, markReadMutation, isAuthReady]);
    useEffect(() => {
        if (isAuthReady && selectedConversationId) {
            markReadMutation.mutate(selectedConversationId);
        }
    }, [selectedConversationId, isAuthReady]);
    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConversationId)
            return;
        sendMessageMutation.mutate({
            conversationId: selectedConversationId,
            content: newMessage.trim(),
        });
    };
    const selectedConversation = conversations?.find((c: Conversation) => c._id === selectedConversationId);
    const selectedUser = selectedConversation?.counterpart;
    const handleSearchUserSelect = (id: string) => {
        if (!allowUserSearch)
            return;
        startConversationMutation.mutate({ userId: id });
    };
    return (<div className="h-[calc(100vh-120px)] flex bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <ConversationSidebar conversations={conversations} loadingConversations={loadingConversations} selectedConversationId={selectedConversationId} setSelectedConversationId={setSelectedConversationId} searchTerm={searchTerm} setSearchTerm={setSearchTerm} searchResults={searchResults} onSelectSearchUser={handleSearchUserSelect} enableSearch={allowUserSearch}/>

      <ChatWindow selectedConversationId={selectedConversationId} selectedUser={selectedUser} messages={messages} loadingMessages={loadingMessages} newMessage={newMessage} setNewMessage={setNewMessage} handleSendMessage={handleSendMessage} isSending={sendMessageMutation.isPending} currentUser={currentUser} staffOptions={staffOptions} onHandoff={(toStaffId) => handoffMutation.mutate(toStaffId)} handoffPending={handoffMutation.isPending}/>
    </div>);
}
