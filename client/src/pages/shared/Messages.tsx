import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useAppSelector } from "../../store/store";
import api from "../../lib/api";
import { User } from "../../types";
import { socket } from "../../lib/socket";

// Components
import ConversationSidebar from "./components/messages/ConversationSidebar";
import ChatWindow from "./components/messages/ChatWindow";

interface Message {
  _id: string;
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
}

interface Conversation {
  _id: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    role: string;
    email: string;
  };
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export default function Messages() {
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [searchParams] = useSearchParams();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  // Queries
  const { data: conversations, isLoading: loadingConversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const response = await api.get("/messages/conversations");
      return response.data.data;
    },
    refetchInterval: 5000,
  });

  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ["messages", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const response = await api.get(`/messages/${selectedUserId}`);
      return response.data.data;
    },
    enabled: !!selectedUserId,
  });

  const { data: searchResults } = useQuery({
    queryKey: ["chat-search", searchTerm],
    queryFn: async () => {
      if (!searchTerm) return [];
      const response = await api.get(`/messages/chatable-users`, {
        params: { search: searchTerm },
      });
      return response.data.data;
    },
    enabled: searchTerm.length > 2,
  });

  // Mutations
  const markReadMutation = useMutation({
    mutationFn: (userId: string) => api.patch(`/messages/${userId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { receiverId: string; content: string }) => {
      const response = await api.post("/messages", data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setNewMessage("");
    },
  });

  // Effects
  useEffect(() => {
    const userId = searchParams.get("userId");
    if (userId) {
      setSelectedUserId(userId);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleChatMessage = (msg: Message) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });

      if (
        selectedUserId &&
        (msg.senderId._id === selectedUserId ||
          (msg.senderId as unknown as string) === selectedUserId)
      ) {
        markReadMutation.mutate(selectedUserId);
      }
    };

    socket.on("chat_message", handleChatMessage);
    return () => {
      socket.off("chat_message", handleChatMessage);
    };
  }, [queryClient, selectedUserId, markReadMutation]);

  useEffect(() => {
    if (selectedUserId) {
      markReadMutation.mutate(selectedUserId);
    }
  }, [selectedUserId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUserId) return;

    sendMessageMutation.mutate({
      receiverId: selectedUserId,
      content: newMessage.trim(),
    });
  };

  const selectedConversation = conversations?.find(
    (c: Conversation) => c._id === selectedUserId,
  );
  const selectedUser =
    selectedConversation?.user ||
    searchResults?.find((u: User) => u._id === selectedUserId);

  return (
    <div className="h-[calc(100vh-120px)] flex bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <ConversationSidebar
        conversations={conversations}
        loadingConversations={loadingConversations}
        selectedUserId={selectedUserId}
        setSelectedUserId={setSelectedUserId}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchResults={searchResults}
      />

      <ChatWindow
        selectedUserId={selectedUserId}
        selectedUser={selectedUser}
        messages={messages}
        loadingMessages={loadingMessages}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        handleSendMessage={handleSendMessage}
        isSending={sendMessageMutation.isPending}
        currentUser={currentUser}
      />
    </div>
  );
}
