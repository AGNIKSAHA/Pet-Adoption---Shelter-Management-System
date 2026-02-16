import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Send,
  Search,
  MessageSquare,
  Loader2,
  Check,
  CheckCheck,
} from "lucide-react";
import { useAppSelector } from "../../store/store";
import api from "../../lib/api";
import { User } from "../../types";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize selectedUserId from URL query param
  useEffect(() => {
    const userId = searchParams.get("userId");
    if (userId) {
      setSelectedUserId(userId);
    }
  }, [searchParams]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedUserId]);

  const { data: conversations, isLoading: loadingConversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const response = await api.get("/messages/conversations");
      return response.data.data;
    },
    refetchInterval: 5000, // Basic polling as fallback for now
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

  const markReadMutation = useMutation({
    mutationFn: (userId: string) => api.patch(`/messages/${userId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

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
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-100 flex flex-col bg-gray-50/30">
        <div className="p-4 border-b border-gray-100 bg-white">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {searchTerm.length > 2 ? (
            <div className="p-2 space-y-1">
              <p className="px-3 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
                Search Results
              </p>
              {searchResults?.map((u: User) => (
                <button
                  key={u._id}
                  onClick={() => {
                    setSelectedUserId(u._id);
                    setSearchTerm("");
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    selectedUserId === u._id
                      ? "bg-white shadow-sm ring-1 ring-gray-100"
                      : "hover:bg-white"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold">
                    {u.firstName[0]}
                    {u.lastName[0]}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 leading-none">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 capitalize">
                      {u.role.replace("_", " ")}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {loadingConversations ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                </div>
              ) : conversations?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 px-4 text-center">
                  <MessageSquare className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-sm">
                    No conversations yet. Start one by searching for someone!
                  </p>
                </div>
              ) : (
                conversations?.map((conv: Conversation) => (
                  <button
                    key={conv._id}
                    onClick={() => setSelectedUserId(conv._id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group ${
                      selectedUserId === conv._id
                        ? "bg-white shadow-sm ring-1 ring-gray-100"
                        : "hover:bg-white"
                    }`}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-lg">
                        {conv.user.firstName[0]}
                        {conv.user.lastName[0]}
                      </div>
                      {conv.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                          {conv.unreadCount}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-gray-900 truncate">
                          {conv.user.firstName} {conv.user.lastName}
                        </p>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                          {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p
                        className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? "font-bold text-gray-900" : "text-gray-500"}`}
                      >
                        {conv.lastMessage}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedUserId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold">
                  {selectedUser?.firstName[0]}
                  {selectedUser?.lastName[0]}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 leading-none">
                    {selectedUser?.firstName} {selectedUser?.lastName}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 capitalize">
                    {selectedUser?.role?.replace("_", " ")}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
              {loadingMessages ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
              ) : (
                messages?.map((msg: Message) => {
                  const isMine = msg.senderId._id === currentUser?.id;
                  return (
                    <div
                      key={msg._id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      {!isMine && (
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xs mr-2 self-end mb-1">
                          {msg.senderId.firstName[0]}
                        </div>
                      )}
                      <div className="max-w-[70%] space-y-1">
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                            isMine
                              ? "bg-primary-600 text-white rounded-br-none"
                              : "bg-white text-gray-900 rounded-bl-none border border-gray-100"
                          }`}
                        >
                          {msg.content}
                        </div>
                        <div
                          className={`flex items-center gap-1 text-[10px] text-gray-400 ${isMine ? "justify-end" : "justify-start"}`}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {isMine &&
                            (msg.isRead ? (
                              <CheckCheck className="w-3 h-3 text-primary-500" />
                            ) : (
                              <Check className="w-3 h-3" />
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-100">
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  className="bg-primary-600 text-white p-3 rounded-xl hover:bg-primary-700 transition-all disabled:opacity-50 shadow-lg shadow-primary-200"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/20">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
              <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-10 h-10 text-primary-500 opacity-50" />
              </div>
              <h3 className="text-gray-900 font-bold text-lg">Your Inbox</h3>
              <p className="max-w-[240px] text-center text-sm mt-2">
                Select a conversation from the left or search for a user to
                start chatting.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
