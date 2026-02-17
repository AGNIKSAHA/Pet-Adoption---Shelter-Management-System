import { useRef, useEffect } from "react";
import { Send, Loader2, Check, CheckCheck, MessageSquare } from "lucide-react";

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

import { User } from "../../../../types";

interface ChatWindowProps {
  selectedUserId: string | null;
  selectedUser:
    | {
        firstName: string;
        lastName: string;
        role: string;
      }
    | undefined;
  messages: Message[] | undefined;
  loadingMessages: boolean;
  newMessage: string;
  setNewMessage: (msg: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
  isSending: boolean;
  currentUser: User | null;
}

export default function ChatWindow({
  selectedUserId,
  selectedUser,
  messages,
  loadingMessages,
  newMessage,
  setNewMessage,
  handleSendMessage,
  isSending,
  currentUser,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!selectedUserId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/20">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
          <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mb-4">
            <MessageSquare className="w-10 h-10 text-primary-500 opacity-50" />
          </div>
          <h3 className="text-gray-900 font-bold text-lg">Your Inbox</h3>
          <p className="max-w-[240px] text-center text-sm mt-2">
            Select a conversation from the left or search for a user to start
            chatting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
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
            const currentId = currentUser?.id || currentUser?._id;
            const isMine = msg.senderId._id === currentId;
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
            disabled={!newMessage.trim() || isSending}
            className="bg-primary-600 text-white p-3 rounded-xl hover:bg-primary-700 transition-all disabled:opacity-50 shadow-lg shadow-primary-200"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
